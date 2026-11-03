import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function requireAdmin(req, res, next) {
  let token = null;

  if (req.cookies && req.cookies.tc_admin_token) {
    token = req.cookies.tc_admin_token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7);
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication required' });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access only' });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
}

export function requireCustomer(req, res, next) {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7);
  } else if (req.cookies && req.cookies.tc_customer_token) {
    token = req.cookies.tc_customer_token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Customer sign in required' });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (decoded.role !== 'customer') {
      return res.status(403).json({ error: 'Forbidden: Customer access only' });
    }
    req.customer = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
  }
}

export function optionalCustomer(req, res, next) {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7);
  } else if (req.cookies && req.cookies.tc_customer_token) {
    token = req.cookies.tc_customer_token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      if (decoded.role === 'customer') {
        req.customer = decoded;
      }
    } catch (e) {
      // Ignored for optional
    }
  }
  next();
}

