/**
 * ADMA — Traduction et normalisation des erreurs API
 * Ne laisse JAMAIS passer de message brut serveur ou technique.
 */
import i18n from '../i18n';

export const ERROR_CODE_MAP = {
  // Authentification & Session
  ACCOUNT_DELETED:         'errors.ACCOUNT_DELETED',
  ACCOUNT_SUSPENDED:       'errors.ACCOUNT_SUSPENDED',
  ADMIN_EXISTS:            'errors.ADMIN_EXISTS',
  ADMIN_LOCKED_OUT:        'errors.ADMIN_LOCKED_OUT',
  ADMIN_NOT_FOUND:         'errors.ADMIN_NOT_FOUND',
  INVALID_ADMIN_TOKEN:     'errors.INVALID_ADMIN_TOKEN',
  INVALID_CREDENTIALS:     'errors.INVALID_CREDENTIALS',
  INVALID_PASSWORD:        'errors.INVALID_PASSWORD',
  INVALID_REFRESH_TOKEN:   'errors.INVALID_REFRESH_TOKEN',
  MISSING_REFRESH_TOKEN:   'errors.MISSING_REFRESH_TOKEN',
  TOKEN_EXPIRED:           'errors.TOKEN_EXPIRED',
  UNAUTHORIZED:            'errors.UNAUTHORIZED',
  USER_NOT_FOUND:          'errors.USER_NOT_FOUND',
  WEAK_PASSWORD:           'errors.WEAK_PASSWORD',

  // OTP
  OTP_EXPIRED:             'errors.OTP_EXPIRED',
  OTP_INVALID:             'errors.OTP_INVALID',
  OTP_MAX_ATTEMPTS:        'errors.OTP_MAX_ATTEMPTS',

  // Rate Limiting
  RATE_LIMIT:              'errors.RATE_LIMIT',
  RATE_LIMIT_EXCEEDED:     'errors.RATE_LIMIT_EXCEEDED',

  // Prestataires & Contenu
  ALREADY_FAVORITE:        'errors.ALREADY_FAVORITE',
  ALREADY_RESPONDED:       'errors.ALREADY_RESPONDED',
  ALREADY_REVIEWED:        'errors.ALREADY_REVIEWED',
  CANNOT_DEACTIVATE_SELF:  'errors.CANNOT_DEACTIVATE_SELF',
  CANT_REVIEW_OWN:         'errors.CANT_REVIEW_OWN',
  CATEGORY_HAS_CHILDREN:   'errors.CATEGORY_HAS_CHILDREN',
  NO_PROVIDER:             'errors.NO_PROVIDER',
  PROVIDER_EXISTS:         'errors.PROVIDER_EXISTS',
  PROVIDER_NOT_FOUND:      'errors.PROVIDER_NOT_FOUND',
  REPORT_NOT_FOUND:        'errors.REPORT_NOT_FOUND',
  REQUEST_PENDING:         'errors.REQUEST_PENDING',
  VERIFICATION_NOT_FOUND:  'errors.VERIFICATION_NOT_FOUND',

  // Fichiers & Données
  DATA_TOO_LONG:           'errors.DATA_TOO_LONG',
  DUPLICATE:               'errors.DUPLICATE',
  EMAIL_EXISTS:            'errors.EMAIL_EXISTS',
  EMAIL_SEND_FAILED:       'errors.EMAIL_SEND_FAILED',
  FEATURE_NOT_ALLOWED:     'errors.FEATURE_NOT_ALLOWED',
  LIMIT_FILE_SIZE:         'errors.LIMIT_FILE_SIZE',
  LIMIT_UNEXPECTED_FILE:   'errors.LIMIT_UNEXPECTED_FILE',
  MISSING_CNI:             'errors.MISSING_CNI',
  MISSING_FIELDS:          'errors.MISSING_FIELDS',
  NO_DATA:                 'errors.NO_DATA',
  NO_FILE:                 'errors.NO_FILE',
  PAYLOAD_TOO_LARGE:       'errors.PAYLOAD_TOO_LARGE',
  RESOURCE_LOCKED:         'errors.RESOURCE_LOCKED',
  UPLOAD_ERROR:            'errors.UPLOAD_ERROR',
  VALIDATION_ERROR:        'errors.VALIDATION_ERROR',

  // Paramètres & Requêtes
  FORBIDDEN:               'errors.FORBIDDEN',
  INVALID_ACTION:          'errors.INVALID_ACTION',
  INVALID_BOUNDS:          'errors.INVALID_BOUNDS',
  INVALID_COORDS:          'errors.INVALID_COORDS',
  INVALID_DATE:            'errors.INVALID_DATE',
  INVALID_DAYS:            'errors.INVALID_DAYS',
  INVALID_PAYLOAD:         'errors.INVALID_PAYLOAD',
  INVALID_PHONE:           'errors.INVALID_PHONE',
  INVALID_REFERENCE:       'errors.INVALID_REFERENCE',
  INVALID_TARGET:          'errors.INVALID_TARGET',
  INVALID_TYPE:            'errors.INVALID_TYPE',
  MISSING_ACTION:          'errors.MISSING_ACTION',
  MISSING_COORDS:          'errors.MISSING_COORDS',
  MISSING_PARAM:           'errors.MISSING_PARAM',
  MISSING_TARGET_VALUE:    'errors.MISSING_TARGET_VALUE',
  NOT_FOUND:               'errors.NOT_FOUND',
  PAST_DATE:               'errors.PAST_DATE',

  // Paiement & Abonnements
  INVALID_AMOUNT:          'errors.INVALID_AMOUNT',
  INVALID_OPERATOR:        'errors.INVALID_OPERATOR',
  INVALID_PLAN:            'errors.INVALID_PLAN',
  PAYMENT_EXPIRED:         'errors.PAYMENT_EXPIRED',
  PAYMENT_FAILED:          'errors.PAYMENT_FAILED',
  PAYMENT_NOT_FOUND:       'errors.PAYMENT_NOT_FOUND',

  // Système & Base de données
  DATABASE_UNAVAILABLE:    'errors.DATABASE_UNAVAILABLE',
  INTERNAL_ERROR:          'errors.INTERNAL_ERROR',
};

/**
 * Retourne le message utilisateur traduit pour une erreur Axios donnée
 */
export function getLocalizedErrorMessage(err) {
  if (!err) {
    return i18n.t('errors.generic', 'Une erreur inattendue est survenue.');
  }

  // Pas de réponse HTTP (Erreur réseau ou timeout)
  if (!err.response) {
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      return i18n.t('errors.timeout', "Le délai d'attente a expiré. Veuillez réessayer.");
    }
    return i18n.t('errors.network', 'Connexion internet interrompue. Vérifiez votre réseau.');
  }

  // Réponse HTTP reçue avec code applicatif
  const code = err.response.data?.code;
  if (code && ERROR_CODE_MAP[code]) {
    return i18n.t(ERROR_CODE_MAP[code]);
  }

  // Erreur HTTP générique (404, 500...) sans code connu
  if (err.response.status === 404) {
    return i18n.t('errors.NOT_FOUND', 'Élément introuvable.');
  }
  if (err.response.status === 403) {
    return i18n.t('errors.FORBIDDEN', 'Accès non autorisé.');
  }
  if (err.response.status >= 500) {
    return i18n.t('errors.INTERNAL_ERROR', 'Une erreur interne est survenue. Veuillez réessayer.');
  }

  // Repli sécurisé : Jamais de message technique brut
  return i18n.t('errors.generic', 'Une erreur inattendue est survenue.');
}
