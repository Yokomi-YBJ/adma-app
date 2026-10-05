/**
 * ADMA — Service Email via Resend
 * Utilisé pour les alertes admin et notifications système
 */
import { Resend } from 'resend';
import { logger } from '../utils/logger.js';

let client = null;

function getClient() {
  if (client) return client;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn('RESEND_API_KEY non défini — les emails ne seront pas envoyés');
    return null;
  }
  client = new Resend(apiKey);
  return client;
}

const FROM_ADDRESS = process.env.MAIL_FROM || 'Adma <alerts@adma.cm>';

/**
 * Alerte système à l'admin (erreurs serveur, exceptions)
 */
export async function sendAdminAlert({ subject, body }) {
  const resend = getClient();
  if (!resend) return;

  const to = process.env.ADMIN_ALERT_EMAIL;
  if (!to) {
    logger.warn('ADMIN_ALERT_EMAIL non défini');
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      text: body,
    });
    if (error) throw new Error(error.message);
    logger.info(`Alerte email envoyée à ${to}`);
  } catch (err) {
    logger.error('sendAdminAlert error', { err: err.message });
  }
}

/**
 * Email générique (utilisable pour d'autres usages futurs)
 */
export async function sendEmail({ to, subject, text, html }) {
  const resend = getClient();
  if (!resend) return { ok: false, reason: 'RESEND_NOT_CONFIGURED' };

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      text,
      html,
    });
    if (error) throw new Error(error.message);
    return { ok: true, id: data?.id };
  } catch (err) {
    logger.error('sendEmail error', { err: err.message, to });
    return { ok: false, reason: err.message };
  }
}
