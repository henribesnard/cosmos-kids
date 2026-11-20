// @vitest-environment node
/**
 * Tests for deterministic server-side travel actions.
 *
 * Handler-level tests use a mocked LLM provider whose draft returns
 * claims WITHOUT actions (the bug scenario): the expected action must
 * still be present, computed by the server.
 */

import { describe, it, expect } from 'vitest';

import { handleNovaRequest, _resetProviderForTest } from './handler';
import { computeTravelActions, normalizeText } from './travelActions';
import type { LLMProvider, NovaConfig, ChatResponse } from './provider';

/* ------------------------------------------------------------------ */
/*  Mock provider                                                      */
/* ------------------------------------------------------------------ */

interface MockOpts {
  readonly offTopic?: boolean;
  readonly claimText?: string;
  readonly modelActions?: Array<{ kind: 'travel'; destinationId: string; label: string }>;
}

function createMockProvider(opts: MockOpts = {}): LLMProvider {
  const json = (value: unknown): ChatResponse => ({ content: JSON.stringify(value), toolCalls: [] });
  return {
    async chat(messages, options = {}) {
      const userText = messages.map((m) => m.content).join('\n');
      if (options.maxTokens === 100) {
        // Classification
        return json({ category: opts.offTopic ? 'off-topic' : 'in-domain', openQuestion: false });
      }
      if (options.maxTokens === 2048) {
        // Verification — attribute the claim to the first catalog source in the prompt
        const ids: string[] = [];
        for (const part of userText.split('[cat-').slice(1)) {
          const id = 'cat-' + part.split(']')[0].trim();
          if (id.length > 4) ids.push(id);
        }
        return json({ results: [{ claimIndex: 0, verdict: 'supported', supportingSourceIds: ids.slice(0, 1) }] });
      }
      if (options.maxTokens === 4096) {
        // Draft — deliberately WITHOUT server-trustworthy actions
        return json({
          claims: [{ text: opts.claimText ?? 'Voici une information vérifiée.', sourceIds: [] }],
          followUps: [],
          actions: opts.modelActions ?? [],
          guessFirst: false,
        });
      }
      // Text assembly
      return json(opts.claimText ?? 'Voici une information vérifiée.');
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
  maxQuestionsPerHour: 10_000,
  timeoutMs: 20_000,
  maxHistoryMessages: 6,
  exaApiKey: '',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function makeRequest(question: string, locale: 'fr' | 'en'): Request {
  return new Request('http://127.0.0.1/api/nova', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      context: { locale, view: 'solar', selectedObjectId: null, activeJourneyId: null, readingLevel: 'simple' },
      history: [],
    }),
  });
}

interface ParsedResult {
  kind?: string;
  status?: string;
  actions: Array<{ kind: string; destinationId: string; label: string }>;
}

async function ask(question: string, locale: 'fr' | 'en', opts: MockOpts = {}): Promise<ParsedResult> {
  _resetProviderForTest(createMockProvider(opts), MOCK_CONFIG);
  const res = await handleNovaRequest(makeRequest(question, locale));
  expect(res.status).toBe(200);
  const text = await res.text();
  for (const block of text.split('\n\n')) {
    for (const line of block.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      try {
        const parsed = JSON.parse(line.slice(6));
        if (parsed.type === 'result') {
          return {
            kind: parsed.message.kind,
            status: parsed.message.status,
            actions: parsed.message.actions ?? [],
          };
        }
      } catch { /* not JSON */ }
    }
  }
  throw new Error('No result event in SSE stream');
}

/* ------------------------------------------------------------------ */
/*  Direct unit tests of computeTravelActions                          */
/* ------------------------------------------------------------------ */

