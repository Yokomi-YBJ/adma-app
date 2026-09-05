/**
 * ADMA — Service SMS via Orange Developer Cameroun
 */
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

// ── Cache du token OAuth2 ─────────────────────────────────────────
// Le token dure 90 jours. On le garde en mémoire et on le renouvelle
// 10 minutes avant expiration.
let cachedToken      = null;
let tokenExpiresAt   = 0;

const TOKEN_URL = 'https://api.orange.com/oauth/v2/token';
const SMS_URL   = 'https://api.orange.com/smsmessaging/v1/outbound';

/**
 * Obtenir un access token OAuth2 (Client Credentials)
 * Le token est mis en cache pour éviter un appel à chaque SMS
 */
async function getAccessToken() {
  // Retourner le token en cache s'il est encore valide (marge 10 min)
  if (cachedToken && Date.now() < tokenExpiresAt - 10 * 60 * 1000) {
    return cachedToken;
  }

  // Construire le header Basic Auth = Base64(clientId:clientSecret)
  const credentials = Buffer.from(
    `${config.orange.clientId}:${config.orange.clientSecret}`
  ).toString('base64');

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const err = await res.text();
    logger.error('Orange SMS — Erreur token OAuth2', { status: res.status, err });
    throw new Error('Impossible d\'obtenir le token Orange SMS');
  }

  const data = await res.json();
  cachedToken    = data.access_token;
  // expires_in est en secondes (90 jours = 7776000s)
  tokenExpiresAt = Date.now() + data.expires_in * 1000;

  logger.info('Orange SMS — Token OAuth2 renouvelé');
  return cachedToken;
}

/**
 * Envoyer un SMS via l'API Orange Cameroun
 * @param {string} to      - Numéro destinataire format +237XXXXXXXXX
 * @param {string} message - Contenu du SMS (max 160 car. pour 1 SMS)
 */
export async function sendSMS(to, message) {
  if (process.env.NODE_ENV === 'development') {
    logger.warn(`[DEV] SMS vers ${to}: ${message}`);
    return true;
  }

  // Normaliser le numéro : supprimer le + pour l'URL, le garder pour le body
  const senderNumber   = config.orange.senderNumber.replace('+', '');
  const recipientClean = to.replace('+', '');

  try {
    const token = await getAccessToken();

    // URL : /outbound/tel:+{senderNumber}/requests
    const url = `${SMS_URL}/tel:+${senderNumber}/requests`;

    const res = await fetch(url, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        outboundSMSMessageRequest: {
          address:       `tel:+${recipientClean}`,
          senderAddress: `tel:+${senderNumber}`,
          outboundSMSTextMessage: { message },
        },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      logger.error('Orange SMS — Échec envoi', { to, status: res.status, errBody });
      throw new Error(`Échec envoi SMS Orange (${res.status})`);
    }

    logger.info(`Orange SMS — Envoyé à ${to}`);
    return true;
  } catch (err) {
    logger.error('Orange SMS — Erreur', { to, message: err.message });
    const e    = new Error("Impossible d'envoyer le SMS. Réessayez.");
    e.statusCode = 503;
    e.code       = 'SMS_SEND_FAILED';
    throw e;
  }
}

/**
 * Envoyer un OTP par SMS
 */
export async function sendOTPSms(phone, code, expiresMinutes = 10) {
  const message = `Adma — Code de vérification : ${code}\nValable ${expiresMinutes} min. Ne le partagez avec personne.`;
  return sendSMS(phone, message);
}
