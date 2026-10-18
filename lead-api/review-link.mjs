// Signed "job done, ask for a review" links. Only the business owner receives one (in their
// lead alert), so strangers can't make us email arbitrary addresses through the public form.
import { createHmac, timingSafeEqual } from 'node:crypto';

const MAX_AGE_DAYS = 120;
const b64 = s => Buffer.from(s).toString('base64url');
const sig = (data, secret) => createHmac('sha256', secret).update(data).digest('base64url');

export function signReviewToken({ clientId, name, email }, secret, now = new Date()) {
  const data = b64(JSON.stringify({ c: clientId, n: name, e: email, t: now.getTime() }));
  return `${data}.${sig(data, secret)}`;
}

export function verifyReviewToken(token, secret, now = new Date()) {
  const [data, mac] = String(token || '').split('.');
  if (!data || !mac || !secret) return null;
  const expected = Buffer.from(sig(data, secret));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const p = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (now.getTime() - p.t > MAX_AGE_DAYS * 86400000) return null;
    return { clientId: p.c, name: p.n, email: p.e };
  } catch {
    return null;
  }
}
