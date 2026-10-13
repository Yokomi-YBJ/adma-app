/**
 * ADMA — Service de tarification (fidélité progressive)
 *
 * Source de vérité : README.md section 2.4
 * Grille tarifaire :
 *   Premium      : 1300 → 1100 → 850
 *   Professional : 3900 → 3200 → 2500
 *   Enterprise   : 7500 → 6200 → 4900
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

// ── Rayons de visibilité par plan (km) ──────────────────────────
export const PLAN_RADIUS_KM = {
  free:         3,
  premium:      5,
  professional: 8,
  enterprise:   null, // illimité
};

// ── Vérifier si c'est un downgrade ──────────────────────────────
export function isDowngrade(currentPlan, newPlan) {
  return (PLAN_LEVELS[newPlan] ?? 0) < (PLAN_LEVELS[currentPlan] ?? 0);
}

// ── Vérifier si c'est un upgrade ────────────────────────────────
export function isUpgrade(currentPlan, newPlan) {
  return (PLAN_LEVELS[newPlan] ?? 0) > (PLAN_LEVELS[currentPlan] ?? 0);
}

// ── Grille tarifaire (SOURCE DE VÉRITÉ — cf. README § 2.4) ──────
const BASE_PRICES = {
  premium:      { base: 1300, prices: [1300, 1100, 850] },
  professional: { base: 3900, prices: [3900, 3200, 2500] },
  enterprise:   { base: 7500, prices: [7500, 6200, 4900] },
};

// ── Calcul du prix avec fidélité ────────────────────────────────
export function computePrice(plan, loyaltyMonths = 0) {
  const config = BASE_PRICES[plan];
  if (!config) {
    throw new Error(`Plan inconnu: ${plan}`);
  }

  const step = Math.min(Math.max(0, loyaltyMonths), 2);
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

  if (!provider.last_renewal_at) {
    return 1;
  }

  const lastRenewal = new Date(provider.last_renewal_at);
  const daysSince = Math.floor((Date.now() - lastRenewal) / 86400000);

  if (daysSince <= 60) {
    return Math.min(current + 1, 3);
  }
  return 1;
}

// ── Grille complète pour l'écran Forfaits (mobile) ──────────────
export function getPlansGrid() {
  return {
    premium: {
      prices: BASE_PRICES.premium.prices,
      radius: PLAN_RADIUS_KM.premium,
    },
    professional: {
      prices: BASE_PRICES.professional.prices,
      radius: PLAN_RADIUS_KM.professional,
    },
    enterprise: {
      prices: BASE_PRICES.enterprise.prices,
      radius: PLAN_RADIUS_KM.enterprise,
    },
  };
}