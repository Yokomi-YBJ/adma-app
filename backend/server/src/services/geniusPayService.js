/**
 * ADMA — Service GeniusPay (Mobile Money Afrique)
 * Orange Money + MTN MoMo Cameroun (XAF)
 * Documentation : https://geniuspay.ci/docs/api
 *
 * ⚠️  On utilise uniquement XAF (Cameroun) — pas de conversion XOF.
 *     Le Cameroun est listé comme pays supporté : CM → XAF.
 */
import crypto from 'crypto';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

// ── Requête générique vers l'API GeniusPay ──────────────────────
async function geniusPayRequest(method, path, body = null) {
  const url     = `${config.geniusPay.baseUrl}${path}`;
  const payload = body ? JSON.stringify(body) : '';

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key':    config.geniusPay.apiKey,
      'X-API-Secret': config.geniusPay.secretKey,
    },
    ...(body ? { body: payload } : {}),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    logger.error('GeniusPay API error', {
      status: res.status,
      url,
      data,
    });
    const err = new Error(
      data?.error?.message || data?.message || 'Erreur GeniusPay'
    );
    err.statusCode = 502;
    err.code       = data?.error?.code || 'GENIUSPAY_ERROR';
    err.details    = data;
    throw err;
  }

  return data;
}

// ── Map opérateur ADMA → code MMO GeniusPay (Cameroun) ──────────
function mapOperatorToMmo(operator) {
  const map = {
    orange_cmr:   'ORANGE_CMR',
    mtn_momo_cmr: 'MTN_MOMO_CMR',
  };
  return map[operator] || null;
}

// ── Initier un paiement ─────────────────────────────────────────
/**
 * @param {Object} params
 * @param {number} params.amount       - Montant en XAF (entier)
 * @param {string} params.phone        - Numéro au format international (+2376XXXXXXXX)
 * @param {string} params.operator     - 'orange_cmr' | 'mtn_momo_cmr'
 * @param {string} params.plan         - 'premium' | 'professional' | 'enterprise'
 * @param {string} params.reference    - Référence externe unique (ex: PAY-...)
 * @param {string} [params.description]- Description optionnelle
 * @returns {Promise<{paymentId, reference, status, paymentUrl}>}
 */
export async function initiatePayment({
  amount,
  phone,
  operator,
  plan,
  reference,
  description,
}) {
  const mmoProvider = mapOperatorToMmo(operator);
  if (!mmoProvider) {
    const err = new Error('Opérateur non supporté (Cameroun uniquement)');
    err.statusCode = 400;
    err.code       = 'INVALID_OPERATOR';
    throw err;
  }

  // Nettoyage du numéro : retirer espaces et forcer +237...
  const cleanedPhone = phone.replace(/\s/g, '');
  const finalPhone   = cleanedPhone.startsWith('+')
    ? cleanedPhone
    : `+237${cleanedPhone.replace(/^237/, '')}`;

  // Payload GeniusPay — XAF uniquement
  const payload = {
    amount,                                // en XAF
    currency:       'XAF',                 // ← forcé en XAF (Cameroun)
    payment_method: 'pawapay',             // agrégateur MMO
    mmo_provider:   mmoProvider,           // ORANGE_CMR ou MTN_MOMO_CMR
    description:    description || `Adma — Abonnement ${plan}`,
    customer: {
      phone:   finalPhone,
      country: 'CM',                       // ← Cameroun
    },
    metadata: {
      plan,
      reference,
      operator,
    },
  };

  const data = await geniusPayRequest('POST', '/payments', payload);
  const d    = data.data || {};

  logger.info('GeniusPay — Paiement initié', {
    reference: d.reference,
    status:    d.status,
    amount:    d.amount,
    currency:  d.currency,
  });

  return {
    paymentId:  d.id,
    reference:  d.reference || reference,
    status:     mapStatus(d.status),
    paymentUrl: d.payment_url || d.checkout_url || null,
    rawStatus:  d.status,
  };
}

// ── Vérifier un paiement (par référence MTX-...) ────────────────
export async function verifyPayment(reference) {
  const data = await geniusPayRequest('GET', `/payments/${reference}`);
  const d    = data.data || {};

  return {
    id:            d.id,
    reference:     d.reference,
    status:        mapStatus(d.status),
    rawStatus:     d.status,
    amount:        d.amount,
    currency:      d.currency,
    fees:          d.fees,
    netAmount:     d.net_amount,
    paidAt:        d.completed_at || null,
    paymentMethod: d.payment_method,
    metadata:      d.metadata || {},
    customer:      d.customer || {},
  };
}

// ── Mapping statuts GeniusPay → ADMA ────────────────────────────
function mapStatus(s) {
  const map = {
    pending:    'pending',
    processing: 'processing',
    completed:  'completed',
    failed:     'failed',
    cancelled:  'cancelled',
    expired:    'failed',
    refunded:   'refunded',
  };
  return map[s?.toLowerCase()] || 'pending';
}

// ── Vérification signature webhook ──────────────────────────────
/**
 * Format GeniusPay :
 *   signature = HMAC-SHA256( timestamp + "." + json_payload , webhook_secret )
 *
 * Headers :
 *   X-Webhook-Signature
 *   X-Webhook-Timestamp
 *   X-Webhook-Event
 *
 * @param {Buffer|string} rawBody   - Corps brut de la requête (NON parsé)
 * @param {string}        signature - X-Webhook-Signature
 * @param {string}        timestamp - X-Webhook-Timestamp (Unix seconds)
 * @returns {boolean}
 */
export function verifyWebhookSignature(rawBody, signature, timestamp) {
  if (!config.geniusPay.webhookSecret || !signature || !timestamp) {
    logger.warn('GeniusPay webhook — secret/signature/timestamp manquant');
    return false;
  }

  // Protection replay : rejet si timestamp > 5 min
  const now = Math.floor(Date.now() / 1000);
  const ts  = parseInt(timestamp, 10);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > 300) {
    logger.warn('GeniusPay webhook — timestamp invalide ou trop ancien', { ts, now });
    return false;
  }

  const bodyStr    = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
  const dataToSign = `${timestamp}.${bodyStr}`;

  const expected = crypto
    .createHmac('sha256', config.geniusPay.webhookSecret)
    .update(dataToSign)
    .digest('hex');

  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(signature, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ── Helpers (bonus) ─────────────────────────────────────────────
/**
 * Liste des opérateurs MMO disponibles pour le Cameroun
 */
export async function getCamerounProviders() {
  const data = await geniusPayRequest('GET', '/pawapay/providers?country=CM');
  return data.data?.providers || [];
}

/**
 * Solde du compte marchand GeniusPay
 */
export async function getBalance() {
  const data = await geniusPayRequest('GET', '/account/balance');
  return data.data;
}