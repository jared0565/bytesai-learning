/**
 * Transactional email via Resend.
 * API key is stored as a Cloudflare Worker secret: RESEND_API_KEY
 * From address: noreply@learn.bytesai.uk  (must be verified in Resend dashboard)
 */

import { escapeHtml } from '@/lib/security';

async function getResendKey(): Promise<string> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const { env } = await getCloudflareContext({ async: true });
    return String((env as Record<string, unknown>).BYTESAI_RESEND_KEY ?? '').trim();
  } catch {
    return process.env.BYTESAI_RESEND_KEY?.trim() ?? '';
  }
}

interface SendOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(opts: SendOptions): Promise<{ ok: boolean; error?: string }> {
  const apiKey = await getResendKey();
  if (!apiKey) {
    // Graceful fallback in local dev — log to console
    console.log(`[email:dev] To: ${opts.to} | Subject: ${opts.subject}`);
    console.log(`[email:dev] Text: ${opts.text}`);
    return { ok: true };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'BytesAI Learning <noreply@bytesai.uk>',
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[email] Resend error:', res.status, body);
      return { ok: false, error: `Resend API error: ${res.status}` };
    }

    return { ok: true };
  } catch (err) {
    console.error('[email] Send failed:', err);
    return { ok: false, error: 'Email send failed' };
  }
}

// ── Email templates ────────────────────────────────────────────────────────────

const BASE_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0f172a; color: #e2e8f0; margin: 0; padding: 0;
`;

const CARD_STYLE = `
  max-width: 520px; margin: 40px auto; background: #1e293b;
  border-radius: 12px; border: 1px solid #334155;
  padding: 40px 36px; box-sizing: border-box;
`;

const LOGO_STYLE = `
  display: inline-flex; align-items: center; gap: 8px;
  font-weight: 800; font-size: 1.1rem; color: #fff;
  text-decoration: none; margin-bottom: 28px;
`;

const BTN_STYLE = `
  display: inline-block; padding: 14px 28px;
  background: linear-gradient(135deg, #4f6ef7, #0ea5e9);
  color: #fff; font-weight: 700; font-size: 0.9375rem;
  border-radius: 8px; text-decoration: none;
  margin: 24px 0 8px;
`;

const FOOTER_STYLE = `
  font-size: 0.75rem; color: #64748b; margin-top: 28px; line-height: 1.6;
`;

export function buildVerificationEmail(opts: {
  displayName: string;
  verificationUrl: string;
  siteUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = 'Verify your BytesAI Learning email';
  const displayName = escapeHtml(opts.displayName);
  const verificationUrl = escapeHtml(opts.verificationUrl);
  const siteUrl = escapeHtml(opts.siteUrl);
  const siteHost = escapeHtml(opts.siteUrl.replace('https://', ''));

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${subject}</title></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    <a href="${siteUrl}" style="${LOGO_STYLE}">
      <span style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#4f6ef7,#0ea5e9);display:inline-flex;align-items:center;justify-content:center;font-size:1rem;">📚</span>
      BytesAI Learning
    </a>
    <h1 style="font-size:1.375rem;font-weight:800;color:#fff;margin:0 0 12px;">Verify your email address</h1>
    <p style="color:#94a3b8;line-height:1.7;margin:0 0 8px;">
      Hi ${displayName},
    </p>
    <p style="color:#94a3b8;line-height:1.7;margin:0 0 8px;">
      Thanks for creating your BytesAI Learning account. Click the button below to verify your email address and unlock access to your dashboard, course tracking, and personalised recommendations.
    </p>
    <a href="${verificationUrl}" style="${BTN_STYLE}">Verify my email</a>
    <p style="color:#64748b;font-size:0.8125rem;line-height:1.6;margin:16px 0 0;">
      This link expires in <strong style="color:#94a3b8;">24 hours</strong>. If you didn't create an account, you can safely ignore this email.
    </p>
    <p style="color:#475569;font-size:0.75rem;margin-top:12px;word-break:break-all;">
      Or copy this link: ${verificationUrl}
    </p>
    <hr style="border:none;border-top:1px solid #334155;margin:28px 0 20px;">
    <p style="${FOOTER_STYLE}">
      BytesAI Learning · <a href="${siteUrl}" style="color:#4f6ef7;text-decoration:none;">${siteHost}</a><br>
      You're receiving this because you created an account. We will never send unsolicited emails.
    </p>
  </div>
</body></html>`;

  const text = `Verify your BytesAI Learning email

Hi ${opts.displayName},

Please verify your email address by visiting this link:
${opts.verificationUrl}

This link expires in 24 hours.

If you didn't create an account, you can safely ignore this email.

— BytesAI Learning
${opts.siteUrl}`;

  return { subject, html, text };
}

