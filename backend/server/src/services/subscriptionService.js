/**
 * ADMA — Service de gestion des abonnements
 * Gère : downgrade programmé, activation, annulation
 */
import { query } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { PLAN_DAYS, isDowngrade } from './pricingService.js';
import { createNotification } from './notificationService.js';
import { invalidateCache } from './cacheService.js';

// ── Récupérer la programmation en attente pour un provider ──────
export async function getPendingPlanChange(providerId) {
  const [rows] = await query(
    `SELECT pending_plan_change   AS newPlan,
            pending_plan_effective_at AS effectiveAt
       FROM providers
      WHERE id = ?
        AND pending_plan_change IS NOT NULL
        AND pending_plan_effective_at IS NOT NULL
        AND pending_plan_effective_at >= CURDATE()
      LIMIT 1`,
    [providerId]
  );

  if (!rows.length) return null;
  return {
    newPlan:     rows[0].newPlan,
    effectiveAt: rows[0].effectiveAt,
  };
}

// ── Créer/remplacer une programmation de downgrade ──────────────
export async function scheduleDowngrade(providerId, newPlan, currentExpiry, userId) {
  const effectiveAt  = new Date(currentExpiry);
  const effectiveStr = effectiveAt.toISOString().slice(0, 10);

  await query(
    `UPDATE providers
        SET pending_plan_change = ?,
            pending_plan_effective_at = ?
      WHERE id = ?`,
    [newPlan, effectiveStr, providerId]
  );

  logger.info('Downgrade programmé', {
    providerId,
    newPlan,
    effectiveAt: effectiveStr,
  });

  // ✅ #11 : Notification à l'utilisateur
  if (userId) {
    const planLabels = {
      premium:      'Premium',
      professional: 'Professional',
      enterprise:   'Enterprise',
    };
    const label = planLabels[newPlan] || newPlan;

    createNotification(userId, {
      type: 'subscription_updated',
      titleFr: 'Changement de plan programmé',
      bodyFr:  `Vous passerez au plan ${label} le ${effectiveStr}. Votre plan actuel reste actif jusque-là.`,
      titleEn: 'Plan change scheduled',
      bodyEn:  `You will switch to ${label} on ${effectiveStr}. Your current plan remains active until then.`,
      data:    { newPlan, effectiveAt: effectiveStr },
    }).catch((err) => {
      logger.warn('Notification downgrade échouée', { error: err.message });
    });
  }

  return {
    newPlan,
    effectiveAt: effectiveStr,
  };
}

// ── Annuler une programmation ───────────────────────────────────
export async function cancelScheduledDowngrade(providerId, userId) {
  const [result] = await query(
    `UPDATE providers
        SET pending_plan_change = NULL,
            pending_plan_effective_at = NULL
      WHERE id = ?
        AND pending_plan_change IS NOT NULL`,
    [providerId]
  );

  const cancelled = result.affectedRows > 0;

  // ✅ #11 : Notification d'annulation
  if (cancelled && userId) {
    createNotification(userId, {
      type: 'subscription_updated',
      titleFr: 'Changement de plan annulé',
      bodyFr:  'Votre changement de plan programmé a été annulé.',
      titleEn: 'Plan change cancelled',
      bodyEn:  'Your scheduled plan change has been cancelled.',
    }).catch(() => {});
  }

  return cancelled;
}

// ── Appliquer les downgrades arrivés à échéance ─────────────────
export async function applyDueDowngrades() {
  const [rows] = await query(`
    SELECT id, user_id, plan AS current_plan, plan_expires_at,
           pending_plan_change, pending_plan_effective_at
      FROM providers
     WHERE pending_plan_change IS NOT NULL
       AND pending_plan_effective_at IS NOT NULL
       AND pending_plan_effective_at <= CURDATE()
       AND (plan_expires_at IS NULL OR plan_expires_at <= NOW())
  `);

  if (!rows.length) {
    return { applied: 0 };
  }

  logger.info(`Downgrades à appliquer : ${rows.length}`);

  let applied = 0;
  for (const r of rows) {
    try {
      const newPlan     = r.pending_plan_change;
      const currentPlan = r.current_plan;

      if (!isDowngrade(currentPlan, newPlan)) {
        logger.warn('Skip non-downgrade', {
          providerId: r.id,
          from:       currentPlan,
          to:         newPlan,
        });
        await query(
          `UPDATE providers
              SET pending_plan_change = NULL,
                  pending_plan_effective_at = NULL
            WHERE id = ?`,
          [r.id]
        );
        continue;
      }

      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + (PLAN_DAYS[newPlan] || 30));

      await query(
        `UPDATE providers
            SET plan = ?,
                plan_expires_at = ?,
                last_renewal_at = NOW(),
                pending_plan_change = NULL,
                pending_plan_effective_at = NULL
          WHERE id = ?`,
        [newPlan, newExpiry, r.id]
      );

      // Historique
      await query(
        `INSERT INTO subscriptions
           (provider_id, plan, amount, base_amount, discount_percent, start_date, end_date)
         VALUES (?, ?, 0, 0, 0, CURDATE(), ?)`,
        [r.id, newPlan, newExpiry.toISOString().slice(0, 10)]
      );

      // ✅ #11 : Notification d'application du downgrade
      if (r.user_id) {
        const planLabels = {
          premium:      'Premium',
          professional: 'Professional',
          enterprise:   'Enterprise',
        };
        const label = planLabels[newPlan] || newPlan;

        createNotification(r.user_id, {
          type: 'subscription_activated',
          titleFr: 'Nouveau plan activé',
          bodyFr:  `Votre plan ${label} est maintenant actif.`,
          titleEn: 'New plan activated',
          bodyEn:  `Your ${label} plan is now active.`,
          data:    { plan: newPlan },
        }).catch(() => {});
      }

      logger.info('Downgrade appliqué', {
        providerId: r.id,
        from:       currentPlan,
        to:         newPlan,
        newExpiry:  newExpiry.toISOString().slice(0, 10),
      });
      applied++;
    } catch (err) {
      logger.error('Erreur application downgrade', {
        providerId: r.id,
        error:      err.message,
      });
    }
  }

  // ✅ #12 : Invalider le cache si des changements ont eu lieu
  if (applied > 0) {
    invalidateCache('home_providers');
    invalidateCache('categories_all');
  }

  return { applied };
}