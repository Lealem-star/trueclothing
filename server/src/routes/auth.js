import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { requireAdmin } from '../middlewares/auth.js';
import { otpRequestLimiter } from '../middlewares/rateLimiter.js';
import { smsService } from '../services/smsService.js';
import { activityService } from '../services/activityService.js';
import { normalizePhone } from '../utils/phone.js';

const router = express.Router();

const adminLoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters')
});

const otpRequestSchema = z.object({
  phone: z.string().min(8, 'Phone number is required')
});

const otpVerifySchema = z.object({
  phone: z.string().min(8, 'Phone number is required'),
  code: z.string().length(6, 'Code must be 6 digits')
});

const customerLoginSchema = z.object({
  identifier: z.string().min(1, 'Username or phone is required'),
  password: z.string().min(1, 'Password is required')
});

const customerRegisterSchema = z.object({
  name: z.string().min(1, 'Full name is required'),
  phone: z.string().min(8, 'Valid phone number is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(4, 'Password must be at least 4 characters')
});

// Admin Login
router.post('/admin/login', async (req, res, next) => {
  try {
    const { username, password } = adminLoginSchema.parse(req.body);
    const trimmed = username.trim();

    const admin = await prisma.adminUser.findFirst({
      where: {
        OR: [
          { username: trimmed },
          { username: trimmed.toLowerCase() }
        ]
      }
    });

    if (!admin) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { adminId: admin.id, username: admin.username, role: 'admin' },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set HTTP-only secure cookie
    res.cookie('tc_admin_token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    await activityService.log('ADMIN', `Admin ${admin.username} logged in`, admin.id);

    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username
      }
    });
  } catch (err) {
    next(err);
  }
});

// Admin Logout
router.post('/admin/logout', (req, res) => {
  res.clearCookie('tc_admin_token');
  res.json({ success: true, message: 'Logged out successfully' });
});

// Admin Me
router.get('/admin/me', requireAdmin, async (req, res, next) => {
  try {
    const admin = await prisma.adminUser.findUnique({
      where: { id: req.admin.adminId },
      select: { id: true, username: true, createdAt: true }
    });

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.json({ admin });
  } catch (err) {
    next(err);
  }
});

// Admin Change Password
router.post('/admin/change-password', requireAdmin, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const admin = await prisma.adminUser.findUnique({
      where: { id: req.admin.adminId }
    });

    if (!admin) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    const match = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!match) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { passwordHash: newHash }
    });

    await activityService.log('ADMIN', `Admin ${admin.username} changed password`, admin.id);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
});

// Customer: Request OTP
router.post('/otp/request', otpRequestLimiter, async (req, res, next) => {
  try {
    const { phone: rawPhone } = otpRequestSchema.parse(req.body);
    const normalizedPhone = normalizePhone(rawPhone);

    if (!normalizedPhone) {
      return res.status(400).json({ error: 'Please enter a valid phone number (e.g. 0911223344)' });
    }

    // Generate 6 digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(code, 8);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Clean up old expired codes for this phone
    await prisma.otpCode.deleteMany({
      where: {
        phone: normalizedPhone,
        expiresAt: { lt: new Date() }
      }
    });

    // Save OTP
    await prisma.otpCode.create({
      data: {
        phone: normalizedPhone,
        codeHash,
        expiresAt
      }
    });

    // Send via SMS service (logs to console in dev)
    await smsService.sendOtp(normalizedPhone, code);

    res.json({
      success: true,
      message: 'Verification code sent',
      phone: normalizedPhone,
      // Provide preview code in development for instant pair-programming/testing verification
      ...(env.NODE_ENV === 'development' || env.SMS_PROVIDER === 'console' ? { devCode: code } : {})
    });
  } catch (err) {
    next(err);
  }
});

