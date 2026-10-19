import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchPlaces, toLeadRows, cityFromQuery } from '../prospector/places.mjs';

const place = (id, extra = {}) => ({ id, displayName: { text: `Biz ${id}` }, nationalPhoneNumber: `(512) 555-01${id}`, formattedAddress: `${id} Main St, Austin, TX`, ...extra });

test('searchPlaces sends the key and field mask, follows page tokens, stops at the last page', async () => {
  const calls = [];
  const pagesData = [{ places: [place('1'), place('2')], nextPageToken: 'p2' }, { places: [place('3')] }];
  const fetchImpl = async (url, opts) => {
    calls.push({ url, headers: opts.headers, body: JSON.parse(opts.body) });
    return { ok: true, json: async () => pagesData[calls.length - 1] };
  };
  const out = await searchPlaces({ query: 'plumber in Austin, TX', apiKey: 'k', pages: 3, fetchImpl });
  assert.equal(out.length, 3);
  assert.equal(calls.length, 2, 'no third request once nextPageToken is gone');
  assert.equal(calls[0].headers['X-Goog-Api-Key'], 'k');
  assert.match(calls[0].headers['X-Goog-FieldMask'], /places\.websiteUri/);
  assert.equal(calls[1].body.pageToken, 'p2');
  assert.equal(calls[0].body.textQuery, 'plumber in Austin, TX');
});

test('searchPlaces surfaces API errors', async () => {
  const fetchImpl = async () => ({ ok: false, status: 403, text: async () => 'API key not valid' });
  await assert.rejects(searchPlaces({ query: 'x', apiKey: 'bad', fetchImpl }), /403: API key not valid/);
});

test('toLeadRows maps fields, keeps no-website businesses and drops closed ones', () => {
  const rows = toLeadRows([
    place('1', { websiteUri: 'https://biz1.test', rating: 4.8, userRatingCount: 120 }),
    place('2'),
    place('3', { businessStatus: 'CLOSED_PERMANENTLY' }),
  ], { city: 'Austin, TX', niche: 'plumber' });
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { name: 'Biz 1', website: 'https://biz1.test', city: 'Austin, TX', phone: '(512) 555-011', niche: 'plumber', rating: 4.8, reviews: 120, address: '1 Main St, Austin, TX', place_id: '1' });
  assert.equal(rows[1].website, '');
});

test('cityFromQuery', () => {
  assert.equal(cityFromQuery('plumber in Austin, TX'), 'Austin, TX');
  assert.equal(cityFromQuery('dentist near Leeds'), 'Leeds');
  assert.equal(cityFromQuery('roofers'), '');
});
