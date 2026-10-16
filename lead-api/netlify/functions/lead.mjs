// Netlify Functions (v2) adapter. Deploy lead-api/ as its own Netlify site; endpoint: /api/lead
// Env vars: RESEND_API_KEY, FROM_EMAIL, optional TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM
import { handleLead } from '../../handle-lead.mjs';
import { CORS_HEADERS } from '../../cors.mjs';
import clients from '../../clients.json' with { type: 'json' };

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
  let body;
  try { body = await req.json(); } catch { body = null; }
  try {
    const { status, body: out } = await handleLead(body, { clients, env: process.env });
    return Response.json(out, { status, headers: CORS_HEADERS });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'failed to deliver lead' }, { status: 502, headers: CORS_HEADERS });
  }
};

export const config = { path: '/api/lead' };
