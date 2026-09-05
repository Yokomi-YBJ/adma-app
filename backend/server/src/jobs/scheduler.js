/**
 * ADMA — Jobs planifiés (node-cron)
 */
import cron from 'node-cron';
import { query }        from '../config/database.js';
import { deleteImages } from '../services/imgdbService.js';
import {
  notifySubscriptionExpiring,
  notifyInactiveProvider,
} from '../services/notificationService.js';
import { logger } from '../utils/logger.js';

// Suppression CNI 24h après certification (chaque heure)
cron.schedule('0 * * * *', async () => {
  try {
    const [rows] = await query(`
      SELECT id, cni_front_cld, cni_back_cld FROM verification_requests
      WHERE cni_deleted_at IS NULL AND status IN ('approved','rejected')
        AND reviewed_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `);
    for (const r of rows) {
      const ids = [r.cni_front_cld, r.cni_back_cld].filter(Boolean);
      if (ids.length) await deleteImages(ids);
      await query(
        `UPDATE verification_requests
         SET cni_front_url=NULL, cni_back_url=NULL,
             cni_front_cld=NULL, cni_back_cld=NULL,
             cni_deleted_at=NOW()
         WHERE id=?`, [r.id]
      );
    }
    if (rows.length) logger.info(`CNI supprimées: ${rows.length}`);
  } catch (err) { logger.error('Job CNI', err.message); }
});

// Rappels abonnements expirant dans 3 jours (8h chaque matin)
cron.schedule('0 8 * * *', async () => {
  try {
    const [rows] = await query(`
      SELECT p.user_id, p.plan, p.plan_expires_at FROM providers p
      WHERE p.plan != 'free'
        AND p.plan_expires_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 3 DAY)
        AND p.is_active = TRUE
    `);
    for (const r of rows) {
      const days = Math.ceil((new Date(r.plan_expires_at) - Date.now()) / 86400000);
      await notifySubscriptionExpiring(r.user_id, r.plan, days);
    }
    if (rows.length) logger.info(`Rappels abonnement: ${rows.length}`);
  } catch (err) { logger.error('Job abo reminder', err.message); }
});

// Désactivation plans expirés (00h05 chaque nuit)
cron.schedule('5 0 * * *', async () => {
  try {
    const [res] = await query(`
      UPDATE providers SET plan='free', plan_expires_at=NULL
      WHERE plan != 'free' AND plan_expires_at < NOW()
    `);
    if (res.affectedRows > 0) logger.info(`Plans expirés désactivés: ${res.affectedRows}`);
  } catch (err) { logger.error('Job plan expiry', err.message); }
});

// Nettoyage tokens (2h chaque nuit)
cron.schedule('0 2 * * *', async () => {
  try {
    await query('DELETE FROM otp_codes WHERE expires_at < DATE_SUB(NOW(), INTERVAL 1 DAY)');
    await query('DELETE FROM refresh_tokens WHERE expires_at < NOW()');
    await query('DELETE FROM admin_otp_codes WHERE expires_at < DATE_SUB(NOW(), INTERVAL 1 DAY)');
    logger.info('Nettoyage tokens OK');
  } catch (err) { logger.error('Job cleanup', err.message); }
});

// Relance prestataires inactifs 30+ jours (dimanche 10h)
cron.schedule('0 10 * * 0', async () => {
  try {
    const [rows] = await query(`
      SELECT user_id, name FROM providers
      WHERE is_active=TRUE AND availability != 'available'
        AND updated_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
      LIMIT 100
    `);
    for (const r of rows) await notifyInactiveProvider(r.user_id, r.name);
    if (rows.length) logger.info(`Rappels inactivité: ${rows.length}`);
  } catch (err) { logger.error('Job inactive', err.message); }
});

logger.info('Jobs planifiés démarrés');
