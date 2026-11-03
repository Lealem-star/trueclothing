import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { requireAdmin, optionalCustomer } from '../middlewares/auth.js';
import { publicOrderLimiter } from '../middlewares/rateLimiter.js';
import { uploadImages } from '../middlewares/upload.js';
import { storageService } from '../services/storageService.js';
import { activityService } from '../services/activityService.js';
import { telegramService } from '../services/telegramService.js';
import { normalizePhone } from '../utils/phone.js';

const router = express.Router();

// Helper to map tab type string to DB enum
const typeToEnum = (typeStr) => {
  const map = {
    'Custom design': 'CUSTOM_DESIGN',
    'CUSTOM_DESIGN': 'CUSTOM_DESIGN',
    'Wholesale': 'WHOLESALE',
    'WHOLESALE': 'WHOLESALE',
    'Abroad': 'ABROAD',
    'ABROAD': 'ABROAD'
  };
  return map[typeStr] || 'CUSTOM_DESIGN';
};

const enumToDisplayType = (enumVal) => {
  const map = {
    CUSTOM_DESIGN: 'Custom design',
    WHOLESALE: 'Wholesale',
    ABROAD: 'Abroad'
  };
  return map[enumVal] || enumVal;
};

// POST /requests - Public request creation with optional images (up to 4)
router.post('/', publicOrderLimiter, uploadImages.array('images', 4), optionalCustomer, async (req, res, next) => {
  try {
    const { honeypot } = req.body;
    if (honeypot) {
      return res.json({ success: true, request: { id: 'r_0', status: 'NEW' } });
    }

    const { type = 'Custom design', name, phone, notes, details } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return res.status(400).json({ error: 'Please enter a valid phone number' });
    }

    // Parse details: may come as JSON string or key-value object
    let parsedDetails = {};
    if (typeof details === 'string') {
      try {
        parsedDetails = JSON.parse(details);
      } catch {
        parsedDetails = { raw: details };
      }
    } else if (typeof details === 'object' && details !== null) {
      parsedDetails = details;
    } else {
      // Pick dynamic fields from body if sent directly (e.g. q0, q1, etc. or specific field names)
      for (const [k, v] of Object.entries(req.body)) {
        if (!['name', 'phone', 'type', 'notes', 'honeypot', 'username', 'password'].includes(k) && typeof v === 'string') {
          parsedDetails[k] = v;
        }
      }
    }

    // Optional customer registration credentials
    const rawUsername = req.body.username ? String(req.body.username).trim().toLowerCase() : null;
    let passwordHash = null;
    if (req.body.password && String(req.body.password).length >= 4) {
      passwordHash = await bcrypt.hash(String(req.body.password), 10);
    }

    if (rawUsername) {
      const existingUser = await prisma.customer.findFirst({
        where: { username: rawUsername }
      });
      if (existingUser && existingUser.phone !== normalizedPhone) {
        return res.status(400).json({ error: 'Username is already taken. Please choose another username.' });
      }
    }

    // Find or create customer
    let customerId = req.customer?.customerId;
    let customerRecord = null;

    if (!customerId) {
      const existing = await prisma.customer.findUnique({
        where: { phone: normalizedPhone }
      });
      if (existing) {
        customerId = existing.id;
        customerRecord = await prisma.customer.update({
          where: { id: existing.id },
          data: {
            name: name.trim() || existing.name,
            ...(rawUsername ? { username: rawUsername } : {}),
            ...(passwordHash ? { passwordHash } : {}),
            lastLoginAt: new Date()
          }
        });
      } else {
        customerRecord = await prisma.customer.create({
          data: {
            phone: normalizedPhone,
            name: name.trim(),
            ...(rawUsername ? { username: rawUsername } : {}),
            ...(passwordHash ? { passwordHash } : {}),
            lastLoginAt: new Date()
          }
        });
        customerId = customerRecord.id;
      }
    } else {
      if (rawUsername || passwordHash) {
        customerRecord = await prisma.customer.update({
          where: { id: customerId },
          data: {
            ...(rawUsername ? { username: rawUsername } : {}),
            ...(passwordHash ? { passwordHash } : {}),
            lastLoginAt: new Date()
          }
        });
      }
    }

    // Generate JWT token if customer registered with credentials
    let authPayload = null;
    if (customerRecord && (rawUsername || passwordHash || !req.customer)) {
      const token = jwt.sign(
        { customerId: customerRecord.id, phone: customerRecord.phone, username: customerRecord.username, role: 'customer' },
        env.JWT_SECRET,
        { expiresIn: '30d' }
      );
      res.cookie('tc_customer_token', token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000
      });
      authPayload = {
        token,
        customer: {
          id: customerRecord.id,
          phone: customerRecord.phone,
          name: customerRecord.name,
          username: customerRecord.username
        }
      };
    }

    const dbType = typeToEnum(type);

    const request = await prisma.request.create({
      data: {
        type: dbType,
        customerId,
        name: name.trim(),
        phone: normalizedPhone,
        details: parsedDetails,
        notes: notes ? String(notes).trim() : null,
        status: 'NEW'
      }
    });

    // Save uploaded images if any
    const savedImages = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const saved = await storageService.saveImage(file.buffer, file.originalname);
        const img = await prisma.requestImage.create({
          data: {
            requestId: request.id,
            url: saved.url
          }
        });
        savedImages.push(img);
      }
    }

    try {
      await activityService.log('CUSTOMER', `New ${enumToDisplayType(dbType)} request from ${name.trim()}`, customerId);
    } catch (e) {
      // Non-fatal
    }

    // Telegram alert check
    try {
      const settings = await prisma.setting.findFirst();
      if (settings && settings.alertOnRequests) {
        telegramService.notifyNewRequest({
          type: enumToDisplayType(dbType),
          name: name.trim(),
          phone: normalizedPhone,
          details: parsedDetails,
          notes,
          status: 'NEW'
        }).catch(() => {});
      }
    } catch (e) {
      // Non-fatal
    }

    res.status(201).json({
      success: true,
      request: {
        id: request.id,
        type: enumToDisplayType(dbType),
        name: request.name,
        phone: request.phone,
        status: 'New',
        images: savedImages
      },
      auth: authPayload
    });
  } catch (err) {
    next(err);
  }
});

