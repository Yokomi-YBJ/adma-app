/**
 * ADMA — Service GeniusPay (Mobile Money Afrique)
 * Orange Money + MTN MoMo Cameroun (XAF)
 *
 * ✅ User-Agent + Accept + redirect:manual → évite les redirections HTML
 * ✅ XOF au lieu de XAF → devise pivot GeniusPay
 * ✅ Payload simplifié (mode checkout) → pas de payment_method
 */
import crypto from 'crypto';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

// ── Requête générique vers l'API GeniusPay ──────────────────────
async function geniusPayRequest(method, path, body = null) {
  const url     = `${config.geniusPay.baseUrl}${path}`;
  const payload = body ? JSON.stringify(body) : '';

  // 🔍 LOG CRITIQUE : URL exacte construite
  logger.info('🔍 URL GENIUSPAY', {
    baseUrl:       config.geniusPay.baseUrl,
    baseUrlLength: config.geniusPay.baseUrl?.length,
    path,
    fullUrl:       url,
    fullUrlLength: url.length,
    method,
  });

  // 🛡️ 1. Vérifier les clés
  if (!config.geniusPay.apiKey || !config.geniusPay.secretKey) {
    const err = new Error(
      'GeniusPay : clés API manquantes (GENIUSPAY_API_KEY / GENIUSPAY_SECRET_KEY)'
    );
    err.statusCode = 500;
    err.code       = 'GENIUSPAY_CONFIG_MISSING';
    logger.error(err.message);
    throw err;
  }

  // 🔍 Log des headers (clés masquées)
  logger.info('GeniusPay → headers envoyés', {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
    'User-Agent':   'AdmaBackend/1.0 (+https://adma-app.onrender.com)',
    'X-API-Key':    config.geniusPay.apiKey
      ? `${config.geniusPay.apiKey.slice(0, 12)}...`
      : 'ABSENT',
    'X-API-Secret': config.geniusPay.secretKey
      ? `${config.geniusPay.secretKey.slice(0, 12)}...`
      : 'ABSENT',
  });

  // 🛡️ 2. Fetch avec headers complets + redirect:manual
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
      redirect: 'manual',  // ← NE PAS suivre les redirections
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

  // 🚨 3. DÉTECTION REDIRECTION (le bug caché !)
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get('location');
    logger.error('🚨 GeniusPay a REDIRIGÉ (au lieu de JSON)', {
      status:   res.status,
      location,
      url,
      hint:     'Sans User-Agent, GeniusPay redirige vers / → fetch suivait et recevait du HTML',
    });
    const err = new Error(
      `GeniusPay a redirigé vers ${location} au lieu de répondre en JSON`
    );
    err.statusCode = 502;
    err.code       = 'GENIUSPAY_REDIRECTED';
    err.details    = { status: res.status, location, url };
    throw err;
  }

  // 🛡️ 4. Vérifier le Content-Type
  const contentType = res.headers.get('content-type') || '';

  // 🛡️ 5. Lire le corps brut
  const rawText = await res.text();

  logger.debug('GeniusPay ← réponse', {
    status:      res.status,
    contentType,
    bodyPreview: rawText.slice(0, 300),
  });

  // 🛡️ 6. Si HTML → erreur explicite
  if (contentType.includes('text/html')) {
    logger.error('🚨 GeniusPay — réponse HTML (mauvaise URL ?)', {
      url,
      status:      res.status,
      contentType,
      bodyPreview: rawText.slice(0, 200),
      hint:        'Vérifie User-Agent, Accept, ou contacte le support GeniusPay',
    });
    const err = new Error(
      `GeniusPay a renvoyé du HTML au lieu de JSON. URL : ${url} | Statut : ${res.status}`
    );
    err.statusCode = 502;
    err.code       = 'GENIUSPAY_HTML_RESPONSE';
    err.details    = { url, status: res.status, contentType };
    throw err;
  }

  // 🛡️ 7. Parser le JSON
  let data = null;
  if (rawText && rawText.length > 0) {
    try {
      data = JSON.parse(rawText);
    } catch (parseErr) {
      logger.error('GeniusPay — réponse non-JSON', {
        url,
        status:      res.status,
        contentType,
        bodyPreview: rawText.slice(0, 300),
      });
      const err = new Error('Réponse GeniusPay invalide (non-JSON)');
      err.statusCode = 502;
      err.code       = 'GENIUSPAY_INVALID_RESPONSE';
      throw err;
    }
  }

  // 🛡️ 8. Erreurs HTTP
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

  // 🛡️ 9. Corps vide
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
    mtm_momo_cmr: 'MTN_MOMO_CMR',
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
  // On valide l'opérateur côté serveur, même si on ne l'envoie plus à GeniusPay
  // (mode checkout : c'est GeniusPay qui fait choisir l'utilisateur)
  const mmoProvider = mapOperatorToMmo(operator);
  if (!mmoProvider) {
    const err = new Error('Opérateur non supporté (Cameroun uniquement)');
    err.statusCode = 400;
    err.code       = 'INVALID_OPERATOR';
    throw err;
  }

  // Normaliser le numéro
  const cleanedPhone = phone.replace(/\s/g, '');
  const finalPhone   = cleanedPhone.startsWith('+')
    ? cleanedPhone
    : `+237${cleanedPhone.replace(/^237/, '')}`;

  // ⚠️ PAYLOAD SIMPLIFIÉ (mode checkout)
  // → Retire payment_method + mmo_provider pour éviter les rejets sandbox
  // → XOF au lieu de XAF (devise pivot GeniusPay)
  // → description sans em-dash (—)
  const payload = {
    amount,
    currency:    'XOF',
    description: `Adma Abonnement ${plan}`,
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
    phone:     finalPhone,
    reference,
    mode:      'checkout',  // pas de payment_method → mode checkout
  });

  const data = await geniusPayRequest('POST', '/payments', payload);

  // 🛡️ Vérifier data.data
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
    checkout:  d.checkout_url || d.payment_url,
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