#!/usr/bin/env node
// Create demo client files, ready for `npm run gen` / `npm run clients -- build`.
//
// One business:
//   npm run new-client -- --name "Joe's Plumbing" --city "Austin, TX" --phone "(512) 555-0100" --niche plumber [--website joesplumbing.com]
// Top leads from the prospector:
//   npm run new-client -- --from-leads leads.csv --top 5 [--niche plumber]
//
// Demo leads go to YOUR email (agency.json → yourEmail) so you can show the form working.
// Switch lead.ownerEmail to the client's address during onboarding.
import { readFile, writeFile, access } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { parseCsv } from '../prospector/csv.mjs';
import { slugify } from '../site-template/render.mjs';
import { NICHES } from './niches.mjs';

export function buildClient(biz, agency) {
  const niche = NICHES[String(biz.niche || '').toLowerCase()] || NICHES.default;
  const id = slugify(`${biz.name} ${String(biz.city || '').split(',')[0]}`);
  const host = biz.website ? String(biz.website).replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/^www\./i, '') : '';
  const pkg = agency.packages?.starter || {};
  return {
    id,
    status: 'demo',
    contact: { name: '', email: biz.email || '', phone: biz.phone || '' },
    plan: { package: 'starter', setupFee: pkg.setupFee ?? 0, monthly: pkg.monthly ?? 0, currency: agency.currency || 'USD', startDate: '', billingRef: '' },
    domain: { name: host, ownedBy: 'client', registrar: '', renewalDate: '', renewalPaidBy: 'client', dnsAccess: 'none', emailOnDomain: null, dnsBackupTaken: false, notes: '' },
    access: { gbp: 'none', gsc: 'none', ga4: 'none', vaultRef: '', notes: '' },
    site: {
      name: biz.name,
      tagline: niche.tagline,
      city: biz.city,
      serviceArea: biz.city,
      phone: biz.phone,
      brandColor: '#0b6bcb',
      schemaType: niche.schemaType,
      siteUrl: '',
      liveUrl: '',
      headline: niche.headline.replace('{city}', String(biz.city).split(',')[0]),
      leadEndpoint: `${String(agency.leadApiUrl || '').replace(/\/+$/, '')}/api/lead`,
      badges: niche.badges,
      services: niche.services,
      testimonials: [],
    },
    lead: { ownerEmail: agency.yourEmail || '', ownerPhone: '', reviewUrl: '', reviewDelayDays: 0 },
  };
}

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

async function main() {
  const { values: o } = parseArgs({
    options: {
      name: { type: 'string' }, city: { type: 'string' }, phone: { type: 'string' },
      niche: { type: 'string' }, website: { type: 'string' },
      'from-leads': { type: 'string' }, top: { type: 'string', default: '5' },
    },
  });
  const agency = JSON.parse(await readFile('agency.json', 'utf8'));
  if (agency.yourEmail.includes('yourstudio') || agency.leadApiUrl.includes('YOUR-')) {
    console.warn('! agency.json still has placeholder values: fill in yourEmail and leadApiUrl first.\n');
  }

  let businesses;
  if (o['from-leads']) {
    businesses = parseCsv(await readFile(o['from-leads'], 'utf8')).slice(0, Number(o.top));
  } else if (o.name && o.city && o.phone) {
    businesses = [{ name: o.name, city: o.city, phone: o.phone, website: o.website }];
  } else {
    console.error('Usage: npm run new-client -- --name "Biz" --city "City, ST" --phone "(555) 555-0100" [--niche plumber] [--website x.com]\n   or: npm run new-client -- --from-leads leads.csv --top 5 [--niche plumber]');
    process.exit(1);
  }

  for (const biz of businesses) {
    if (o.niche && !biz.niche) biz.niche = o.niche;
    if (!biz.name || !biz.city || !biz.phone) {
      console.log(`- skipped "${biz.name || '?'}": needs name, city and phone (add a phone column to your CSV)`);
      continue;
    }
    const client = buildClient(biz, agency);
    const file = `clients/${client.id}.json`;
    if (await exists(file)) {
      console.log(`- skipped ${file}: already exists`);
      continue;
    }
    await writeFile(file, JSON.stringify(client, null, 2) + '\n');
    console.log(`+ ${file}  →  edit the services/headline, then: npm run gen -- ${file}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
