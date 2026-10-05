import os from 'node:os';
import { query } from '../config/database.js';
import { sendAdminAlert } from './mailService.js';
import { logger } from '../utils/logger.js';

const ALERT_COOLDOWN_MS = 15 * 60 * 1000;
const lastAlertAt = new Map();

async function checkDatabase() {
  const startedAt = Date.now();
  try {
    await query('SELECT 1');
    const latencyMs = Date.now() - startedAt;
    return { status: latencyMs > 1000 ? 'slow' : 'ok', latencyMs };
  } catch (err) {
    logger.error('Monitoring database check failed', { err: err.message });
    return { status: 'error', message: err.message };
  }
}

async function checkRecentErrors() {
  try {
    const [[counts]] = await query(
      `SELECT
         COALESCE(SUM(created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)), 0) AS lastHour,
         COUNT(*) AS last24Hours
       FROM admin_logs
       WHERE action IN ('error', 'exception')
         AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`
    );
    const lastHour = Number(counts?.lastHour || 0);
    return {
      status: lastHour > 10 ? 'critical' : 'ok',
      lastHour,
      last24Hours: Number(counts?.last24Hours || 0),
    };
  } catch (err) {
    logger.error('Monitoring recent errors check failed', { err: err.message });
    return { status: 'error', message: err.message };
  }
}

async function checkPushTokens() {
  try {
    const [[stats]] = await query(
      `SELECT COUNT(*) AS activeUsers,
              COALESCE(SUM(expo_push_token IS NOT NULL AND expo_push_token <> ''), 0) AS withToken
       FROM users
       WHERE status = 'active'`
    );
    const activeUsers = Number(stats?.activeUsers || 0);
    const withToken = Number(stats?.withToken || 0);
    return {
      status: 'ok',
      activeUsers,
      withToken,
      coveragePercent: activeUsers ? Math.round((withToken / activeUsers) * 100) : 0,
    };
  } catch (err) {
    logger.error('Monitoring push token check failed', { err: err.message });
    return { status: 'error', message: err.message };
  }
}

async function checkPendingItems() {
  try {
    const [[counts]] = await query(
      `SELECT
         (SELECT COUNT(*) FROM verification_requests WHERE status = 'pending') AS verifications,
         (SELECT COUNT(*) FROM reports WHERE status = 'pending') AS reports`
    );
    const verifications = Number(counts?.verifications || 0);
    const reports = Number(counts?.reports || 0);
    return { status: 'ok', verifications, reports, total: verifications + reports };
  } catch (err) {
    logger.error('Monitoring pending items check failed', { err: err.message });
    return { status: 'error', message: err.message };
  }
}

async function checkScheduler() {
  try {
    const [[counts]] = await query(
      `SELECT
         (SELECT COUNT(*) FROM admin_broadcasts
          WHERE status = 'scheduled'
            AND scheduled_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE)) AS delayedBroadcasts,
         (SELECT COUNT(*) FROM otp_codes
          WHERE used_at IS NULL
            AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)) AS staleOtps`
    );
    const delayedBroadcasts = Number(counts?.delayedBroadcasts || 0);
    const staleOtps = Number(counts?.staleOtps || 0);
    return {
      status: delayedBroadcasts || staleOtps ? 'warning' : 'ok',
      delayedBroadcasts,
      staleOtps,
    };
  } catch (err) {
    logger.error('Monitoring scheduler check failed', { err: err.message });
    return { status: 'error', message: err.message };
  }
}

function checkSystem() {
  const memory = process.memoryUsage();
  const loadAverage = os.loadavg();
  const rssMb = Math.round(memory.rss / 1024 / 1024);
  return {
    status: rssMb > 800 ? 'critical' : 'ok',
    rssMb,
    heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
    uptimeSeconds: Math.floor(process.uptime()),
    cpu: { loadAverage, cores: os.cpus().length },
  };
}

export async function runFullHealthCheck() {
  const [database, recentErrors, pushTokens, pendingItems, scheduler] = await Promise.all([
    checkDatabase(),
    checkRecentErrors(),
    checkPushTokens(),
    checkPendingItems(),
    checkScheduler(),
  ]);
  const system = checkSystem();
  const checks = { database, recentErrors, pushTokens, pendingItems, scheduler, system };
  const statuses = Object.values(checks).map((check) => check.status);
  const status = statuses.some((value) => value === 'error' || value === 'critical')
    ? 'critical'
    : statuses.some((value) => value === 'warning' || value === 'slow')
      ? 'degraded'
      : 'healthy';

  return { status, checkedAt: new Date().toISOString(), checks };
}

async function sendAlertWithCooldown(key, subject, body) {
  const now = Date.now();
  if (now - (lastAlertAt.get(key) || 0) < ALERT_COOLDOWN_MS) return;
  lastAlertAt.set(key, now);
  await sendAdminAlert({ subject, body });
}

export async function runHealthCheckWithAlerts() {
  const report = await runFullHealthCheck();
  const { database, recentErrors, scheduler, system } = report.checks;
  const body = JSON.stringify(report, null, 2);

  if (database.status === 'error') {
    await sendAlertWithCooldown('database-down', '[ADMA] Base de données indisponible', body);
  }
  if (database.status === 'slow') {
    await sendAlertWithCooldown('database-slow', '[ADMA] Base de données lente', body);
  }
  if (recentErrors.lastHour > 10) {
    await sendAlertWithCooldown('errors-critical', '[ADMA] Pic d’erreurs serveur', body);
  }
  if (scheduler.delayedBroadcasts > 0) {
    await sendAlertWithCooldown('scheduler-stuck', '[ADMA] Broadcasts programmés en retard', body);
  }
  if (system.rssMb > 800) {
    await sendAlertWithCooldown('memory-critical', '[ADMA] Mémoire du processus critique', body);
  }

  return report;
}