// GET /requests - Admin list requests
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const { type, status, search } = req.query;
    const where = {};

    if (type && type !== 'All') {
      where.type = typeToEnum(type);
    }

    if (status && status !== 'All') {
      const statusMap = {
        'New': 'NEW',
        'Quoted': 'QUOTED',
        'Accepted': 'ACCEPTED',
        'Declined': 'CLOSED',
        'Closed': 'CLOSED',
        'Converted': 'ACCEPTED'
      };
      if (statusMap[status]) where.status = statusMap[status];
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } }
      ];
    }

    const requests = await prisma.request.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        images: true,
        order: true
      }
    });

    const formatted = requests.map(r => {
      const statusDisplay = {
        NEW: 'New',
        QUOTED: 'Quoted',
        ACCEPTED: 'Converted',
        CLOSED: 'Declined'
      }[r.status] || r.status;

      return {
        id: r.id,
        type: enumToDisplayType(r.type),
        name: r.name,
        phone: r.phone,
        d: r.details,
        notes: r.notes,
        status: statusDisplay,
        rawStatus: r.status,
        quote: r.quoteAmount ? Number(r.quoteAmount) : (r.quoteText || ''),
        quoteText: r.quoteText,
        quoteAmount: r.quoteAmount ? Number(r.quoteAmount) : null,
        date: r.createdAt.toISOString().slice(0, 10),
        images: r.images,
        orderCode: r.order?.code || null
      };
    });

    res.json({
      success: true,
      requests: formatted
    });
  } catch (err) {
    next(err);
  }
});

