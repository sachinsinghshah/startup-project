import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseCsv, toCsv } from '../prospector/csv.mjs';
import { checkHtml, scoreAudit, normalizeUrl } from '../prospector/audit.mjs';
import { render, slugify } from '../site-template/render.mjs';
import { validateLead, buildEmails, handleLead } from '../lead-api/handle-lead.mjs';

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

const clients = { acme: { name: 'Acme', ownerEmail: 'o@acme.test', reviewUrl: 'https://g.page/r/x/review', reviewDelayDays: 3 } };

test('validateLead rejects bad input and catches the honeypot', () => {
  assert.equal(validateLead({ businessId: 'nope', name: 'a', phone: '1' }, clients).error, 'unknown businessId');
  assert.match(validateLead({ businessId: 'acme', name: 'a' }, clients).error, /required/);
  assert.equal(validateLead({ businessId: 'acme', company_website: 'spam' }, clients).spam, true);
});

test('buildEmails alerts the owner and schedules the review request', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  const emails = buildEmails(clients.acme, { name: 'Jane Doe', phone: '555', email: 'j@x.test', message: 'leak' }, { from: 'f@x.test', now });
  assert.equal(emails.length, 2);
  assert.deepEqual(emails[0].to, ['o@acme.test']);
  assert.equal(emails[1].scheduled_at, '2026-01-04T00:00:00.000Z');
  assert.equal(buildEmails(clients.acme, { name: 'J', phone: '5', email: '', message: '' }, { from: 'f' }).length, 1);
});

test('handleLead dry-runs without an API key', async () => {
  const logs = [];
  const out = await handleLead({ businessId: 'acme', name: 'Jane', phone: '555', email: 'j@x.test', message: 'hi' },
    { clients, env: {}, log: (...a) => logs.push(a) });
  assert.equal(out.status, 200);
  assert.equal(out.body.dryRun, true);
  assert.equal(out.body.scheduledReview, true);
  assert.equal(logs.length, 1);
});
