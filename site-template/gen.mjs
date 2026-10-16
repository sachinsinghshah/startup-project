#!/usr/bin/env node
// Usage: npm run gen -- <config.json> [more.json ...]
// Accepts a plain site config (site-template/configs/*.json, for prospect demos)
// or a client file (clients/*.json, uses its "site" section).
// Writes dist/<id>/. Deploy a preview with:  npx netlify-cli deploy --dir dist/<id>
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { render, slugify } from './render.mjs';
import { writeSite } from './write-site.mjs';
import { siteConfig } from '../tools/client-registry.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const files = process.argv.slice(2);
if (!files.length) {
  console.error('Usage: npm run gen -- <config.json> [more.json ...]');
  process.exit(1);
}

const template = await readFile(join(here, 'template.html'), 'utf8');
for (const file of files) {
  const json = JSON.parse(await readFile(file, 'utf8'));
  const config = json.site ? siteConfig(json) : json;
  const outDir = join('dist', config.businessId || slugify(config.name));
  await mkdir(outDir, { recursive: true });
  await writeSite(outDir, render(template, config), config);
  console.log(`Built ${outDir}/`);
}
