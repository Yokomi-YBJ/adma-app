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

/**
 * TiDB ne supporte pas les placeholders ? dans LIMIT/OFFSET avec execute().
 * On les inline en entiers sûrs avant l'exécution.
 *
 * Ex: 'SELECT ... LIMIT ? OFFSET ?' + [20, 0] → 'SELECT ... LIMIT 20 OFFSET 0'
 */
function inlineLimitOffset(sql, params) {
  const limitRegex  = /\bLIMIT\s+\?/gi;
  const offsetRegex = /\bOFFSET\s+\?/gi;

  const limitMatches  = (sql.match(limitRegex)  || []).length;
  const offsetMatches = (sql.match(offsetRegex) || []).length;

  if (limitMatches === 0 && offsetMatches === 0) {
    return { sql, params };
  }

  const newParams = [...params];
  const consumed  = [];

  // OFFSET est toujours après LIMIT dans la requête → on dépile en sens inverse
  for (let i = 0; i < offsetMatches; i++) {
    consumed.unshift(safeInt(newParams.pop()));
  }
  for (let i = 0; i < limitMatches; i++) {
    consumed.unshift(safeInt(newParams.pop()));
  }

  let i = 0;
  const newSql = sql
    .replace(limitRegex,  () => `LIMIT ${consumed[i++]}`)
    .replace(offsetRegex, () => `OFFSET ${consumed[i++]}`);

  return { sql: newSql, params: newParams };
}

function safeInt(value) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Valeur LIMIT/OFFSET invalide : ${value}`);
  }
  return n;
}

// ── Wrapper sécurisé (prepared statements mysql2) ─────────────────
export async function query(sql, params = []) {
  const { sql: finalSql, params: finalParams } = inlineLimitOffset(sql, params);
  // nosemgrep: javascript.lang.security.audit.sqli.node-mysql-sqli.node-mysql-sqli
  return getPool().execute(finalSql, finalParams);
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

// ── Test de connexion ─────────────────────────────────────────────
export async function testConnection() {
  const conn = await getPool().getConnection();
  try {
    await conn.ping();
  } finally {
    conn.release();
  }
}