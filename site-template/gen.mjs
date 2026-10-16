#!/usr/bin/env node
// Usage: npm run gen -- site-template/configs/sample-plumber.json [more.json ...]
// Writes dist/<slug>/index.html. Deploy a preview with:
//   npx netlify-cli deploy --dir dist/<slug>
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { render, slugify } from './render.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const files = process.argv.slice(2);
if (!files.length) {
  console.error('Usage: npm run gen -- <config.json> [more.json ...]');
  process.exit(1);
}

const template = await readFile(join(here, 'template.html'), 'utf8');
for (const file of files) {
  const config = JSON.parse(await readFile(file, 'utf8'));
  const outDir = join('dist', config.businessId || slugify(config.name));
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, 'index.html'), render(template, config));
  console.log(`Built ${outDir}/index.html`);
}
