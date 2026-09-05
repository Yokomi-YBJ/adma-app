/**
 * ADMA — Routes Admin unifiées
 * Toutes les routes /api/v1/admin/* ici
 */
import { Router }   from 'express';
import { body }     from 'express-validator';
import bcrypt       from 'bcryptjs';
import jwt          from 'jsonwebtoken';
import { Resend }   from 'resend';
import { query }    from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticateAdmin }      from '../middleware/auth.js';
import { loginRateLimit }         from '../middleware/rateLimit.js';
import { deleteImages }           from '../services/imgdbService.js';
import { notifyVerificationApproved, notifyVerificationRejected } from '../services/notificationService.js';
import { config }   from '../config/env.js';
import { logger }   from '../utils/logger.js';

const router = Router();
const resend = new Resend(config.resend.apiKey);
const OTP_MIN = 10;

// ── 1. AUTH ADMIN ─────────────────────────────────────────────────

// POST /admin/auth/login
router.post('/auth/login', loginRateLimit, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const [rows] = await query('SELECT * FROM admins WHERE email=? AND is_active=TRUE', [email]);
  if (!rows.length) throw new AppError('Identifiants invalides', 401, 'INVALID_CREDENTIALS');

  const admin = rows[0];
  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) throw new AppError('Identifiants invalides', 401, 'INVALID_CREDENTIALS');

  const code    = Math.floor(100000 + Math.random() * 900000).toString();
  const hash    = await bcrypt.hash(code, 10);
  const expires = new Date(Date.now() + OTP_MIN * 60 * 1000);

  await query('DELETE FROM admin_otp_codes WHERE admin_id=?', [admin.id]);
  await query('INSERT INTO admin_otp_codes (admin_id, code_hash, expires_at) VALUES (?,?,?)', [admin.id, hash, expires]);

  if (process.env.NODE_ENV !== 'test') {
    await resend.emails.send({
      from:    config.resend.fromEmail,
      to:      admin.email,
      subject: `[Adma Admin] Code de connexion : ${code}`,
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:28px">
            <div style="width:40px;height:40px;background:#5FC2BA;border-radius:10px;display:flex;align-items:center;justify-content:center">
              <span style="font-size:20px;font-weight:900;color:#fff">A</span>
            </div>
            <span style="font-size:18px;font-weight:900;color:#0B162C;letter-spacing:3px">ADMA</span>
          </div>
          <h2 style="color:#0B162C;margin:0 0 8px">Code de connexion Admin</h2>
          <p style="color:#6B7B8F;margin:0 0 24px">Bonjour ${admin.full_name},</p>
          <div style="background:#EBF7F7;border-radius:16px;padding:28px;text-align:center;margin-bottom:24px">
            <div style="font-size:40px;font-weight:900;letter-spacing:16px;color:#0B162C">${code}</div>
          </div>
          <p style="color:#6B7B8F;font-size:13px;margin:0">
            Ce code expire dans <strong>${OTP_MIN} minutes</strong>.<br>
            Si vous n'avez pas tenté de vous connecter, ignorez cet email.
          </p>
        </div>
      `,
    });
  } else {
    logger.warn(`[DEV] Admin OTP pour ${email}: ${code}`);
  }

  res.json({ success: true, message: 'Code OTP envoyé par email', data: { adminId: admin.id } });
}));

// POST /admin/auth/verify-otp
router.post('/auth/verify-otp', loginRateLimit, [
  body('adminId').isInt().toInt(),
  body('code').isLength({ min:6, max:6 }).isNumeric(),
], asyncHandler(async (req, res) => {
  const { adminId, code } = req.body;

  const [rows] = await query(
    'SELECT * FROM admin_otp_codes WHERE admin_id=? AND used_at IS NULL AND expires_at>NOW() ORDER BY created_at DESC LIMIT 1',
    [adminId]
  );
  if (!rows.length) throw new AppError('Code expiré ou invalide', 400, 'OTP_EXPIRED');

  const valid = await bcrypt.compare(code, rows[0].code_hash);
  if (!valid) throw new AppError('Code incorrect', 400, 'OTP_INVALID');

  await query('UPDATE admin_otp_codes SET used_at=NOW() WHERE id=?', [rows[0].id]);

  const [admins] = await query('SELECT id, email, full_name FROM admins WHERE id=? AND is_active=TRUE', [adminId]);
  if (!admins.length) throw new AppError('Admin introuvable', 404, 'NOT_FOUND');

  const admin = admins[0];
  await query('UPDATE admins SET last_login_at=NOW() WHERE id=?', [admin.id]);

  const token = jwt.sign({ adminId: admin.id, type: 'admin' }, config.jwt.adminSecret, {
    expiresIn: config.jwt.adminExpires,
  });

  await query('INSERT INTO admin_logs (admin_id, action) VALUES (?,?)', [admin.id, 'login']);
  res.json({ success: true, data: { token, admin: { id: admin.id, email: admin.email, fullName: admin.full_name } } });
}));

// GET /admin/auth/me
router.get('/auth/me', authenticateAdmin, asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.admin });
}));

// ── 2. STATS DASHBOARD ────────────────────────────────────────────
router.get('/stats/dashboard', authenticateAdmin, asyncHandler(async (req, res) => {
  const [[users]]       = await query('SELECT COUNT(*) AS total FROM users WHERE status="active"');
  const [[providers]]   = await query('SELECT COUNT(*) AS total FROM providers WHERE is_active=TRUE AND deleted_at IS NULL');
  const [[reviews]]     = await query('SELECT COUNT(*) AS total FROM reviews WHERE status="active"');
  const [[reports]]     = await query('SELECT COUNT(*) AS total FROM reports WHERE status="pending"');
  const [[verPending]]  = await query('SELECT COUNT(*) AS total FROM verification_requests WHERE status IN ("pending","reviewing")');
  const [[revenue]]     = await query('SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE status="completed" AND MONTH(created_at)=MONTH(NOW()) AND YEAR(created_at)=YEAR(NOW())');
  const [[prevRevenue]] = await query('SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE status="completed" AND MONTH(created_at)=MONTH(DATE_SUB(NOW(),INTERVAL 1 MONTH)) AND YEAR(created_at)=YEAR(DATE_SUB(NOW(),INTERVAL 1 MONTH))');
  const [planDist]      = await query('SELECT plan, COUNT(*) AS count FROM providers WHERE is_active=TRUE AND deleted_at IS NULL GROUP BY plan ORDER BY count DESC');
  const [cityDist]      = await query('SELECT ci.name, COUNT(*) AS count FROM providers p JOIN cities ci ON ci.id=p.city_id WHERE p.is_active=TRUE GROUP BY ci.id ORDER BY count DESC');
  const [dailyReg]      = await query('SELECT DATE(created_at) AS date, COUNT(*) AS count FROM users WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY DATE(created_at) ORDER BY date ASC');
  const [recentActions] = await query('SELECT al.*, a.full_name AS admin_name FROM admin_logs al JOIN admins a ON a.id=al.admin_id ORDER BY al.created_at DESC LIMIT 10');

  res.json({ success: true, data: {
    users:                users.total,
    providers:            providers.total,
    reviews:              reviews.total,
    pendingReports:       reports.total,
    pendingVerifications: verPending.total,
    revenueThisMonth:     revenue.total,
    revenuePrevMonth:     prevRevenue.total,
    planDistribution:     planDist,
    cityDistribution:     cityDist,
    dailyRegistrations:   dailyReg,
    recentActions,
  }});
}));

// ── 3. UTILISATEURS ───────────────────────────────────────────────
router.get('/users', authenticateAdmin, asyncHandler(async (req, res) => {
  const { q, status, page = 1, limit = 30 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conds  = ['1=1']; const params = [];
  if (status) { conds.push('u.status=?');  params.push(status); }
  if (q)      { conds.push('(u.phone LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)'); params.push(`%${q}%`,`%${q}%`,`%${q}%`); }
  const where = conds.join(' AND ');
  const [rows] = await query(
    `SELECT u.id, u.phone, u.first_name, u.last_name, u.status, u.phone_verified, u.created_at,
            (SELECT COUNT(*) FROM providers p WHERE p.user_id=u.id AND p.deleted_at IS NULL) AS has_provider
     FROM users u WHERE ${where} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), offset]
  );
  const [[{ total }]] = await query(`SELECT COUNT(*) AS total FROM users u WHERE ${where}`, params);
  res.json({ success: true, data: { users: rows, pagination: { page: parseInt(page), total } } });
}));

