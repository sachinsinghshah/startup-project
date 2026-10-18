// Core lead handling, independent of the hosting platform.
// 1) Validate the form submission  2) Alert the business owner (email, optional SMS, optional BCC to you)
// 3) The alert contains a signed "job done → ask for a review" link. The review request goes to the
//    customer only when the owner clicks it, i.e. after real work, never automatically.
import { signReviewToken, verifyReviewToken } from './review-link.mjs';

const RESEND_URL = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'Leads <onboarding@resend.dev>';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const firstName = name => String(name).trim().split(/\s+/)[0];

export function validateLead(body, clients) {
  if (!body || typeof body !== 'object') return { error: 'invalid body' };
  if (body.company_website) return { spam: true }; // honeypot filled in by bots
  const client = Object.hasOwn(clients, body.businessId) ? clients[body.businessId] : null;
  if (!client) return { error: 'unknown businessId' };
  const lead = {
    name: String(body.name || '').trim().slice(0, 200),
    phone: String(body.phone || '').trim().slice(0, 40),
    email: String(body.email || '').trim().slice(0, 200),
    message: String(body.message || '').trim().slice(0, 4000),
  };
  if (!lead.name || !lead.phone) return { error: 'name and phone are required' };
  if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) lead.email = '';
  return { client, lead };
}

export function buildOwnerAlert(client, lead, { from, reviewLink, bcc }) {
  const reviewPart = reviewLink
    ? `\n\nWhen the job is done, click here to ask ${firstName(lead.name)} for a Google review:\n${reviewLink}`
    : '';
  return {
    from,
    to: [client.ownerEmail],
    ...(bcc ? { bcc: [bcc] } : {}),
    ...(lead.email ? { reply_to: lead.email } : {}),
    subject: `New lead: ${lead.name} (${lead.phone})`,
    text: `New quote request from your website.\n\nName: ${lead.name}\nPhone: ${lead.phone}\nEmail: ${lead.email || '-'}\n\n${lead.message}\n\nCall them back fast: most customers hire whoever calls first.${reviewPart}`,
  };
}

export function buildReviewEmail(client, { name, email }, { from, now = new Date() }) {
  const days = Math.min(Math.max(Number(client.reviewDelayDays ?? 0), 0), 29);
  return {
    from,
    to: [email],
    reply_to: client.ownerEmail,
    subject: `How did we do, ${firstName(name)}?`,
    text: `Hi ${firstName(name)},\n\nThanks for choosing ${client.name}! If we did a good job, a quick Google review helps a small local business more than you'd think:\n\n${client.reviewUrl}\n\nThank you!\n${client.name}`,
    ...(days ? { scheduled_at: new Date(now.getTime() + days * 86400000).toISOString() } : {}),
  };
}

async function sendEmail(apiKey, email) {
  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify(email),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

async function deliver(email, env, log) {
  if (!env.RESEND_API_KEY) {
    log('[dry run] no RESEND_API_KEY, would send:', JSON.stringify(email, null, 2));
    return true;
  }
  await sendEmail(env.RESEND_API_KEY, email);
  return false;
}

async function sendSms(env, to, body) {
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM: from } = env;
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { authorization: `Basic ${btoa(`${sid}:${token}`)}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${await res.text()}`);
}

// Returns { status, body } so each platform adapter can wrap it in its own response type.
// env: RESEND_API_KEY, FROM_EMAIL, BCC_EMAIL, LINK_SECRET, PUBLIC_URL (this API's base URL), TWILIO_*
export async function handleLead(body, { clients, env, log = console.log, now = new Date() }) {
  const v = validateLead(body, clients);
  if (v.spam) return { status: 200, body: { ok: true } };
  if (v.error) return { status: 400, body: { error: v.error } };

  let reviewLink = '';
  if (v.lead.email && v.client.reviewUrl && env.LINK_SECRET && env.PUBLIC_URL) {
    const token = signReviewToken({ clientId: body.businessId, name: v.lead.name, email: v.lead.email }, env.LINK_SECRET, now);
    reviewLink = `${env.PUBLIC_URL.replace(/\/+$/, '')}/api/review?t=${token}`;
  }
  const alert = buildOwnerAlert(v.client, v.lead, { from: env.FROM_EMAIL || DEFAULT_FROM, reviewLink, bcc: env.BCC_EMAIL });
  const dryRun = await deliver(alert, env, log);

  if (v.client.ownerPhone && env.TWILIO_ACCOUNT_SID) {
    await sendSms(env, v.client.ownerPhone, `New lead: ${v.lead.name} ${v.lead.phone}. ${v.lead.message.slice(0, 100)}`)
      .catch(e => log('SMS failed:', e.message)); // email already went out; don't fail the lead
  }
  return { status: 200, body: { ok: true, dryRun, reviewLink: Boolean(reviewLink) } };
}

const page = (title, inner) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title><style>body{font:17px/1.5 system-ui,sans-serif;max-width:480px;margin:48px auto;padding:0 16px;color:#1a1d21}button{font:inherit;font-weight:700;background:#0b6bcb;color:#fff;border:0;border-radius:8px;padding:12px 20px;cursor:pointer}</style></head><body>${inner}</body></html>`;

// GET shows a confirmation button (email link scanners that pre-open links won't trigger a send);
// POST sends the review request. Returns { status, html }.
export async function handleReview(method, token, { clients, env, log = console.log, now = new Date() }) {
  const p = verifyReviewToken(token, env.LINK_SECRET, now);
  const client = p && Object.hasOwn(clients, p.clientId) ? clients[p.clientId] : null;
  if (!client || !client.reviewUrl) {
    return { status: 400, html: page('Link not valid', '<h1>This link is not valid</h1><p>It may have expired. Reply to the lead email if you need help.</p>') };
  }
  if (method === 'GET') {
    return {
      status: 200,
      html: page('Ask for a review', `<h1>Ask ${esc(firstName(p.name))} for a review?</h1><p>We'll email <strong>${esc(p.email)}</strong> on behalf of ${esc(client.name)} with a link to your Google reviews page.</p><form method="post"><input type="hidden" name="t" value="${esc(token)}"><button type="submit">Yes, send the review request</button></form>`),
    };
  }
  await deliver(buildReviewEmail(client, p, { from: env.FROM_EMAIL || DEFAULT_FROM, now }), env, log);
  return { status: 200, html: page('Review request sent', `<h1>Done ✓</h1><p>${esc(firstName(p.name))} will get a friendly review request from ${esc(client.name)}.</p>`) };
}
