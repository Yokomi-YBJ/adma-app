/**
 * ADMA — Contrôleur Authentification Admin
 * ✅ Anti-brute-force (lockout 15 min après 5 échecs par email+IP)
 * ✅ Template email pro via mailService.sendAdminOTP()
 */
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { query } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { sendAdminOTP } from '../../services/mailService.js';

const OTP_MIN = 10;
const MAX_OTP_ATTEMPTS = 3;

// ── Anti-brute-force : compteur d'échecs en mémoire ────────────
const loginAttempts = new Map();
const otpVerifyAttempts = new Map();
const LOCKOUT_THRESHOLD   = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

function isLocked(email, ip) {
  const key   = `${email}:${ip}`;
  const entry = loginAttempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.firstAt > LOCKOUT_DURATION_MS) {
    loginAttempts.delete(key);
    return false;
  }
  return entry.count >= LOCKOUT_THRESHOLD;
}

function recordFailure(email, ip) {
  const key   = `${email}:${ip}`;
  const entry = loginAttempts.get(key) || { count: 0, firstAt: Date.now() };
  entry.count++;
  loginAttempts.set(key, entry);
}

function recordSuccess(email, ip) {
  loginAttempts.delete(`${email}:${ip}`);
}

function recordOtpFailure(adminId) {
  const entry = otpVerifyAttempts.get(adminId) || { count: 0, firstAt: Date.now() };
  entry.count++;
  otpVerifyAttempts.set(adminId, entry);
  return entry.count;
}

function clearOtpAttempts(adminId) {
  otpVerifyAttempts.delete(adminId);
}

// Nettoyage périodique
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of loginAttempts.entries()) {
    if (now - entry.firstAt > LOCKOUT_DURATION_MS) {
      loginAttempts.delete(key);
    }
  }
  for (const [key, entry] of otpVerifyAttempts.entries()) {
    if (now - entry.firstAt > OTP_MIN * 60 * 1000) {
      otpVerifyAttempts.delete(key);
    }
  }
}, 30 * 60 * 1000);

/**
 * Connexion initiale (envoi OTP par email)
 */
export const login = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Données invalides', 400, 'VALIDATION_ERROR', errors.array()));
  }

  const { email, password } = req.body;

  // ⚡ Anti-brute-force
  if (isLocked(email, req.ip)) {
    logger.warn('Admin login bloqué (trop de tentatives)', { email, ip: req.ip });
    return next(new AppError(
      'Trop de tentatives. Réessayez dans 15 minutes.',
      429,
      'ADMIN_LOCKED_OUT'
    ));
  }

  try {
    const [rows] = await query('SELECT * FROM admins WHERE email=? AND is_active=TRUE', [email]);
    if (!rows.length) {
      recordFailure(email, req.ip);
      logger.warn('Admin login échoué (email inconnu)', { email, ip: req.ip });
      throw new AppError('Identifiants invalides', 401, 'INVALID_CREDENTIALS');
    }

    const admin = rows[0];
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      recordFailure(email, req.ip);
      logger.warn('Admin login échoué (mot de passe)', { email, ip: req.ip });
      throw new AppError('Identifiants invalides', 401, 'INVALID_CREDENTIALS');
    }

    // ✅ Succès → reset compteur
    recordSuccess(email, req.ip);

    // ── Génération OTP ──────────────────────────────────────────
    const code    = crypto.randomInt(100000, 1000000).toString();
    const hash    = await bcrypt.hash(code, 10);
    const expires = new Date(Date.now() + OTP_MIN * 60 * 1000);

    await query('DELETE FROM admin_otp_codes WHERE admin_id=?', [admin.id]);
    await query(
      'INSERT INTO admin_otp_codes (admin_id, code_hash, expires_at) VALUES (?,?,?)',
      [admin.id, hash, expires]
    );

    // ── Envoi email via mailService ─────────────────────────────
    if (process.env.NODE_ENV === 'development') {
      logger.warn(`[DEV] Admin OTP pour ${admin.email} : ${code}`);
    }

    if (process.env.NODE_ENV !== 'test') {
      const result = await sendAdminOTP({
        to:             admin.email,
        adminName:      admin.full_name,
        code,
        expiresMinutes: OTP_MIN,
      });

      if (!result.ok) {
        logger.error(`Envoi OTP admin échoué : ${result.reason}`);
        throw new AppError('Impossible d\'envoyer le code par email', 500, 'EMAIL_SEND_FAILED');
      }
    } else {
      logger.warn(`[TEST] Admin OTP pour ${email}: ${code}`);
    }

    res.json({
      success: true,
      message: 'Code de vérification envoyé par email',
      data: { adminId: admin.id },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Vérification OTP et remise du token JWT
 */
export const verifyOTP = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Données invalides', 400, 'VALIDATION_ERROR', errors.array()));
  }

  const { adminId, code } = req.body;

  try {
    const [rows] = await query(
      'SELECT * FROM admin_otp_codes WHERE admin_id=? AND used_at IS NULL AND expires_at>NOW() ORDER BY created_at DESC LIMIT 1',
      [adminId]
    );

    if (!rows.length) {
      throw new AppError('Code expiré ou invalide', 400, 'OTP_EXPIRED');
    }

    const valid = await bcrypt.compare(code, rows[0].code_hash);
    if (!valid) {
      const attempts = recordOtpFailure(adminId);
      const remaining = Math.max(0, MAX_OTP_ATTEMPTS - attempts);
      if (remaining === 0) {
        await query('UPDATE admin_otp_codes SET used_at=NOW() WHERE id=?', [rows[0].id]);
        clearOtpAttempts(adminId);
        logger.warn('Admin OTP invalidé après trop de tentatives infructueuses', { adminId });
        throw new AppError('Trop de tentatives incorrectes. Le code a été invalidé.', 429, 'OTP_MAX_ATTEMPTS');
      }
      throw new AppError(`Code incorrect. ${remaining} tentative(s) restante(s).`, 400, 'OTP_INVALID');
    }

    clearOtpAttempts(adminId);
    await query('UPDATE admin_otp_codes SET used_at=NOW() WHERE id=?', [rows[0].id]);

    const [admins] = await query(
      'SELECT id, email, full_name FROM admins WHERE id=? AND is_active=TRUE',
      [adminId]
    );
    if (!admins.length) {
      throw new AppError('Administrateur introuvable ou inactif', 404, 'ADMIN_NOT_FOUND');
    }

    const admin = admins[0];
    await query('UPDATE admins SET last_login_at=NOW() WHERE id=?', [admin.id]);

    const token = jwt.sign(
      { adminId: admin.id, type: 'admin' },
      config.jwt.adminSecret,
      { expiresIn: config.jwt.adminExpires }
    );

    await query('INSERT INTO admin_logs (admin_id, action) VALUES (?,?)', [admin.id, 'login']);

    res.json({
      success: true,
      data: {
        token,
        admin: {
          id:       admin.id,
          email:    admin.email,
          fullName: admin.full_name,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Récupérer les infos de l'admin connecté
 */
export const getMe = async (req, res) => {
  res.json({ success: true, data: req.admin });
};