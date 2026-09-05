export const API_URL = 'http://192.168.1.151:5000/api/v1';
export const EAS_PROJECT_ID = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || '';

export const PLANS = {
  free:         { id:'free',         label_fr:'Gratuit',       label_en:'Free',         price:0,    color:'#6B7B8F' },
  premium:      { id:'premium',      label_fr:'Premium',       label_en:'Premium',      price:1000, color:'#5FC2BA' },
  professional: { id:'professional', label_fr:'Professionnel', label_en:'Professional', price:2500, color:'#3B556D' },
  enterprise:   { id:'enterprise',   label_fr:'Entreprise',    label_en:'Enterprise',   price:5000, color:'#0B162C' },
};

// Rayon de détectabilité géographique par plan (en km)
// Correspond à ce que le serveur applique dans la requête Haversine
export const PLAN_RADIUS = {
  free:         3,
  premium:      6,
  professional: 9,
  enterprise:   null, // illimité
};

export const TRUST_BADGE = {
  new:      { label_fr:'Nouveau',     color:'#6B7B8F' },
  caution:  { label_fr:'Prudence',    color:'#DC2626' },
  correct:  { label_fr:'Correct',     color:'#D97706' },
  reliable: { label_fr:'Très fiable', color:'#16A34A' },
};

export const CACHE_TTL = {
  categories:    24 * 60 * 60 * 1000,
  cities:        24 * 60 * 60 * 1000,
  providers:     5  * 60 * 1000,
  providerDetail:2  * 60 * 1000,
  nearby:        2  * 60 * 1000,   // Cache résultats géo 2 min
};
