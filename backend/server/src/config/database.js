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