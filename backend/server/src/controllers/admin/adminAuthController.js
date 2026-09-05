/**
 * ADMA — Contrôleur Authentification Admin
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { query } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { Resend } from 'resend';

const resend = new Resend(config.resend.apiKey);
const OTP_MIN = 10;

/**
 * Connexion initiale (envoi OTP par email)
 */
export const login = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Données invalides', 400, 'VALIDATION_ERROR', errors.array()));
  }

  const { email, password } = req.body;
  
  try {
    const [rows] = await query('SELECT * FROM admins WHERE email=? AND is_active=TRUE', [email]);
    if (!rows.length) {
      throw new AppError('Identifiants invalides', 401, 'INVALID_CREDENTIALS');
    }

    const admin = rows[0];
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      throw new AppError('Identifiants invalides', 401, 'INVALID_CREDENTIALS');
    }

    // Génération OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hash = await bcrypt.hash(code, 10);
    const expires = new Date(Date.now() + OTP_MIN * 60 * 1000);

    // Nettoyage et insertion OTP
    await query('DELETE FROM admin_otp_codes WHERE admin_id=?', [admin.id]);
    await query('INSERT INTO admin_otp_codes (admin_id, code_hash, expires_at) VALUES (?,?,?)', [admin.id, hash, expires]);

    // Envoi de l'email
    if (process.env.NODE_ENV !== 'test') {
      try {
        await resend.emails.send({
          from: config.resend.fromEmail,
          to: admin.email,
          subject: `[Adma Admin] Code de connexion : ${code}`,
          html: `
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;background-color:#fff">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:32px">
                <div style="width:44px;height:44px;background:#5FC2BA;border-radius:12px;display:flex;align-items:center;justify-content:center">
                  <span style="font-size:22px;font-weight:900;color:#fff">A</span>
                </div>
                <span style="font-size:20px;font-weight:900;color:#0B162C;letter-spacing:4px">ADMA</span>
              </div>
              
              <h1 style="font-size:24px;font-weight:800;color:#0B162C;margin:0 0 12px;letter-spacing:-0.5px">Vérification de connexion</h1>
              <p style="font-size:15px;line-height:24px;color:#64748B;margin:0 0 32px">
                Bonjour ${admin.full_name},<br>
                Utilisez le code ci-dessous pour accéder à votre tableau de bord Adma.
              </p>
              
              <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:20px;padding:40px;text-align:center;margin-bottom:32px">
                <div style="font-size:42px;font-weight:900;letter-spacing:14px;color:#0B162C;font-family:monospace">${code}</div>
                <div style="font-size:12px;font-weight:700;color:#94A3B8;text-transform:uppercase;margin-top:16px;letter-spacing:1px">Valable 10 minutes</div>
              </div>
              
              <p style="font-size:13px;line-height:20px;color:#94A3B8;margin:0">
                Si vous n'avez pas initié cette demande, nous vous recommandons de changer votre mot de passe immédiatement.
              </p>
            </div>
          `,
        });
      } catch (emailErr) {
        logger.error(`Erreur envoi email admin OTP: ${emailErr.message}`);
        // On continue quand même car on peut voir le code en log de dev si besoin
      }
    } else {
      logger.warn(`[DEV] Admin OTP pour ${email}: ${code}`);
    }

    res.json({ 
      success: true, 
      message: 'Code de vérification envoyé par email', 
      data: { adminId: admin.id } 
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
      throw new AppError('Code incorrect', 400, 'OTP_INVALID');
    }

    // Marquer comme utilisé
    await query('UPDATE admin_otp_codes SET used_at=NOW() WHERE id=?', [rows[0].id]);

    const [admins] = await query('SELECT id, email, full_name FROM admins WHERE id=? AND is_active=TRUE', [adminId]);
    if (!admins.length) {
      throw new AppError('Administrateur introuvable ou inactif', 404, 'ADMIN_NOT_FOUND');
    }

    const admin = admins[0];
    await query('UPDATE admins SET last_login_at=NOW() WHERE id=?', [admin.id]);

    // Génération du Token JWT
    const token = jwt.sign(
      { adminId: admin.id, type: 'admin' }, 
      config.jwt.adminSecret, 
      { expiresIn: config.jwt.adminExpires }
    );

    // Logging de l'action
    await query('INSERT INTO admin_logs (admin_id, action) VALUES (?,?)', [admin.id, 'login']);

    res.json({ 
      success: true, 
      data: { 
        token, 
        admin: { 
          id: admin.id, 
          email: admin.email, 
          fullName: admin.full_name 
        } 
      } 
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
