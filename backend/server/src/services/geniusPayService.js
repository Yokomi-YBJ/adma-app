/**
 * ADMA — Service GeniusPay (Mobile Money Cameroun)
 * Mode DIRECT USSD (comme KPay) — pas de checkout web
 */
import crypto from 'crypto';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

// ── Requête générique vers l'API GeniusPay ──────────────────────
async function geniusPayRequest(method, path, body = null) {
  const url     = `${config.geniusPay.baseUrl}${path}`;
  const payload = body ? JSON.stringify(body) : '';

  logger.info('🔍 URL GENIUSPAY', {
    baseUrl: config.geniusPay.baseUrl,
    path,
    fullUrl: url,
    method,
  });

  if (!config.geniusPay.apiKey || !config.geniusPay.secretKey) {
    const err = new Error(
      'GeniusPay : clés API manquantes (GENIUSPAY_API_KEY / GENIUSPAY_SECRET_KEY)'
    );
    err.statusCode = 500;
    err.code       = 'GENIUSPAY_CONFIG_MISSING';
    logger.error(err.message);
    throw err;
  }

  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept':       'application/json',
        'User-Agent':   'AdmaBackend/1.0 (+https://adma-app.onrender.com)',
        'X-API-Key':    config.geniusPay.apiKey,
        'X-API-Secret': config.geniusPay.secretKey,
      },
      ...(body ? { body: payload } : {}),
      redirect: 'manual',
    });
  } catch (fetchErr) {
    logger.error('GeniusPay — fetch a échoué', { url, error: fetchErr.message });
    const err = new Error(`Impossible de joindre GeniusPay : ${fetchErr.message}`);
    err.statusCode = 502;
    err.code       = 'GENIUSPAY_NETWORK_ERROR';
    throw err;
  }

  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get('location');
    logger.error('🚨 GeniusPay a REDIRIGÉ', { status: res.status, location, url });
    const err = new Error(`GeniusPay a redirigé vers ${location}`);
    err.statusCode = 502;
    err.code       = 'GENIUSPAY_REDIRECTED';
    throw err;
  }

  const contentType = res.headers.get('content-type') || '';
  const rawText     = await res.text();

  logger.debug('GeniusPay ← réponse', {
    status:      res.status,
    contentType,
    bodyPreview: rawText.slice(0, 500),
  });

  if (contentType.includes('text/html')) {
    const err = new Error(`GeniusPay a renvoyé du HTML au lieu de JSON. URL : ${url}`);
    err.statusCode = 502;
    err.code       = 'GENIUSPAY_HTML_RESPONSE';
    logger.error(err.message);
    throw err;
  }

  let data = null;
  if (rawText && rawText.length > 0) {
    try {
      data = JSON.parse(rawText);
    } catch {
      const err = new Error('Réponse GeniusPay invalide (non-JSON)');
      err.statusCode = 502;
      err.code       = 'GENIUSPAY_INVALID_RESPONSE';
      throw err;
    }
  }

  if (!res.ok) {
    const err = new Error(
      data?.error?.message || data?.message || `Erreur GeniusPay (HTTP ${res.status})`
    );
    err.statusCode = 502;
    err.code       = data?.error?.code || 'GENIUSPAY_ERROR';
    err.details    = data;
    logger.error('GeniusPay API error', { status: res.status, url, data });
    throw err;
  }

  if (data === null) {
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

// ── Initier un paiement DIRECT (USSD push) ──────────────────────
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
    description:    `Adma Abonnement ${plan}`,
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

  logger.info('GeniusPay → initiatePayment (DIRECT USSD)', {
    amount,
    operator,
    mmoProvider,
    phone: finalPhone,
    reference,
    mode:  'direct',
  });

  const data = await geniusPayRequest('POST', '/payments', payload);

  if (!data || !data.data) {
    logger.error('GeniusPay — réponse sans .data', { data });
    const err = new Error('Réponse GeniusPay sans données');
    err.statusCode = 502;
    err.code       = 'GENIUSPAY_NO_DATA';
    throw err;
  }

  const d = data.data;

  logger.info('GeniusPay — Paiement initié', {
    reference:   d.reference,
    status:      d.status,
    amount:      d.amount,
    currency:    d.currency,
    gateway:     d.gateway,
    paymentUrl:  d.payment_url  || null,
    checkoutUrl: d.checkout_url || null,
    expiresAt:   d.expires_at   || null,
  });

  // ✅ #15 : Retourner les DEUX URLs séparément + expiresAt
  return {
    paymentId:   d.id,
    reference:   d.reference || reference,
    status:      mapStatus(d.status),
    paymentUrl:  d.payment_url  || null,   // USSD direct (prod)
    checkoutUrl: d.checkout_url || null,   // Page web (sandbox)
    expiresAt:   d.expires_at   || null,   // #13 : date d'expiration
    rawStatus:   d.status,
  };
}

// ── Vérifier un paiement ────────────────────────────────────────
export async function verifyPayment(reference) {
  const data = await geniusPayRequest('GET', `/payments/${reference}`);

  if (!data || !data.data) {
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

// ── Mapping statuts ─────────────────────────────────────────────
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
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  const ts  = parseInt(timestamp, 10);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > 300) {
    logger.warn('Webhook timestamp invalide', { ts, now });
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