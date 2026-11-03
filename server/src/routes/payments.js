import express from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { chapaService } from '../services/chapaService.js';
import { logger } from '../middlewares/logger.js';

const router = express.Router();

const initPaymentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  paymentMethod: z.enum(['telebirr', 'cbebirr', 'TELEBIRR', 'CBEBIRR']).default('telebirr'),
  mobile: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  customerName: z.string().optional(),
  honeypot: z.string().optional()
});

const validatePaymentSchema = z.object({
  reference: z.string().min(1, 'Payment reference is required'),
  paymentMethod: z.string().default('telebirr'),
  otp: z.string().optional().nullable(),
  orderId: z.string().optional()
});

// GET /api/payments/config - Public configuration
router.get('/config', async (req, res, next) => {
  try {
    const settings = await prisma.setting.findFirst();
    const enabledMethods = [];
    if (settings?.payTelebirr) enabledMethods.push('telebirr');
    if (settings?.payCbeBirr) enabledMethods.push('cbebirr');

    res.json({
      success: true,
      publicKey: env.CHAPA_PUBLIC_KEY || '',
      enabledMethods,
      currency: 'ETB'
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/inline/init - Initialize an inline charge
router.post('/inline/init', async (req, res, next) => {
  try {
    const parsed = initPaymentSchema.parse(req.body);
    const result = await chapaService.initializeInlineCharge(parsed);
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0]?.message || 'Invalid parameters' });
    }
    res.status(400).json({ error: err.message || 'Payment initialization failed' });
  }
});

// POST /api/payments/live/init - Initialize Live Chapa Checkout (api.chapa.co)
router.post('/live/init', async (req, res, next) => {
  try {
    const { orderId, email, customerName, phone } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }
    const result = await chapaService.initializeLiveCharge({
      orderId,
      email,
      customerName,
      phone
    });
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Live payment initialization failed' });
  }
});

// POST /api/payments/inline/validate - Validate inline charge (or poll USSD status)
router.post('/inline/validate', async (req, res, next) => {
  try {
    const parsed = validatePaymentSchema.parse(req.body);
    const result = await chapaService.validateInlineCharge(parsed);
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0]?.message || 'Invalid parameters' });
    }
    res.status(400).json({ error: err.message || 'Payment validation failed' });
  }
});

// GET /api/payments/verify/:reference - Verify payment with private key
router.get('/verify/:reference', async (req, res, next) => {
  try {
    const { reference } = req.params;
    const result = await chapaService.verifyPayment(reference);
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/payments/order/:orderId - List payments for an order
router.get('/order/:orderId', async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const payments = await prisma.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' }
    });
    res.json({
      success: true,
      payments
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/webhook - Chapa Webhook endpoint
router.post('/webhook', async (req, res) => {
  try {
    logger.info(`Chapa Webhook received: ${JSON.stringify(req.body)}`);
    const event = req.body;
    const txRef = event?.tx_ref || event?.reference || event?.merchant_reference;

    if (txRef) {
      // Validate with private key
      const verification = await chapaService.verifyPayment(txRef);
      if (verification?.verified) {
        const payment = await prisma.payment.findFirst({
          where: {
            OR: [
              { chapaReference: txRef },
              { merchantReference: txRef }
            ]
          }
        });

        if (payment) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'SUCCESS' }
          });
          await prisma.order.update({
            where: { id: payment.orderId },
            data: { paymentStatus: 'PAID' }
          });
        }
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    logger.error('Error processing Chapa webhook:', err);
    res.status(200).json({ received: true }); // Acknowledge to prevent retries
  }
});

export default router;

