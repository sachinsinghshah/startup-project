#!/usr/bin/env node
// Collect businesses from Google (official Places API) into a CSV the prospector understands.
//
//   GOOGLE_PLACES_API_KEY=xxx npm run find-leads -- --query "plumber in Austin, TX" --niche plumber
//   options: --pages 1-3 (20 results per page), --out my-leads.csv, --city "Austin, TX"
//
// Re-running with the same --out appends new businesses and skips ones already in the file.
// Then: npm run prospect -- my-leads.csv --psi
import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { parseCsv, toCsv } from './csv.mjs';
import { searchPlaces, toLeadRows, cityFromQuery } from './places.mjs';

const COLUMNS = ['name', 'website', 'city', 'phone', 'niche', 'rating', 'reviews', 'address', 'place_id'];

const { values: o } = parseArgs({
  options: {
    query: { type: 'string' }, niche: { type: 'string' }, city: { type: 'string' },
    pages: { type: 'string', default: '1' }, out: { type: 'string', default: 'my-leads.csv' },
  },
});

const apiKey = process.env.GOOGLE_PLACES_API_KEY;
if (!o.query || !apiKey) {
  console.error('Usage: GOOGLE_PLACES_API_KEY=xxx npm run find-leads -- --query "plumber in Austin, TX" --niche plumber [--pages 3] [--out my-leads.csv]');
  if (!apiKey) console.error('\nMissing GOOGLE_PLACES_API_KEY. See GUIDE.md §1 for how to get a free key.');
  process.exit(1);
}

const pages = Math.min(Math.max(Number(o.pages) || 1, 1), 3);
const city = o.city || cityFromQuery(o.query);
const found = toLeadRows(await searchPlaces({ query: o.query, apiKey, pages }), { city, niche: o.niche });

let existing = [];
try { existing = parseCsv(await readFile(o.out, 'utf8')); } catch { /* new file */ }
const seen = new Set(existing.map(r => r.place_id || `${r.name}|${r.phone}`));
const added = found.filter(r => !seen.has(r.place_id) && !seen.has(`${r.name}|${r.phone}`));

// Keep any columns already in the file (e.g. email from find-emails, osm_id from osm-leads).
const columns = [...new Set([...COLUMNS, ...existing.flatMap(r => Object.keys(r))])];
await writeFile(o.out, toCsv([...existing, ...added], columns));
const noSite = added.filter(r => !r.website).length;
console.log(`Found ${found.length}, added ${added.length} new (${noSite} with no website) → ${o.out} (${existing.length + added.length} total)`);
console.log(`Next: npm run prospect -- ${o.out} --psi`);
