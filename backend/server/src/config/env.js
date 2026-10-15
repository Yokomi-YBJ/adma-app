import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join }  from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

function requireEnv(key, fallback) {
  const value = process.env[key] ?? fallback;
  if ((value === undefined || value === '') && process.env.NODE_ENV === 'production') {
    throw new Error(`Variable d'environnement requise: ${key}`);
  }
  return value ?? '';
}

export const config = {
  env:     process.env.NODE_ENV || 'development',
  port:    parseInt(process.env.PORT, 10) || 5000,
  apiUrl:  process.env.API_URL  || 'http://localhost:5000',

  db: {
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT, 10) || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    name:     process.env.DB_NAME     || 'adma_db',
    ssl:      process.env.DB_SSL      === 'true',
  },

  jwt: {
    secret:        requireEnv('JWT_SECRET',       'dev_jwt_secret_change_in_prod'),
    accessExpires: process.env.JWT_ACCESS_EXPIRES  || '15m',
    refreshExpires:process.env.JWT_REFRESH_EXPIRES || '30d',
    adminSecret:   requireEnv('ADMIN_JWT_SECRET',  'dev_admin_secret_change_in_prod'),
    adminExpires:  process.env.ADMIN_JWT_EXPIRES   || '8h',
  },

  // ── MboaSMS (SMS OTP mobile — Cameroun) ─────────────────────────
  mboaSMS: {
    apiKey:   requireEnv('MBOASMS_API_KEY', ''),
    senderId: process.env.MBOASMS_SENDER_ID || '', // vide = sender par défaut du compte
  },

  cloudinary: {
    cloudName: requireEnv('CLOUDINARY_CLOUD_NAME', ''),
    apiKey:    requireEnv('CLOUDINARY_API_KEY',    ''),
    apiSecret: requireEnv('CLOUDINARY_API_SECRET', ''),
  },

  // ── GeniusPay (Mobile Money Afrique — XAF Cameroun) ─────────────
  geniusPay: {
    apiKey:        requireEnv('GENIUSPAY_API_KEY',        ''),
    secretKey:     requireEnv('GENIUSPAY_SECRET_KEY',     ''),
    baseUrl:       process.env.GENIUSPAY_BASE_URL || 'https://geniuspay.ci/api/v1/merchant',
    webhookSecret: requireEnv('GENIUSPAY_WEBHOOK_SECRET', ''),
  },

  expo: {
    accessToken: process.env.EXPO_ACCESS_TOKEN || '',
  },

  // ── Resend (UNIQUEMENT pour l'auth admin) ───────────────────────
  resend: {
    apiKey:    requireEnv('RESEND_API_KEY',   ''),
    fromEmail: process.env.RESEND_FROM_EMAIL || 'noreply@adma.cm',
  },

  bcryptRounds:      parseInt(process.env.BCRYPT_ROUNDS,       10) || 12,
  otpExpiresMinutes: parseInt(process.env.OTP_EXPIRES_MINUTES, 10) || 10,
  otpMaxAttempts:    parseInt(process.env.OTP_MAX_ATTEMPTS,    10) || 3,
};