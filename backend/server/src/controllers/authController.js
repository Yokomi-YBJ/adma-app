/**
 * ADMA — Contrôleur Authentification
 */
import crypto   from 'crypto';
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
  if (/^6[4-9]\d{7}$/.test(cleaned))                        return `+237${cleaned}`;
  const e = new Error('Numéro camerounais invalide. Plages mobiles acceptées : 64X, 65X, 66X, 67X, 68X, 69X');
  e.statusCode = 400; e.code = 'INVALID_PHONE'; throw e;
}

function generateOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateAccessToken(userId) {
  return jwt.sign({ userId, type: 'access' }, config.jwt.secret, { expiresIn: config.jwt.accessExpires });
}

async function generateRefreshToken(userId, deviceInfo = null) {
  const raw   = uuid();
  const hash  = hashRefreshToken(raw);
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

  // Invalider tous les anciens OTP non utilisés pour ce numéro
  const [invalidateResult] = await query(
    `UPDATE otp_codes
     SET used_at = NOW()
     WHERE phone = ?
       AND used_at IS NULL`,
    [phone]
  );

  if (invalidateResult.affectedRows > 0) {
    logger.debug('sendOTP: anciens OTP invalidés', { phone, count: invalidateResult.affectedRows });
  }

  const code    = generateOTP();
  const hash    = await bcrypt.hash(code, 8);
  const expires = new Date(Date.now() + config.otpExpiresMinutes * 60 * 1000);

  await query(
    'INSERT INTO otp_codes (phone, code_hash, expires_at) VALUES (?,?,?)',
    [phone, hash, expires]
  );

  await sendOTPSms(phone, code, config.otpExpiresMinutes);

  logger.info('sendOTP: OTP envoyé', {
    phone,
    expiresInMinutes: config.otpExpiresMinutes,
    expiresAt: expires.toISOString(),
  });

  res.json({
    success: true,
    message: 'Code OTP envoyé',
    data: { phone, expiresAt: expires },
  });
});

