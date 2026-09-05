import mysql from 'mysql2/promise';
import { config } from './env.js';

let pool;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host:               config.db.host,
      port:               config.db.port,
      database:           config.db.name,
      user:               config.db.user,
      password:           config.db.password,
      waitForConnections: true,
      connectionLimit:    10,
      queueLimit:         0,
      enableKeepAlive:    true,
      keepAliveInitialDelay: 10000,
      charset:            'utf8mb4',
      timezone:           '+01:00',
      decimalNumbers:     true,
      ...(config.db.ssl ? { ssl: { rejectUnauthorized: false } } : {}),
    });
  }
  return pool;
}

export async function query(sql, params = []) {
  return getPool().execute(sql, params);
}

export async function transaction(callback) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function testConnection() {
  const conn = await getPool().getConnection();
  await conn.ping();
  conn.release();
}
