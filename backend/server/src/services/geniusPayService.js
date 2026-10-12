/**
 * ADMA — Service GeniusPay (Mobile Money Afrique)
 * Orange Money + MTN MoMo Cameroun (XAF)
 */
import crypto from 'crypto';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

// ── Requête générique vers l'API GeniusPay ──────────────────────
async function geniusPayRequest(method, path, body = null) {
  const url     = `${config.geniusPay.baseUrl}${path}`;
  const payload = body ? JSON.stringify(body) : '';

  // 🔍 LOG CRITIQUE : affiche l'URL COMPLÈTE et le baseUrl utilisé
  logger.info('🔍 URL GENIUSPAY CONSTRUITE', {
    baseUrl:  config.geniusPay.baseUrl,
    baseUrlLength: config.geniusPay.baseUrl?.length,
    baseUrlHex: config.geniusPay.baseUrl?.split('').map(c => c.charCodeAt(0)).join(','),
    path,
    fullUrl:  url,
    hasTrailingSpace: config.geniusPay.baseUrl?.endsWith(' '),
    hasLeadingSpace:  config.geniusPay.baseUrl?.startsWith(' '),
  });

  // 🛡️ 1. Vérifier que les clés sont présentes
  if (!config.geniusPay.apiKey || !config.geniusPay.secretKey) {
    const err = new Error(
      'GeniusPay : clés API manquantes (GENIUSPAY_API_KEY / GENIUSPAY_SECRET_KEY)'
    );
    err.statusCode = 500;
    err.code       = 'GENIUSPAY_CONFIG_MISSING';
    logger.error(err.message);
    throw err;
  }

  logger.debug('GeniusPay → requête', { method, url });

  // 🛡️ 2. Fetch avec try/catch
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key':    config.geniusPay.apiKey,
        'X-API-Secret': config.geniusPay.secretKey,
      },
      ...(body ? { body: payload } : {}),
    });
  } catch (fetchErr) {
    logger.error('GeniusPay — fetch a échoué', {
      url,
      error: fetchErr.message,
    });
    const err = new Error(`Impossible de joindre GeniusPay : ${fetchErr.message}`);
    err.statusCode = 502;
    err.code       = 'GENIUSPAY_NETWORK_ERROR';
    throw err;
  }

  // 🛡️ 3. Vérifier le Content-Type AVANT de lire le body
  const contentType = res.headers.get('content-type') || '';

  // 🛡️ 4. Lire le corps brut (text)
  const rawText = await res.text();

  logger.debug('GeniusPay ← réponse brute', {
    status: res.status,
    contentType,
    bodyPreview: rawText.slice(0, 300),
  });

  // 🛡️ 5. Si HTML détecté → erreur claire
  if (contentType.includes('text/html')) {
    logger.error('GeniusPay — réponse HTML (mauvaise URL ?)', {
      url,
      status: res.status,
      contentType,
      bodyPreview: rawText.slice(0, 200),
    });
    const err = new Error(
      `GeniusPay a renvoyé du HTML au lieu de JSON. ` +
      `Vérifie que l'URL appelée est correcte : ${url}`
    );
    err.statusCode = 502;
    err.code       = 'GENIUSPAY_HTML_RESPONSE';
    err.details    = { url, status: res.status, contentType };
    throw err;
  }

  // 🛡️ 6. Parser le JSON seulement si le corps n'est pas vide
  let data = null;
  if (rawText && rawText.length > 0) {
    try {
      data = JSON.parse(rawText);
    } catch (parseErr) {
      logger.error('GeniusPay — réponse non-JSON', {
        url,
        status: res.status,
        contentType,
        bodyPreview: rawText.slice(0, 300),
      });
      const err = new Error('Réponse GeniusPay invalide (non-JSON)');
      err.statusCode = 502;
      err.code       = 'GENIUSPAY_INVALID_RESPONSE';
      throw err;
    }
  }

  // 🛡️ 7. Gérer les erreurs HTTP
  if (!res.ok) {
    logger.error('GeniusPay API error', {
      status: res.status,
      url,
      data,
    });
    const err = new Error(
      data?.error?.message || data?.message || `Erreur GeniusPay (HTTP ${res.status})`
    );
    err.statusCode = 502;
    err.code       = data?.error?.code || 'GENIUSPAY_ERROR';
    err.details    = data;
    throw err;
  }

  // 🛡️ 8. Corps vide = erreur explicite
  if (data === null) {
    logger.error('GeniusPay — réponse 2xx mais corps vide', {
      url,
      status: res.status,
    });
    const err = new Error('Réponse GeniusPay vide');
    err.statusCode = 502;
    err.code       = 'GENIUSPAY_EMPTY_RESPONSE';
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

  const cleanedPhone = phone.replace(/\s/g, '');
  const finalPhone   = cleanedPhone.startsWith('+')
    ? cleanedPhone
    : `+237${cleanedPhone.replace(/^237/, '')}`;

  const payload = {
    amount,
    currency:       'XAF',
    payment_method: 'pawapay',
    mmo_provider:   mmoProvider,
    description:    description || `Adma — Abonnement ${plan}`,
    customer: {
      phone:   finalPhone,
      country: 'CM',
    },
    metadata: {
      plan,
      reference,
      operator,
    },
  };

  logger.info('GeniusPay → initiatePayment', {
    amount,
    operator,
    mmoProvider,
    phone: finalPhone,
    reference,
  });

  const data = await geniusPayRequest('POST', '/payments', payload);

  // 🛡️ Vérifier que data.data existe avant d'y accéder
  if (!data || !data.data) {
    logger.error('GeniusPay — réponse sans .data', { data });
    const err = new Error('Réponse GeniusPay sans données (data manquant)');
    err.statusCode = 502;
    err.code       = 'GENIUSPAY_NO_DATA';
    throw err;
  }

  const d = data.data;

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

// ── Vérifier un paiement ────────────────────────────────────────
export async function verifyPayment(reference) {
  const data = await geniusPayRequest('GET', `/payments/${reference}`);

  if (!data || !data.data) {
    logger.error('GeniusPay — verifyPayment sans .data', { reference, data });
    const err = new Error('Réponse GeniusPay sans données');
    err.statusCode = 502;
    err.code       = 'GENIUSPAY_NO_DATA';
    throw err;
  }

  const d = data.data;

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
export function verifyWebhookSignature(rawBody, signature, timestamp) {
  if (!config.geniusPay.webhookSecret || !signature || !timestamp) {
    logger.warn('GeniusPay webhook — secret/signature/timestamp manquant');
    return false;
  }

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