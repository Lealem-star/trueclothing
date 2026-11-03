import express from 'express';
import { prisma } from '../config/prisma.js';
import { requireAdmin } from '../middlewares/auth.js';
import { activityService } from '../services/activityService.js';

const router = express.Router();

// GET /settings/public - Public store configuration
router.get('/public', async (req, res, next) => {
  try {
    let settings = await prisma.setting.findFirst();
    if (!settings) {
      settings = await prisma.setting.create({
        data: {
          businessName: 'True clothing',
          phone: '0985698888',
          telegramUrl: 't.me/Trueclothing16',
          alertOnOrders: true,
          alertOnRequests: true,
          payTelebirr: true,
          payCbeBirr: true,
          payBank: false
        }
      });
    }

    res.json({
      success: true,
      settings: {
        businessName: settings.businessName,
        phone: settings.phone,
        telegramUrl: settings.telegramUrl,
        payTelebirr: settings.payTelebirr,
        payCbeBirr: settings.payCbeBirr,
        payBank: settings.payBank
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /settings - Admin full settings
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    let settings = await prisma.setting.findFirst();
    if (!settings) {
      settings = await prisma.setting.create({
        data: {
          businessName: 'True clothing',
          phone: '0985698888',
          telegramUrl: 't.me/Trueclothing16',
          alertOnOrders: true,
          alertOnRequests: true,
          payTelebirr: true,
          payCbeBirr: true,
          payBank: false
        }
      });
    }

    res.json({
      success: true,
      settings
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /settings - Admin update settings
router.patch('/', requireAdmin, async (req, res, next) => {
  try {
    const {
      businessName,
      phone,
      telegramUrl,
      alertOnOrders,
      alertOnRequests,
      payTelebirr,
      payCbeBirr,
      payBank
    } = req.body;

    const current = await prisma.setting.findFirst();
    const updateData = {};

    if (businessName !== undefined) updateData.businessName = businessName;
    if (phone !== undefined) updateData.phone = phone;
    if (telegramUrl !== undefined) updateData.telegramUrl = telegramUrl;
    if (alertOnOrders !== undefined) updateData.alertOnOrders = Boolean(alertOnOrders);
    if (alertOnRequests !== undefined) updateData.alertOnRequests = Boolean(alertOnRequests);
    if (payTelebirr !== undefined) updateData.payTelebirr = Boolean(payTelebirr);
    if (payCbeBirr !== undefined) updateData.payCbeBirr = Boolean(payCbeBirr);
    if (payBank !== undefined) updateData.payBank = Boolean(payBank);

    let updated;
    if (current) {
      updated = await prisma.setting.update({
        where: { id: current.id },
        data: updateData
      });
    } else {
      updated = await prisma.setting.create({
        data: {
          ...updateData,
          businessName: businessName || 'True clothing',
          phone: phone || '0985698888',
          telegramUrl: telegramUrl || 't.me/Trueclothing16'
        }
      });
    }

    await activityService.log('ADMIN', 'Settings updated', req.admin.adminId);

    res.json({
      success: true,
      settings: updated
    });
  } catch (err) {
    next(err);
  }
});

export default router;

