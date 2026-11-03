import assert from 'assert';
import { prisma } from './src/config/prisma.js';

const BASE_URL = 'http://localhost:5000/api';

async function runTest() {
  console.log('====================================');
  console.log('TESTING CHAPA PAYMENT INTEGRATION');
  console.log('====================================');

  // 1. Config check
  console.log('\n1. Testing GET /api/payments/config...');
  const cfgRes = await fetch(`${BASE_URL}/payments/config`);
  assert.strictEqual(cfgRes.status, 200, 'Config endpoint returns 200');
  const cfg = await cfgRes.json();
  console.log('  ✔ PASS: Config retrieved:', cfg);
  assert.ok(cfg.publicKey, 'Public key is present');
  assert.ok(cfg.enabledMethods.includes('telebirr'), 'Telebirr is enabled');
  assert.ok(cfg.enabledMethods.includes('cbebirr'), 'CBE Birr is enabled');

  // 2. Create a test order
  console.log('\n2. Creating a test order for payment...');
  const product = await prisma.product.findFirst({ where: { published: true } });
  assert.ok(product, 'Found published product');

  const orderRes = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: 'Abebe Kebede',
      customerPhone: '0911223344',
      items: [{ productId: product.id, quantity: 1 }],
      notes: 'Testing Chapa payment'
    })
  });
  assert.strictEqual(orderRes.status, 201, 'Order created');
  const { order } = await orderRes.json();
  console.log(`  ✔ PASS: Order created: ${order.code} (Total: ${order.total} ETB, ID: ${order.id})`);

  // 3. Test Telebirr Inline Charge (USSD flow)
  console.log('\n3. Testing Telebirr Inline Charge Initialization (USSD)...');
  const telebirrInitRes = await fetch(`${BASE_URL}/payments/inline/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: order.id,
      paymentMethod: 'telebirr',
      mobile: '0911223344',
      customerName: 'Abebe Kebede'
    })
  });
  assert.strictEqual(telebirrInitRes.status, 200, 'Telebirr init returned 200');
  const telebirrData = await telebirrInitRes.json();
  console.log('  ✔ PASS: Telebirr charge initiated:', telebirrData.data);
  assert.strictEqual(telebirrData.data.auth_type, 'USSD', 'Auth type is USSD');
  assert.ok(telebirrData.data.chapa_reference, 'Chapa reference issued');

  const telebirrRef = telebirrData.data.chapa_reference;

  // 4. Test USSD Polling (Pending then Success)
  console.log('\n4. Testing USSD Status Polling...');
  const poll1Res = await fetch(`${BASE_URL}/payments/inline/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reference: telebirrRef,
      paymentMethod: 'telebirr'
    })
  });
  assert.strictEqual(poll1Res.status, 200, 'Poll 1 returned 200');
  const poll1 = await poll1Res.json();
  console.log('  ✔ PASS: Poll 1 state:', poll1.data.status || poll1.data.payment_status);

  // Poll 2 / Approve
  const poll2Res = await fetch(`${BASE_URL}/payments/inline/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reference: telebirrRef,
      paymentMethod: 'telebirr',
      otp: 'APPROVE'
    })
  });
  assert.strictEqual(poll2Res.status, 200, 'Poll 2 returned 200');
  const poll2 = await poll2Res.json();
  console.log('  ✔ PASS: Payment validated as SUCCESS:', poll2.data);
  assert.strictEqual(poll2.data.status, 'SUCCESS', 'Payment status is SUCCESS');
  assert.ok(poll2.data.processor_reference, 'Processor reference issued');

  // 5. Verify database update
  console.log('\n5. Verifying database order paymentStatus...');
  const dbOrder = await prisma.order.findUnique({ where: { id: order.id } });
  console.log(`  ✔ PASS: Order paymentStatus in DB is now: ${dbOrder.paymentStatus}`);
  assert.strictEqual(dbOrder.paymentStatus, 'PAID', 'Order paymentStatus updated to PAID');

  // 6. Check payment records for order
  console.log('\n6. Checking GET /api/payments/order/:orderId...');
  const historyRes = await fetch(`${BASE_URL}/payments/order/${order.id}`);
  assert.strictEqual(historyRes.status, 200, 'Payment history endpoint returned 200');
  const history = await historyRes.json();
  console.log(`  ✔ PASS: Payment record found: ${history.payments?.length} payment(s), status: ${history.payments[0]?.status}`);
  assert.strictEqual(history.payments[0]?.status, 'SUCCESS');

  // 7. Test CBE Birr OTP Flow on a second order
  console.log('\n7. Testing CBE Birr Inline Charge & OTP Validation...');
  const order2Res = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: 'Fatuma Mohammed',
      customerPhone: '0922334455',
      items: [{ productId: product.id, quantity: 1 }],
      notes: 'Testing CBE Birr OTP'
    })
  });
  const { order: order2 } = await order2Res.json();

  const cbeInitRes = await fetch(`${BASE_URL}/payments/inline/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: order2.id,
      paymentMethod: 'cbebirr',
      mobile: '0922334455',
      customerName: 'Fatuma Mohammed'
    })
  });
  const cbeData = await cbeInitRes.json();
  console.log('  ✔ PASS: CBE Birr initiated:', cbeData.data);
  assert.strictEqual(cbeData.data.auth_type, 'OTP', 'Auth type is OTP for CBE Birr');

  const cbeOtpRes = await fetch(`${BASE_URL}/payments/inline/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reference: cbeData.data.chapa_reference,
      paymentMethod: 'cbebirr',
      otp: '123456'
    })
  });
  const cbeOtp = await cbeOtpRes.json();
  console.log('  ✔ PASS: CBE Birr OTP validated:', cbeOtp.data);
  assert.strictEqual(cbeOtp.data.status, 'SUCCESS', 'CBE Birr payment confirmed');

  const dbOrder2 = await prisma.order.findUnique({ where: { id: order2.id } });
  assert.strictEqual(dbOrder2.paymentStatus, 'PAID', 'Order 2 marked as PAID');

  console.log('\n====================================');
  console.log('ALL CHAPA INTEGRATION TESTS PASSED!');
  console.log('====================================\n');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

