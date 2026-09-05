/**
 * ADMA — Service KPay (Mobile Money Cameroun)
 * Orange Money + MTN MoMo via kpay.site
 */
import crypto from 'crypto';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

async function kpayRequest(method, path, body = null) {
  const url       = `${config.kpay.baseUrl}${path}`;
  const timestamp = Date.now().toString();
  const payload   = body ? JSON.stringify(body) : '';
  const signature = crypto
    .createHmac('sha256', config.kpay.secretKey)
    .update(`${timestamp}${method.toUpperCase()}${path}${payload}`)
    .digest('hex');

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key':    config.kpay.apiKey,
      'X-Timestamp':  timestamp,
      'X-Signature':  signature,
    },
    ...(body ? { body: payload } : {}),
  });

  const data = await res.json();
  if (!res.ok) {
    logger.error('KPay API error', { status: res.status, data });
    const err = new Error(data.message || 'Erreur KPay');
    err.statusCode = 502;
    err.code = 'KPAY_ERROR';
    throw err;
  }
  return data;
}

export async function initiatePayment({ amount, phone, providerId, plan, reference }) {
  const payload = {
    amount,
    currency:    'XAF',
    phone_number: phone,
    external_id:  reference,
    description:  `Adma — Abonnement ${plan}`,
  };
  const data = await kpayRequest('POST', '/collections/request', payload);
  return {
    paymentId:  data.id || data.payment_id,
    reference:  data.reference || reference,
    status:     data.status || 'pending',
  };
}

export async function verifyPayment(kpayPaymentId) {
  const data = await kpayRequest('GET', `/collections/${kpayPaymentId}`);
  return {
    id:     data.id,
    status: mapStatus(data.status),
    amount: data.amount,
    paidAt: data.paid_at || null,
  };
}

function mapStatus(s) {
  const map = {
    pending: 'pending', processing: 'processing',
    successful: 'completed', failed: 'failed',
    cancelled: 'cancelled', expired: 'failed',
  };
  return map[s?.toLowerCase()] || 'pending';
}

export function verifyWebhookSignature(rawBody, signature) {
  if (!config.kpay.webhookSecret) return false;
  const expected = crypto
    .createHmac('sha256', config.kpay.webhookSecret)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ''));
  } catch {
    return false;
  }
}