/**
 * Build a marketing/recommendations email with a one-click unsubscribe link.
 * The unsubscribeUrl must be pre-signed by the caller using signUnsubscribeToken from auth.ts.
 * CAN-SPAM requires: clear identification, physical address, functional unsubscribe mechanism.
 */
export function buildMarketingEmail(opts: {
  displayName: string;
  subject: string;
  preheader: string;
  bodyHtml: string;
  bodyText: string;
  ctaLabel: string;
  ctaUrl: string;
  unsubscribeUrl: string;
  siteUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = escapeHtml(opts.subject);
  const displayName = escapeHtml(opts.displayName);
  const ctaLabel = escapeHtml(opts.ctaLabel);
  const ctaUrl = escapeHtml(opts.ctaUrl);
  const siteUrl = escapeHtml(opts.siteUrl);
  const unsubscribeUrl = escapeHtml(opts.unsubscribeUrl);
  const siteHost = escapeHtml(opts.siteUrl.replace('https://', ''));

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${subject}</title></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    <a href="${siteUrl}" style="${LOGO_STYLE}">
      <span style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#4f6ef7,#0ea5e9);display:inline-flex;align-items:center;justify-content:center;font-size:1rem;">📚</span>
      BytesAI Learning
    </a>
    <h1 style="font-size:1.375rem;font-weight:800;color:#fff;margin:0 0 12px;">${subject}</h1>
    <p style="color:#94a3b8;line-height:1.7;margin:0 0 8px;">Hi ${displayName},</p>
    ${opts.bodyHtml}
    <a href="${ctaUrl}" style="${BTN_STYLE}">${ctaLabel}</a>
    <hr style="border:none;border-top:1px solid #334155;margin:28px 0 20px;">
    <p style="${FOOTER_STYLE}">
      BytesAI Learning · <a href="${siteUrl}" style="color:#4f6ef7;text-decoration:none;">${siteHost}</a><br>
      You're receiving this because you opted in to course recommendations.<br>
      <a href="${unsubscribeUrl}" style="color:#4f6ef7;text-decoration:none;">Unsubscribe</a> · <a href="${siteUrl}/privacy-policy" style="color:#4f6ef7;text-decoration:none;">Privacy Policy</a>
    </p>
  </div>
</body></html>`;

  const text = `${opts.subject}

Hi ${opts.displayName},

${opts.bodyText}

${opts.ctaLabel}: ${opts.ctaUrl}

---
BytesAI Learning — ${opts.siteUrl}
You're receiving this because you opted in to course recommendations.
Unsubscribe: ${opts.unsubscribeUrl}`;

  return { subject: opts.subject, html, text };
}

export function buildWelcomeEmail(opts: {
  displayName: string;
  siteUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = 'Welcome to BytesAI Learning 🎓';
  const displayName = escapeHtml(opts.displayName);
  const siteUrl = escapeHtml(opts.siteUrl);
  const siteHost = escapeHtml(opts.siteUrl.replace('https://', ''));

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${subject}</title></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    <a href="${siteUrl}" style="${LOGO_STYLE}">
      <span style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#4f6ef7,#0ea5e9);display:inline-flex;align-items:center;justify-content:center;font-size:1rem;">📚</span>
      BytesAI Learning
    </a>
    <h1 style="font-size:1.375rem;font-weight:800;color:#fff;margin:0 0 12px;">Welcome, ${displayName}!</h1>
    <p style="color:#94a3b8;line-height:1.7;margin:0 0 16px;">
      Your email is verified and your account is ready. Here's what you can do now:
    </p>
    <ul style="color:#94a3b8;line-height:1.9;padding-left:20px;margin:0 0 20px;">
      <li>Browse <strong style="color:#e2e8f0;">100+ free AI courses</strong> from Google, Microsoft, Anthropic, NVIDIA &amp; more</li>
      <li>Save courses to your learning list</li>
      <li>Track your progress as you learn</li>
      <li>Get personalised recommendations from our AI chatbot</li>
    </ul>
    <a href="${siteUrl}/courses" style="${BTN_STYLE}">Browse free courses</a>
    <hr style="border:none;border-top:1px solid #334155;margin:28px 0 20px;">
    <p style="${FOOTER_STYLE}">
      BytesAI Learning · <a href="${siteUrl}" style="color:#4f6ef7;text-decoration:none;">${siteHost}</a><br>
      You're receiving this because you created and verified a BytesAI Learning account.<br>
      To stop receiving emails, delete your account in <a href="${siteUrl}/settings" style="color:#4f6ef7;text-decoration:none;">Settings</a>.
    </p>
  </div>
</body></html>`;

  const text = `Welcome to BytesAI Learning!

Hi ${opts.displayName},

Your email is verified and your account is ready.

Browse free courses: ${opts.siteUrl}/courses

— BytesAI Learning
${opts.siteUrl}`;

  return { subject, html, text };
}
