#!/usr/bin/env node
// Usage: npm run prospect -- prospector/sample-businesses.csv [--out leads.csv] [--psi]
// Input CSV columns: name, website, city, phone (optional: email, niche)
// Set PSI_API_KEY for higher PageSpeed Insights quota (free key from Google Cloud).
import { readFile, writeFile } from 'node:fs/promises';
import { parseCsv, toCsv } from './csv.mjs';
import { auditSite, scoreAudit } from './audit.mjs';

const args = process.argv.slice(2);
const input = args.find(a => !a.startsWith('--'));
const outIdx = args.indexOf('--out');
const out = outIdx >= 0 ? args[outIdx + 1] : 'leads.csv';
const psi = args.includes('--psi');
const CONCURRENCY = 5;

if (!input) {
  console.error('Usage: npm run prospect -- <businesses.csv> [--out leads.csv] [--psi]');
  process.exit(1);
}

const businesses = parseCsv(await readFile(input, 'utf8'));
console.log(`Auditing ${businesses.length} businesses${psi ? ' (with PageSpeed)' : ''}...`);

const results = new Array(businesses.length);
let next = 0;
async function worker() {
  while (next < businesses.length) {
    const i = next++;
    const b = businesses[i];
    const audit = await auditSite(b.website, { psi, psiKey: process.env.PSI_API_KEY });
    const { score, reasons } = scoreAudit(audit);
    results[i] = { ...b, score, reasons: reasons.join('; '), mobile_speed: audit.perf ?? '', final_url: audit.finalUrl ?? '' };
    console.log(`  ${String(score).padStart(3)}  ${b.name}  ${reasons.join(', ') || 'looks fine'}`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

results.sort((a, b) => b.score - a.score);
const extra = Object.keys(businesses[0] || {}).filter(k => !['name', 'website', 'city'].includes(k));
await writeFile(out, toCsv(results, ['score', 'name', 'city', 'website', 'reasons', 'mobile_speed', 'final_url', ...extra]));
console.log(`\nWrote ${out}. Top leads have the highest score — build their demo site first.`);
