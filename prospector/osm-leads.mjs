#!/usr/bin/env node
// Free lead finder (no API key): businesses from OpenStreetMap.
//   npm run osm-leads -- --city "Leeds, UK" --niche plumber [--out my-leads.csv]
// Appends to the CSV and skips businesses already in it. Coverage varies by country:
// usually good in the UK/EU, patchier in the US. Combine with find-leads or manual research.
import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { parseCsv, toCsv } from './csv.mjs';
import { findOsmBusinesses, NICHE_TAGS } from './osm.mjs';

const COLUMNS = ['name', 'website', 'city', 'phone', 'niche', 'email', 'address', 'rating', 'reviews', 'place_id', 'osm_id'];

const { values: o } = parseArgs({
  options: { city: { type: 'string' }, niche: { type: 'string' }, out: { type: 'string', default: 'my-leads.csv' } },
});
if (!o.city || !o.niche) {
  console.error(`Usage: npm run osm-leads -- --city "Leeds, UK" --niche plumber [--out my-leads.csv]\nNiches: ${Object.keys(NICHE_TAGS).join(', ')}`);
  process.exit(1);
}

let contact = '';
try { contact = JSON.parse(await readFile('agency.json', 'utf8')).yourEmail || ''; } catch { /* optional */ }
const userAgent = `local-lead-kit/0.1 (${contact || 'set yourEmail in agency.json'})`;

const { areaName, rows } = await findOsmBusinesses({ city: o.city, niche: o.niche, userAgent });

let existing = [];
try { existing = parseCsv(await readFile(o.out, 'utf8')); } catch { /* new file */ }
const key = r => `${String(r.name).toLowerCase()}|${r.phone}`;
const seen = new Set(existing.map(key));
const added = rows.filter(r => !seen.has(key(r)));

// Keep any columns already in the file (e.g. email from find-emails, osm_id from osm-leads).
const columns = [...new Set([...COLUMNS, ...existing.flatMap(r => Object.keys(r))])];
await writeFile(o.out, toCsv([...existing, ...added], columns));
console.log(`Area: ${areaName}`);
console.log(`Found ${rows.length} ${o.niche} businesses, added ${added.length} new → ${o.out}`);
console.log(`  ${added.filter(r => !r.website).length} without a website, ${added.filter(r => !r.phone).length} without a phone, ${added.filter(r => r.email).length} with an email`);
console.log(`Next: npm run find-emails -- ${o.out}   then   npm run prospect -- ${o.out} --psi`);
console.log('Data © OpenStreetMap contributors (ODbL).');
