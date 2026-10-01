/**
 * ADMA — Contrôleur Profil & Admins
 */
import bcrypt from 'bcryptjs';
import { query } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';

export async function getProfile(req, res) {
  const [rows] = await query(
    'SELECT id, email, full_name, is_active, last_login_at, created_at FROM admins WHERE id = ?',
    [req.admin.id]
  );
  if (!rows.length) throw new AppError('Admin introuvable', 404, 'NOT_FOUND');
  res.json({ success: true, data: rows[0] });
}

export async function updateProfile(req, res) {
  const { fullName, email } = req.body;
  const sets = [];
  const vals = [];

  if (fullName) { sets.push('full_name = ?'); vals.push(fullName.trim()); }
  if (email) {
    // Check if email already taken
    const [exist] = await query('SELECT id FROM admins WHERE email = ? AND id != ?', [email.trim(), req.admin.id]);
    if (exist.length) throw new AppError('Cet email est déjà utilisé par un autre administrateur', 400, 'EMAIL_EXISTS');
    sets.push('email = ?'); vals.push(email.trim());
  }

  if (sets.length) {
    vals.push(req.admin.id);
    await query(`UPDATE admins SET ${sets.join(', ')} WHERE id = ?`, vals);
  }

  const [updated] = await query('SELECT id, email, full_name FROM admins WHERE id = ?', [req.admin.id]);
  res.json({ success: true, message: 'Profil mis à jour avec succès', data: updated[0] });
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError('Mot de passe actuel et nouveau mot de passe requis', 400, 'VALIDATION_ERROR');
  }

  if (newPassword.length < 8) {
    throw new AppError('Le nouveau mot de passe doit comporter au moins 8 caractères', 400, 'WEAK_PASSWORD');
  }

  const [rows] = await query('SELECT password_hash FROM admins WHERE id = ?', [req.admin.id]);
  if (!rows.length) throw new AppError('Admin introuvable', 404, 'NOT_FOUND');

  const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!valid) throw new AppError('Mot de passe actuel incorrect', 400, 'INVALID_PASSWORD');

  const newHash = await bcrypt.hash(newPassword, 12);
  await query('UPDATE admins SET password_hash = ? WHERE id = ?', [newHash, req.admin.id]);

  await query(
    'INSERT INTO admin_logs (admin_id, action, target_type, target_id) VALUES (?,?,?,?)',
    [req.admin.id, 'password_change', 'admin', req.admin.id]
  );

  res.json({ success: true, message: 'Mot de passe modifié avec succès' });
}

export async function getAdmins(req, res) {
  const [rows] = await query(
    'SELECT id, email, full_name, is_active, last_login_at, created_at FROM admins ORDER BY created_at ASC'
  );
  res.json({ success: true, data: rows });
}

export async function createAdmin(req, res) {
  const { email, password, fullName } = req.body;

  if (!email || !password || !fullName) {
    throw new AppError('Tous les champs sont requis', 400, 'VALIDATION_ERROR');
  }

  const [existing] = await query('SELECT id FROM admins WHERE email = ?', [email.trim()]);
  if (existing.length) {
    throw new AppError('Un administrateur existe déjà avec cet email', 400, 'ADMIN_EXISTS');
  }

  const hash = await bcrypt.hash(password, 12);

  const [result] = await query(
    'INSERT INTO admins (email, password_hash, full_name, is_active) VALUES (?, ?, ?, TRUE)',
    [email.trim(), hash, fullName.trim()]
  );

  await query(
    'INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?,?,?,?,?)',
    [req.admin.id, 'admin_create', 'admin', result.insertId, JSON.stringify({ email, fullName })]
  );

  res.status(201).json({
    success: true,
    message: 'Nouvel administrateur créé avec succès',
    data: { id: result.insertId, email, fullName },
  });
}

export async function toggleAdminStatus(req, res) {
  const { id } = req.params;

  if (parseInt(id, 10) === req.admin.id) {
    throw new AppError('Vous ne pouvez pas désactiver votre propre compte', 400, 'CANNOT_DEACTIVATE_SELF');
  }

  const [rows] = await query('SELECT is_active FROM admins WHERE id = ?', [id]);
  if (!rows.length) throw new AppError('Admin introuvable', 404, 'NOT_FOUND');

  const newStatus = !rows[0].is_active;
  await query('UPDATE admins SET is_active = ? WHERE id = ?', [newStatus, id]);

  await query(
    'INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?,?,?,?,?)',
    [req.admin.id, newStatus ? 'admin_activate' : 'admin_deactivate', 'admin', id, JSON.stringify({ newStatus })]
  );

  res.json({
    success: true,
    message: `Compte administrateur ${newStatus ? 'activé' : 'désactivé'}`,
    data: { isActive: newStatus },
  });
}

export async function getLogs(req, res) {
  const { action, adminId, page = 1, limit = 30 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const conds = ['1=1'];
  const params = [];

  if (action && action !== 'all') {
    conds.push('al.action = ?');
    params.push(action);
  }

  if (adminId && adminId !== 'all') {
    conds.push('al.admin_id = ?');
    params.push(adminId);
  }

  const where = conds.join(' AND ');

  const [logs] = await query(
    `SELECT al.*, a.full_name AS admin_name, a.email AS admin_email
     FROM admin_logs al
     JOIN admins a ON a.id = al.admin_id
     WHERE ${where}
     ORDER BY al.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limitNum, offset]
  );

  const [[{ total }]] = await query(`SELECT COUNT(*) AS total FROM admin_logs al WHERE ${where}`, params);

  res.json({
    success: true,
    data: {
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    },
  });
}
