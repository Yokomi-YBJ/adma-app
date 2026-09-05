import jwt    from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { query }  from '../config/database.js';
import { config } from '../config/env.js';

export function generateAccessToken(userId) {
  return jwt.sign({ userId, type: 'access' }, config.jwt.secret, { expiresIn: config.jwt.accessExpires });
}

export function generateAdminToken(adminId) {
  return jwt.sign({ adminId, type: 'admin' }, config.jwt.adminSecret, { expiresIn: config.jwt.adminExpires });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

export async function generateRefreshToken(userId, deviceInfo = null) {
  const raw  = uuid();
  const hash = await bcrypt.hash(raw, 8);
  const exp  = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await query('INSERT INTO refresh_tokens (user_id, token_hash, device_info, expires_at) VALUES (?,?,?,?)',
    [userId, hash, deviceInfo, exp]);
  return raw;
}
