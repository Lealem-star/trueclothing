import express from 'express';
import { prisma } from '../config/prisma.js';
import { requireAdmin } from '../middlewares/auth.js';
import { cleanDigits } from '../utils/phone.js';

const router = express.Router();

// GET /dashboard/stats - Admin dashboard statistics and needs attention items
router.get('/stats', requireAdmin, async (req, res, next) => {
  try {
    const newOrdersCount = await prisma.order.count({ where: { status: 'RECEIVED' } });
    const openRequestsCount = await prisma.request.count({ where: { status: 'NEW' } });
    const inProductionCount = await prisma.order.count({ where: { status: 'IN_PRODUCTION' } });
    const totalCustomers = await prisma.customer.count();

    const newOrders = await prisma.order.findMany({
      where: { status: 'RECEIVED' },
      take: 8,
      orderBy: { createdAt: 'desc' }
    });

    const newRequests = await prisma.request.findMany({
      where: { status: 'NEW' },
      take: 8,
      orderBy: { createdAt: 'desc' }
    });

    const recentLogs = await prisma.activityLog.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' }
    });

    // Build needs attention list
    const needsAttention = [
      ...newOrders.map(o => ({
        id: o.code,
        internalId: o.id,
        kind: 'order',
        title: `${o.code} · ${o.customerName}`,
        subtitle: 'New order',
        status: 'Received',
        date: o.createdAt.toISOString().slice(0, 10)
      })),
      ...newRequests.map(r => {
        const typeMap = {
          CUSTOM_DESIGN: 'Custom design',
          WHOLESALE: 'Wholesale',
          ABROAD: 'Abroad'
        };
        const displayType = typeMap[r.type] || r.type;
        return {
          id: r.id,
          internalId: r.id,
          kind: 'request',
          title: r.name,
          subtitle: `${displayType} request`,
          status: 'New',
          date: r.createdAt.toISOString().slice(0, 10)
        };
      })
    ];

    res.json({
      success: true,
      stats: {
        newOrders: newOrdersCount,
        openRequests: openRequestsCount,
        inProduction: inProductionCount,
        customers: totalCustomers
      },
      needsAttention,
      recentActivity: recentLogs.map(l => l.message)
    });
  } catch (err) {
    next(err);
  }
});

export default router;

