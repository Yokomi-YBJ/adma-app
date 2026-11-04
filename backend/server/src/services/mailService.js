/**
 * ADMA — Service Email via Resend
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
// LAYOUT EMAIL COMMUN
// ────────────────────────────────────────────────────────────────
function emailLayout({ headerColor = '#0B162C', accent = '#5FC2BA', title, subtitle, content }) {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <style>
    .select-all {
      -webkit-user-select: all; /* Safari */
      -moz-user-select: all;    /* Firefox */
      -ms-user-select: all;     /* IE10+ */
      user-select: all;         /* Standard */
    }
  </style>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <!-- Preheader : Texte affiché dans la notification push -->
  <div style="display:none;font-size:1px;color:#F1F5F9;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${subtitle}
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F1F5F9;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(11,22,44,0.06);">
          
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

          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>

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
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// ────────────────────────────────────────────────────────────────
// 1. ALERTE SYSTÈME
// ────────────────────────────────────────────────────────────────
function buildAlertHtml({ subject, body }) {
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
    <div style="display:inline-block;background-color:#FEF2F2;color:#DC2626;font-size:11px;font-weight:700;padding:6px 14px;border-radius:20px;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:20px;">
      ⚠️ Incident serveur
    </div>
    <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:800;color:#0B162C;letter-spacing:-0.5px;line-height:1.3;">
      ${escapeHtml(subject.replace('[ADMA]', '').trim())}
    </h1>
    <p style="margin:0 0 28px 0;font-size:14px;color:#64748B;line-height:22px;">
      Une erreur a été détectée sur la plateforme Adma. Voici les détails techniques :
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:28px;background-color:#F8FAFC;border-radius:12px;padding:8px;">
      ${rows}
    </table>
    <div style="text-align:center;">
      <a href="https://adma-app.vercel.app" style="display:inline-block;background-color:#0B162C;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:700;padding:14px 32px;border-radius:12px;letter-spacing:0.3px;">
        Ouvrir le dashboard admin
      </a>
    </div>
    <p style="margin:28px 0 0 0;font-size:12px;color:#94A3B8;line-height:18px;text-align:center;">
      Un rate limit interne limite ces alertes à 1 tous les 5 minutes.<br>
      Vous ne recevrez pas de doublons pour la même erreur.
    </p>
  `;

  return emailLayout({
    headerColor: '#7F1D1D',
    accent:      '#DC2626',
    title:       subject,
    subtitle:    'Incident détecté sur le serveur Adma',
    content,
  });
}

// ────────────────────────────────────────────────────────────────
// 2. OTP ADMIN (optimisé détection OS)
// ────────────────────────────────────────────────────────────────
function buildAdminOTPHtml({ adminName, code, expiresMinutes = 10 }) {
  const codeDigits = code.split('').map((d) => `
    <td style="padding:0 4px;">
      <div style="display:inline-block;width:44px;height:56px;background-color:#FFFFFF;border:2px solid #E2E8F0;border-radius:12px;text-align:center;line-height:52px;font-size:26px;font-weight:900;color:#0B162C;font-family:'Courier New',monospace;">${d}</div>
    </td>
  `).join('');

  const content = `
    <div style="display:inline-block;background-color:#F0FDFA;color:#0D9488;font-size:11px;font-weight:700;padding:6px 14px;border-radius:20px;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:20px;">
      🔐 Connexion sécurisée
    </div>

    <h1 style="margin:0 0 12px 0;font-size:24px;font-weight:800;color:#0B162C;letter-spacing:-0.5px;line-height:1.3;">
      Vérification de connexion
    </h1>

    <p style="margin:0 0 24px 0;font-size:15px;color:#64748B;line-height:24px;">
      Bonjour <strong style="color:#0B162C;">${escapeHtml(adminName)}</strong>,<br>
      Utilisez le code ci-dessous pour accéder à votre tableau de bord Adma.
    </p>

    <!-- ✅ LIGNE MAGIQUE POUR LA DÉTECTION OS (iOS/Android) -->
    <p style="text-align:center;font-size:15px;color:#64748B;margin:0 0 20px 0;">
      Votre code de connexion : <strong style="font-family:'Courier New',monospace;font-size:22px;color:#0B162C;letter-spacing:4px;background-color:#F8FAFC;padding:4px 12px;border-radius:8px;border:1px solid #E2E8F0;">${escapeHtml(code)}</strong>
    </p>

    <!-- Bloc visuel -->
    <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:20px;padding:32px 16px;text-align:center;margin-bottom:24px;">
      <div style="font-size:11px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:2px;margin-bottom:20px;">Votre code de vérification</div>
      
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;" class="select-all">
        <tr>
          ${codeDigits}
        </tr>
      </table>

      <div style="display:inline-block;background-color:#FEF3C7;color:#92400E;font-size:11px;font-weight:700;padding:5px 12px;border-radius:20px;margin-top:20px;letter-spacing:0.5px;">
        ⏱ Valable ${expiresMinutes} minutes
      </div>
    </div>

    <p style="margin:0;font-size:12px;color:#94A3B8;line-height:18px;text-align:center;">
      Si vous n'avez pas initié cette demande, <strong style="color:#DC2626;">changez votre mot de passe immédiatement</strong>.
    </p>
  `;

  return emailLayout({
    headerColor: '#0B162C',
    accent:      '#5FC2BA',
    title:       'Code de connexion admin',
    subtitle:    `Votre code de connexion Adma est : ${code}`,
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
      text:    body,
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
    
    // ✅ Version texte brut (Crucial pour l'OS et les clients mail basiques)
    const plainText = `Bonjour ${adminName},\n\nVotre code de connexion Adma est : ${code}\n\nCe code est valable ${expiresMinutes} minutes. Ne le partagez avec personne.\n\nSi vous n'avez pas demandé ce code, changez votre mot de passe immédiatement.`;

    const { data, error } = await resend.emails.send({
      from:    FROM_ADDRESS,
      to,
      subject: `[Adma Admin] Code de connexion : ${code}`, 
      html,
      text: plainText, 
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
// 3. EMAIL GÉNÉRIQUE
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
