/**
 * ADMA — Service de tarification (fidélité progressive)
 */

// ── Hiérarchie des plans (0 = plus bas) ─────────────────────────
export const PLAN_LEVELS = {
  free:         0,
  premium:      1,
  professional: 2,
  enterprise:   3,
};

// ── Durée en jours par plan ─────────────────────────────────────
export const PLAN_DAYS = {
  premium:      30,
  professional: 30,
  enterprise:   30,
};

// ── Vérifier si c'est un downgrade ──────────────────────────────
export function isDowngrade(currentPlan, newPlan) {
  return (PLAN_LEVELS[newPlan] ?? 0) < (PLAN_LEVELS[currentPlan] ?? 0);
}

// ── Vérifier si c'est un upgrade ────────────────────────────────
export function isUpgrade(currentPlan, newPlan) {
  return (PLAN_LEVELS[newPlan] ?? 0) > (PLAN_LEVELS[currentPlan] ?? 0);
}

// ── Calcul du prix avec fidélité ────────────────────────────────
// (Garde ta logique existante — exemple ci-dessous)
const BASE_PRICES = {
  premium:      { base: 5000,  prices: [5000,  4500,  4000] },
  professional: { base: 10000, prices: [10000, 9000,  8000] },
  enterprise:   { base: 20000, prices: [20000, 18000, 16000] },
};

export function computePrice(plan, loyaltyMonths = 0) {
  const config = BASE_PRICES[plan];
  if (!config) {
    throw new Error(`Plan inconnu: ${plan}`);
  }

  const step = Math.min(loyaltyMonths, 2); // 0, 1, 2
  const finalPrice = config.prices[step];
  const basePrice  = config.base;
  const discountPercent = Math.round(
    ((basePrice - finalPrice) / basePrice) * 100
  );

  return {
    basePrice,
    finalPrice,
    discountPercent,
    step,
  };
}

// ── Calcul des mois de fidélité ─────────────────────────────────
export function computeNewLoyaltyMonths(provider) {
  const current = provider.loyalty_months || 0;

  // Si le dernier renouvellement était il y a moins de 60 jours
  // → on incrémente, sinon on repart de 0
  if (!provider.last_renewal_at) {
    return 1;
  }

  const lastRenewal = new Date(provider.last_renewal_at);
  const daysSince = Math.floor((Date.now() - lastRenewal) / 86400000);

  if (daysSince <= 60) {
    return Math.min(current + 1, 3);
  }
  return 1; // reset
}