router.patch('/users/:id/suspend', authenticateAdmin, asyncHandler(async (req, res) => {
  await query("UPDATE users SET status='suspended' WHERE id=?", [req.params.id]);
  await query('INSERT INTO admin_logs (admin_id, action, target_type, target_id) VALUES (?,?,?,?)',
    [req.admin.id, 'user_suspend', 'user', req.params.id]);
  res.json({ success: true });
}));

router.patch('/users/:id/activate', authenticateAdmin, asyncHandler(async (req, res) => {
  await query("UPDATE users SET status='active' WHERE id=?", [req.params.id]);
  await query('INSERT INTO admin_logs (admin_id, action, target_type, target_id) VALUES (?,?,?,?)',
    [req.admin.id, 'user_activate', 'user', req.params.id]);
  res.json({ success: true });
}));

// ── 4. PRESTATAIRES ───────────────────────────────────────────────
router.get('/providers', authenticateAdmin, asyncHandler(async (req, res) => {
  const { q, status, plan, verification, page = 1, limit = 30 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conds  = ['p.deleted_at IS NULL']; const params = [];
  if (status)       { conds.push('p.is_active=?');              params.push(status === 'active' ? 1 : 0); }
  if (plan)         { conds.push('p.plan=?');                    params.push(plan); }
  if (verification) { conds.push('p.verification_status=?');     params.push(verification); }
  if (q)            { conds.push('(p.name LIKE ? OR u.phone LIKE ?)'); params.push(`%${q}%`,`%${q}%`); }
  const where = conds.join(' AND ');
  const [rows] = await query(
    `SELECT p.id, p.name, p.specialty, p.plan, p.verification_status, p.is_active,
            p.review_count, p.trust_score, p.ranking_score, p.created_at,
            u.phone, ci.name AS city
     FROM providers p JOIN users u ON u.id=p.user_id JOIN cities ci ON ci.id=p.city_id
     WHERE ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), offset]
  );
  const [[{ total }]] = await query(
    `SELECT COUNT(*) AS total FROM providers p JOIN users u ON u.id=p.user_id WHERE ${where}`, params
  );
  res.json({ success: true, data: { providers: rows, pagination: { page: parseInt(page), total } } });
}));

router.patch('/providers/:id/suspend', authenticateAdmin, asyncHandler(async (req, res) => {
  await query('UPDATE providers SET is_active=FALSE, suspended_at=NOW() WHERE id=?', [req.params.id]);
  await query('INSERT INTO admin_logs (admin_id, action, target_type, target_id) VALUES (?,?,?,?)',
    [req.admin.id, 'provider_suspend', 'provider', req.params.id]);
  res.json({ success: true });
}));

router.patch('/providers/:id/activate', authenticateAdmin, asyncHandler(async (req, res) => {
  await query('UPDATE providers SET is_active=TRUE, suspended_at=NULL WHERE id=?', [req.params.id]);
  await query('INSERT INTO admin_logs (admin_id, action, target_type, target_id) VALUES (?,?,?,?)',
    [req.admin.id, 'provider_activate', 'provider', req.params.id]);
  res.json({ success: true });
}));

// ── 5. VÉRIFICATIONS ──────────────────────────────────────────────
router.get('/verifications', authenticateAdmin, asyncHandler(async (req, res) => {
  const { status = 'pending' } = req.query;
  const [rows] = await query(`
    SELECT vr.*, p.name AS provider_name, p.user_id, u.phone,
           p.verification_status AS current_status
    FROM verification_requests vr
    JOIN providers p ON p.id=vr.provider_id
    JOIN users u ON u.id=p.user_id
    WHERE vr.status=? ORDER BY vr.created_at ASC
  `, [status]);
  res.json({ success: true, data: rows });
}));

router.patch('/verifications/:id/approve', authenticateAdmin, [
  body('badgeType').optional().isIn(['verified_id','verified']),
], asyncHandler(async (req, res) => {
  const { badgeType = 'verified_id', note } = req.body;
  const [rows] = await query('SELECT * FROM verification_requests WHERE id=?', [req.params.id]);
  if (!rows.length) throw new AppError('Demande introuvable', 404, 'NOT_FOUND');

  await query("UPDATE verification_requests SET status='approved', reviewed_by=?, reviewed_at=NOW(), review_note=? WHERE id=?",
    [req.admin.id, note || null, req.params.id]);
  await query("UPDATE providers SET verification_status=?, verified_at=NOW() WHERE id=?",
    [badgeType, rows[0].provider_id]);
  await query('INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?,?,?,?,?)',
    [req.admin.id, 'verification_approve', 'provider', rows[0].provider_id, JSON.stringify({ badgeType })]);

  const [prov] = await query('SELECT user_id FROM providers WHERE id=?', [rows[0].provider_id]);
  if (prov.length) notifyVerificationApproved(prov[0].user_id, badgeType).catch(() => {});

  res.json({ success: true, message: 'Vérification approuvée' });
}));

router.patch('/verifications/:id/reject', authenticateAdmin, asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const [rows] = await query('SELECT * FROM verification_requests WHERE id=?', [req.params.id]);
  if (!rows.length) throw new AppError('Demande introuvable', 404, 'NOT_FOUND');

  await query("UPDATE verification_requests SET status='rejected', reviewed_by=?, reviewed_at=NOW(), review_note=? WHERE id=?",
    [req.admin.id, reason || null, req.params.id]);
  await query("UPDATE providers SET verification_status='none' WHERE id=?", [rows[0].provider_id]);
  await query('INSERT INTO admin_logs (admin_id, action, target_type, target_id) VALUES (?,?,?,?)',
    [req.admin.id, 'verification_reject', 'provider', rows[0].provider_id]);

  const [prov] = await query('SELECT user_id FROM providers WHERE id=?', [rows[0].provider_id]);
  if (prov.length) notifyVerificationRejected(prov[0].user_id, reason).catch(() => {});

  res.json({ success: true, message: 'Demande rejetée' });
}));

// ── 6. AVIS ───────────────────────────────────────────────────────
router.get('/reviews', authenticateAdmin, asyncHandler(async (req, res) => {
  const { status = 'active', page = 1 } = req.query;
  const offset = (parseInt(page) - 1) * 30;
  const [rows] = await query(`
    SELECT r.id, r.verdict, r.comment, r.status, r.created_at,
           p.name AS provider_name, CONCAT(u.first_name,' ',u.last_name) AS reviewer_name
    FROM reviews r JOIN providers p ON p.id=r.provider_id JOIN users u ON u.id=r.reviewer_id
    WHERE r.status=? ORDER BY r.created_at DESC LIMIT 30 OFFSET ?
  `, [status, offset]);
  res.json({ success: true, data: rows });
}));

router.patch('/reviews/:id/hide', authenticateAdmin, asyncHandler(async (req, res) => {
  await query("UPDATE reviews SET status='hidden' WHERE id=?", [req.params.id]);
  await query('INSERT INTO admin_logs (admin_id, action, target_type, target_id) VALUES (?,?,?,?)',
    [req.admin.id, 'review_hide', 'review', req.params.id]);
  res.json({ success: true });
}));

router.patch('/reviews/:id/restore', authenticateAdmin, asyncHandler(async (req, res) => {
  await query("UPDATE reviews SET status='active' WHERE id=?", [req.params.id]);
  res.json({ success: true });
}));

// ── 7. SIGNALEMENTS ───────────────────────────────────────────────
router.get('/reports', authenticateAdmin, asyncHandler(async (req, res) => {
  const { status = 'pending', page = 1 } = req.query;
  const offset = (parseInt(page) - 1) * 30;
  const [rows] = await query(`
    SELECT r.*, u.phone AS reporter_phone
    FROM reports r JOIN users u ON u.id=r.reporter_id
    WHERE r.status=? ORDER BY r.created_at ASC LIMIT 30 OFFSET ?
  `, [status, offset]);
  const [[{ total }]] = await query('SELECT COUNT(*) AS total FROM reports WHERE status=?', [status]);
  res.json({ success: true, data: { reports: rows, total } });
}));

router.patch('/reports/:id/resolve', authenticateAdmin, asyncHandler(async (req, res) => {
  await query("UPDATE reports SET status='resolved', resolved_by=?, resolved_at=NOW() WHERE id=?",
    [req.admin.id, req.params.id]);
  res.json({ success: true });
}));

router.patch('/reports/:id/dismiss', authenticateAdmin, asyncHandler(async (req, res) => {
  await query("UPDATE reports SET status='dismissed', resolved_by=?, resolved_at=NOW() WHERE id=?",
    [req.admin.id, req.params.id]);
  res.json({ success: true });
}));

// ── 8. ABONNEMENTS ────────────────────────────────────────────────
router.get('/subscriptions', authenticateAdmin, asyncHandler(async (req, res) => {
  const { plan, status, page = 1 } = req.query;
  const offset = (parseInt(page) - 1) * 30;
  const conds  = ['1=1']; const params = [];
  if (plan)   { conds.push('s.plan=?');   params.push(plan); }
  if (status) { conds.push('s.status=?'); params.push(status); }
  const where = conds.join(' AND ');
  const [rows] = await query(
    `SELECT s.*, p.name AS provider_name, u.phone
     FROM subscriptions s JOIN providers p ON p.id=s.provider_id JOIN users u ON u.id=p.user_id
     WHERE ${where} ORDER BY s.created_at DESC LIMIT 30 OFFSET ?`,
    [...params, offset]
  );
  const [[{ total }]] = await query(`SELECT COUNT(*) AS total FROM subscriptions s WHERE ${where}`, params);
  res.json({ success: true, data: { subscriptions: rows, total } });
}));

// Activer un abonnement manuellement (sans paiement)
router.post('/subscriptions/activate', authenticateAdmin, [
  body('providerId').isInt().toInt(),
  body('plan').isIn(['premium','professional','enterprise']),
  body('days').optional().isInt({ min:1, max:365 }),
], asyncHandler(async (req, res) => {
  const { providerId, plan, days = 30 } = req.body;
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);
  const endStr = endDate.toISOString().slice(0, 10);

  await query(
    "INSERT INTO subscriptions (provider_id, plan, amount, start_date, end_date, activated_by) VALUES (?,?,0,CURDATE(),?,'admin')",
    [providerId, plan, endStr]
  );
  await query('UPDATE providers SET plan=?, plan_expires_at=? WHERE id=?', [plan, endDate, providerId]);
  await query('INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?,?,?,?,?)',
    [req.admin.id, 'subscription_activate', 'provider', providerId, JSON.stringify({ plan, days })]);
  res.json({ success: true, message: `Plan ${plan} activé pour ${days} jours` });
}));

// ── 9. CATÉGORIES ─────────────────────────────────────────────────
router.get('/categories', authenticateAdmin, asyncHandler(async (req, res) => {
  const [rows] = await query('SELECT * FROM categories ORDER BY sort_order ASC, name_fr ASC');
  res.json({ success: true, data: rows });
}));

router.post('/categories', authenticateAdmin, [
  body('nameFr').trim().notEmpty(),
  body('nameEn').trim().notEmpty(),
  body('nameFul').optional().trim(),
  body('parentId').optional().isInt(),
], asyncHandler(async (req, res) => {
  const { nameFr, nameEn, nameFul, parentId, icon, sortOrder } = req.body;
  const slug = nameFr.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
  await query(
    'INSERT INTO categories (parent_id, name_fr, name_en, name_ful, slug, icon, sort_order) VALUES (?,?,?,?,?,?,?)',
    [parentId || null, nameFr, nameEn, nameFul || '', slug, icon || null, sortOrder || 0]
  );
  res.status(201).json({ success: true });
}));

router.patch('/categories/:id', authenticateAdmin, asyncHandler(async (req, res) => {
  const { nameFr, nameEn, nameFul, isActive, sortOrder } = req.body;
  const sets = []; const vals = [];
  if (nameFr     !== undefined) { sets.push('name_fr=?');    vals.push(nameFr); }
  if (nameEn     !== undefined) { sets.push('name_en=?');    vals.push(nameEn); }
  if (nameFul    !== undefined) { sets.push('name_ful=?');   vals.push(nameFul); }
  if (isActive   !== undefined) { sets.push('is_active=?');  vals.push(isActive ? 1 : 0); }
  if (sortOrder  !== undefined) { sets.push('sort_order=?'); vals.push(sortOrder); }
  if (!sets.length) return res.json({ success: true });
  vals.push(req.params.id);
  await query(`UPDATE categories SET ${sets.join(',')} WHERE id=?`, vals);
  res.json({ success: true });
}));

// ── 10. PAIEMENTS ─────────────────────────────────────────────────
router.get('/payments', authenticateAdmin, asyncHandler(async (req, res) => {
  const { status, page = 1 } = req.query;
  const offset = (parseInt(page) - 1) * 30;
  const conds  = ['1=1']; const params = [];
  if (status) { conds.push('pay.status=?'); params.push(status); }
  const where = conds.join(' AND ');
  const [rows] = await query(
    `SELECT pay.*, p.name AS provider_name, u.phone
     FROM payments pay JOIN providers p ON p.id=pay.provider_id JOIN users u ON u.id=p.user_id
     WHERE ${where} ORDER BY pay.created_at DESC LIMIT 30 OFFSET ?`,
    [...params, offset]
  );
  const [[{ total }]] = await query(`SELECT COUNT(*) AS total FROM payments pay WHERE ${where}`, params);
  res.json({ success: true, data: { payments: rows, total } });
}));

export default router;
