import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseCsv, toCsv } from '../prospector/csv.mjs';
import { checkHtml, scoreAudit, normalizeUrl } from '../prospector/audit.mjs';
import { render, slugify } from '../site-template/render.mjs';
import { validateLead, buildReviewEmail, handleLead, handleReview } from '../lead-api/handle-lead.mjs';

test('csv round-trips quotes, commas and newlines', () => {
  const rows = [{ a: 'x, "y"', b: 'line1\nline2' }];
  assert.deepEqual(parseCsv(toCsv(rows, ['a', 'b'])), rows);
});

test('normalizeUrl adds a scheme', () => {
  assert.equal(normalizeUrl('example.com'), 'http://example.com');
  assert.equal(normalizeUrl('https://x.io'), 'https://x.io');
  assert.equal(normalizeUrl(''), null);
});

test('a bad site scores higher than a good one', () => {
  const bad = { https: false, ...checkHtml('<html><title>Joe Plumbing</title>© 2015</html>') };
  const good = { https: true, perf: 95, ...checkHtml('<meta name="viewport" content="x"><title>Good Co</title><form></form><a href="tel:+1">c</a>') };
  assert.ok(scoreAudit(bad).score > 60, JSON.stringify(scoreAudit(bad)));
  assert.equal(scoreAudit(good).score, 0);
  assert.equal(scoreAudit({ error: 'timeout' }).score, 100);
});

test('render fills every placeholder and escapes HTML', async () => {
  const tpl = await readFile(new URL('../site-template/template.html', import.meta.url), 'utf8');
  const cfg = JSON.parse(await readFile(new URL('../site-template/configs/sample-plumber.json', import.meta.url), 'utf8'));
  const html = render(tpl, { ...cfg, name: 'Bob <script>' });
  assert.ok(!html.includes('{{'));
  assert.ok(!html.includes('Bob <script>'));
  assert.ok(html.includes('href="tel:5125550142"'));
  assert.throws(() => render(tpl, { name: 'x' }), /config missing/);
});

test('slugify', () => assert.equal(slugify('Riverside Plumbing Co.'), 'riverside-plumbing-co'));

const clients = { acme: { name: 'Acme', ownerEmail: 'o@acme.test', reviewUrl: 'https://g.page/r/x/review', reviewDelayDays: 0 } };
const env = { LINK_SECRET: 'test-secret', PUBLIC_URL: 'https://leads.example/' };
const jane = { businessId: 'acme', name: 'Jane Doe', phone: '555', email: 'j@x.test', message: 'leak' };

test('validateLead rejects bad input and catches the honeypot', () => {
  assert.equal(validateLead({ businessId: 'nope', name: 'a', phone: '1' }, clients).error, 'unknown businessId');
  assert.equal(validateLead({ businessId: 'toString', name: 'a', phone: '1' }, clients).error, 'unknown businessId');
  assert.match(validateLead({ businessId: 'acme', name: 'a' }, clients).error, /required/);
  assert.equal(validateLead({ businessId: 'acme', company_website: 'spam' }, clients).spam, true);
});

test('a lead emails only the owner, with a signed review link, never the customer', async () => {
  const sent = [];
  const out = await handleLead(jane, { clients, env: { ...env, BCC_EMAIL: 'me@agency.test' }, log: (_, json) => sent.push(JSON.parse(json)) });
  assert.equal(out.status, 200);
  assert.equal(out.body.dryRun, true);
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].to, ['o@acme.test']);
  assert.deepEqual(sent[0].bcc, ['me@agency.test']);
  assert.match(sent[0].text, /https:\/\/leads\.example\/api\/review\?t=[\w-]+\.[\w-]+/);
});

test('no review link without LINK_SECRET or customer email', async () => {
  const sent = [];
  const log = (_, json) => sent.push(JSON.parse(json));
  await handleLead(jane, { clients, env: {}, log });
  await handleLead({ ...jane, email: '' }, { clients, env, log });
  assert.ok(sent.every(e => !e.text.includes('/api/review')));
});

test('review link: GET asks for confirmation, POST sends to the customer, tampering fails', async () => {
  const sent = [];
  await handleLead(jane, { clients, env, log: (_, json) => sent.push(JSON.parse(json)) });
  const token = sent[0].text.match(/\?t=([\w.-]+)/)[1];
  const opts = { clients, env, log: (_, json) => sent.push(JSON.parse(json)) };

  const get = await handleReview('GET', token, opts);
  assert.equal(get.status, 200);
  assert.match(get.html, /j@x\.test/);
  assert.equal(sent.length, 1, 'GET must not send');

  const post = await handleReview('POST', token, opts);
  assert.equal(post.status, 200);
  assert.deepEqual(sent[1].to, ['j@x.test']);
  assert.match(sent[1].text, /g\.page\/r\/x\/review/);
  assert.equal(sent[1].scheduled_at, undefined);

  const forged = token.slice(0, -2) + (token.endsWith('AA') ? 'BB' : 'AA');
  assert.equal((await handleReview('POST', forged, opts)).status, 400);
  const late = new Date(Date.now() + 200 * 86400000);
  assert.equal((await handleReview('POST', token, { ...opts, now: late })).status, 400);
});

test('review email can be delayed per client', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  const e = buildReviewEmail({ ...clients.acme, reviewDelayDays: 2 }, { name: 'Jane', email: 'j@x.test' }, { from: 'f', now });
  assert.equal(e.scheduled_at, '2026-01-03T00:00:00.000Z');
});
