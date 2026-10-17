// Client files in clients/*.json are the single source of truth for each client:
// site content, lead routing, domain ownership, Google access and billing.

export const STATUSES = ['prospect', 'demo', 'onboarding', 'active', 'paused', 'cancelled'];
// Statuses whose lead form should work (demo so prospects can try the form).
const LEAD_STATUSES = new Set(['demo', 'onboarding', 'active']);
const RENEWAL_WARN_DAYS = 45;

export function checkClient(c, now = new Date()) {
  const errors = [];
  const warnings = [];
  if (!c.id || !/^[a-z0-9-]+$/.test(c.id)) errors.push('id must be lowercase letters, digits and dashes');
  if (!STATUSES.includes(c.status)) errors.push(`status must be one of: ${STATUSES.join(', ')}`);
  if (!c.site?.name) errors.push('site.name is required');

  const live = c.status === 'active' || c.status === 'onboarding';
  if (LEAD_STATUSES.has(c.status) && !c.lead?.ownerEmail) errors.push('lead.ownerEmail is required to route leads');

  if (c.status === 'active') {
    if (!c.site?.liveUrl) warnings.push('active but site.liveUrl is empty');
    if (!c.plan?.billingRef) warnings.push('active but no billingRef (is the subscription set up?)');
    if (c.domain?.name && !c.domain?.renewalDate) warnings.push('domain.renewalDate unknown: ask the client or check WHOIS');
  }
  if (live) {
    if (['none', 'requested', undefined].includes(c.access?.gbp)) warnings.push(`Google Business Profile access: ${c.access?.gbp ?? 'none'}`);
    if (['none', undefined].includes(c.access?.gsc)) warnings.push('no Search Console access');
    if (!c.lead?.reviewUrl || c.lead.reviewUrl.includes('REPLACE')) warnings.push('lead.reviewUrl not set: review requests are off');
    if (c.domain?.emailOnDomain == null) warnings.push('unknown whether email runs on the domain: check MX records before DNS changes');
    if (c.domain?.name && !c.domain?.dnsBackupTaken) warnings.push('DNS records not backed up yet');
  }
  if (c.domain?.ownedBy && !['client', 'us-for-client'].includes(c.domain.ownedBy)) {
    errors.push('domain.ownedBy must be "client" or "us-for-client" (the client is always the registrant)');
  }
  if (c.domain?.renewalDate && c.status !== 'cancelled') {
    const days = Math.floor((new Date(c.domain.renewalDate) - now) / 86400000);
    if (Number.isNaN(days)) errors.push('domain.renewalDate must be YYYY-MM-DD');
    else if (days < 0) warnings.push(`domain EXPIRED ${-days} days ago`);
    else if (days <= RENEWAL_WARN_DAYS) warnings.push(`domain renews in ${days} days (paid by ${c.domain.renewalPaidBy || '?'})`);
  }
  return { errors, warnings };
}

// Shape consumed by lead-api/handle-lead.mjs.
export function leadApiClients(clients) {
  return Object.fromEntries(clients
    .filter(c => LEAD_STATUSES.has(c.status) && c.lead?.ownerEmail)
    .map(c => [c.id, {
      name: c.site.name,
      ownerEmail: c.lead.ownerEmail,
      ownerPhone: c.lead.ownerPhone || '',
      reviewUrl: c.lead.reviewUrl && !c.lead.reviewUrl.includes('REPLACE') ? c.lead.reviewUrl : '',
      reviewDelayDays: c.lead.reviewDelayDays ?? 0,
    }]));
}

export function siteConfig(c) {
  return { ...c.site, businessId: c.id };
}

export function monthlyRevenue(clients) {
  const totals = {};
  for (const c of clients) {
    if (c.status !== 'active' || !c.plan?.monthly) continue;
    const cur = c.plan.currency || 'USD';
    totals[cur] = (totals[cur] || 0) + Number(c.plan.monthly);
  }
  return totals;
}
