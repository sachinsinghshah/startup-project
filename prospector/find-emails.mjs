#!/usr/bin/env node
// Fill in the "email" column by visiting each business's own website (homepage + contact pages).
//   npm run find-emails -- my-leads.csv
// Only rows with a website and no email yet are checked. Polite: 3 sites at a time.
import { readFile, writeFile } from 'node:fs/promises';
import { parseCsv, toCsv } from './csv.mjs';
import { findEmail } from './emails.mjs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: npm run find-emails -- my-leads.csv');
  process.exit(1);
}

let contact = '';
try { contact = JSON.parse(await readFile('agency.json', 'utf8')).yourEmail || ''; } catch { /* optional */ }
const userAgent = `Mozilla/5.0 (compatible; local-lead-kit/0.1; ${contact || 'contact via agency.json'})`;

const rows = parseCsv(await readFile(file, 'utf8'));
const columns = [...new Set([...Object.keys(rows[0] || {}), 'email'])];
const todo = rows.filter(r => r.website && !r.email);
console.log(`Checking ${todo.length} websites for a contact email...`);

let next = 0, found = 0;
async function worker() {
  while (next < todo.length) {
    const r = todo[next++];
    r.email = await findEmail(r.website, { userAgent });
    if (r.email) found++;
    console.log(`  ${r.email ? '✓' : '·'} ${r.name}${r.email ? `  ${r.email}` : ''}`);
  }
}
await Promise.all([worker(), worker(), worker()]);

await writeFile(file, toCsv(rows, columns));
console.log(`\nFound ${found} emails → ${file}. No email? Call them, or check their Facebook page.`);
