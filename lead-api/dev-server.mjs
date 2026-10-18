#!/usr/bin/env node
// Local test server: npm run lead-api:dev
//   POST http://localhost:8787/api/lead          (form submissions)
//   GET/POST http://localhost:8787/api/review    (owner's "ask for a review" link)
// Without RESEND_API_KEY it runs in dry-run mode and prints the emails it would send.
// Review links need LINK_SECRET (any random string) and PUBLIC_URL=http://localhost:8787.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { handleLead, handleReview } from './handle-lead.mjs';
import { CORS_HEADERS } from './cors.mjs';

const clients = JSON.parse(await readFile(new URL('./clients.json', import.meta.url), 'utf8'));
const PORT = Number(process.env.PORT || 8787);

async function readBody(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw;
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const sendJson = (status, obj) => {
    res.writeHead(status, { ...CORS_HEADERS, 'content-type': 'application/json' });
    res.end(obj ? JSON.stringify(obj) : undefined);
  };
  try {
    if (url.pathname === '/api/lead') {
      if (req.method === 'OPTIONS') return sendJson(204);
      if (req.method !== 'POST') return sendJson(405, { error: 'method not allowed' });
      let body;
      try { body = JSON.parse(await readBody(req)); } catch { body = null; }
      const out = await handleLead(body, { clients, env: process.env });
      return sendJson(out.status, out.body);
    }
    if (url.pathname === '/api/review' && (req.method === 'GET' || req.method === 'POST')) {
      const token = req.method === 'POST' ? new URLSearchParams(await readBody(req)).get('t') : url.searchParams.get('t');
      const out = await handleReview(req.method, token, { clients, env: process.env });
      res.writeHead(out.status, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(out.html);
    }
    sendJson(404, { error: 'not found' });
  } catch (e) {
    console.error(e);
    sendJson(502, { error: 'failed to deliver' });
  }
}).listen(PORT, () => console.log(`Lead API listening on http://localhost:${PORT} (/api/lead, /api/review)`));
