import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { requireAdmin, optionalCustomer } from '../middlewares/auth.js';
import { publicOrderLimiter } from '../middlewares/rateLimiter.js';
import { normalizePhone, cleanDigits } from '../utils/phone.js';
import { activityService } from '../services/activityService.js';
import { telegramService } from '../services/telegramService.js';

const router = express.Router();

const publicOrderSchema = z.object({
  customerName: z.string().min(1, 'Name is required'),
  customerPhone: z.string().min(8, 'Valid phone number is required'),
  username: z.string().min(2, 'Username must be at least 2 characters').optional().nullable(),
  password: z.string().min(4, 'Password must be at least 4 characters').optional().nullable(),
  items: z.array(z.object({
    productId: z.string().min(1, 'Product ID is required'),
    size: z.string().optional().nullable(),
    quantity: z.coerce.number().int().positive().default(1)
  })).min(1, 'At least one item is required'),
  notes: z.string().optional().nullable(),
  honeypot: z.string().optional() // Honeypot field for bot deterrence
});

const adminCreateOrderSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  customerPhone: z.string().min(8, 'Phone number is required'),
  type: z.enum(['READY_MADE', 'CUSTOM_DESIGN', 'WHOLESALE', 'ABROAD']).default('READY_MADE'),
  description: z.string().min(1, 'Description is required'),
  total: z.coerce.number().min(0, 'Total must be non-negative'),
  notes: z.string().optional().nullable()
});

const adminUpdateOrderSchema = z.object({
  status: z.enum(['RECEIVED', 'IN_PRODUCTION', 'SHIPPED', 'DELIVERED']).optional(),
  paymentStatus: z.enum(['UNPAID', 'PARTLY_PAID', 'PAID']).optional(),
  total: z.coerce.number().min(0).optional(),
  notes: z.string().optional().nullable(),
  description: z.string().optional()
});

/**
 * In-memory caches to eliminate cross-continent round-trip latency to TiDB Cloud
 */
let cachedOrderCounter = null;
let productsCache = null;
let productsCacheTime = 0;

export function invalidateProductsCache() {
  productsCache = null;
  productsCacheTime = 0;
}

export async function warmupOrderCaches() {
  try {
    const [counter, products] = await Promise.all([
      prisma.orderCounter.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1, lastNumber: 0 }
      }),
      prisma.product.findMany({
        where: { published: true }
      })
    ]);
    cachedOrderCounter = counter.lastNumber;
    productsCache = products;
    productsCacheTime = Date.now();
  } catch (err) {
    console.warn('Cache warmup note:', err.message);
  }
}

async function getPublishedProducts() {
  const now = Date.now();
  if (productsCache && (now - productsCacheTime < 60000)) {
    return productsCache;
  }
  const products = await prisma.product.findMany({
    where: { published: true }
  });
  productsCache = products;
  productsCacheTime = now;
  return products;
}

/**
 * Generate next monotonic order code like #0001 safely and with 0ms in-memory increment
 */
async function generateOrderCode() {
  if (cachedOrderCounter === null) {
    const counter = await prisma.orderCounter.upsert({
      where: { id: 1 },
      update: { lastNumber: { increment: 1 } },
      create: { id: 1, lastNumber: 1 }
    });
    cachedOrderCounter = counter.lastNumber;
  } else {
    cachedOrderCounter++;
    // Persist counter increment to DB asynchronously in background
    prisma.orderCounter.update({
      where: { id: 1 },
      data: { lastNumber: cachedOrderCounter }
    }).catch(err => console.warn('Order counter async sync warning:', err.message));
  }
  return `#${String(cachedOrderCounter).padStart(4, '0')}`;
}

