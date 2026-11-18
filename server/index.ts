/**
 * Standalone Node.js server for Nova API.
 *
 * Usage:
 *   npx tsx server/index.ts
 *
 * Serves:
 *   POST /api/nova — Nova assistant endpoint (SSE)
 *   GET  /health   — Health check
 *
 * In production, run behind a reverse proxy (nginx/caddy) that:
 * - Terminates TLS
 * - Serves the static dist/ files
 * - Proxies /api/nova to this server
 *
 * VPS requirements:
 * - Node.js 20+
 * - ~128 MB RAM (server itself uses minimal memory)
 * - Network access to api.mistral.ai
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { handleNovaRequest } from './nova/handler';

const PORT = Number(process.env.NOVA_PORT) || 3001;
const HOST = process.env.NOVA_HOST || '127.0.0.1';

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

async function requestHandler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // Health check
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
    return;
  }

  // Nova endpoint
  if (req.url === '/api/nova' && (req.method === 'POST' || req.method === 'OPTIONS')) {
    const body = req.method === 'POST' ? await readBody(req) : '';
    const protocol = 'http';
    const host = req.headers.host ?? `${HOST}:${PORT}`;
    const url = `${protocol}://${host}${req.url}`;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') headers.set(key, value);
      else if (Array.isArray(value)) headers.set(key, value.join(', '));
    }

    const webRequest = new Request(url, {
      method: req.method,
      headers,
      body: req.method === 'POST' ? body : undefined,
    });

    try {
      const webResponse = await handleNovaRequest(webRequest);
      res.writeHead(webResponse.status, Object.fromEntries(webResponse.headers.entries()));

      if (webResponse.body) {
        const reader = webResponse.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      }
      res.end();
    } catch (err) {
      console.error('[Nova] Handler error:', (err as Error).message);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
      }
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  // 404 for everything else
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
}

const server = createServer((req, res) => {
  requestHandler(req, res).catch((err) => {
    console.error('[Nova] Unhandled error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
    }
    res.end(JSON.stringify({ error: 'Internal server error' }));
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[Nova] Server listening on ${HOST}:${PORT}`);
  console.log(`[Nova] POST ${HOST}:${PORT}/api/nova`);
  console.log(`[Nova] GET  ${HOST}:${PORT}/health`);
});
