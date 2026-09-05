/**
 * ADMA — Contrôleur Authentification
 */
import bcrypt   from 'bcryptjs';
import jwt      from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { validationResult } from 'express-validator';
import { query, transaction } from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { sendOTPSms } from '../services/smsService.js';
import { config }     from '../config/env.js';
import { logger }     from '../utils/logger.js';

// ── Helpers ──────────────────────────────────────────────────────
function normalizePhone(phone) {
  const cleaned = phone.replace(/\s/g, '').replace(/[^+\d]/g, '');
  if (cleaned.startsWith('+237') && cleaned.length === 13) return cleaned;
  if (cleaned.startsWith('237')  && cleaned.length === 12)  return `+${cleaned}`;
  if (/^6[5-9]\d{7}$/.test(cleaned))                        return `+237${cleaned}`;
  const e = new Error('Numéro camerounais invalide (format : 6XXXXXXXX)');
  e.statusCode = 400; e.code = 'INVALID_PHONE'; throw e;
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateAccessToken(userId) {
  return jwt.sign({ userId, type: 'access' }, config.jwt.secret, { expiresIn: config.jwt.accessExpires });
}

async function generateRefreshToken(userId, deviceInfo = null) {
  const raw   = uuid();
  const hash  = await bcrypt.hash(raw, 8);
  const exp   = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await query(
    'INSERT INTO refresh_tokens (user_id, token_hash, device_info, expires_at) VALUES (?,?,?,?)',
    [userId, hash, deviceInfo, exp]
  );
  return raw;
}

// ── POST /api/v1/auth/send-otp ───────────────────────────────────
export const sendOTP = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new AppError('Données invalides', 422, 'VALIDATION_ERROR', errors.array());

  const phone = normalizePhone(req.body.phone);

  // Invalider les anciens OTP
  await query("UPDATE otp_codes SET used_at=NOW() WHERE phone=? AND used_at IS NULL AND expires_at>NOW()", [phone]);

  const code    = generateOTP();
  const hash    = await bcrypt.hash(code, 8);
  const expires = new Date(Date.now() + config.otpExpiresMinutes * 60 * 1000);

  await query('INSERT INTO otp_codes (phone, code_hash, expires_at) VALUES (?,?,?)', [phone, hash, expires]);

  await sendOTPSms(phone, code, config.otpExpiresMinutes);

  logger.info(`OTP envoyé à ${phone}`);
  res.json({ success: true, message: 'Code OTP envoyé', data: { phone, expiresAt: expires } });
});

// ── POST /api/v1/auth/verify-otp ────────────────────────────────
export const verifyOTP = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new AppError('Données invalides', 422, 'VALIDATION_ERROR', errors.array());

  const phone      = normalizePhone(req.body.phone);
  const { code, deviceInfo } = req.body;

  const [rows] = await query(
    `SELECT id, code_hash, attempts FROM otp_codes
     WHERE phone=? AND used_at IS NULL AND expires_at>NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [phone]
  );
  if (!rows.length) throw new AppError('Code OTP expiré ou introuvable', 400, 'OTP_EXPIRED');

  const otp = rows[0];
  if (otp.attempts >= config.otpMaxAttempts) {
    throw new AppError('Trop de tentatives. Demandez un nouveau code.', 429, 'OTP_MAX_ATTEMPTS');
  }

  const valid = await bcrypt.compare(code, otp.code_hash);
  if (!valid) {
    await query('UPDATE otp_codes SET attempts=attempts+1 WHERE id=?', [otp.id]);
    const remaining = config.otpMaxAttempts - otp.attempts - 1;
    throw new AppError(`Code incorrect. ${remaining} tentative(s) restante(s).`, 400, 'OTP_INVALID', { remaining });
  }
  await query('UPDATE otp_codes SET used_at=NOW() WHERE id=?', [otp.id]);

  // Trouver ou créer l'utilisateur
  const [existing] = await query('SELECT * FROM users WHERE phone=?', [phone]);
  let user; let isNew = false;

  if (existing.length) {
    user = existing[0];
    if (user.status === 'suspended') throw new AppError('Compte suspendu', 403, 'ACCOUNT_SUSPENDED');
    if (user.status === 'deleted')   throw new AppError('Compte supprimé', 403, 'ACCOUNT_DELETED');
    await query('UPDATE users SET phone_verified=TRUE, last_seen_at=NOW() WHERE id=?', [user.id]);
  } else {
    const [result] = await query('INSERT INTO users (phone, phone_verified) VALUES (?,TRUE)', [phone]);
    await query('INSERT INTO notification_preferences (user_id) VALUES (?)', [result.insertId]);
    const [newUser] = await query('SELECT * FROM users WHERE id=?', [result.insertId]);
    user = newUser[0];
    isNew = true;
  }

  const accessToken  = generateAccessToken(user.id);
  const refreshToken = await generateRefreshToken(user.id, deviceInfo || null);

  res.json({
    success: true,
    message: isNew ? 'Compte créé' : 'Connexion réussie',
    data: {
      isNew,
      accessToken,
      refreshToken,
      user: {
        id:        user.id,
        phone:     user.phone,
        firstName: user.first_name,
        lastName:  user.last_name,
        avatarUrl: user.avatar_url,
      },
    },
  });
});

// ── POST /api/v1/auth/refresh ────────────────────────────────────
export const refreshToken = asyncHandler(async (req, res) => {
  const raw = req.headers['x-refresh-token'] || req.body?.refreshToken;
  if (!raw) throw new AppError('Refresh token manquant', 400, 'MISSING_REFRESH_TOKEN');

  const [rows] = await query(
    'SELECT * FROM refresh_tokens WHERE revoked_at IS NULL AND expires_at>NOW() ORDER BY created_at DESC LIMIT 50'
  );

  let found = null;
  for (const row of rows) {
    if (await bcrypt.compare(raw, row.token_hash)) { found = row; break; }
  }
  if (!found) throw new AppError('Refresh token invalide ou expiré', 401, 'INVALID_REFRESH_TOKEN');

  const [users] = await query('SELECT id, status FROM users WHERE id=? AND status="active"', [found.user_id]);
  if (!users.length) throw new AppError('Compte introuvable', 401, 'USER_NOT_FOUND');

  await query('UPDATE refresh_tokens SET revoked_at=NOW() WHERE id=?', [found.id]);
  const accessToken  = generateAccessToken(found.user_id);
  const refreshToken = await generateRefreshToken(found.user_id);

  res.json({ success: true, data: { accessToken, refreshToken } });
});

// ── POST /api/v1/auth/logout ─────────────────────────────────────
export const logout = asyncHandler(async (req, res) => {
  const raw = req.headers['x-refresh-token'] || req.body?.refreshToken;
  if (raw) {
    const [rows] = await query(
      'SELECT id, token_hash FROM refresh_tokens WHERE revoked_at IS NULL AND expires_at>NOW() LIMIT 50'
    );
    for (const row of rows) {
      if (await bcrypt.compare(raw, row.token_hash)) {
        await query('UPDATE refresh_tokens SET revoked_at=NOW() WHERE id=?', [row.id]);
        break;
      }
    }
  }
  res.json({ success: true, message: 'Déconnecté' });
});

// ── GET /api/v1/auth/me ──────────────────────────────────────────
export const getMe = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      id:        req.user.id,
      phone:     req.user.phone,
      firstName: req.user.first_name,
      lastName:  req.user.last_name,
      avatarUrl: req.user.avatar_url,
    },
  });
});
