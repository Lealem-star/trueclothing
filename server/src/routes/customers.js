import express from 'express';
import { prisma } from '../config/prisma.js';
import { requireAdmin } from '../middlewares/auth.js';
import { cleanDigits, formatPhone } from '../utils/phone.js';

const router = express.Router();

// GET /customers - Derived customer list from orders, requests, and Customer records
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const { search } = req.query;

    const [orders, requests, customers] = await Promise.all([
      prisma.order.findMany({
        select: {
          code: true,
          customerName: true,
          customerPhone: true,
          createdAt: true
        }
      }),
      prisma.request.findMany({
        select: {
          name: true,
          phone: true,
          createdAt: true
        }
      }),
      prisma.customer.findMany({
        select: {
          id: true,
          name: true,
          phone: true,
          lastLoginAt: true
        }
      })
    ]);

    const map = new Map();

    // Index existing customers
    for (const c of customers) {
      const ph = cleanDigits(c.phone);
      map.set(ph, {
        id: c.id,
        ph,
        phone: c.phone,
        name: c.name || '',
        o: 0,
        r: 0,
        last: c.lastLoginAt ? c.lastLoginAt.toISOString().slice(0, 10) : ''
      });
    }

    // Process orders
    for (const o of orders) {
      const ph = cleanDigits(o.customerPhone);
      let entry = map.get(ph);
      if (!entry) {
        entry = {
          id: ph,
          ph,
          phone: o.customerPhone,
          name: o.customerName || '',
          o: 0,
          r: 0,
          last: ''
        };
        map.set(ph, entry);
      }
      entry.o++;
      if (o.customerName && !entry.name) entry.name = o.customerName;
      const orderDate = o.createdAt.toISOString().slice(0, 10);
      if (!entry.last || orderDate > entry.last) entry.last = orderDate;
    }

    // Process requests
    for (const r of requests) {
      const ph = cleanDigits(r.phone);
      let entry = map.get(ph);
      if (!entry) {
        entry = {
          id: ph,
          ph,
          phone: r.phone,
          name: r.name || '',
          o: 0,
          r: 0,
          last: ''
        };
        map.set(ph, entry);
      }
      entry.r++;
      if (r.name && !entry.name) entry.name = r.name;
      const reqDate = r.createdAt.toISOString().slice(0, 10);
      if (!entry.last || reqDate > entry.last) entry.last = reqDate;
    }

    let customerList = Array.from(map.values());

    if (search) {
      const q = search.toLowerCase();
      customerList = customerList.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.ph.includes(q)
      );
    }

    // Sort by most orders + requests
    customerList.sort((a, b) => (b.o + b.r) - (a.o + a.r));

    res.json({
      success: true,
      customers: customerList
    });
  } catch (err) {
    next(err);
  }
});

// GET /customers/:phone - Customer detail with all their orders & requests
router.get('/:phone', requireAdmin, async (req, res, next) => {
  try {
    const rawPhone = req.params.phone;
    const phDigits = cleanDigits(rawPhone);

    const [orders, requests, customer] = await Promise.all([
      prisma.order.findMany({
        where: {
          OR: [
            { customerPhone: { contains: phDigits } },
            { customerPhone: rawPhone }
          ]
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.request.findMany({
        where: {
          OR: [
            { phone: { contains: phDigits } },
            { phone: rawPhone }
          ]
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.customer.findFirst({
        where: {
          OR: [
            { phone: { contains: phDigits } },
            { phone: rawPhone }
          ]
        }
      })
    ]);

    const name = customer?.name || orders[0]?.customerName || requests[0]?.name || 'Customer';
    const phone = customer?.phone || orders[0]?.customerPhone || requests[0]?.phone || rawPhone;

    const statusMap = {
      RECEIVED: 'Received',
      IN_PRODUCTION: 'In production',
      SHIPPED: 'Shipped',
      DELIVERED: 'Delivered'
    };

    const typeMap = {
      READY_MADE: 'Ready-made',
      CUSTOM_DESIGN: 'Custom design',
      WHOLESALE: 'Wholesale',
      ABROAD: 'Abroad'
    };

    res.json({
      success: true,
      customer: {
        name,
        phone,
        cleanPhone: cleanDigits(phone),
        formattedPhone: formatPhone(phone),
        orders: orders.map(o => ({
          id: o.code,
          internalId: o.id,
          type: typeMap[o.type] || o.type,
          desc: o.description,
          total: Number(o.total),
          status: statusMap[o.status] || o.status,
          date: o.createdAt.toISOString().slice(0, 10)
        })),
        requests: requests.map(r => ({
          id: r.id,
          type: typeMap[r.type] || r.type,
          status: r.status === 'NEW' ? 'New' : r.status === 'QUOTED' ? 'Quoted' : r.status === 'ACCEPTED' ? 'Converted' : 'Declined',
          date: r.createdAt.toISOString().slice(0, 10),
          details: r.details
        }))
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;