describe('computeTravelActions (unit)', () => {
  it('maps a cited cat-mars source to the mars destination with a localized label', async () => {
    const actions = await computeTravelActions(
      'À quelle distance est Mars ?',
      [{ text: 'Mars est à 227,9 millions de km du Soleil.', sourceIds: ['cat-mars'] }],
      'fr',
    );
    expect(actions[0]!.destinationId).toBe('mars'); // question object first
    expect(actions[0]!.label).toBe('Emmène-moi voir Mars');
    expect(actions.length).toBeLessThanOrEqual(2);
    expect(actions.map((a) => a.destinationId)).toContain('mars');
  });

  it('matches English names and variants from the catalog (ISS)', async () => {
    const actions = await computeTravelActions('What is the ISS?', [], 'en');
    expect(actions.map((a) => a.destinationId)).toContain('iss');
    expect(actions[0]!.label).toBe('Take me to International Space Station');
  });

  it('matches French names (nébuleuse d’Orion, Andromède)', async () => {
    const orion = await computeTravelActions('Qu’est-ce que la nébuleuse d’Orion ?', [], 'fr');
    expect(orion[0]!.destinationId).toBe('orion-nebula');
    const andromeda = await computeTravelActions('Parle-moi d’Andromède', [], 'fr');
    expect(andromeda[0]!.destinationId).toBe('andromeda');
  });

  it('orders by relevance (main object of the question first) and caps at 2', async () => {
    const actions = await computeTravelActions(
      'Quelle est la distance entre Mars et Saturne, et Jupiter est-elle plus grosse ?',
      [],
      'fr',
    );
    expect(actions.map((a) => a.destinationId)).toEqual(['mars', 'saturn']);
  });

  it('rejects ids that are not valid travel destinations (e.g. journey ids)', async () => {
    const actions = await computeTravelActions(
      'Parle-moi du voyage vers Mars',
      [{ text: 'Le trajet Terre-Mars est documenté.', sourceIds: ['cat-earth-to-mars'] }],
      'fr',
    );
    expect(actions.map((a) => a.destinationId)).not.toContain('earth-to-mars');
  });

  it('onlyIfInQuestion ignores claims for unknown answers', async () => {
    const actions = await computeTravelActions(
      'À quelle distance est Mars ?',
      [{ text: 'Jupiter est une géante.', sourceIds: ['cat-jupiter'] }],
      'fr',
      { onlyIfInQuestion: true },
    );
    expect(actions.map((a) => a.destinationId)).toEqual(['mars']);
  });

  it('normalizeText strips diacritics and punctuation', () => {
    expect(normalizeText('Nébuleuse d’Orion !')).toBe('nebuleuse d orion');
  });
});

/* ------------------------------------------------------------------ */
/*  Handler-level tests (mock provider, draft WITHOUT actions)         */
/* ------------------------------------------------------------------ */

describe('lot 2 — faux positifs (aliases = noms propres uniquement)', () => {
  it('« What is the ISS? » ne propose jamais lmc, même si une claim dit « large »', async () => {
    const r = await ask('What is the International Space Station? fp', 'en', {
      claimText: 'The International Space Station is a large spacecraft and a grand laboratory in a cloud-free orbit.',
      modelActions: [{ kind: 'travel', destinationId: 'lmc', label: 'Take me to Large Magellanic Cloud' }],
    });
    const ids = r.actions.map((a) => a.destinationId);
    expect(ids).toContain('iss');
    expect(ids).not.toContain('lmc');
    expect(ids).not.toContain('smc');
  });

  it('« une grande étoile » → aucune action parasite', async () => {
    const actions = await computeTravelActions(
      'Qu’est-ce qu’une grande étoile ?',
      [{ text: 'Une grande étoile est très large, comme un grand nuage brillant.', sourceIds: [] }],
      'fr',
    );
    expect(actions).toEqual([]);
  });

  it('mots courants anglais (large, small, cloud, station, eagle, ring…) → aucune action', async () => {
    const actions = await computeTravelActions(
      'Is a large cloud or a small space station bigger than an eagle?',
      [{ text: 'A large gas cloud can be huge.', sourceIds: [] }],
      'en',
    );
    expect(actions).toEqual([]);
  });

  it('un objet seulement nommé dans le texte d’une claim ne suffit plus', async () => {
    const actions = await computeTravelActions(
      'Pourquoi les planètes tournent-elles ?',
      [{ text: 'Mars et Jupiter tournent autour du Soleil.', sourceIds: [] }],
      'fr',
    );
    expect(actions).toEqual([]);
  });

  it('les noms complets restent reconnus (Grand Nuage de Magellan, Large Magellanic Cloud)', async () => {
    const fr = await computeTravelActions('C’est quoi le Grand Nuage de Magellan ?', [], 'fr');
    expect(fr.map((a) => a.destinationId)).toEqual(['lmc']);
    const en = await computeTravelActions('How far is the Large Magellanic Cloud?', [], 'en');
    expect(en.map((a) => a.destinationId)).toEqual(['lmc']);
  });

  it('la source catalogue d’une claim conservée reste une raison valable', async () => {
    const actions = await computeTravelActions(
      'Pourquoi les planètes tournent-elles ?',
      [{ text: 'La Lune tourne autour de la Terre.', sourceIds: ['cat-moon'] }],
      'fr',
    );
    expect(actions.map((a) => a.destinationId)).toEqual(['moon']);
  });
});

