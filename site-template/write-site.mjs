import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Writes index.html, plus robots.txt and sitemap.xml once the final siteUrl is known
// (submit the sitemap in Search Console after go-live).
export async function writeSite(outDir, html, config) {
  await writeFile(join(outDir, 'index.html'), html);
  if (!config.siteUrl) return;
  const base = config.siteUrl.replace(/\/+$/, '');
  await writeFile(join(outDir, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`);
  await writeFile(join(outDir, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${base}/</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>\n</urlset>\n`);
}