// POST /orders - Public customer or guest order creation
router.post('/', publicOrderLimiter, optionalCustomer, async (req, res, next) => {
  try {
    const { honeypot } = req.body;
    // Honeypot trap: if filled, quietly return a fake success to fool bots
    if (honeypot) {
      return res.json({ success: true, order: { code: '#0000', status: 'RECEIVED' } });
    }

    const data = publicOrderSchema.parse(req.body);
    const normalizedPhone = normalizePhone(data.customerPhone);

    if (!normalizedPhone) {
      return res.status(400).json({ error: 'Please enter a valid phone number (e.g. 0911223344)' });
    }

    // Retrieve products from memory cache to strictly compute price on the server without DB round-trip
    const allProducts = await getPublishedProducts();
    const productMap = new Map(allProducts.map(p => [p.id, p]));

    let calculatedTotal = 0;
    const orderItemsData = [];
    const descParts = [];

    for (const item of data.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return res.status(400).json({ error: `Product not found or is currently unavailable` });
      }

      const unitPrice = Number(product.price);
      const lineTotal = unitPrice * item.quantity;
      calculatedTotal += lineTotal;

      const sizeLabel = item.size ? ` (${item.size})` : '';
      descParts.push(`${product.nameEn} ×${item.quantity}${sizeLabel}`);

      orderItemsData.push({
        productId: product.id,
        nameSnapshot: product.nameEn,
        size: item.size || null,
        quantity: item.quantity,
        unitPrice: product.price
      });
    }

    // Check username uniqueness if customer is registering
    const cleanUsername = data.username ? data.username.trim().toLowerCase() : null;
    let passwordHash = null;
    if (data.password) {
      passwordHash = await bcrypt.hash(data.password, 10);
    }

    // Find or create customer via single atomic upsert
    let customerId = req.customer?.customerId;
    let customerRecord = null;

    if (!customerId) {
      try {
        customerRecord = await prisma.customer.upsert({
          where: { phone: normalizedPhone },
          update: {
            name: data.customerName,
            ...(cleanUsername ? { username: cleanUsername } : {}),
            ...(passwordHash ? { passwordHash } : {}),
            lastLoginAt: new Date()
          },
          create: {
            phone: normalizedPhone,
            name: data.customerName,
            ...(cleanUsername ? { username: cleanUsername } : {}),
            ...(passwordHash ? { passwordHash } : {}),
            lastLoginAt: new Date()
          }
        });
        customerId = customerRecord.id;
      } catch (upsertErr) {
        if (upsertErr.code === 'P2002') {
          return res.status(400).json({ error: 'Username is already taken. Please choose another username.' });
        }
        throw upsertErr;
      }
    } else {
      // Signed in customer placing order: update credentials only if provided
      if (cleanUsername || passwordHash) {
        try {
          customerRecord = await prisma.customer.update({
            where: { id: customerId },
            data: {
              ...(cleanUsername ? { username: cleanUsername } : {}),
              ...(passwordHash ? { passwordHash } : {}),
              lastLoginAt: new Date()
            }
          });
        } catch (updateErr) {
          if (updateErr.code === 'P2002') {
            return res.status(400).json({ error: 'Username is already taken. Please choose another username.' });
          }
          throw updateErr;
        }
      }
    }

    // Generate JWT token if customer registered or updated with credentials
    let authPayload = null;
    if (customerRecord && (cleanUsername || passwordHash || !req.customer)) {
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

    const code = await generateOrderCode();

    const order = await prisma.order.create({
      data: {
        code,
        customerId,
        customerName: data.customerName,
        customerPhone: normalizedPhone,
        type: 'READY_MADE',
        description: descParts.join(', '),
        total: calculatedTotal,
        status: 'RECEIVED',
        paymentStatus: 'UNPAID',
        notes: data.notes || null,
        items: {
          create: orderItemsData
        }
      }
    });

    // Respond to the client immediately for instantaneous UI transition
    res.status(201).json({
      success: true,
      order: {
        id: order.id,
        code: order.code,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        total: Number(order.total),
        status: order.status,
        description: order.description,
        createdAt: order.createdAt
      },
      auth: authPayload
    });

    // Run auditing and notification in the background without blocking customer
    setImmediate(async () => {
      try {
        await activityService.log('CUSTOMER', `New order ${order.code} from ${data.customerName}`, customerId);
      } catch (e) {}

      try {
        const settings = await prisma.setting.findFirst();
        if (settings && settings.alertOnOrders) {
          await telegramService.notifyNewOrder(order);
        }
      } catch (e) {}
    });
  } catch (err) {
    next(err);
  }
});

// GET /orders - Admin list orders
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const where = {};

    if (status && status !== 'All') {
      const statusMap = {
        'Received': 'RECEIVED',
        'In production': 'IN_PRODUCTION',
        'Shipped': 'SHIPPED',
        'Delivered': 'DELIVERED',
        'RECEIVED': 'RECEIVED',
        'IN_PRODUCTION': 'IN_PRODUCTION',
        'SHIPPED': 'SHIPPED',
        'DELIVERED': 'DELIVERED'
      };
      if (statusMap[status]) {
        where.status = statusMap[status];
      }
    }

    if (search) {
      where.OR = [
        { code: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
        { description: { contains: search } }
      ];
    }

    const take = Math.min(Number(limit) || 50, 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true
        }
      }),
      prisma.order.count({ where })
    ]);

    // Format for client prototype display
    const formatted = orders.map(o => {
      const statusDisplay = {
        RECEIVED: 'Received',
        IN_PRODUCTION: 'In production',
        SHIPPED: 'Shipped',
        DELIVERED: 'Delivered'
      }[o.status] || o.status;

      const payDisplay = {
        UNPAID: 'Unpaid',
        PARTLY_PAID: 'Partly paid',
        PAID: 'Paid'
      }[o.paymentStatus] || o.paymentStatus;

      const typeDisplay = {
        READY_MADE: 'Ready-made',
        CUSTOM_DESIGN: 'Custom design',
        WHOLESALE: 'Wholesale',
        ABROAD: 'Abroad'
      }[o.type] || o.type;

      return {
        id: o.code,
        internalId: o.id,
        name: o.customerName,
        phone: o.customerPhone,
        type: typeDisplay,
        desc: o.description,
        total: Number(o.total),
        status: statusDisplay,
        rawStatus: o.status,
        pay: payDisplay,
        rawPay: o.paymentStatus,
        notes: o.notes,
        date: o.createdAt.toISOString().slice(0, 10),
        items: o.items
      };
    });

    res.json({
      success: true,
      orders: formatted,
      totalCount,
      page: Number(page),
      totalPages: Math.ceil(totalCount / take)
    });
  } catch (err) {
    next(err);
  }
});

