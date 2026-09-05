import jwt          from 'jsonwebtoken';
import { query }    from '../config/database.js';
import { AppError } from './errorHandler.js';
import { config }   from '../config/env.js';

export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer '))
      throw new AppError('Token manquant', 401, 'UNAUTHORIZED');

    const token = header.slice(7);
    let payload;
    try {
      payload = jwt.verify(token, config.jwt.secret);
    } catch (e) {
      throw new AppError(
        e.name === 'TokenExpiredError' ? 'Token expiré' : 'Token invalide',
        401,
        e.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'
      );
    }

    const [rows] = await query(
      'SELECT id, phone, first_name, last_name, avatar_url, status FROM users WHERE id=? AND status="active"',
      [payload.userId]
    );
    if (!rows.length) throw new AppError('Compte introuvable ou suspendu', 401, 'USER_NOT_FOUND');

    req.user = rows[0];
    next();
  } catch (err) { next(err); }
}

export async function optionalAuth(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return next();
    const payload = jwt.verify(header.slice(7), config.jwt.secret);
    const [rows]  = await query(
      'SELECT id, status FROM users WHERE id=? AND status="active"', [payload.userId]
    );
    if (rows.length) req.user = rows[0];
  } catch { /* ignoré */ }
  next();
}

export async function authenticateAdmin(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer '))
      throw new AppError('Token admin manquant', 401, 'UNAUTHORIZED');

    let payload;
    try {
      payload = jwt.verify(header.slice(7), config.jwt.adminSecret);
    } catch {
      throw new AppError('Token admin invalide ou expiré', 401, 'INVALID_ADMIN_TOKEN');
    }

    const [rows] = await query(
      'SELECT id, email, full_name FROM admins WHERE id=? AND is_active=TRUE',
      [payload.adminId]
    );
    if (!rows.length) throw new AppError('Admin introuvable', 401, 'ADMIN_NOT_FOUND');

    req.admin = rows[0];
    next();
  } catch (err) { next(err); }
}
