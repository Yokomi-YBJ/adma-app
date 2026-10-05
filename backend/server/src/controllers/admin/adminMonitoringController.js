import { query } from '../../config/database.js';
import { sendAdminAlert } from '../../services/mailService.js';
import { runFullHealthCheck } from '../../services/systemMonitorService.js';

export async function getSystemHealth(_req, res) {
  const report = await runFullHealthCheck();
  res.json({ success: true, data: report });
}

export async function getRecentErrors(req, res) {
  const parsedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 100)) : 20;
  const [errors] = await query(
    `SELECT log.id, log.created_at,
            JSON_UNQUOTE(JSON_EXTRACT(log.details, '$.path')) AS route,
            JSON_UNQUOTE(JSON_EXTRACT(log.details, '$.code')) AS code,
            JSON_UNQUOTE(JSON_EXTRACT(log.details, '$.message')) AS message,
            admins.full_name AS admin_name
     FROM admin_logs log
     LEFT JOIN admins ON admins.id = log.admin_id
     WHERE log.action IN ('error', 'exception')
     ORDER BY log.created_at DESC
     LIMIT ?`,
    [limit]
  );

  res.json({ success: true, data: { errors } });
}

export async function testAlert(_req, res) {
  await sendAdminAlert({
    subject: "[ADMA] Test d'alerte monitoring",
    body: `Test d'alerte monitoring envoyé le ${new Date().toISOString()}.`,
  });
  res.json({ success: true, message: 'Alerte de test envoyée à l’administrateur.' });
}
