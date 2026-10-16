#!/usr/bin/env node
// Local test server: npm run lead-api:dev  → POST http://localhost:8787/api/lead
// Without RESEND_API_KEY it runs in dry-run mode and prints the emails it would send.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { handleLead } from './handle-lead.mjs';
import { CORS_HEADERS } from './cors.mjs';

const clients = JSON.parse(await readFile(new URL('./clients.json', import.meta.url), 'utf8'));
const PORT = Number(process.env.PORT || 8787);

createServer(async (req, res) => {
  const send = (status, obj) => {
    res.writeHead(status, { ...CORS_HEADERS, 'content-type': 'application/json' });
    res.end(obj ? JSON.stringify(obj) : undefined);
  };
  if (req.method === 'OPTIONS') return send(204);
  if (req.url !== '/api/lead' || req.method !== 'POST') return send(404, { error: 'not found' });
  let raw = '';
  for await (const chunk of req) raw += chunk;
  let body;
  try { body = JSON.parse(raw); } catch { body = null; }
  try {
    const out = await handleLead(body, { clients, env: process.env });
    send(out.status, out.body);
  } catch (e) {
    console.error(e);
    send(502, { error: 'failed to deliver lead' });
  }
}).listen(PORT, () => console.log(`Lead API listening on http://localhost:${PORT}/api/lead`));
