import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import { env } from './config/env.js';
import { httpLogger } from './middlewares/logger.js';
import { errorHandler } from './middlewares/errorHandler.js';

import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import requestRoutes from './routes/requests.js';
import customerRoutes from './routes/customers.js';
import settingRoutes from './routes/settings.js';
import dashboardRoutes from './routes/dashboard.js';
import meRoutes from './routes/me.js';
import activityRoutes from './routes/activity.js';
import paymentRoutes from './routes/payments.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security headers with resource sharing for image assets
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS configuration
const allowedOrigins = [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive for local dev & testing
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(httpLogger);

// Static uploads directory
const uploadsPath = path.resolve(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath, {
  maxAge: '1d',
  immutable: true
}));

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/me', meRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/payments', paymentRoutes);

// Serve frontend static build in production
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  const indexPath = path.join(clientDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) next();
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;