// ── POST /api/v1/auth/verify-otp ─────────────────────────────────
export const verifyOTP = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new AppError('Données invalides', 422, 'VALIDATION_ERROR', errors.array());

  const phone = normalizePhone(req.body.phone);
  const { code, deviceInfo } = req.body;

  logger.debug('verifyOTP: début', {
    phone,
    codeLength: String(code || '').length,
    codeType:   typeof code,
  });

  // ── Transaction atomique : SELECT FOR UPDATE + UPDATE ──
  // Empêche deux requêtes concurrentes de traiter le même OTP
  const result = await transaction(async (conn) => {
    const [rows] = await conn.execute(
      `SELECT id, code_hash, attempts, expires_at, created_at
       FROM otp_codes
       WHERE phone = ?
         AND used_at IS NULL
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [phone]
    );

    if (!rows.length) {
      return { ok: false, reason: 'NO_OTP' };
    }

    const otp = rows[0];

    // OTP déjà bloqué (attempts atteint le max lors d'un précédent appel)
    if (otp.attempts >= config.otpMaxAttempts) {
      await conn.execute('UPDATE otp_codes SET used_at = NOW() WHERE id = ?', [otp.id]);
      return { ok: false, reason: 'MAX_ATTEMPTS', otpId: otp.id };
    }

    const codeStr = String(code || '').trim();
    const valid   = await bcrypt.compare(codeStr, otp.code_hash);

    // ── Code incorrect ──
    if (!valid) {
      await conn.execute('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?', [otp.id]);
      const remaining = config.otpMaxAttempts - otp.attempts - 1;

      // Si c'était la dernière tentative, on invalide tout de suite
      if (remaining <= 0) {
        await conn.execute('UPDATE otp_codes SET used_at = NOW() WHERE id = ?', [otp.id]);
      }

      return {
        ok: false,
        reason: 'INVALID',
        otpId: otp.id,
        attemptsBefore: otp.attempts,
        remaining,
      };
    }

    // ── Code valide ──
    await conn.execute('UPDATE otp_codes SET used_at = NOW() WHERE id = ?', [otp.id]);
    return { ok: true, otpId: otp.id };
  });

  // ── Gestion des cas d'échec ──
  if (!result.ok) {
    switch (result.reason) {
      case 'NO_OTP':
        logger.warn('verifyOTP: aucun OTP actif', { phone });
        throw new AppError('Code OTP expiré ou introuvable', 400, 'OTP_EXPIRED');

      case 'MAX_ATTEMPTS':
        logger.warn('verifyOTP: OTP déjà bloqué, invalidé', { phone, otpId: result.otpId });
        throw new AppError(
          'Trop de tentatives. Demandez un nouveau code.',
          429,
          'OTP_MAX_ATTEMPTS'
        );

      case 'INVALID':
        logger.info('verifyOTP: code incorrect', {
          phone,
          otpId: result.otpId,
          attemptsBefore: result.attemptsBefore,
          attemptsAfter:  result.attemptsBefore + 1,
          remaining:      result.remaining,
        });
        throw new AppError(
          result.remaining > 0
            ? `Code incorrect. ${result.remaining} tentative(s) restante(s).`
            : 'Code incorrect. Demandez un nouveau code.',
          400,
          'OTP_INVALID',
          { remaining: Math.max(0, result.remaining) }
        );
    }
  }

  // ── Succès ──
  logger.info('verifyOTP: succès', { phone, otpId: result.otpId });

  // Trouver ou créer l'utilisateur
  const [existing] = await query('SELECT * FROM users WHERE phone = ?', [phone]);
  let user;
  let isNew = false;

  if (existing.length) {
    user = existing[0];
    if (user.status === 'suspended') throw new AppError('Compte suspendu', 403, 'ACCOUNT_SUSPENDED');
    if (user.status === 'deleted')   throw new AppError('Compte supprimé', 403, 'ACCOUNT_DELETED');

    await query(
      'UPDATE users SET phone_verified = TRUE, last_seen_at = NOW() WHERE id = ?',
      [user.id]
    );
  } else {
    const [insertResult] = await query(
      'INSERT INTO users (phone, phone_verified) VALUES (?, TRUE)',
      [phone]
    );
    await query('INSERT INTO notification_preferences (user_id) VALUES (?)', [insertResult.insertId]);

    const [newUser] = await query('SELECT * FROM users WHERE id = ?', [insertResult.insertId]);
    user = newUser[0];
    isNew = true;

    logger.info('verifyOTP: nouvel utilisateur créé', { userId: user.id, phone });
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

  const shaHash = hashRefreshToken(raw);

  // Recherche directe indexée O(1) < 1ms
  const [rows] = await query(
    'SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > NOW() LIMIT 1',
    [shaHash]
  );

  let found = rows[0] || null;

  // Fallback rétrocompatible pour les tokens legacy créés avant la migration SHA-256
  if (!found) {
    const [legacyRows] = await query(
      'SELECT * FROM refresh_tokens WHERE revoked_at IS NULL AND expires_at > NOW() AND token_hash LIKE "$2%" LIMIT 20'
    );
    for (const row of legacyRows) {
      if (await bcrypt.compare(raw, row.token_hash)) {
        found = row;
        break;
      }
    }
  }

  if (!found) throw new AppError('Session expirée ou invalide. Veuillez vous reconnecter.', 401, 'INVALID_REFRESH_TOKEN');

  const [users] = await query(
    'SELECT id, status FROM users WHERE id = ? AND status = "active"',
    [found.user_id]
  );
  if (!users.length) throw new AppError('Compte introuvable ou suspendu', 401, 'USER_NOT_FOUND');

  await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?', [found.id]);

  const accessToken  = generateAccessToken(found.user_id);
  const newRefresh   = await generateRefreshToken(found.user_id);

  res.json({ success: true, data: { accessToken, refreshToken: newRefresh } });
});

// ── POST /api/v1/auth/logout ─────────────────────────────────────
export const logout = asyncHandler(async (req, res) => {
  const raw = req.headers['x-refresh-token'] || req.body?.refreshToken;
  if (raw) {
    const shaHash = hashRefreshToken(raw);
    const [result] = await query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ?',
      [shaHash]
    );

    if (result.affectedRows === 0) {
      // Fallback legacy bcrypt
      const [legacyRows] = await query(
        'SELECT id, token_hash FROM refresh_tokens WHERE revoked_at IS NULL AND expires_at > NOW() AND token_hash LIKE "$2%" LIMIT 20'
      );
      for (const row of legacyRows) {
        if (await bcrypt.compare(raw, row.token_hash)) {
          await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?', [row.id]);
          break;
        }
      }
    }
  }
  res.json({ success: true, message: 'Déconnecté avec succès' });
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