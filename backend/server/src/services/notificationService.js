/**
 * ADMA — Service Notifications Push (Expo EAS)
 * Envoi push + sauvegarde BDD + gestion préférences
 */
import { Expo } from 'expo-server-sdk';
import { query } from '../config/database.js';
import { logger } from '../utils/logger.js';

const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN || '' });

// ── Envoi Push via Expo ──────────────────────────────────────────
async function sendPushNotification(tokens, title, body, data = {}) {
  if (!tokens?.length) {
    logger.info('[Push] Aucun token fourni');
    return;
  }

  const validTokens = tokens.filter(t => t && Expo.isExpoPushToken(t));
  if (!validTokens.length) {
    logger.warn('[Push] Aucun token valide parmi:', tokens);
    return;
  }

  const messages = validTokens.map(to => ({
    to, title, body, data,
    sound:     'default',
    channelId: data.channelId || 'default',
    priority:  'high',
  }));

  try {
    const chunks   = expo.chunkPushNotifications(messages);
    const receipts = [];
    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      receipts.push(...ticketChunk);
    }

    // Invalider les tokens expirés
    receipts.forEach((ticket, i) => {
      if (ticket.status === 'error') {
        logger.warn(`Push error [${validTokens[i]}]: ${ticket.message}`);
        if (ticket.details?.error === 'DeviceNotRegistered') {
          query('UPDATE users SET expo_push_token = NULL WHERE expo_push_token = ?',
            [validTokens[i]]).catch(() => {});
        }
      }
    });
  } catch (err) {
    logger.error('Expo push send error', err.message);
  }
}

// ── Créer & envoyer une notification ────────────────────────────
export async function createNotification(userId, {
  type, titleFr, titleEn, bodyFr, bodyEn, data = {}, channelId = 'default',
}) {
  try {
    // Vérifier préférences utilisateur
    const [prefs] = await query(
      'SELECT * FROM notification_preferences WHERE user_id = ?', [userId]
    );
    const prefKeyMap = {
      new_review:             'new_review',
      review_response:        'review_response',
      verification_approved:  'verification_update',
      verification_rejected:  'verification_update',
      subscription_expiring:  'subscription_reminder',
      subscription_activated: 'subscription_reminder',
      new_favorite:           'favorite_update',
      contact_reminder:       'contact_reminder',
      review_updated:         'review_response', // ← on utilise le même canal
    };
    const prefKey = prefKeyMap[type];
    if (prefs[0] && prefKey && prefs[0][prefKey] === 0) {
      logger.info(`[Push] Utilisateur ${userId} a désactivé les notifications pour ${type}`);
      return null;
    }

    // Sauvegarder en BDD
    const [result] = await query(
      `INSERT INTO notifications
         (user_id, type, title_fr, title_en, body_fr, body_en, data_json, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [userId, type, titleFr, titleEn || titleFr, bodyFr, bodyEn || bodyFr, JSON.stringify(data)]
    );

    // Récupérer token push
    const [rows] = await query(
      'SELECT expo_push_token FROM users WHERE id = ? AND status = "active"', [userId]
    );
    const token = rows[0]?.expo_push_token;
    if (token) {
      await sendPushNotification([token], titleFr, bodyFr, { ...data, type, notifId: result.insertId, channelId });
    } else {
      logger.info(`[Push] Utilisateur ${userId} n'a pas de token push, notification sauvegardée en BDD seulement.`);
    }

    return result.insertId;
  } catch (err) {
    logger.error('createNotification error', err.message);
    return null;
  }
}

// ── Helpers métier ───────────────────────────────────────────────
export async function notifyNewReview(providerId, reviewerName, verdict) {
  const [rows] = await query('SELECT user_id FROM providers WHERE id = ?', [providerId]);
  if (!rows.length) return;
  const label = { recommend: 'vous a recommandé', neutral: 'a laissé un avis neutre', discourage: 'vous a déconseillé' }[verdict] || 'vous a noté';
  return createNotification(rows[0].user_id, {
    type: 'new_review', channelId: 'reviews',
    titleFr: 'Nouvel avis',          titleEn: 'New review',
    bodyFr:  `${reviewerName} ${label}.`,
    bodyEn:  `${reviewerName} reviewed your profile.`,
    data: { providerId },
  });
}

