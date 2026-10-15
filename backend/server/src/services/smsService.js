/**
 * ADMA — Service SMS via MboaSMS (Cameroun)
 * Documentation : https://mboasms.com/api-docs
 *
 * ✅ Utilisé UNIQUEMENT pour les OTP mobiles (utilisateurs finaux)
 * ❌ N'est PAS utilisé pour l'auth admin (qui passe par Resend/email)
 *
 * ✅ Envoi OTP sans senderId (utilise le sender par défaut du compte MboaSMS)
 * ✅ Support optionnel de senderId si configuré
 * ✅ Idempotency-Key pour éviter les doublons
 */
import crypto from 'crypto';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

const MBOASMS_BASE_URL = 'https://api.mboasms.com';
const OTP_ENDPOINT     = '/api/v1/developer/sms/send-otp';

/**
 * Envoyer un SMS via MboaSMS
 *
 * @param {string} to - Numéro destinataire (+237XXXXXXXXX)
 * @param {string} message - Contenu du SMS
 * @param {Object} [options]
 * @param {string} [options.senderId]        - Sender ID personnalisé (optionnel)
 * @param {string} [options.idempotencyKey]  - Clé d'idempotence (optionnel)
 */
export async function sendSMS(to, message, options = {}) {
  const { senderId, idempotencyKey } = options;

  // ── 1. Vérifier la clé API ─────────────────────────────────────
  if (!config.mboaSMS?.apiKey) {
    logger.error('MboaSMS : MBOASMS_API_KEY manquante');
    const err = new Error('Configuration SMS manquante');
    err.statusCode = 503;
    err.code       = 'SMS_CONFIG_MISSING';
    throw err;
  }

  // ── 2. Normaliser le numéro ────────────────────────────────────
  const cleanPhone = String(to).replace(/\s/g, '');
  const finalPhone = cleanPhone.startsWith('+')
    ? cleanPhone
    : `+237${cleanPhone.replace(/^237/, '')}`;

  // ── 3. Construire le payload ───────────────────────────────────
  // ⚠️ senderId est OPTIONNEL — si absent, MboaSMS utilise le sender par défaut du compte
  const payload = {
    phoneNumbers: [finalPhone],
    message,
  };

  if (senderId) {
    payload.senderId = senderId;
  }

  // ── 4. Headers ─────────────────────────────────────────────────
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key':    config.mboaSMS.apiKey,
  };

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  // ── 5. Log ─────────────────────────────────────────────────────
  logger.info('MboaSMS → envoi SMS', {
    to:                finalPhone,
    senderId:          senderId || '(défaut compte)',
    hasIdempotencyKey: !!idempotencyKey,
    messageLength:     message.length,
  });

  // ── 6. Appel API ───────────────────────────────────────────────
  let res;
  try {
    res = await fetch(`${MBOASMS_BASE_URL}${OTP_ENDPOINT}`, {
      method:   'POST',
      headers,
      body:     JSON.stringify(payload),
      redirect: 'manual',
    });
  } catch (fetchErr) {
    logger.error('MboaSMS — fetch échoué', {
      to:    finalPhone,
      error: fetchErr.message,
    });
    const err = new Error('Impossible de joindre le service SMS');
    err.statusCode = 503;
    err.code       = 'SMS_NETWORK_ERROR';
    throw err;
  }

  // ── 7. Parser la réponse ───────────────────────────────────────
  const contentType = res.headers.get('content-type') || '';
  const rawText     = await res.text();

  let data = null;
  if (rawText && rawText.length > 0) {
    try {
      data = JSON.parse(rawText);
    } catch {
      logger.error('MboaSMS — réponse non-JSON', {
        status:      res.status,
        bodyPreview: rawText.slice(0, 300),
      });
      const err = new Error('Réponse SMS invalide');
      err.statusCode = 502;
      err.code       = 'SMS_INVALID_RESPONSE';
      throw err;
    }
  }

  // ── 8. Erreurs HTTP ────────────────────────────────────────────
  if (!res.ok) {
    logger.error('MboaSMS — erreur API', { status: res.status, data });

    if (res.status === 429) {
      const err = new Error('Trop de SMS envoyés. Réessayez dans quelques secondes.');
      err.statusCode = 429;
      err.code       = 'SMS_RATE_LIMIT';
      throw err;
    }

    const err = new Error(
      data?.errorMessage || data?.message || `Échec envoi SMS (${res.status})`
    );
    err.statusCode = 503;
    err.code       = 'SMS_SEND_FAILED';
    err.details    = data;
    throw err;
  }

  // ── 9. Succès ──────────────────────────────────────────────────
  logger.info('MboaSMS — SMS envoyé', {
    to:              finalPhone,
    requestId:       data?.requestId,
    status:          data?.status,
    remainingCredit: data?.remainingCredit,
  });

  return {
    success:         true,
    requestId:       data?.requestId,
    status:          data?.status,
    remainingCredit: data?.remainingCredit,
    results:         data?.results,
  };
}

/**
 * Envoyer un OTP par SMS (raccourci utilisé par authController)
 */
export async function sendOTPSms(phone, code, expiresMinutes = 10) {
  const message = `Adma — Code de vérification : ${code}\nValable ${expiresMinutes} min. Ne le partagez avec personne.`;

  const idempotencyKey = `otp-${phone}-${code}-${Date.now()}`;

  // ⚠️ Pas de senderId → MboaSMS utilise le sender par défaut du compte
  return sendSMS(phone, message, { idempotencyKey });
}