describe('handler — server-computed travel actions', () => {
  it('« À quelle distance est Mars ? » (draft sans actions) → action mars', async () => {
    const r = await ask('À quelle distance est Mars du Soleil ?', 'fr', {
      claimText: 'Mars est à environ 228 millions de km du Soleil.',
    });
    expect(r.kind).toBe('answer');
    expect(r.actions.map((a) => a.destinationId)).toContain('mars');
  });

  it('« Combien de lunes a Saturne ? » (draft sans actions) → action saturn', async () => {
    const r = await ask('Combien de lunes a Saturne exactement ?', 'fr', {
      claimText: 'Saturne possède plus de 140 lunes connues.',
    });
    expect(r.actions.map((a) => a.destinationId)).toContain('saturn');
  });

  it('« What is the ISS? » (draft sans actions) → action iss', async () => {
    const r = await ask('What is the ISS exactly?', 'en', {
      claimText: 'The ISS is a space station in low Earth orbit.',
    });
    expect(r.actions.map((a) => a.destinationId)).toContain('iss');
    expect(r.actions.find((a) => a.destinationId === 'iss')!.label).toBe('Take me to International Space Station');
  });

  it('« Qu’est-ce que la nébuleuse d’Orion ? » (draft sans actions) → action orion-nebula', async () => {
    const r = await ask('Qu’est-ce que la nébuleuse d’Orion exactement ?', 'fr', {
      claimText: 'La nébuleuse d’Orion est un nuage de gaz où naissent des étoiles.',
    });
    expect(r.actions.map((a) => a.destinationId)).toContain('orion-nebula');
  });

  it('« Recette de gâteau » (off-topic) → aucune action', async () => {
    const r = await ask('Quelle est la meilleure recette de gâteau au chocolat ?', 'fr', { offTopic: true });
    expect(r.kind).toBe('off-topic');
    expect(r.status).toBeUndefined();
    expect(r.actions).toEqual([]);
  });

  it('identifiant inventé par le modèle → rejeté', async () => {
    const r = await ask('À quelle distance est Mars du Soleil ? bis', 'fr', {
      claimText: 'Mars est à 228 millions de km du Soleil.',
      modelActions: [{ kind: 'travel', destinationId: 'planete-inventee-42', label: 'Voir la planète inventée' }],
    });
    expect(r.actions.map((a) => a.destinationId)).not.toContain('planete-inventee-42');
  });

  it('doublon (modèle propose mars, serveur calcule mars) → une seule action mars', async () => {
    const r = await ask('À quelle distance est Mars du Soleil ? ter', 'fr', {
      claimText: 'Mars est à 228 millions de km du Soleil.',
      modelActions: [{ kind: 'travel', destinationId: 'mars', label: 'Voir Mars' }],
    });
    const marsActions = r.actions.filter((a) => a.destinationId === 'mars');
    expect(marsActions).toHaveLength(1);
  });

  it('action proposée par le modèle pour un objet nommé dans la question est conservée et fusionnée', async () => {
    const r = await ask('Mars est-elle plus petite que Jupiter ? quater', 'fr', {
      claimText: 'Mars est la quatrième planète du système solaire.',
      modelActions: [{ kind: 'travel', destinationId: 'jupiter', label: 'Voir Jupiter' }],
    });
    const ids = r.actions.map((a) => a.destinationId);
    expect(ids).toContain('mars');
    expect(ids).toContain('jupiter');
    expect(r.actions.length).toBeLessThanOrEqual(2);
  });

  it('lot 2 — action du modèle hors question et hors sources citées → rejetée', async () => {
    const r = await ask('À quelle distance se trouve Mars exactement ? quinquies', 'fr', {
      claimText: 'Mars est la quatrième planète du système solaire.',
      modelActions: [{ kind: 'travel', destinationId: 'jupiter', label: 'Voir Jupiter' }],
    });
    expect(r.actions.map((a) => a.destinationId)).toEqual(['mars']);
  });
});
