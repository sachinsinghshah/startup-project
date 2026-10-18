#!/usr/bin/env node
// npm run clients            → status table + warnings for every client
// npm run clients -- build   → regenerate lead-api/clients.json and build every client site into dist/
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { checkClient, leadApiClients, siteConfig, monthlyRevenue } from './client-registry.mjs';
import { render } from '../site-template/render.mjs';
import { writeSite } from '../site-template/write-site.mjs';

const DIR = 'clients';
const files = (await readdir(DIR)).filter(f => f.endsWith('.json') && !f.startsWith('_'));
const clients = [];
for (const f of files) {
  try {
    clients.push({ ...JSON.parse(await readFile(join(DIR, f), 'utf8')), _file: f });
  } catch (e) {
    console.error(`✗ ${f}: invalid JSON (${e.message})`);
    process.exitCode = 1;
  }
}

let errorCount = 0;
console.log(`${'CLIENT'.padEnd(28)} ${'STATUS'.padEnd(11)} ${'DOMAIN'.padEnd(28)} GBP / GSC`);
for (const c of clients.sort((a, b) => a.id?.localeCompare(b.id))) {
  const { errors, warnings } = checkClient(c);
  if (c._file !== `${c.id}.json`) errors.push(`file name should be ${c.id}.json`);
  errorCount += errors.length;
  console.log(`${String(c.id).padEnd(28)} ${String(c.status).padEnd(11)} ${String(c.domain?.name || '-').padEnd(28)} ${c.access?.gbp || 'none'} / ${c.access?.gsc || 'none'}`);
  for (const e of errors) console.log(`    ✗ ${e}`);
  for (const w of warnings) console.log(`    ! ${w}`);
}
const mrr = Object.entries(monthlyRevenue(clients)).map(([cur, v]) => `${v} ${cur}`).join(' + ') || '0';
console.log(`\n${clients.length} clients, ${clients.filter(c => c.status === 'active').length} active, monthly recurring: ${mrr}`);

if (errorCount) {
  console.error(`\n${errorCount} error(s). Fix them before building.`);
  process.exit(1);
}

if (process.argv[2] === 'build') {
  const leadClients = leadApiClients(clients);
  await writeFile('lead-api/clients.json', JSON.stringify(leadClients, null, 2) + '\n');
  console.log(`\nWrote lead-api/clients.json (${Object.keys(leadClients).length} clients). Redeploy the lead API to apply.`);
  const template = await readFile('site-template/template.html', 'utf8');
  for (const c of clients.filter(c => c.status !== 'cancelled' && c.status !== 'prospect')) {
    const config = siteConfig(c);
    const outDir = join('dist', c.id);
    await mkdir(outDir, { recursive: true });
    await writeSite(outDir, render(template, config), config);
    console.log(`Built ${outDir}/`);
  }
}