export async function notifyReviewResponse(reviewerId, providerName) {
  return createNotification(reviewerId, {
    type: 'review_response', channelId: 'reviews',
    titleFr: 'Réponse à votre avis',      titleEn: 'Reply to your review',
    bodyFr:  `${providerName} a répondu à votre avis.`,
    bodyEn:  `${providerName} replied to your review.`,
  });
}

// ✅ NOUVEAU : Notification de modification d'avis
export async function notifyReviewUpdated(providerId, reviewerName, oldVerdict, newVerdict) {
  const [rows] = await query('SELECT user_id FROM providers WHERE id = ?', [providerId]);
  if (!rows.length) return;
  const labelMap = { recommend: 'positive', neutral: 'neutre', discourage: 'négative' };
  const oldLabel = labelMap[oldVerdict] || 'avis';
  const newLabel = labelMap[newVerdict] || 'avis';
  return createNotification(rows[0].user_id, {
    type: 'review_updated', channelId: 'reviews',
    titleFr: 'Avis modifié',
    titleEn: 'Review updated',
    bodyFr: `${reviewerName} a modifié son avis (${oldLabel} → ${newLabel}).`,
    bodyEn: `${reviewerName} updated their review.`,
    data: { providerId },
  });
}

export async function notifyVerificationApproved(userId, badgeType) {
  const badge = badgeType === 'verified' ? 'vérifié complet' : 'identité vérifiée';
  return createNotification(userId, {
    type: 'verification_approved', channelId: 'verifications',
    titleFr: 'Vérification approuvée',
    bodyFr:  `Félicitations ! Badge ${badge} obtenu.`,
    titleEn: 'Verification approved',
    bodyEn:  'Your verification badge has been granted.',
  });
}

export async function notifyVerificationRejected(userId, reason) {
  return createNotification(userId, {
    type: 'verification_rejected', channelId: 'verifications',
    titleFr: 'Demande de vérification refusée',
    bodyFr:  reason || 'Votre dossier n\'a pas été accepté. Soumettez de nouveaux documents.',
    titleEn: 'Verification request rejected',
    bodyEn:  'Your request was not approved. Please submit new documents.',
  });
}

export async function notifySubscriptionActivated(userId, planName) {
  return createNotification(userId, {
    type: 'subscription_activated', channelId: 'payments',
    titleFr: 'Abonnement activé',
    bodyFr:  `Votre plan ${planName} est actif. Profitez d'une meilleure visibilité !`,
    titleEn: 'Subscription activated',
    bodyEn:  `Your ${planName} plan is now active.`,
  });
}

export async function notifySubscriptionExpiring(userId, planName, daysLeft) {
  return createNotification(userId, {
    type: 'subscription_expiring', channelId: 'payments',
    titleFr: 'Abonnement bientôt expiré',
    bodyFr:  `Votre plan ${planName} expire dans ${daysLeft} jour(s). Renouvelez !`,
    titleEn: 'Subscription expiring soon',
    bodyEn:  `Your ${planName} plan expires in ${daysLeft} day(s).`,
  });
}

export async function notifyNewFavorite(providerId) {
  const [rows] = await query('SELECT user_id FROM providers WHERE id = ?', [providerId]);
  if (!rows.length) return;
  return createNotification(rows[0].user_id, {
    type: 'new_favorite',
    titleFr: 'Nouveau favori',
    bodyFr:  'Un utilisateur a ajouté votre fiche à ses favoris.',
    titleEn: 'New favorite',
    bodyEn:  'A user added your profile to their favorites.',
  });
}

export async function notifyInactiveProvider(userId, providerName) {
  return createNotification(userId, {
    type: 'contact_reminder',
    titleFr: 'Votre fiche est active',
    bodyFr:  `${providerName}, des clients cherchent vos services. Mettez à jour votre disponibilité.`,
    titleEn: 'Your profile is active',
    bodyEn:  `Clients are looking for your services. Update your availability to be seen.`,
  });
}