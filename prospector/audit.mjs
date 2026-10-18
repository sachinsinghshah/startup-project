// Scores how badly a local business needs a new website. Higher score = better lead.

const PSI_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

export function normalizeUrl(raw) {
  const s = (raw || '').trim();
  if (!s) return null;
  return /^https?:\/\//i.test(s) ? s : `http://${s}`;
}

// Pure HTML checks so they can be unit tested without the network.
export function checkHtml(html) {
  const h = html.toLowerCase();
  return {
    hasViewport: /<meta[^>]+name=["']?viewport/.test(h),
    hasForm: /<form[\s>]/.test(h),
    hasTelLink: /href=["']tel:/.test(h),
    hasTitle: /<title>[^<]{3,}<\/title>/.test(h),
    // Copyright year older than two years suggests nobody maintains the site.
    staleYear: (() => {
      const years = [...h.matchAll(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/g)].map(m => +m[1]);
      if (!years.length) return null;
      const latest = Math.max(...years);
      return new Date().getFullYear() - latest >= 2 ? latest : null;
    })(),
  };
}

export function scoreAudit(a) {
  if (a.error === 'no website') return { score: 100, reasons: ['no website'] };
  if (a.error) return { score: 100, reasons: [`site unreachable (${a.error})`] };
  const reasons = [];
  let score = 0;
  if (!a.https) { score += 20; reasons.push('no HTTPS'); }
  if (!a.hasViewport) { score += 25; reasons.push('not mobile-friendly'); }
  if (!a.hasForm) { score += 15; reasons.push('no contact/quote form'); }
  if (!a.hasTelLink) { score += 10; reasons.push('no tap-to-call link'); }
  if (!a.hasTitle) { score += 5; reasons.push('missing page title'); }
  if (a.staleYear) { score += 10; reasons.push(`copyright ${a.staleYear}`); }
  if (typeof a.perf === 'number') {
    if (a.perf < 50) { score += 15; reasons.push(`slow on mobile (${a.perf}/100)`); }
    else if (a.perf < 75) { score += 7; reasons.push(`mediocre mobile speed (${a.perf}/100)`); }
  }
  return { score: Math.min(score, 100), reasons };
}

async function fetchWithTimeout(url, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (site audit)' } });
  } finally {
    clearTimeout(t);
  }
}

export async function pageSpeed(url, apiKey) {
  const q = new URLSearchParams({ url, strategy: 'mobile', category: 'performance' });
  if (apiKey) q.set('key', apiKey);
  const res = await fetchWithTimeout(`${PSI_URL}?${q}`, 60000);
  if (!res.ok) return null;
  const json = await res.json();
  const s = json?.lighthouseResult?.categories?.performance?.score;
  return typeof s === 'number' ? Math.round(s * 100) : null;
}

export async function auditSite(rawUrl, { psi = false, psiKey } = {}) {
  const url = normalizeUrl(rawUrl);
  if (!url) return { error: 'no website' };
  try {
    const res = await fetchWithTimeout(url, 15000);
    const html = await res.text();
    const audit = { finalUrl: res.url, https: res.url.startsWith('https://'), ...checkHtml(html) };
    if (psi) audit.perf = await pageSpeed(res.url, psiKey).catch(() => null);
    return audit;
  } catch (e) {
    return { error: e.name === 'AbortError' ? 'timeout' : (e.cause?.code || e.message) };
  }
}
