// Netlify Functions (v2) adapter for the owner's "job done → ask for a review" link: /api/review
import { handleReview } from '../../handle-lead.mjs';
import clients from '../../clients.json' with { type: 'json' };

export default async (req) => {
  if (req.method !== 'GET' && req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const token = req.method === 'POST'
    ? (await req.formData().catch(() => null))?.get('t')
    : new URL(req.url).searchParams.get('t');
  try {
    const { status, html } = await handleReview(req.method, token, { clients, env: process.env });
    return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8' } });
  } catch (e) {
    console.error(e);
    return new Response('Could not send the review request. Please try again later.', { status: 502 });
  }
};

export const config = { path: '/api/review' };
