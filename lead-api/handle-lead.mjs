// Core lead handling, independent of the hosting platform.
// 1) Validate the form submission  2) Alert the business owner (email, optional SMS)
// 3) Schedule a Google review request to the customer N days later (Resend scheduled_at, max 30 days).

const RESEND_URL = 'https://api.resend.com/emails';

export function validateLead(body, clients) {
  if (!body || typeof body !== 'object') return { error: 'invalid body' };
  if (body.company_website) return { spam: true }; // honeypot filled in by bots
  const client = clients[body.businessId];
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

export function buildEmails(client, lead, { from, now = new Date() }) {
  const emails = [{
    from,
    to: [client.ownerEmail],
    ...(lead.email ? { reply_to: lead.email } : {}),
    subject: `New lead: ${lead.name} (${lead.phone})`,
    text: `New quote request from your website.\n\nName: ${lead.name}\nPhone: ${lead.phone}\nEmail: ${lead.email || '-'}\n\n${lead.message}\n\nCall them back fast: most customers hire whoever calls first.`,
  }];
  if (lead.email && client.reviewUrl) {
    const days = Math.min(Math.max(Number(client.reviewDelayDays ?? 3), 0), 29);
    emails.push({
      from,
      to: [lead.email],
      reply_to: client.ownerEmail,
      subject: `How did we do, ${lead.name.split(' ')[0]}?`,
      text: `Hi ${lead.name.split(' ')[0]},\n\nThanks for choosing ${client.name}! If we did a good job, a quick Google review helps a small local business more than you'd think:\n\n${client.reviewUrl}\n\nThank you!\n${client.name}`,
      scheduled_at: new Date(now.getTime() + days * 86400000).toISOString(),
    });
  }
  return emails;
}

async function sendEmail(apiKey, email) {
  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify(email),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
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
export async function handleLead(body, { clients, env, log = console.log }) {
  const v = validateLead(body, clients);
  if (v.spam) return { status: 200, body: { ok: true } };
  if (v.error) return { status: 400, body: { error: v.error } };

  const emails = buildEmails(v.client, v.lead, { from: env.FROM_EMAIL || 'Leads <onboarding@resend.dev>' });
  const dryRun = !env.RESEND_API_KEY;
  if (dryRun) {
    log('[dry run] no RESEND_API_KEY, would send:', JSON.stringify(emails, null, 2));
  } else {
    await Promise.all(emails.map(e => sendEmail(env.RESEND_API_KEY, e)));
  }

  if (v.client.ownerPhone && env.TWILIO_ACCOUNT_SID) {
    await sendSms(env, v.client.ownerPhone, `New lead: ${v.lead.name} ${v.lead.phone}. ${v.lead.message.slice(0, 100)}`)
      .catch(e => log('SMS failed:', e.message)); // email already went out; don't fail the lead
  }
  return { status: 200, body: { ok: true, dryRun, scheduledReview: emails.length > 1 } };
}
