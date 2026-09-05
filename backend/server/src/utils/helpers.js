/**
 * ADMA — Helpers divers
 */
export function normalizePhone(phone) {
  const cleaned = String(phone).replace(/\s/g, '').replace(/[^+\d]/g, '');
  if (cleaned.startsWith('+237') && cleaned.length === 13) return cleaned;
  if (cleaned.startsWith('237')  && cleaned.length === 12)  return `+${cleaned}`;
  if (/^6[5-9]\d{7}$/.test(cleaned))                        return `+237${cleaned}`;
  const err = new Error('Numéro camerounais invalide');
  err.statusCode = 400;
  throw err;
}

export function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatPrice(amount) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}