// Customer: Verify OTP
router.post('/otp/verify', async (req, res, next) => {
  try {
    const { phone: rawPhone, code } = otpVerifySchema.parse(req.body);
    const normalizedPhone = normalizePhone(rawPhone);

    if (!normalizedPhone) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        phone: normalizedPhone,
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!otpRecord) {
      return res.status(400).json({ error: 'Verification code expired or not found. Please request a new one.' });
    }

    if (otpRecord.attempts >= 5) {
      return res.status(400).json({ error: 'Too many failed attempts. Please request a new code.' });
    }

    const isValid = await bcrypt.compare(code, otpRecord.codeHash);
    if (!isValid) {
      await prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } }
      });
      return res.status(400).json({ error: 'Invalid code. Please try again.' });
    }

    // Mark code as used
    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { usedAt: new Date() }
    });

    // Upsert Customer
    const customer = await prisma.customer.upsert({
      where: { phone: normalizedPhone },
      update: { lastLoginAt: new Date() },
      create: {
        phone: normalizedPhone,
        lastLoginAt: new Date()
      }
    });

    // Generate JWT
    const token = jwt.sign(
      { customerId: customer.id, phone: customer.phone, role: 'customer' },
      env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.cookie('tc_customer_token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      token,
      customer: {
        id: customer.id,
        phone: customer.phone,
        name: customer.name,
        username: customer.username
      }
    });
  } catch (err) {
    next(err);
  }
});

// Customer: Password Login (via Username or Phone)
router.post('/customer/login', async (req, res, next) => {
  try {
    const { identifier, password } = customerLoginSchema.parse(req.body);
    const cleanId = identifier.trim();
    const normalizedPhone = normalizePhone(cleanId);

    const customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { username: cleanId.toLowerCase() },
          { username: cleanId },
          ...(normalizedPhone ? [{ phone: normalizedPhone }] : [])
        ]
      }
    });

    if (!customer) {
      return res.status(401).json({ error: 'Account not found. Please check your username/phone or register.' });
    }

    if (!customer.passwordHash) {
      return res.status(400).json({
        error: 'No password set for this account yet. Please sign in with SMS verification code to set your password.'
      });
    }

    const valid = await bcrypt.compare(password, customer.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    await prisma.customer.update({
      where: { id: customer.id },
      data: { lastLoginAt: new Date() }
    });

    const token = jwt.sign(
      { customerId: customer.id, phone: customer.phone, username: customer.username, role: 'customer' },
      env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.cookie('tc_customer_token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      token,
      customer: {
        id: customer.id,
        phone: customer.phone,
        name: customer.name,
        username: customer.username
      }
    });
  } catch (err) {
    next(err);
  }
});

// Customer: Register
router.post('/customer/register', async (req, res, next) => {
  try {
    const { name, phone, username, password } = customerRegisterSchema.parse(req.body);
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return res.status(400).json({ error: 'Please enter a valid phone number (e.g. 0911223344)' });
    }

    const cleanUsername = username.trim().toLowerCase();

    // Check if username already taken
    const existingUser = await prisma.customer.findFirst({
      where: { username: cleanUsername }
    });
    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken. Please choose another username.' });
    }

    // Check if phone number already has a registered password
    const existingPhone = await prisma.customer.findUnique({
      where: { phone: normalizedPhone }
    });

    const passwordHash = await bcrypt.hash(password, 10);
    let customer;

    if (existingPhone) {
      customer = await prisma.customer.update({
        where: { id: existingPhone.id },
        data: {
          name: name.trim(),
          username: cleanUsername,
          passwordHash,
          lastLoginAt: new Date()
        }
      });
    } else {
      customer = await prisma.customer.create({
        data: {
          name: name.trim(),
          phone: normalizedPhone,
          username: cleanUsername,
          passwordHash,
          lastLoginAt: new Date()
        }
      });
    }

    const token = jwt.sign(
      { customerId: customer.id, phone: customer.phone, username: customer.username, role: 'customer' },
      env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.cookie('tc_customer_token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      success: true,
      token,
      customer: {
        id: customer.id,
        phone: customer.phone,
        name: customer.name,
        username: customer.username
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;

