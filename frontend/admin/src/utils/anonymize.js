/**
 * Anonymisation des numéros de téléphone pour l'interface admin.
 * Format : "690123456" → "690*****56"
 *          "+237690123456" → "690*****56"
 *          null/undefined → "—"
 */
export function anonymizePhone(phone) {
  if (!phone) return '—';

  // Retire l'indicatif +237 / 237 s'il est présent
  let clean = String(phone).replace(/\s/g, '');
  clean = clean.replace(/^\+?237/, '');

  // Si ce n'est pas un numéro à 9 chiffres, on retourne une version tronquée générique
  if (clean.length < 5) return clean;

  const first3 = clean.slice(0, 3);
  const last2  = clean.slice(-2);
  return `${first3}****${last2}`;
}