// GET /requests/:id - Single request detail
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const request = await prisma.request.findUnique({
      where: { id },
      include: {
        images: true,
        order: true
      }
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    res.json({
      success: true,
      request: {
        ...request,
        quoteAmount: request.quoteAmount ? Number(request.quoteAmount) : null
      }
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /requests/:id - Admin update request status/notes
router.patch('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const updateData = {};

    if (status !== undefined) {
      const statusMap = {
        'New': 'NEW',
        'Quoted': 'QUOTED',
        'Accepted': 'ACCEPTED',
        'Converted': 'ACCEPTED',
        'Declined': 'CLOSED',
        'Closed': 'CLOSED',
        'NEW': 'NEW',
        'QUOTED': 'QUOTED',
        'ACCEPTED': 'ACCEPTED',
        'CLOSED': 'CLOSED'
      };
      if (statusMap[status]) updateData.status = statusMap[status];
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const updated = await prisma.request.update({
      where: { id },
      data: updateData
    });

    if (updateData.status) {
      await activityService.log('ADMIN', `Request from ${updated.name} updated to ${updated.status}`, req.admin.adminId);
    }

    res.json({ success: true, request: updated });
  } catch (err) {
    next(err);
  }
});

// POST /requests/:id/quote - Admin send quote
router.post('/:id/quote', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quotePrice, quoteText } = req.body;

    const amount = Number(quotePrice);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid quote price in ETB' });
    }

    const updated = await prisma.request.update({
      where: { id },
      data: {
        quoteAmount: amount,
        quoteText: quoteText || `Quote: ${amount.toLocaleString('en')} ETB`,
        status: 'QUOTED'
      }
    });

    await activityService.log('ADMIN', `Quote of ${amount.toLocaleString()} ETB sent to ${updated.name}`, req.admin.adminId);

    res.json({
      success: true,
      request: {
        id: updated.id,
        quote: amount,
        status: 'Quoted'
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /requests/:id/convert - Admin convert request into an order
router.post('/:id/convert', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const request = await prisma.request.findUnique({
      where: { id },
      include: { order: true }
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.order) {
      return res.status(400).json({ error: `Request already converted to order ${request.order.code}` });
    }

    const total = req.body.total 
      ? Number(req.body.total) 
      : (request.quoteAmount ? Number(request.quoteAmount) : 0);

    // Format details description
    let desc = '';
    if (request.details && typeof request.details === 'object') {
      desc = Object.entries(request.details)
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ');
    } else {
      desc = `${enumToDisplayType(request.type)} Order`;
    }

    // Counter for sequential code
    const counter = await prisma.orderCounter.upsert({
      where: { id: 1 },
      update: { lastNumber: { increment: 1 } },
      create: { id: 1, lastNumber: 1 }
    });
    const code = `#${String(counter.lastNumber).padStart(4, '0')}`;

    const [newOrder] = await prisma.$transaction([
      prisma.order.create({
        data: {
          code,
          customerId: request.customerId,
          customerName: request.name,
          customerPhone: request.phone,
          type: request.type,
          description: desc,
          total,
          status: 'RECEIVED',
          paymentStatus: 'UNPAID',
          requestId: request.id,
          notes: request.notes
        }
      }),
      prisma.request.update({
        where: { id: request.id },
        data: { status: 'ACCEPTED' }
      })
    ]);

    const order = newOrder;

    await activityService.log('ADMIN', `Request from ${request.name} became order ${order.code}`, req.admin.adminId);

    res.json({
      success: true,
      order: {
        id: order.code,
        internalId: order.id,
        name: order.customerName,
        total: Number(order.total),
        status: 'Received'
      }
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /requests/:id - Admin delete request
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const request = await prisma.request.findUnique({
      where: { id },
      include: { images: true }
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Clean up images
    for (const img of request.images) {
      await storageService.deleteImage(img.url);
    }

    await prisma.request.delete({ where: { id } });

    await activityService.log('ADMIN', `Request from ${request.name} deleted`, req.admin.adminId);

    res.json({ success: true, message: 'Request deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;

