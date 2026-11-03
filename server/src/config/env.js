import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET || 'dev_jwt_secret_true_clothing_123',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_ADMIN_CHAT_ID: process.env.TELEGRAM_ADMIN_CHAT_ID || '',
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  SMS_PROVIDER: process.env.SMS_PROVIDER || 'console',
  CHAPA_PUBLIC_KEY: process.env.CHAPA_PUBLIC_KEY || '',
  CHAPA_SECRET_KEY: process.env.CHAPA_SECRET_KEY || '',
  NODE_ENV: process.env.NODE_ENV || 'development'
};

