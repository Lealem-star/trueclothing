import express from 'express';
import { prisma } from '../config/prisma.js';
import { requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const logs = await prisma.activityLog.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      logs
    });
  } catch (err) {
    next(err);
  }
});

export default router;