// POST /orders/admin - Admin manually create order
router.post('/admin', requireAdmin, async (req, res, next) => {
  try {
    const data = adminCreateOrderSchema.parse(req.body);
    const normalizedPhone = normalizePhone(data.customerPhone) || data.customerPhone;

    const code = await generateOrderCode();

    let customerId = null;
    if (normalizedPhone) {
      const c = await prisma.customer.findUnique({ where: { phone: normalizedPhone } });
      if (c) customerId = c.id;
    }

    const order = await prisma.order.create({
      data: {
        code,
        customerId,
        customerName: data.customerName,
        customerPhone: normalizedPhone,
        type: data.type,
        description: data.description,
        total: data.total,
        status: 'RECEIVED',
        paymentStatus: 'UNPAID',
        notes: data.notes || null
      }
    });

    await activityService.log('ADMIN', `Order ${order.code} added manually for ${order.customerName}`, req.admin.adminId);

    res.status(201).json({
      success: true,
      order: {
        id: order.code,
        internalId: order.id,
        name: order.customerName,
        phone: order.customerPhone,
        type: order.type,
        desc: order.description,
        total: Number(order.total),
        status: 'Received',
        pay: 'Unpaid'
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /orders/:id - Get single order
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id },
          { code: id }
        ]
      },
      include: {
        items: true,
        request: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      success: true,
      order: {
        ...order,
        total: Number(order.total)
      }
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /orders/:id - Admin update order status, payment, total, notes
router.patch('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { code: id }]
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const { status, paymentStatus, total, notes, description } = req.body;
    const updateData = {};

    // Map status strings (handles both display names and enum names)
    if (status !== undefined) {
      const statusMap = {
        'Received': 'RECEIVED',
        'In production': 'IN_PRODUCTION',
        'Shipped': 'SHIPPED',
        'Delivered': 'DELIVERED',
        'RECEIVED': 'RECEIVED',
        'IN_PRODUCTION': 'IN_PRODUCTION',
        'SHIPPED': 'SHIPPED',
        'DELIVERED': 'DELIVERED'
      };
      if (statusMap[status]) updateData.status = statusMap[status];
    }

    if (paymentStatus !== undefined) {
      const payMap = {
        'Unpaid': 'UNPAID',
        'Partly paid': 'PARTLY_PAID',
        'Paid': 'PAID',
        'UNPAID': 'UNPAID',
        'PARTLY_PAID': 'PARTLY_PAID',
        'PAID': 'PAID'
      };
      if (payMap[paymentStatus]) updateData.paymentStatus = payMap[paymentStatus];
    }

    if (total !== undefined && !isNaN(Number(total))) {
      updateData.total = Number(total);
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    const updated = await prisma.order.update({
      where: { id: existing.id },
      data: updateData
    });

    // Write ActivityLog on status or payment change
    if (updateData.status && updateData.status !== existing.status) {
      const displayStatus = {
        RECEIVED: 'Received',
        IN_PRODUCTION: 'In production',
        SHIPPED: 'Shipped',
        DELIVERED: 'Delivered'
      }[updated.status] || updated.status;
      await activityService.log('ADMIN', `Order ${updated.code} is now ${displayStatus}`, req.admin.adminId);
    }

    if (updateData.paymentStatus && updateData.paymentStatus !== existing.paymentStatus) {
      await activityService.log('ADMIN', `Order ${updated.code} payment set to ${updated.paymentStatus}`, req.admin.adminId);
    }

    res.json({
      success: true,
      order: {
        id: updated.code,
        internalId: updated.id,
        name: updated.customerName,
        phone: updated.customerPhone,
        total: Number(updated.total),
        status: updated.status,
        pay: updated.paymentStatus,
        notes: updated.notes
      }
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /orders/:id - Admin delete order
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { code: id }]
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Order not found' });
    }

    await prisma.order.delete({ where: { id: existing.id } });

    await activityService.log('ADMIN', `Order ${existing.code} deleted`, req.admin.adminId);

    res.json({ success: true, message: 'Order deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;

