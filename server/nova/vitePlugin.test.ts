// @vitest-environment node
/**
 * Integration tests for the Nova Vite plugin.
 *
 * They start a real Vite dev server (createServer) and a real preview server
 * (build + preview) with the nova plugin and a mocked Mistral/Exa provider,
 * then exercise POST /api/nova over HTTP:
 * - the route must NOT 404 (it must be mounted before Vite's internal middlewares)
 * - a valid body returns a full SSE stream (phase events then a result block)
 * - an invalid body returns 400, also when the URL carries a query string
 * - Nova server env vars are loaded from a test .env through the plugin
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createServer, build, preview, type ViteDevServer, type PreviewServer } from 'vite';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { novaPlugin } from './vitePlugin';
import { _resetProviderForTest } from './handler';
import type { LLMProvider, NovaConfig, ChatResponse } from './provider';

const VALID_BODY = {
  question: 'Combien de planètes dans le système solaire ?',
  context: { locale: 'fr', view: 'solar', selectedObjectId: null, activeJourneyId: null, readingLevel: 'simple' },
  history: [],
};

/** Mock LLM: routes each pipeline step by the maxTokens the handler uses. */
function createMockProvider(): LLMProvider {
  const json = (value: unknown): ChatResponse => ({ content: JSON.stringify(value), toolCalls: [] });
  return {
    async chat(messages, options = {}) {
      const userText = messages.map((m) => m.content).join('\n');
      if (options.maxTokens === 100) {
        // Classification step
        return json({ category: 'in-domain', openQuestion: false });
      }
      if (options.maxTokens === 2048) {
        // Verification step — attribute the claim to the first registered source ID found in the prompt
        const ids: string[] = [];
        for (const part of userText.split('[cat-').slice(1)) {
          const id = 'cat-' + part.split(']')[0].trim();
          if (id.length > 4) ids.push(id);
        }
        return json({ results: [{ claimIndex: 0, verdict: 'supported', supportingSourceIds: ids.slice(0, 1) }] });
      }
      if (options.maxTokens === 4096) {
        // Drafting step
        return json({
          claims: [{ text: 'Il y a 8 planètes dans le système solaire.', sourceIds: [] }],
          followUps: ['Quelle est la plus grosse planète ?'],
          actions: [],
          guessFirst: false,
        });
      }
      // Text assembly step
      return json('Il y a 8 planètes dans le système solaire.');
    },
    async chatWithTools() {
      return { content: null, toolCalls: [] };
    },
  };
}

const MOCK_CONFIG: NovaConfig = {
  apiKey: 'test-key',
  model: 'test-model',
  draftModel: 'test-draft-model',
  classificationModel: 'test-classification-model',
  verificationModel: 'test-verification-model',
  maxQuestionsPerHour: 1000,
  timeoutMs: 20_000,
  maxHistoryMessages: 6,
  exaApiKey: '', // empty key → noop search provider, no network calls
};

interface SseEvent {
  type?: string;
  phase?: string;
  message?: { kind?: string };
}

function parseSse(text: string): { phases: string[]; result: SseEvent | null; done: boolean } {
  const phases: string[] = [];
  let result: SseEvent | null = null;
  let done = false;
  for (const block of text.split('\n\n')) {
    for (const line of block.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') {
        done = true;
        continue;
      }
      try {
        const parsed = JSON.parse(data) as SseEvent;
        if (parsed.type === 'phase' && parsed.phase) phases.push(parsed.phase);
        if (parsed.type === 'result') result = parsed;
      } catch {
        // ignore non-JSON lines
      }
    }
  }
  return { phases, result, done };
}

