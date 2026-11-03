import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('TRUE CLOTHING - END-TO-END VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✔ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✖ FAIL: ${message}`);
      failed++;
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // 1. Health check
    console.log('1. Testing /api/health...');
    const healthRes = await fetch(`${BASE}/health`);
    const health = await healthRes.json();
    assert(health.status === 'ok' && health.db === 'connected', 'Health check returns OK and DB connected');

    // 2. Public products
    console.log('\n2. Testing Public Products...');
    const prodsRes = await fetch(`${BASE}/products`);
    const prodsData = await prodsRes.json();
    assert(prodsData.products.length >= 4, `Public products list returned ${prodsData.products.length} products`);
    const sampleProduct = prodsData.products[0];
    assert(sampleProduct.published === true, 'Public products are only published items');
    assert(typeof sampleProduct.price === 'number', 'Product price is returned as a number in ETB');

    // Filter by category
    const shifonRes = await fetch(`${BASE}/products?category=SHIFON`);
    const shifonData = await shifonRes.json();
    assert(shifonData.products.every(p => p.category === 'SHIFON'), 'Category filter SHIFON strictly filters items');

    // 3. Guest places an order
    console.log('\n3. Testing Guest Order Placement...');
    const guestPhone = '0911554433';
    const orderRes = await fetch(`${BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Almaz Ayana',
        customerPhone: guestPhone,
        items: [
          { productId: sampleProduct.id, size: 'M', quantity: 2 }
        ],
        notes: 'Please ensure fast delivery to Bole'
      })
    });
    const orderData = await orderRes.json();
    assert(orderData.success === true, 'Order created successfully');
    assert(orderData.order.code.startsWith('#'), `Order code generated sequentially: ${orderData.order.code}`);
    assert(orderData.order.total === sampleProduct.price * 2, 'Total strictly recalculated on server: ' + orderData.order.total);
    const guestOrderCode = orderData.order.code;

    // 4. Guest submits requests (Custom design with photo, Wholesale, Abroad)
    console.log('\n4. Testing Guest Requests...');

    // 4a. Custom design with image
    // Create a dummy test image buffer
    const dummyImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    const formData = new FormData();
    formData.append('type', 'Custom design');
    formData.append('name', 'Tigist Assefa');
    formData.append('phone', '0922887766');
    formData.append('notes', 'Traditional royal blue embroidered dress');
    formData.append('details', JSON.stringify({
      'Fabric and color': 'Pure silk royal blue',
      'Bust (cm)': '92',
      'Waist (cm)': '74',
      'Hip (cm)': '98',
      'Length (cm)': '148',
      'Needed by': '2026-11-20'
    }));
    formData.append('images', new Blob([dummyImageBuffer], { type: 'image/png' }), 'custom-ref.png');

    const customReqRes = await fetch(`${BASE}/requests`, {
      method: 'POST',
      body: formData
    });
    const customReqData = await customReqRes.json();
    assert(customReqData.success === true, 'Custom design request with image created');
    assert(customReqData.request.images.length > 0, 'Image uploaded, processed by Sharp, and linked to request');

    // 4b. Wholesale request
    const wholesaleReqRes = await fetch(`${BASE}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'Wholesale',
        name: 'Kassahun Trading',
        phone: '0933112233',
        details: {
          'Quantity (pieces)': '100',
          'Product or fabric': 'Habesha dresses with gold tibeb'
        },
        notes: 'Need delivery to Mercato warehouse'
      })
    });
    const wholesaleData = await wholesaleReqRes.json();
    assert(wholesaleData.success === true, 'Wholesale request created successfully');
    const wholesaleRequestId = wholesaleData.request.id;

    // 4c. Abroad request
    const abroadReqRes = await fetch(`${BASE}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'Abroad',
        name: 'Helen Bekele',
        phone: '+12025550198',
        details: {
          'Delivery city and country': 'Washington DC, USA',
          'Needed by': '2026-12-05',
          'Design or fabric': 'Modern Habesha Kemis with Netela'
        },
        notes: 'For graduation celebration'
      })
    });
    const abroadData = await abroadReqRes.json();
    assert(abroadData.success === true, 'Abroad delivery request created successfully');

    // 5. Customer OTP Sign in & Account Isolation
    console.log('\n5. Testing Customer OTP Authentication & Isolation...');
    const customerPhone = '0911554433'; // Almaz Ayana who placed an order earlier
    const otpReqRes = await fetch(`${BASE}/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: customerPhone })
    });
    const otpReqData = await otpReqRes.json();
    assert(otpReqData.success === true, 'OTP requested successfully');
    const otpCode = otpReqData.devCode;
    assert(Boolean(otpCode), 'OTP code generated: ' + otpCode);

    // Verify OTP
    const verifyRes = await fetch(`${BASE}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: customerPhone, code: otpCode })
    });
    const verifyData = await verifyRes.json();
    assert(verifyData.success === true, 'OTP verified and Customer signed in');
    const customerToken = verifyData.token;
    assert(Boolean(customerToken), 'Customer JWT token issued');

    // Customer /me/orders
    const meOrdersRes = await fetch(`${BASE}/me/orders`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    const meOrdersData = await meOrdersRes.json();
    assert(meOrdersData.orders.some(o => o.id === guestOrderCode), `Customer sees their placed order ${guestOrderCode}`);

    // Verify Customer cannot see other customers' orders
    const hasOtherOrders = meOrdersData.orders.some(o => o.phone === '+251911000001');
    assert(!hasOtherOrders, 'Customer cannot see other customers orders (strict isolation)');

    // 6. Admin Authentication
    console.log('\n6. Testing Admin Login...');
    const adminLoginRes = await fetch(`${BASE}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const adminLoginData = await adminLoginRes.json();
    assert(adminLoginData.success === true, 'Admin login succeeded with seeded credentials');
    const adminToken = adminLoginData.token;
    const adminHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    };

    // 7. Admin Dashboard Stats
    console.log('\n7. Testing Admin Dashboard Stats...');
    const statsRes = await fetch(`${BASE}/dashboard/stats`, { headers: adminHeaders });
    const statsData = await statsRes.json();
    assert(statsData.stats.newOrders >= 1, `Stats newOrders: ${statsData.stats.newOrders}`);
    assert(statsData.stats.openRequests >= 1, `Stats openRequests: ${statsData.stats.openRequests}`);
    assert(statsData.stats.customers >= 1, `Stats customers: ${statsData.stats.customers}`);
    assert(statsData.needsAttention.length > 0, 'Needs attention list contains pending items');

    // 8. Order Status Progression (All 4 statuses) & Payment
    console.log('\n8. Testing Order Lifecycle & Activity Logging...');
    const allOrdersRes = await fetch(`${BASE}/orders`, { headers: adminHeaders });
    const allOrdersData = await allOrdersRes.json();
    const targetOrder = allOrdersData.orders.find(o => o.id === guestOrderCode);
    assert(Boolean(targetOrder), `Found target order ${guestOrderCode}`);

    const statuses = ['In production', 'Shipped', 'Delivered'];
    for (const st of statuses) {
      const orderIdParam = targetOrder.internalId || encodeURIComponent(targetOrder.id);
      const updateRes = await fetch(`${BASE}/orders/${orderIdParam}`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({ status: st })
      });
      const updateData = await updateRes.json();
      assert(updateData.order.status === (st === 'In production' ? 'IN_PRODUCTION' : st.toUpperCase()), `Order transitioned to ${st}`);
    }

    // Mark paid
    const orderIdParam = targetOrder.internalId || encodeURIComponent(targetOrder.id);
    const payRes = await fetch(`${BASE}/orders/${orderIdParam}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ paymentStatus: 'Paid' })
    });
    const payData = await payRes.json();
    assert(payData.order.pay === 'PAID', 'Order marked as PAID');

    // 9. Admin Quote Wholesale Request
    console.log('\n9. Testing Wholesale Request Quoting...');
    const quoteRes = await fetch(`${BASE}/requests/${wholesaleRequestId}/quote`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ quotePrice: 38000, quoteText: 'Quote: 38,000 ETB for 100 pieces with embroidery' })
    });
    const quoteData = await quoteRes.json();
    assert(quoteData.success === true && quoteData.request.status === 'Quoted', 'Wholesale request quoted at 38,000 ETB');

    // 10. Convert Request to Order
    console.log('\n10. Testing Request to Order Conversion...');
    const convertRes = await fetch(`${BASE}/requests/${wholesaleRequestId}/convert`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ total: 38000 })
    });
    const convertData = await convertRes.json();
    assert(convertData.success === true, 'Request successfully converted to order: ' + convertData.order.id);
    assert(convertData.order.id.startsWith('#'), 'Converted order received sequential order code: ' + convertData.order.id);

    // 11. Product Unpublish & Publish Toggle
    console.log('\n11. Testing Product Publish/Unpublish toggle...');
    const unpublishRes = await fetch(`${BASE}/products/${sampleProduct.id}/publish`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ published: false })
    });
    const unpublishData = await unpublishRes.json();
    assert(unpublishData.product.published === false, 'Product unpublished by admin');

    // Verify it disappears from public shop
    const publicProdsAfter = await (await fetch(`${BASE}/products`)).json();
    const isPresent = publicProdsAfter.products.some(p => p.id === sampleProduct.id);
    assert(!isPresent, 'Unpublished product disappeared from public shop');

    // Re-publish product
    await fetch(`${BASE}/products/${sampleProduct.id}/publish`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ published: true })
    });
    console.log('  ✔ Product re-published to restore catalog');

    // 12. Activity log check
    console.log('\n12. Testing Activity Log...');
    const activityRes = await fetch(`${BASE}/activity`, { headers: adminHeaders });
    const activityData = await activityRes.json();
    assert(activityData.logs.length >= 5, `Activity log recorded ${activityData.logs.length} actions`);

    // 13. Honeypot check
    console.log('\n13. Testing Honeypot Bot Deterrence...');
    const botOrderRes = await fetch(`${BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Spam Bot',
        customerPhone: '0911000000',
        items: [{ productId: sampleProduct.id, quantity: 1 }],
        honeypot: 'i-am-a-spambot'
      })
    });
    const botOrderData = await botOrderRes.json();
    assert(botOrderData.success === true && botOrderData.order.code === '#0000', 'Spam bot intercepted safely by honeypot without creating DB record');

    console.log('\n====================================================');
    console.log(`ALL VERIFICATION TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

  } catch (err) {
    console.error('\nVerification halted with error:', err.message);
    process.exit(1);
  }
}

runTests();
