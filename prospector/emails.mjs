// Find a public contact email on a business's own website (homepage + common contact pages).

const CONTACT_PATHS = ['', '/contact', '/contact-us', '/contact.html', '/about', '/about-us'];
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,24}/gi;
const JUNK = /\.(png|jpe?g|gif|svg|webp|css|js)$|@(example|domain|email|sentry|wixpress|sentry-next)\.|^(user|name|your|test)@/i;

export function extractEmails(html, siteHost = '') {
  const decoded = String(html)
    .replace(/&#64;|&commat;|\s*\[at\]\s*|\s*\(at\)\s*/gi, '@')
    .replace(/&#46;|\s*\[dot\]\s*|\s*\(dot\)\s*/gi, '.');
  const found = new Set();
  for (const m of decoded.matchAll(/mailto:([^"'?>\s]+)/gi)) found.add(decodeURIComponent(m[1]).toLowerCase());
  for (const m of decoded.matchAll(EMAIL_RE)) found.add(m[0].toLowerCase());
  const emails = [...found].filter(e => /^[^@\s]+@[^@\s]+\.[a-z]{2,24}$/.test(e) && !JUNK.test(e));
  const host = siteHost.replace(/^www\./, '').toLowerCase();
  // Prefer addresses on the business's own domain, then common inbox names.
  const rank = e => (host && e.endsWith('@' + host) ? 0 : 2) + (/^(info|contact|office|hello|admin|enquiries|sales)@/.test(e) ? 0 : 1);
  return emails.sort((a, b) => rank(a) - rank(b));
}

export async function findEmail(website, { fetchImpl = fetch, userAgent, timeoutMs = 10000 } = {}) {
  if (!website) return '';
  let base;
  try { base = new URL(/^https?:\/\//i.test(website) ? website : `http://${website}`); } catch { return ''; }
  for (const path of CONTACT_PATHS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetchImpl(new URL(path || base.pathname, base.origin), { signal: ctrl.signal, redirect: 'follow', headers: { 'user-agent': userAgent } });
      if (!res.ok) continue;
      const emails = extractEmails(await res.text(), base.hostname);
      if (emails.length) return emails[0];
    } catch { /* unreachable page: try the next one */ } finally {
      clearTimeout(timer);
    }
  }
  return '';
}
