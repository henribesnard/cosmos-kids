/**
 * Vite plugin that mounts the Nova handler on /api/nova
 * in both dev (configureServer) and preview (configurePreviewServer).
 *
 * Usage in vite.config.ts:
 *   import { novaPlugin } from '../server/nova/vitePlugin';
 *   export default defineConfig({ plugins: [react(), novaPlugin()] });
 */

import type { Plugin, ViteDevServer, PreviewServer } from 'vite';

export function novaPlugin(): Plugin {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function attachHandler(middlewares: { use: (...args: any[]) => void }): Promise<void> {
    // Lazy-import the handler to avoid loading server code at build time
    const { handleNovaRequest } = await import('./handler');

    // Use Connect-style middleware
    middlewares.use(async (
      req: import('http').IncomingMessage,
      res: import('http').ServerResponse,
      next: () => void,
    ) => {
      if (req.url !== '/api/nova' || (req.method !== 'POST' && req.method !== 'OPTIONS')) {
        return next();
      }

      // Convert Node IncomingMessage → standard Request
      const body = await readBody(req);
      const protocol = 'http';
      const host = req.headers.host ?? 'localhost';
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
          const pump = async (): Promise<void> => {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(value);
            }
            res.end();
          };
          await pump();
        } else {
          res.end();
        }
      } catch (err) {
        console.error('[Nova Plugin] Handler error:', (err as Error).message);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
        }
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
  }

  return {
    name: 'nova-api',
    configureServer(server: ViteDevServer) {
      attachHandler(server.middlewares);
    },
    configurePreviewServer(server: PreviewServer) {
      attachHandler(server.middlewares);
    },
  };
}

function readBody(req: import('http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}
