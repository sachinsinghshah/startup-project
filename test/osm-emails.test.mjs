import { test } from 'node:test';
import assert from 'node:assert/strict';
import { areaIdFromNominatim, buildQuery, toLeadRows, findOsmBusinesses, NICHE_TAGS } from '../prospector/osm.mjs';
import { extractEmails, findEmail } from '../prospector/emails.mjs';

test('areaIdFromNominatim converts relation and way ids, ignores nodes', () => {
  assert.equal(areaIdFromNominatim({ osm_type: 'relation', osm_id: 113314 }), 3600113314);
  assert.equal(areaIdFromNominatim({ osm_type: 'way', osm_id: 5 }), 2400000005);
  assert.equal(areaIdFromNominatim({ osm_type: 'node', osm_id: 5 }), null);
});

test('buildQuery includes every tag for the niche', () => {
  const q = buildQuery(3600113314, NICHE_TAGS.dentist);
  assert.match(q, /area\(id:3600113314\)/);
  assert.match(q, /nwr\["amenity"="dentist"\]\(area\.a\);nwr\["healthcare"="dentist"\]\(area\.a\);/);
  assert.match(q, /out center tags;$/);
});

test('toLeadRows maps OSM tags, skips unnamed/disused and duplicates', () => {
  const rows = toLeadRows([
    { type: 'node', id: 1, tags: { name: 'Leeds Plumbing', 'contact:phone': '0113 000', website: 'https://lp.test', email: 'hi@lp.test', 'addr:street': 'High St', 'addr:housenumber': '4' } },
    { type: 'way', id: 2, tags: { name: 'Leeds Plumbing', 'contact:phone': '0113 000' } },
    { type: 'node', id: 3, tags: { craft: 'plumber' } },
    { type: 'node', id: 4, tags: { name: 'Gone Ltd', disused: 'yes' } },
  ], { city: 'Leeds, UK', niche: 'plumber' });
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], { name: 'Leeds Plumbing', website: 'https://lp.test', city: 'Leeds, UK', phone: '0113 000', niche: 'plumber', email: 'hi@lp.test', address: '4 High St', osm_id: 'node/1' });
});

test('findOsmBusinesses geocodes the city, queries Overpass with a User-Agent, maps rows', async () => {
  const calls = [];
  const fetchImpl = async (url, opts = {}) => {
    calls.push({ url: String(url), opts });
    if (String(url).includes('nominatim')) return { ok: true, json: async () => [{ osm_type: 'node', osm_id: 9 }, { osm_type: 'relation', osm_id: 42, display_name: 'Leeds, England' }] };
    return { ok: true, json: async () => ({ elements: [{ type: 'node', id: 7, tags: { name: 'A1 Plumbers', phone: '0113 1' } }] }) };
  };
  const out = await findOsmBusinesses({ city: 'Leeds, UK', niche: 'plumber', userAgent: 'test-agent', fetchImpl });
  assert.equal(out.areaName, 'Leeds, England');
  assert.equal(out.rows[0].name, 'A1 Plumbers');
  assert.equal(calls[1].opts.headers['user-agent'], 'test-agent');
  assert.match(decodeURIComponent(String(calls[1].opts.body)), /area\(id:3600000042\)/);
  await assert.rejects(findOsmBusinesses({ city: 'x', niche: 'astronaut', userAgent: 'a', fetchImpl }), /unknown niche/);
});

test('extractEmails finds mailto and plain/obfuscated addresses, drops junk, prefers own domain', () => {
  const html = `<a href="mailto:Bob@Gmail.com">mail</a> office [at] joesplumbing [dot] com
    <img src="logo@2x.png"> user@example.com info@joesplumbing.com`;
  const got = extractEmails(html, 'www.joesplumbing.com');
  assert.deepEqual(got.slice(0, 2).sort(), ['info@joesplumbing.com', 'office@joesplumbing.com']);
  assert.equal(got[2], 'bob@gmail.com', 'other domains rank after the business domain');
  assert.equal(got.length, 3);
  assert.ok(!got.some(e => e.includes('example.com') || e.endsWith('.png')));
});

test('findEmail tries the homepage then contact pages', async () => {
  const visited = [];
  const fetchImpl = async (url) => {
    visited.push(new URL(url).pathname);
    const body = new URL(url).pathname === '/contact' ? '<p>Email: hello@biz.test</p>' : '<p>Welcome</p>';
    return { ok: true, text: async () => body };
  };
  assert.equal(await findEmail('biz.test', { fetchImpl, userAgent: 'ua' }), 'hello@biz.test');
  assert.deepEqual(visited, ['/', '/contact']);
  assert.equal(await findEmail('', { fetchImpl }), '');
});
