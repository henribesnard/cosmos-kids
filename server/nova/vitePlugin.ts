/**
 * Vite plugin that mounts the Nova handler on /api/nova
 * in both dev (configureServer) and preview (configurePreviewServer).
 *
 * Usage in vite.config.ts:
 *   import { novaPlugin } from '../server/nova/vitePlugin';
 *   export default defineConfig({ plugins: [react(), novaPlugin()] });
 */

import { loadEnv, type Plugin, type ViteDevServer, type PreviewServer } from 'vite';

const NOVA_ROUTE_PATH = '/api/nova';

/**
 * Server-only env keys that may be copied from .env files into process.env.
 * Deliberately excludes every VITE_* key: nothing loaded here is ever exposed
 * to the client bundle (no `define`, no import.meta.env injection).
 */
function isNovaServerEnvKey(key: string): boolean {
  return key === 'MISTRAL_API_KEY' || key === 'EXA_API_KEY' || key.startsWith('NOVA_');
}

/**
 * Load server-only variables from the .env files (all prefixes, hence '') into
 * process.env so the Nova handler can read them in dev and preview — Vite only
 * exposes VITE_* variables to import.meta.env, never to process.env.
 *
 * A value already present in process.env always wins. Key values are never
 * logged.
 */
function loadServerEnv(mode: string, root: string): void {
  const fileEnv = loadEnv(mode, root, '');
  for (const key of Object.keys(fileEnv)) {
    if (!isNovaServerEnvKey(key)) continue;
    const value = fileEnv[key];
    if (value !== undefined && value !== '' && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function novaPlugin(): Plugin {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function attachHandler(middlewares: { use: (...args: any[]) => void }): Promise<void> {
    // Load the handler BEFORE registering the middleware: the hooks below
    // await this call, so the route is mounted before Vite installs its own
    // internal middlewares (including the final 404 handler).
    const { handleNovaRequest } = await import('./handler');

    // Use Connect-style middleware
    middlewares.use(async (
      req: import('http').IncomingMessage,
      res: import('http').ServerResponse,
      next: () => void,
    ) => {
      // Compare the path only — req.url may carry a query string
      const path = (req.url ?? '').split('?')[0];

      if (path !== NOVA_ROUTE_PATH || (req.method !== 'POST' && req.method !== 'OPTIONS')) {
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
    configResolved(config) {
      // Runs for dev, preview and build; copies only the whitelisted server keys.
      loadServerEnv(config.mode, config.root);
    },
    async configureServer(server: ViteDevServer) {
      // Awaited by Vite before its internal middlewares are installed
      await attachHandler(server.middlewares);
    },
    async configurePreviewServer(server: PreviewServer) {
      await attachHandler(server.middlewares);
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
