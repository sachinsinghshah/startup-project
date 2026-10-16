// Fills template.html from a business config. Every value is HTML-escaped.

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function slugify(s) {
  return String(s).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-');
}

const REQUIRED = ['name', 'phone', 'city', 'tagline', 'services'];

export function validateConfig(c) {
  const missing = REQUIRED.filter(k => !c[k] || (Array.isArray(c[k]) && !c[k].length));
  if (missing.length) throw new Error(`config missing: ${missing.join(', ')}`);
  if (c.brandColor && !/^#[0-9a-f]{3,8}$/i.test(c.brandColor)) throw new Error('brandColor must be a hex color like #0b6bcb');
  if (c.siteUrl && !/^https:\/\/[a-z0-9.-]+(\/[\w./-]*)?$/i.test(c.siteUrl)) throw new Error('siteUrl must be a plain https:// URL like https://www.example.com');
}

export function render(template, c) {
  validateConfig(c);
  const businessId = c.businessId || slugify(c.name);
  const services = c.services.map(s => typeof s === 'string' ? { title: s } : s);
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': c.schemaType || 'LocalBusiness',
    name: c.name,
    telephone: c.phone,
    areaServed: c.serviceArea || c.city,
    ...(c.address ? { address: c.address } : {}),
  }).replace(/</g, '\\u003c');

  const vars = {
    name: esc(c.name),
    tagline: esc(c.tagline),
    city: esc(c.city),
    phone: esc(c.phone),
    phoneDigits: esc(c.phone.replace(/[^\d+]/g, '')),
    brandColor: c.brandColor || '#0b6bcb',
    headline: esc(c.headline || `${c.tagline} in ${c.city}`),
    subheadline: esc(c.subheadline || `Fast, friendly, fully insured. Serving ${c.serviceArea || c.city}. Free quotes, no call-out surprises.`),
    serviceArea: esc(c.serviceArea || c.city),
    responseTime: esc(c.responseTime || '1 business hour'),
    businessId: esc(businessId),
    year: new Date().getFullYear(),
    jsonLd,
    leadEndpointJson: JSON.stringify(c.leadEndpoint || '/api/lead').replace(/</g, '\\u003c'),
    canonicalHtml: c.siteUrl ? `<link rel="canonical" href="${esc(c.siteUrl.replace(/\/+$/, ''))}/">` : '',
    addressHtml: c.address ? ` · ${esc(c.address)}` : '',
    badgesHtml: (c.badges || ['Licensed & insured', 'Free estimates', 'Local & family-run'])
      .map(b => `<li>${esc(b)}</li>`).join(''),
    servicesHtml: services
      .map(s => `<div class="card"><h3>${esc(s.title)}</h3>${s.text ? `<p>${esc(s.text)}</p>` : ''}</div>`).join(''),
    testimonialsHtml: (c.testimonials?.length ? c.testimonials : [{ text: 'Add real Google reviews here once the client approves.', author: 'Placeholder' }])
      .map(t => `<blockquote class="card"><p>“${esc(t.text)}”</p><p><strong>${esc(t.author)}</strong></p></blockquote>`).join(''),
  };

  return template.replace(/\{\{(\w+)\}\}/g, (m, k) => {
    if (!(k in vars)) throw new Error(`template uses unknown variable {{${k}}}`);
    return vars[k];
  });
}
