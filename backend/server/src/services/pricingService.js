/**
 * ADMA — Service de tarification fidélité
 *
 * Mois 1  : prix plein
 * Mois 2  : remise intermédiaire
 * Mois 3+ : prix plancher
 * Reset après 30 jours sans renouvellement.
 */

const BASE_PRICES = {
  premium:      1300,
  professional: 3900,
  enterprise:   7500,
};

const FLOOR_PRICES = {
  premium:      850,
  professional: 2500,
  enterprise:   4900,
};

const PLAN_RADIUS_KM = {
  free:         3,
  premium:      5,
  professional: 8,
  enterprise:   Infinity,
};

const PLANS_GRID = {
  premium:      { prices: [1300, 1100,  850], radius: 5 },
  professional: { prices: [3900, 3200, 2500], radius: 8 },
  enterprise:   { prices: [7500, 6200, 4900], radius: Infinity },
};

function roundToNearest100(value) {
  return Math.round(value / 100) * 100;
}

export function computePrice(plan, loyaltyMonths = 0) {
  const base  = BASE_PRICES[plan];
  const floor = FLOOR_PRICES[plan];
  if (!base || !floor) throw new Error(`Plan inconnu : ${plan}`);

  let finalPrice;
  let tier;

  if (loyaltyMonths <= 0) {
    finalPrice = base;
    tier = 'standard';
  } else if (loyaltyMonths === 1) {
    finalPrice = roundToNearest100((base + floor) / 2);
    tier = 'intermediate';
  } else {
    finalPrice = floor;
    tier = 'floor';
  }

  const discountPercent = Math.round((1 - finalPrice / base) * 100);
  const savings = base - finalPrice;

  return { basePrice: base, finalPrice, discountPercent, savings, tier };
}

export function computeNewLoyaltyMonths(provider) {
  const current = provider.loyalty_months || 0;
  if (!provider.plan_expires_at) return 1;

  const now       = Date.now();
  const expiresAt = new Date(provider.plan_expires_at).getTime();

  if (now <= expiresAt) return current + 1;

  const daysSinceExpiry = (now - expiresAt) / (1000 * 60 * 60 * 24);
  if (daysSinceExpiry <= 30) return current + 1;

  return 1;
}

export function getPlansGrid() {
  return PLANS_GRID;
}

export { BASE_PRICES, FLOOR_PRICES, PLAN_RADIUS_KM, PLANS_GRID };