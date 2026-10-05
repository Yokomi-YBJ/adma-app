/**
 * ADMA — Contrôleur Monitoring Admin
 */
import { query } from '../../config/database.js';
import { logger } from '../../utils/logger.js';

export async function getSystemHealth(req, res) {
  const checks = {};

  // 1. Vérifier la connexion DB
  try {
    const start = Date.now();
    await query('SELECT 1');
    checks.database = { status: 'ok', latencyMs: Date.now() - start };
  } catch (err) {
    checks.database = { status: 'error', message: err.message };
    logger.error('Monitoring DB check failed', { err: err.message });
  }

  // 2. Compter les erreurs récentes
  try {
    const [[errors24h]] = await query(
      `SELECT COUNT(*) AS count FROM admin_logs
       WHERE action IN ('error','exception') AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)`
    );
    checks.errors24h = errors24h?.count || 0;
  } catch {
    checks.errors24h = null;
  }

  // 3. Statistiques des tokens push
  try {
    const [[pushStats]] = await query(
      `SELECT COUNT(*) AS total,
              SUM(expo_push_token IS NOT NULL) AS with_token
       FROM users WHERE status = 'active'`
    );
    checks.pushTokens = {
      total: pushStats?.total || 0,
      withToken: pushStats?.with_token || 0,
      coverage: pushStats?.total ? Math.round((pushStats.with_token / pushStats.total) * 100) : 0,
    };
  } catch {
    checks.pushTokens = null;
  }

  // 4. Uptime
  checks.uptime = Math.floor(process.uptime());
  checks.memory = {
    rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
    heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
  };

  res.json({ success: true, data: checks });
}
