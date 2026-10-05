/**
 * ADMA — Contrôleur Abonnements Admin
 */
import { query } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { computeNewLoyaltyMonths } from '../../services/pricingService.js';

// Hiérarchie des plans (pour empêcher les downgrades)
const PLAN_RANK = {
  free:         0,
  premium:      1,
  professional: 2,
  enterprise:   3,
};

const MAX_DAYS = 90;

export async function getSubscriptions(req, res) {
  const { plan, status, q, page = 1, limit = 20 } = req.query;
  const pageNum  = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const offset   = (pageNum - 1) * limitNum;

  const conds = ['1=1'];
  const params = [];

  if (plan && plan !== 'all')     { conds.push('s.plan = ?');   params.push(plan); }
  if (status && status !== 'all') { conds.push('s.status = ?'); params.push(status); }

  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    conds.push('(p.name LIKE ? OR u.phone LIKE ?)');
    params.push(term, term);
  }

  const where = conds.join(' AND ');

  const [subscriptions] = await query(
    `SELECT s.*,
            p.name AS provider_name, p.specialty AS provider_specialty, p.plan AS provider_current_plan,
            u.phone AS user_phone, CONCAT(u.first_name, ' ', u.last_name) AS user_name
     FROM subscriptions s
     JOIN providers p ON p.id = s.provider_id
     JOIN users u ON u.id = p.user_id
     WHERE ${where}
     ORDER BY s.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limitNum, offset]
  );

  const [[{ total }]] = await query(
    `SELECT COUNT(*) AS total
     FROM subscriptions s
     JOIN providers p ON p.id = s.provider_id
     JOIN users u ON u.id = p.user_id
     WHERE ${where}`,
    params
  );

  res.json({
    success: true,
    data: {
      subscriptions,
      pagination: {
        page: pageNum, limit: limitNum, total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    },
  });
}

/**
 * Liste des prestataires éligibles à un upgrade depuis l'admin.
 * Renvoie : liste avec plan actuel, pour filtrer côté client.
 */
export async function getUpgradableProviders(req, res) {
  const [rows] = await query(
    `SELECT p.id, p.name, p.plan, p.plan_expires_at,
            u.phone,
            ci.name AS city_name
     FROM providers p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN cities ci ON ci.id = p.city_id
     WHERE p.is_active = TRUE
       AND p.deleted_at IS NULL
       AND p.plan != 'enterprise'
     ORDER BY p.name ASC
     LIMIT 500`
  );

  // Enrichir avec la liste des plans supérieurs possibles
  const enriched = rows.map((p) => {
    const rank = PLAN_RANK[p.plan] ?? 0;
    const upgradablePlans = Object.entries(PLAN_RANK)
      .filter(([, r]) => r > rank)
      .map(([key]) => key);

    return { ...p, upgradablePlans };
  });

  res.json({ success: true, data: enriched });
}

export async function manualActivateSubscription(req, res) {
  const { providerId, plan, days = 30 } = req.body;

  // Validation
  if (!providerId || !plan) {
    throw new AppError('Prestataire et plan requis', 400, 'MISSING_FIELDS');
  }

  if (!PLAN_RANK.hasOwnProperty(plan) || plan === 'free') {
    throw new AppError('Plan invalide', 400, 'INVALID_PLAN');
  }

  const daysNum = parseInt(days, 10);
  if (isNaN(daysNum) || daysNum < 1 || daysNum > MAX_DAYS) {
    throw new AppError(`La durée doit être comprise entre 1 et ${MAX_DAYS} jours`, 400, 'INVALID_DAYS');
  }

  const [prov] = await query(
    'SELECT id, name, plan, loyalty_months, plan_expires_at FROM providers WHERE id = ?',
    [providerId]
  );
  if (!prov.length) throw new AppError('Prestataire introuvable', 404, 'NOT_FOUND');

  const currentPlan = prov[0].plan;
  const currentRank = PLAN_RANK[currentPlan] ?? 0;
  const newRank     = PLAN_RANK[plan] ?? 0;

  if (newRank <= currentRank) {
    throw new AppError(
      `Impossible : le prestataire a déjà un plan égal ou supérieur (${currentPlan}). Seuls les upgrades sont autorisés.`,
      400,
      'DOWNGRADE_NOT_ALLOWED'
    );
  }

  // Calcul de la nouvelle date d'expiration
  // Si un plan existe déjà et n'est pas expiré → on ajoute à la date d'expiration actuelle
  const now = new Date();
  const currentExpiry = prov[0].plan_expires_at ? new Date(prov[0].plan_expires_at) : null;
  const baseDate = currentExpiry && currentExpiry > now ? currentExpiry : now;

  const endDate = new Date(baseDate);
  endDate.setDate(endDate.getDate() + daysNum);
  const endStr = endDate.toISOString().slice(0, 10);

  // Clôturer les anciens abonnements actifs
  await query(
    "UPDATE subscriptions SET status = 'expired' WHERE provider_id = ? AND status = 'active'",
    [providerId]
  );

  // Créer le nouvel abonnement
  await query(
    `INSERT INTO subscriptions (provider_id, plan, amount, base_amount, discount_percent, start_date, end_date, status, activated_by)
     VALUES (?, ?, 0, 0, 0, CURDATE(), ?, 'active', 'admin')`,
    [providerId, plan, endStr]
  );

  // Nouveau compteur fidélité : on garde la logique existante
  const newLoyaltyMonths = computeNewLoyaltyMonths(prov[0]);

  await query(
    `UPDATE providers
     SET plan = ?, plan_expires_at = ?, loyalty_months = ?, last_renewal_at = NOW()
     WHERE id = ?`,
    [plan, endDate, newLoyaltyMonths, providerId]
  );

  await query(
    'INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?,?,?,?,?)',
    [
      req.admin.id, 'subscription_activate', 'provider', providerId,
      JSON.stringify({ plan, days: daysNum, previousPlan: currentPlan, providerName: prov[0].name }),
    ]
  );

  res.json({
    success: true,
    message: `Plan ${plan} activé pour ${daysNum} jours (upgrade depuis ${currentPlan})`,
    data: { plan, expiresAt: endDate },
  });
}

export async function cancelSubscription(req, res) {
  const { id } = req.params;

  const [sub] = await query('SELECT * FROM subscriptions WHERE id = ?', [id]);
  if (!sub.length) throw new AppError('Abonnement introuvable', 404, 'NOT_FOUND');

  const currentSub = sub[0];

  await query(
    "UPDATE subscriptions SET status = 'cancelled', cancelled_at = NOW() WHERE id = ?",
    [id]
  );

  await query(
    "UPDATE providers SET plan = 'free', plan_expires_at = NULL WHERE id = ?",
    [currentSub.provider_id]
  );

  await query(
    'INSERT INTO admin_logs (admin_id, action, target_type, target_id) VALUES (?,?,?,?)',
    [req.admin.id, 'subscription_cancel', 'subscription', id]
  );

  res.json({ success: true, message: 'Abonnement annulé avec succès' });
}