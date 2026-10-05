import cron from 'node-cron';
import { query }        from '../config/database.js';
import { deleteImages } from '../services/imgdbService.js';
import { executeBroadcast } from '../controllers/admin/adminNotificationsController.js';
import {
  notifySubscriptionExpiring,
  notifyInactiveProvider,
} from '../services/notificationService.js';
import { computePrice } from '../services/pricingService.js';
import { runHealthCheckWithAlerts } from '../services/systemMonitorService.js';
import { logger } from '../utils/logger.js';

// ── Job CNI : purge après 24h post-traitement OU 30j si non traité ──
async function cleanupCNI() {
  try {
    const [rows] = await query(`
      SELECT id, cni_front_cld, cni_back_cld
      FROM verification_requests
      WHERE cni_deleted_at IS NULL
        AND (
          (
            status IN ('approved','rejected')
            AND COALESCE(reviewed_at, updated_at, created_at) < DATE_SUB(NOW(), INTERVAL 24 HOUR)
          )
          OR
          (
            status IN ('pending','reviewing')
            AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
          )
        )
    `);

    if (!rows.length) {
      logger.debug('Job CNI: rien à supprimer');
      return;
    }

    logger.info(`Job CNI: ${rows.length} demande(s) à nettoyer`);

    for (const r of rows) {
      const ids = [r.cni_front_cld, r.cni_back_cld].filter(Boolean);

      if (ids.length) {
        try {
          await deleteImages(ids);
          logger.info(`Cloudinary: ${ids.length} image(s) supprimée(s) pour req ${r.id}`);
        } catch (err) {
          logger.warn(`Échec suppression Cloudinary ${r.id}: ${err.message}`);
        }
      }

      await query(
        `UPDATE verification_requests
         SET cni_front_url = NULL,
             cni_back_url  = NULL,
             cni_front_cld = NULL,
             cni_back_cld  = NULL,
             cni_deleted_at = NOW()
         WHERE id = ?`,
        [r.id]
      );

      logger.info(`CNI req ${r.id} marquée comme supprimée`);
    }
  } catch (err) {
    logger.error('Job CNI', err.message);
  }
}

// ── Job rappels abonnement ──
async function remindersSubscription() {
  try {
    const [rows] = await query(`
      SELECT p.user_id, p.plan, p.loyalty_months, p.plan_expires_at
      FROM providers p
      WHERE p.plan != 'free'
        AND p.plan_expires_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 3 DAY)
        AND p.is_active = TRUE
    `);
    for (const r of rows) {
      const days = Math.ceil((new Date(r.plan_expires_at) - Date.now()) / 86400000);
      const nextPricing = computePrice(r.plan, (r.loyalty_months || 0) + 1);
      await notifySubscriptionExpiring(
        r.user_id, r.plan, days,
        nextPricing.finalPrice, nextPricing.discountPercent
      );
    }
    if (rows.length) logger.info(`Rappels abonnement: ${rows.length}`);
  } catch (err) { logger.error('Job abo reminder', err.message); }
}

// ── Job expiration plans ──
async function expirePlans() {
  try {
    const [res] = await query(`
      UPDATE providers SET plan='free', plan_expires_at=NULL
      WHERE plan != 'free' AND plan_expires_at < NOW()
    `);
    if (res.affectedRows > 0) logger.info(`Plans expirés désactivés: ${res.affectedRows}`);

    const [reset] = await query(`
      UPDATE providers
      SET loyalty_months = 0
      WHERE plan = 'free'
        AND loyalty_months > 0
        AND last_renewal_at IS NOT NULL
        AND last_renewal_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);
    if (reset.affectedRows > 0) logger.info(`Compteurs fidélité reset: ${reset.affectedRows}`);
  } catch (err) { logger.error('Job plan expiry', err.message); }
}

// ── Job nettoyage tokens ──
async function cleanupTokens() {
  try {
    await query('DELETE FROM otp_codes WHERE expires_at < DATE_SUB(NOW(), INTERVAL 1 DAY)');
    await query('DELETE FROM refresh_tokens WHERE expires_at < NOW()');
    await query('DELETE FROM admin_otp_codes WHERE expires_at < DATE_SUB(NOW(), INTERVAL 1 DAY)');
    logger.info('Nettoyage tokens OK');
  } catch (err) { logger.error('Job cleanup', err.message); }
}

// ── Job relance inactifs ──
async function reminderInactive() {
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
}

// ── Crons ─────────────────────────────────────────────────────
cron.schedule('0 * * * *',    cleanupCNI);
cron.schedule('0 8 * * *',    remindersSubscription);
cron.schedule('5 0 * * *',    expirePlans);
cron.schedule('0 2 * * *',    cleanupTokens);
cron.schedule('0 10 * * 0',   reminderInactive);

// ── Catch-up au démarrage (15 secondes après le boot) ──────────
// Rattrape les jobs manqués si le serveur a été redémarré avant l'heure pile
setTimeout(async () => {
  try {
    logger.info('Catch-up: exécution des jobs au démarrage');
    await cleanupCNI();
    logger.info('Catch-up terminé');
  } catch (err) {
    logger.error('Catch-up échoué', err.message);
  }
}, 15 * 1000);

// ── Broadcasts programmés : vérifie toutes les 5 minutes ────────
cron.schedule('*/5 * * * *', async () => {
  try {
    const [rows] = await query(`
      SELECT id FROM admin_broadcasts
      WHERE status = 'scheduled' AND scheduled_at <= NOW()
      LIMIT 10
    `);

    if (!rows.length) return;

    logger.info(`Broadcasts programmés à envoyer : ${rows.length}`);
    for (const row of rows) {
      await executeBroadcast(row.id);
    }
  } catch (err) {
    logger.error('Job broadcast scheduler', err.message);
  }
});

cron.schedule('*/10 * * * *', async () => {
  try {
    await runHealthCheckWithAlerts();
  } catch (err) {
    logger.error('Job monitoring', err.message);
  }
});

logger.info('Jobs planifiés démarrés');