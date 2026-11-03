import express from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { requireCustomer } from '../middlewares/auth.js';
import { cleanDigits } from '../utils/phone.js';

const router = express.Router();

// GET /me/orders - Orders belonging to authenticated customer
router.get('/orders', requireCustomer, async (req, res, next) => {
  try {
    const customerPhone = req.customer.phone;
    const phDigits = cleanDigits(customerPhone);

    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { customerId: req.customer.customerId },
          { customerPhone: customerPhone },
          { customerPhone: { contains: phDigits } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: { items: true }
    });

    const statusDisplay = {
      RECEIVED: 'Received',
      IN_PRODUCTION: 'In production',
      SHIPPED: 'Shipped',
      DELIVERED: 'Delivered'
    };

    const typeDisplay = {
      READY_MADE: 'Ready-made',
      CUSTOM_DESIGN: 'Custom design',
      WHOLESALE: 'Wholesale',
      ABROAD: 'Abroad'
    };

    res.json({
      success: true,
      orders: orders.map(o => ({
        id: o.code,
        internalId: o.id,
        type: typeDisplay[o.type] || o.type,
        desc: o.description,
        total: Number(o.total),
        status: statusDisplay[o.status] || o.status,
        rawStatus: o.status,
        pay: o.paymentStatus,
        date: o.createdAt.toISOString().slice(0, 10),
        items: o.items
      }))
    });
  } catch (err) {
    next(err);
  }
});

// GET /me/requests - Requests belonging to authenticated customer
router.get('/requests', requireCustomer, async (req, res, next) => {
  try {
    const customerPhone = req.customer.phone;
    const phDigits = cleanDigits(customerPhone);

    const requests = await prisma.request.findMany({
      where: {
        OR: [
          { customerId: req.customer.customerId },
          { phone: customerPhone },
          { phone: { contains: phDigits } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        images: true,
        order: true
      }
    });

    const statusDisplay = {
      NEW: 'New',
      QUOTED: 'Quoted',
      ACCEPTED: 'Converted',
      CLOSED: 'Declined'
    };

    const typeDisplay = {
      CUSTOM_DESIGN: 'Custom design',
      WHOLESALE: 'Wholesale',
      ABROAD: 'Abroad'
    };

    res.json({
      success: true,
      requests: requests.map(r => ({
        id: r.id,
        type: typeDisplay[r.type] || r.type,
        name: r.name,
        phone: r.phone,
        d: r.details,
        notes: r.notes,
        status: statusDisplay[r.status] || r.status,
        rawStatus: r.status,
        quote: r.quoteAmount ? Number(r.quoteAmount) : (r.quoteText || ''),
        quoteAmount: r.quoteAmount ? Number(r.quoteAmount) : null,
        quoteText: r.quoteText,
        date: r.createdAt.toISOString().slice(0, 10),
        images: r.images,
        orderCode: r.order?.code || null
      }))
    });
  } catch (err) {
    next(err);
  }
});

// GET /me/profile - Get customer profile info
router.get('/profile', requireCustomer, async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.customer.customerId },
      select: {
        id: true,
        name: true,
        username: true,
        phone: true,
        createdAt: true,
        lastLoginAt: true
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ success: true, customer });
  } catch (err) {
    next(err);
  }
});

// PATCH /me/profile - Update customer name
router.patch('/profile', requireCustomer, async (req, res, next) => {
  try {
    const { name } = req.body;
    const updated = await prisma.customer.update({
      where: { id: req.customer.customerId },
      data: { name: name ? String(name).trim() : null }
    });

    res.json({
      success: true,
      customer: {
        id: updated.id,
        phone: updated.phone,
        name: updated.name,
        username: updated.username
      }
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /me/password - Customer change password
router.patch('/password', requireCustomer, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters' });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: req.customer.customerId }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // If customer already has a password set, verify current password
    if (customer.passwordHash && currentPassword) {
      const match = await bcrypt.compare(currentPassword, customer.passwordHash);
      if (!match) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.customer.update({
      where: { id: customer.id },
      data: { passwordHash: newHash }
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;

