/**
 * ADMA — Service Email via Resend
 * Utilisé pour les alertes admin et les notifications système
 *
 * Templates inclus :
 *   - sendAdminAlert()  → Alertes serveur (erreurs, incidents)
 *   - sendAdminOTP()    → OTP de connexion admin
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

const FROM_ADDRESS = process.env.MAIL_FROM
  || process.env.RESEND_FROM_EMAIL
  || 'Adma <onboarding@resend.dev>';

let warnedMissingTo = false;

// ────────────────────────────────────────────────────────────────
// LAYOUT EMAIL COMMUN (header + footer)
// ────────────────────────────────────────────────────────────────
function emailLayout({ headerColor = '#0B162C', accent = '#5FC2BA', title, subtitle, content }) {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <!-- Preheader (texte affiché dans l'aperçu) -->
  <div style="display:none;font-size:1px;color:#F1F5F9;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${subtitle}
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F1F5F9;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Container principal -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(11,22,44,0.06);">

          <!-- Header avec logo -->
          <tr>
            <td style="background-color:${headerColor};padding:32px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <div style="display:inline-block;width:44px;height:44px;background-color:${accent};border-radius:12px;text-align:center;line-height:44px;font-size:22px;font-weight:900;color:#FFFFFF;letter-spacing:-1px;">A</div>
                  </td>
                  <td style="vertical-align:middle;padding-left:14px;">
                    <div style="font-size:20px;font-weight:900;color:#FFFFFF;letter-spacing:5px;">ADMA</div>
                    <div style="font-size:11px;font-weight:500;color:rgba(255,255,255,0.6);margin-top:2px;letter-spacing:0.5px;">Trouvez le bon prestataire</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Contenu -->
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F8FAFC;padding:24px 40px;border-top:1px solid #E2E8F0;">
              <p style="margin:0 0 8px 0;font-size:12px;color:#94A3B8;line-height:18px;">
                Cet email a été envoyé automatiquement par la plateforme Adma.
              </p>
              <p style="margin:0;font-size:12px;color:#94A3B8;line-height:18px;">
                © ${new Date().getFullYear()} Adma — Ngaoundéré, Cameroun
              </p>
            </td>
          </tr>

        </table>
        <!-- /Container principal -->

      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// ────────────────────────────────────────────────────────────────
// 1. ALERTE SYSTÈME (erreurs serveur)
// ────────────────────────────────────────────────────────────────
function buildAlertHtml({ subject, body }) {
  // Extraire les infos du body si c'est un objet structuré
  const lines = body.split('\n').filter(Boolean);
  const rows = lines.map((line) => {
    const [key, ...rest] = line.split(':');
    const value = rest.join(':').trim();
    if (!value) return '';
    return `
      <tr>
        <td style="padding:8px 12px;background-color:#F8FAFC;border-bottom:1px solid #E2E8F0;font-size:12px;font-weight:700;color:#475569;vertical-align:top;width:120px;border-radius:6px 0 0 6px;">${key.trim()}</td>
        <td style="padding:8px 12px;background-color:#F8FAFC;border-bottom:1px solid #E2E8F0;font-size:12px;color:#0B162C;vertical-align:top;font-family:monospace;word-break:break-word;border-radius:0 6px 6px 0;">${escapeHtml(value)}</td>
      </tr>
    `;
  }).join('');

  const content = `
    <!-- Badge d'alerte -->
    <div style="display:inline-block;background-color:#FEF2F2;color:#DC2626;font-size:11px;font-weight:700;padding:6px 14px;border-radius:20px;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:20px;">
      ⚠️ Incident serveur
    </div>

    <!-- Titre -->
    <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:800;color:#0B162C;letter-spacing:-0.5px;line-height:1.3;">
      ${escapeHtml(subject.replace('[ADMA]', '').trim())}
    </h1>

    <p style="margin:0 0 28px 0;font-size:14px;color:#64748B;line-height:22px;">
      Une erreur a été détectée sur la plateforme Adma. Voici les détails techniques :
    </p>

    <!-- Tableau des détails -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:28px;background-color:#F8FAFC;border-radius:12px;padding:8px;">
      ${rows}
    </table>

    <!-- CTA -->
    <div style="text-align:center;">
      <a href="https://adma-app.vercel.app"
         style="display:inline-block;background-color:#0B162C;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:700;padding:14px 32px;border-radius:12px;letter-spacing:0.3px;">
        Voir le dashboard admin
      </a>
    </div>

    <!-- Note -->
    <p style="margin:28px 0 0 0;font-size:12px;color:#94A3B8;line-height:18px;text-align:center;">
      Un rate limit interne limite ces alertes à 1 tous les 5 minutes.<br>
      Vous ne recevrez pas de doublons pour la même erreur.
    </p>
  `;

  return emailLayout({
    headerColor: '#7F1D1D',  // rouge foncé pour alerte
    accent:      '#DC2626',
    title:       subject,
    subtitle:    'Incident détecté sur le serveur Adma',
    content,
  });
}

// ────────────────────────────────────────────────────────────────
// 2. OTP ADMIN (connexion)
// ────────────────────────────────────────────────────────────────
function buildAdminOTPHtml({ adminName, code, expiresMinutes = 10 }) {
  const codeDigits = code.split('').map((d) => `
    <td style="padding:0 4px;">
      <div style="display:inline-block;width:44px;height:56px;background-color:#FFFFFF;border:2px solid #E2E8F0;border-radius:12px;text-align:center;line-height:52px;font-size:26px;font-weight:900;color:#0B162C;font-family:'Courier New',monospace;">${d}</div>
    </td>
  `).join('');

  const content = `
    <!-- Badge -->
    <div style="display:inline-block;background-color:#F0FDFA;color:#0D9488;font-size:11px;font-weight:700;padding:6px 14px;border-radius:20px;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:20px;">
      🔐 Connexion sécurisée
    </div>

    <!-- Titre -->
    <h1 style="margin:0 0 12px 0;font-size:24px;font-weight:800;color:#0B162C;letter-spacing:-0.5px;line-height:1.3;">
      Vérification de connexion
    </h1>

    <p style="margin:0 0 32px 0;font-size:15px;color:#64748B;line-height:24px;">
      Bonjour <strong style="color:#0B162C;">${escapeHtml(adminName)}</strong>,<br>
      Utilisez le code ci-dessous pour accéder à votre tableau de bord Adma.
    </p>

    <!-- Code OTP en boîtes -->
    <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:20px;padding:32px 16px;text-align:center;margin-bottom:24px;">
      <div style="font-size:11px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:2px;margin-bottom:20px;">Votre code de vérification</div>
      
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
        <tr>
          ${codeDigits}
        </tr>
      </table>

      <div style="display:inline-block;background-color:#FEF3C7;color:#92400E;font-size:11px;font-weight:700;padding:5px 12px;border-radius:20px;margin-top:20px;letter-spacing:0.5px;">
        ⏱ Valable ${expiresMinutes} minutes
      </div>
    </div>

    <!-- Info -->
    <div style="background-color:#EFF6FF;border-left:4px solid #3B82F6;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#1E40AF;line-height:20px;">
        <strong>💡 Astuce :</strong> Ne partagez jamais ce code. L'équipe Adma ne vous demandera jamais votre code par téléphone ou email.
      </p>
    </div>

    <!-- Sécurité -->
    <p style="margin:0;font-size:12px;color:#94A3B8;line-height:18px;text-align:center;">
      Si vous n'avez pas initié cette demande, <strong style="color:#DC2626;">changez votre mot de passe immédiatement</strong>.
    </p>
  `;

  return emailLayout({
    headerColor: '#0B162C',
    accent:      '#5FC2BA',
    title:       'Code de connexion admin',
    subtitle:    'Votre code de vérification Adma',
    content,
  });
}

// ────────────────────────────────────────────────────────────────
// Utilitaire : échapper le HTML
// ────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ────────────────────────────────────────────────────────────────
// 1. ENVOYER UNE ALERTE ADMIN
// ────────────────────────────────────────────────────────────────
export async function sendAdminAlert({ subject, body }) {
  const resend = getClient();
  if (!resend) return;

  const to = process.env.ADMIN_ALERT_EMAIL;
  if (!to) {
    if (!warnedMissingTo) {
      logger.warn('ADMIN_ALERT_EMAIL non défini — alertes admin désactivées');
      warnedMissingTo = true;
    }
    return;
  }

  try {
    const html = buildAlertHtml({ subject, body });
    const { error } = await resend.emails.send({
      from:    FROM_ADDRESS,
      to,
      subject,
      html,
      text:    body,  // fallback texte
    });
    if (error) throw new Error(error.message);
    logger.info(`Alerte email envoyée à ${to}`);
  } catch (err) {
    logger.error('sendAdminAlert error', { err: err.message });
  }
}

// ────────────────────────────────────────────────────────────────
// 2. ENVOYER UN OTP ADMIN
// ────────────────────────────────────────────────────────────────
export async function sendAdminOTP({ to, adminName, code, expiresMinutes = 10 }) {
  const resend = getClient();
  if (!resend) {
    logger.warn('Resend non configuré — OTP admin non envoyé');
    return { ok: false, reason: 'RESEND_NOT_CONFIGURED' };
  }

  try {
    const html = buildAdminOTPHtml({ adminName, code, expiresMinutes });
    const { data, error } = await resend.emails.send({
      from:    FROM_ADDRESS,
      to,
      subject: `[Adma Admin] Code de connexion : ${code}`,
      html,
    });

    if (error) {
      logger.error('Resend a refusé l\'OTP admin', { error: error.message });
      return { ok: false, reason: error.message };
    }

    logger.info(`OTP admin envoyé avec succès (id: ${data?.id})`);
    return { ok: true, id: data?.id };
  } catch (err) {
    logger.error('sendAdminOTP error', { err: err.message, to });
    return { ok: false, reason: err.message };
  }
}

// ────────────────────────────────────────────────────────────────
// 3. EMAIL GÉNÉRIQUE (pour usages futurs)
// ────────────────────────────────────────────────────────────────
export async function sendEmail({ to, subject, text, html }) {
  const resend = getClient();
  if (!resend) return { ok: false, reason: 'RESEND_NOT_CONFIGURED' };

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      text,
      html: html || emailLayout({
        title:    subject,
        subtitle: subject,
        content:  `<p style="margin:0;font-size:15px;color:#0B162C;line-height:24px;">${escapeHtml(text || '')}</p>`,
      }),
    });
    if (error) throw new Error(error.message);
    return { ok: true, id: data?.id };
  } catch (err) {
    logger.error('sendEmail error', { err: err.message, to });
    return { ok: false, reason: err.message };
  }
}