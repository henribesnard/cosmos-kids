// @vitest-environment node
/**
 * Nova lot 2 — handler-level tests with a mocked provider:
 * real Retry-After on 429, first-name masking, plain text, guess choices.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { handleNovaRequest, _resetProviderForTest } from './handler';
import { resetAllRateLimits } from './rateLimit';
import type { ChatMessage, ChatResponse, LLMProvider, NovaConfig } from './provider';

interface DraftShape {
  claims?: Array<{ text: string; sourceIds: string[] }>;
  guessFirst?: boolean;
  guessChoices?: unknown;
  followUps?: string[];
}

interface MockOpts {
  readonly draft?: DraftShape;
  readonly assembled?: string;
}

function createProvider(opts: MockOpts, seen: ChatMessage[][]): LLMProvider {
  const json = (value: unknown): ChatResponse => ({ content: JSON.stringify(value), toolCalls: [] });
  return {
    async chat(messages, options = {}) {
      seen.push([...messages]);
      const userText = messages.map((m) => m.content).join('\n');
      if (options.maxTokens === 100) return json({ category: 'in-domain', openQuestion: false });
      if (options.maxTokens === 2048) {
        const first = userText.split('[cat-')[1]?.split(']')[0];
        const ids = first ? [`cat-${first}`] : [];
        const count = (opts.draft?.claims ?? [{}]).length;
        return json({ results: Array.from({ length: count }, (_, i) => ({ claimIndex: i, verdict: 'supported', supportingSourceIds: ids })) });
      }
      if (options.maxTokens === 4096) {
        return json({
          claims: opts.draft?.claims ?? [{ text: 'Saturne possède des anneaux.', sourceIds: [] }],
          followUps: opts.draft?.followUps ?? [],
          actions: [],
          guessFirst: opts.draft?.guessFirst ?? false,
          guessChoices: opts.draft?.guessChoices,
        });
      }
      return { content: opts.assembled ?? 'Saturne possède des anneaux.', toolCalls: [] };
    },
    async chatWithTools() {
      return { content: null, toolCalls: [] };
    },
  };
}

function config(maxQuestionsPerHour = 10_000): NovaConfig {
  return {
    apiKey: 'test-key',
    model: 'm',
    draftModel: 'm',
    classificationModel: 'm',
    verificationModel: 'm',
    maxQuestionsPerHour,
    timeoutMs: 20_000,
    maxHistoryMessages: 6,
    exaApiKey: '',
  };
}

function request(question: string, locale: 'fr' | 'en' = 'fr', history: Array<{ role: string; text: string }> = []): Request {
  return new Request('http://127.0.0.1/api/nova', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `10.0.0.${Math.floor(Math.random() * 250)}` },
    body: JSON.stringify({
      question,
      context: { locale, view: 'solar', selectedObjectId: null, activeJourneyId: null, readingLevel: 'simple' },
      history,
    }),
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resultOf(res: Response): Promise<any> {
  const text = await res.text();
  for (const line of text.split('\n')) {
    if (!line.startsWith('data: {')) continue;
    const parsed = JSON.parse(line.slice(6));
    if (parsed.type === 'result') return parsed.message;
  }
  throw new Error('no result');
}

let counter = 0;
/** Unique suffix so the response cache never answers for another test. */
const q = (text: string) => `${text} (${++counter})`;

beforeEach(() => resetAllRateLimits());