function postNova(base: string, path: string, body: unknown): Promise<Response> {
  return fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const openServers: Array<{ close: () => Promise<void> }> = [];

afterEach(async () => {
  while (openServers.length > 0) {
    await openServers.pop()!.close();
  }
});

function serverPort(server: ViteDevServer | PreviewServer): number {
  const addr = server.httpServer?.address();
  if (addr && typeof addr === 'object') return addr.port;
  throw new Error('Server is not listening');
}

describe('novaPlugin — dev server (createServer)', () => {
  it('mounts POST /api/nova before Vite middlewares: SSE on valid body, 400 on invalid body, never 404', async () => {
    _resetProviderForTest(createMockProvider(), MOCK_CONFIG);
    const server = await createServer({
      root: process.cwd(),
      configFile: false,
      logLevel: 'silent',
      plugins: [novaPlugin()],
      server: { host: '127.0.0.1', port: 0, strictPort: false },
    });
    openServers.push(server);
    await server.listen();
    const base = `http://127.0.0.1:${serverPort(server)}`;

    // Invalid body → 400 (would be 404 if the route were mounted after Vite's 404)
    const invalid = await postNova(base, '/api/nova', {});
    expect(invalid.status).toBe(400);

    // Invalid body with a query string → still 400, not 404
    const invalidQuery = await postNova(base, '/api/nova?trace=1', {});
    expect(invalidQuery.status).toBe(400);

    // Valid body → SSE stream with phase events then a result block
    const res = await postNova(base, '/api/nova', VALID_BODY);
    expect(res.status).not.toBe(404);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const { phases, result, done } = parseSse(await res.text());
    expect(phases.length).toBeGreaterThan(0);
    expect(result).not.toBeNull();
    expect(result!.message?.kind).toBe('answer');
    expect(done).toBe(true);
  }, 30_000);
});

describe('novaPlugin — preview server (build + preview)', () => {
  it('mounts POST /api/nova in preview too: SSE on valid body, 400 on invalid body, never 404', async () => {
    _resetProviderForTest(createMockProvider(), MOCK_CONFIG);
    const tmp = mkdtempSync(join(tmpdir(), 'nova-preview-'));
    try {
      writeFileSync(join(tmp, 'index.html'), '<!doctype html><html><body>nova preview test</body></html>');
      await build({
        root: tmp,
        configFile: false,
        logLevel: 'silent',
        plugins: [novaPlugin()],
        build: { outDir: 'dist' },
      });
      const server = await preview({
        root: tmp,
        configFile: false,
        logLevel: 'silent',
        plugins: [novaPlugin()],
        preview: { host: '127.0.0.1', port: 0, strictPort: false },
      });
      openServers.push(server);
      const base = `http://127.0.0.1:${serverPort(server)}`;

      const invalid = await postNova(base, '/api/nova', {});
      expect(invalid.status).toBe(400);

      const res = await postNova(base, '/api/nova', VALID_BODY);
      expect(res.status).not.toBe(404);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/event-stream');
      const { phases, result, done } = parseSse(await res.text());
      expect(phases.length).toBeGreaterThan(0);
      expect(result).not.toBeNull();
      expect(result!.message?.kind).toBe('answer');
      expect(done).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }, 120_000);
});

describe('novaPlugin — server env loading', () => {
  it('copies only Nova server keys from a test .env into process.env, without overwriting existing values', async () => {
    const marker = 'NOVA_PLUGIN_ENV_TEST_MARKER';
    const preset = 'NOVA_PLUGIN_ENV_TEST_PRESET';
    const nonNova = 'NOT_A_NOVA_KEY';
    const hadMistralKey = process.env.MISTRAL_API_KEY !== undefined;
    delete process.env[marker];
    delete process.env[nonNova];
    process.env[preset] = 'preset-value';
    try {
      const tmp = mkdtempSync(join(tmpdir(), 'nova-env-'));
      try {
        const dotenvLines = [
          'MISTRAL_API_KEY=dotenv-test-key',
          marker + '=loaded-from-dotenv',
          preset + '=dotenv-value-that-must-not-win',
          nonNova + '=must-not-be-copied',
          'VITE_CLIENT_KEY=must-not-be-copied',
          '',
        ];
        writeFileSync(join(tmp, '.env'), dotenvLines.join('\n'));
        writeFileSync(join(tmp, 'index.html'), '<!doctype html><html><body>env test</body></html>');
        const server = await createServer({
          root: tmp,
          configFile: false,
          logLevel: 'silent',
          plugins: [novaPlugin()],
          server: { host: '127.0.0.1', port: 0, strictPort: false },
        });
        openServers.push(server);
        await server.listen();

        if (!hadMistralKey) {
          expect(process.env.MISTRAL_API_KEY).toBe('dotenv-test-key');
        }
        expect(process.env[marker]).toBe('loaded-from-dotenv');
        expect(process.env[preset]).toBe('preset-value'); // existing process.env value wins
        expect(process.env[nonNova]).toBeUndefined(); // not a Nova key → untouched
        expect(process.env.VITE_CLIENT_KEY).toBeUndefined(); // VITE_* never copied by the plugin
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    } finally {
      delete process.env[marker];
      delete process.env[preset];
      delete process.env[nonNova];
    }
  }, 30_000);
});
