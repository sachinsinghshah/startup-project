import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkClient, leadApiClients, siteConfig, monthlyRevenue } from '../tools/client-registry.mjs';
import { writeSite } from '../site-template/write-site.mjs';
import { render } from '../site-template/render.mjs';

const base = () => ({
  id: 'acme-plumbing', status: 'active',
  plan: { monthly: 99, currency: 'USD', billingRef: 'sub_1' },
  domain: { name: 'acme.test', ownedBy: 'client', renewalDate: '2027-06-01', emailOnDomain: true, dnsBackupTaken: true },
  access: { gbp: 'manager', gsc: 'full' },
  site: { name: 'Acme', liveUrl: 'https://acme.test' },
  lead: { ownerEmail: 'o@acme.test', reviewUrl: 'https://g.page/r/x/review' },
});
const now = new Date('2026-10-16');

test('a fully set-up active client has no errors or warnings', () => {
  assert.deepEqual(checkClient(base(), now), { errors: [], warnings: [] });
});

test('flags upcoming and expired domain renewals', () => {
  const c = base(); c.domain.renewalDate = '2026-11-01';
  assert.match(checkClient(c, now).warnings.join(), /renews in 16 days/);
  c.domain.renewalDate = '2026-10-01';
  assert.match(checkClient(c, now).warnings.join(), /EXPIRED/);
});

test('flags missing Google access, unknown email setup and missing DNS backup', () => {
  const c = base(); c.access = { gbp: 'requested', gsc: 'none' }; c.domain.emailOnDomain = null; c.domain.dnsBackupTaken = false;
  const w = checkClient(c, now).warnings.join('|');
  for (const re of [/Business Profile/, /Search Console/, /MX records/, /DNS records not backed up/]) assert.match(w, re);
});

test('rejects the agency as domain owner and bad statuses', () => {
  const c = base(); c.domain.ownedBy = 'us'; c.status = 'live';
  const e = checkClient(c, now).errors.join('|');
  assert.match(e, /ownedBy/);
  assert.match(e, /status must be/);
});

test('leadApiClients keeps only clients whose forms should work', () => {
  const cancelled = { ...base(), id: 'gone', status: 'cancelled' };
  const demo = { ...base(), id: 'demo-co', status: 'demo', lead: { ownerEmail: 'd@x.test', reviewUrl: 'https://g.page/r/REPLACE/review' } };
  const out = leadApiClients([base(), cancelled, demo]);
  assert.deepEqual(Object.keys(out), ['acme-plumbing', 'demo-co']);
  assert.equal(out['demo-co'].reviewUrl, '');
});

test('monthlyRevenue sums active clients by currency', () => {
  const gbp = { ...base(), plan: { monthly: 120, currency: 'GBP' } };
  assert.deepEqual(monthlyRevenue([base(), base(), gbp, { ...base(), status: 'paused' }]), { USD: 198, GBP: 120 });
});

test('writeSite adds robots.txt and sitemap.xml when siteUrl is set', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'site-'));
  const cfg = { ...siteConfig({ id: 'acme', site: { name: 'Acme', phone: '1', city: 'X', tagline: 'T', services: ['A'], siteUrl: 'https://www.acme.test/' } }) };
  const html = render('<html>{{canonicalHtml}}</html>', cfg);
  assert.equal(html, '<html><link rel="canonical" href="https://www.acme.test/"></html>');
  await writeSite(dir, html, cfg);
  assert.match(await readFile(join(dir, 'sitemap.xml'), 'utf8'), /<loc>https:\/\/www\.acme\.test\/<\/loc>/);
  assert.match(await readFile(join(dir, 'robots.txt'), 'utf8'), /Sitemap: https:\/\/www\.acme\.test\/sitemap\.xml/);
  assert.throws(() => render('x', { ...cfg, siteUrl: 'javascript:alert(1)' }), /siteUrl/);
});