describe('lot 2 — rate limit returns the real delay', () => {
  it('429 carries Retry-After and retryAfterSeconds (sliding window, not a fixed 60 s)', async () => {
    _resetProviderForTest(createProvider({}, []), config(1));
    const headers = { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.7' };
    const body = JSON.stringify({
      question: q('Combien de lunes a Saturne ?'),
      context: { locale: 'fr', view: 'solar', selectedObjectId: null, activeJourneyId: null, readingLevel: 'simple' },
      history: [],
    });
    const first = await handleNovaRequest(new Request('http://x/api/nova', { method: 'POST', headers, body }));
    expect(first.status).toBe(200);
    await first.text();

    const second = await handleNovaRequest(new Request('http://x/api/nova', { method: 'POST', headers, body }));
    expect(second.status).toBe(429);
    const retryAfter = Number(second.headers.get('Retry-After'));
    const json = await second.json();
    expect(json.retryAfterSeconds).toBe(retryAfter);
    expect(retryAfter).toBeGreaterThan(3500);
    expect(retryAfter).toBeLessThanOrEqual(3600);
  });
});

describe('lot 2 — personal information in natural phrasing', () => {
  it('a first name alone is masked before the provider and the question is answered with a reminder', async () => {
    const seen: ChatMessage[][] = [];
    _resetProviderForTest(createProvider({}, seen), config());
    const res = await handleNovaRequest(request(q('Je m’appelle Léonie, est-ce que Saturne a des anneaux ?')));
    const message = await resultOf(res);
    expect(message.kind).toBe('answer');
    expect(message.status).toBe('verified');
    expect(message.privacyNote).toMatch(/prénom/);
    expect(seen.length).toBeGreaterThan(0);
    for (const call of seen) {
      for (const m of call) expect(m.content).not.toContain('Léonie');
    }
  });

  it('a first name in the history is masked too', async () => {
    const seen: ChatMessage[][] = [];
    _resetProviderForTest(createProvider({}, seen), config());
    await resultOf(await handleNovaRequest(request(q('Saturne a-t-elle des anneaux ?'), 'fr', [
      { role: 'child', text: 'my name is Oscar, hi!' },
    ])));
    for (const call of seen) for (const m of call) expect(m.content).not.toContain('Oscar');
  });

  it('a place of residence is refused without calling the provider', async () => {
    const seen: ChatMessage[][] = [];
    _resetProviderForTest(createProvider({}, seen), config());
    const message = await resultOf(await handleNovaRequest(request(q('J’habite à Lyon, on voit Saturne ?'))));
    expect(message.kind).toBe('privacy');
    expect(message.status).toBeUndefined();
    expect(seen).toHaveLength(0);
  });

  it('"j’habite sur Terre" is a normal question', async () => {
    _resetProviderForTest(createProvider({}, []), config());
    const message = await resultOf(await handleNovaRequest(request(q('J’habite sur Terre, pourquoi Saturne a des anneaux ?'))));
    expect(message.kind).toBe('answer');
    expect(message.privacyNote).toBeUndefined();
  });
});

describe('lot 2 — plain text only (no asterisk reaches the child)', () => {
  it('cleans Markdown from the assembled text, the claims and the follow-ups', async () => {
    _resetProviderForTest(createProvider({
      draft: {
        claims: [
          { text: '*Pouf !* Saturne possède des anneaux.', sourceIds: [] },
          { text: 'Les anneaux sont faits de **glace**.', sourceIds: [] },
        ],
        followUps: ['*Pourquoi* des anneaux ?'],
      },
      assembled: '*Pouf !* Saturne a des **anneaux** faits de _glace_.\n- et de poussière',
    }, []), config());
    const message = await resultOf(await handleNovaRequest(request(q('De quoi sont faits les anneaux de Saturne ?'))));
    const visible = [message.text, ...message.claims.map((c: { text: string }) => c.text), ...message.followUps].join(' ');
    expect(visible).not.toContain('*');
    expect(visible).not.toMatch(/(^|\s)_\w/);
    expect(message.text).toContain('Pouf !');
  });
});

describe('lot 2 — "Guess first!" choices', () => {
  it('are sent only with guessFirst, as hypotheses outside the verified claims', async () => {
    _resetProviderForTest(createProvider({
      draft: {
        claims: [{ text: 'Saturne possède au moins 146 lunes.', sourceIds: [] }],
        guessFirst: true,
        guessChoices: ['Une seule', 'Une dizaine', 'Plus de 100'],
      },
    }, []), config());
    const message = await resultOf(await handleNovaRequest(request(q('Combien de lunes a Saturne ?'))));
    expect(message.guessFirst).toBe(true);
    expect(message.guessChoices).toEqual(['Une seule', 'Une dizaine', 'Plus de 100']);
    const claimTexts = message.claims.map((c: { text: string }) => c.text);
    for (const choice of message.guessChoices) expect(claimTexts).not.toContain(choice);
  });

  it('are dropped when guessFirst is false', async () => {
    _resetProviderForTest(createProvider({
      draft: { guessFirst: false, guessChoices: ['A', 'B'] },
    }, []), config());
    const message = await resultOf(await handleNovaRequest(request(q('Saturne a-t-elle des anneaux ?'))));
    expect(message.guessChoices).toBeUndefined();
  });
});
