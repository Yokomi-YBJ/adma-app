import mysql from 'mysql2/promise';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

let pool;

export function getPool() {
  if (!pool) {
    const sslConfig = config.db.ssl
      ? {
          rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
          minVersion: 'TLSv1.2',
        }
      : undefined;

    pool = mysql.createPool({
      host:                  config.db.host,
      port:                  config.db.port,
      database:              config.db.name,
      user:                  config.db.user,
      password:              config.db.password,
      ssl:                   sslConfig,
      waitForConnections:    true,
      connectionLimit:       10,
      queueLimit:            0,
      enableKeepAlive:       true,
      keepAliveInitialDelay: 10000,
      charset:               'utf8mb4',
      timezone:              '+01:00',
      decimalNumbers:        true,
    });

    pool.on('error', (err) => {
      logger.error('Pool MySQL/TiDB error', { error: err.message, code: err.code });
    });
  }
  return pool;
}

// ── Wrapper sécurisé (prepared statements) ────────────────────────
export async function query(sql, params = []) {
  // nosemgrep: javascript.lang.security.audit.sqli.node-mysql-sqli.node-mysql-sqli
  return getPool().execute(sql, params);
}

// ── Transaction ───────────────────────────────────────────────────
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

// ── Test de connexion (utilisé au démarrage) ──────────────────────
export async function testConnection() {
  const conn = await getPool().getConnection();
  try {
    await conn.ping();
  } finally {
    conn.release();
  }
}