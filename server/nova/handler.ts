/**
 * Nova request handler — framework-agnostic (Request → Response).
 *
 * Orchestrates the full verification pipeline:
 * 1. Validation + privacy detection
 * 2. Classification + catalog search (parallel)
 * 3. Web search (if catalog insufficient, optional)
 * 4. Drafting with closed source IDs
 * 5. Extract-based verification
 * 6. Text assembly from retained claims only
 * 7. Action filtering + follow-ups
 *
 * Returns SSE: phase events then a final result block.
 */

import { type LLMProvider, type ChatMessage, type NovaConfig, loadConfig, createMistralProvider } from './provider';
import { validateRequest, containsPersonalInfo, isValidTravelDestination, type NovaRequest } from './validation';
import { searchCatalog, type CatalogEntry } from './catalogSearch';
import { getSystemPrompt, getClassificationPrompt, getVerificationPrompt, getTextAssemblyPrompt } from './prompts';
import { checkRateLimit, type RateLimitResult } from './rateLimit';
import { searchWeb } from './webSearch';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ClaimStatus = 'verified' | 'debated' | 'unknown';

interface AssistantSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  kind: 'catalog' | 'web';
}

interface AssistantClaim {
  text: string;
  status: ClaimStatus;
  sourceIds: string[];
}

interface AssistantAction {
  kind: 'travel';
  destinationId: string;
  label: string;
}

interface NovaResult {
  text: string;
  status?: ClaimStatus;
  claims: AssistantClaim[];
  sources: AssistantSource[];
  followUps: string[];
  actions: AssistantAction[];
  guessFirst: boolean;
  kind: 'answer' | 'off-topic' | 'safety' | 'privacy' | 'error';
}

/* ------------------------------------------------------------------ */
/*  Source Registry — closed source tracking with extracts             */
/* ------------------------------------------------------------------ */

interface TrackedSource extends AssistantSource {
  extract: string;
}

export class SourceRegistry {
  private sources = new Map<string, TrackedSource>();

  addCatalog(entry: CatalogEntry, locale: 'fr' | 'en'): string {
    const id = `cat-${entry.id}`;
    const extract = entry.facts
      .map((f) => `${f.label}: ${f.value}${f.sourceUrl ? ` (source: ${f.sourceUrl})` : ''}`)
      .join(' | ');

    this.sources.set(id, {
      id,
      title: entry.name[locale],
      publisher: entry.sourceLabel || 'COSMOS KIDS catalog',
      url: entry.sourceUrl,
      kind: 'catalog',
      extract: `${entry.description[locale]} — ${extract}`,
    });
    return id;
  }

  addWeb(title: string, url: string, publisher: string, extract: string): string {
    const id = `web-${this.sources.size}`;
    this.sources.set(id, { id, title, publisher, url, kind: 'web', extract });
    return id;
  }

  hasId(id: string): boolean {
    return this.sources.has(id);
  }

  getExtract(id: string): string {
    return this.sources.get(id)?.extract ?? '';
  }

  allSources(): AssistantSource[] {
    return [...this.sources.values()].map((s) => ({
      id: s.id, title: s.title, publisher: s.publisher, url: s.url, kind: s.kind,
    }));
  }

  filterByIds(ids: string[]): AssistantSource[] {
    return ids
      .map((id) => this.sources.get(id))
      .filter((s): s is TrackedSource => s != null)
      .map((s) => ({
        id: s.id, title: s.title, publisher: s.publisher, url: s.url, kind: s.kind,
      }));
  }

  isEmpty(): boolean {
    return this.sources.size === 0;
  }

  /** Format all sources as a context block for the draft LLM. */
  formatForDraft(): string {
    if (this.sources.size === 0) return '';
    const lines: string[] = ['--- AVAILABLE SOURCES ---'];
    for (const [id, s] of this.sources) {
      lines.push(`[${id}] ${s.title} — ${s.extract.slice(0, 500)}`);
      lines.push(`  Source: ${s.publisher} (${s.url})`);
    }
    lines.push('---');
    lines.push('Use ONLY the source IDs listed above in your claims. Do NOT invent new source IDs.');
    return lines.join('\n');
  }
}

/* ------------------------------------------------------------------ */
/*  SSE helpers                                                        */
/* ------------------------------------------------------------------ */

function ssePhase(phase: string): string {
  return `data: ${JSON.stringify({ type: 'phase', phase })}\n\n`;
}

function sseResult(result: NovaResult, remainingQuestions: number | null): string {
  return `data: ${JSON.stringify({ type: 'result', message: result, remainingQuestions })}\n\ndata: [DONE]\n\n`;
}

/* ------------------------------------------------------------------ */
/*  Response cache                                                     */
/* ------------------------------------------------------------------ */

interface CacheEntry {
  result: NovaResult;
  expiresAt: number;
}

const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function cacheKey(question: string, locale: string, level: string): string {
  return `${locale}:${level}:${question.toLowerCase().trim().replace(/\s+/g, ' ')}`;
}

function getCached(key: string): NovaResult | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(key);
    return null;
  }
  return entry.result;
}

function setCache(key: string, result: NovaResult): void {
  if (responseCache.size > 500) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) responseCache.delete(oldestKey);
  }
  responseCache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
}

/* ------------------------------------------------------------------ */
/*  Singleton provider + config                                        */
/* ------------------------------------------------------------------ */

let provider: LLMProvider | null = null;
let config: NovaConfig | null = null;

function getProviderAndConfig(): { provider: LLMProvider; config: NovaConfig } {
  if (!config) config = loadConfig();
  if (!provider) provider = createMistralProvider(config);
  return { provider, config };
}

/** Reset singleton for testing. */
export function _resetProviderForTest(p: LLMProvider, c: NovaConfig): void {
  provider = p;
  config = c;
}

/* ------------------------------------------------------------------ */
/*  Pipeline steps                                                     */
/* ------------------------------------------------------------------ */

async function classifyQuestion(
  llm: LLMProvider,
  question: string,
  locale: 'fr' | 'en',
  cfg: NovaConfig,
): Promise<'in-domain' | 'off-topic' | 'inappropriate' | 'distress'> {
  const classPrompt = getClassificationPrompt(locale);

  const response = await llm.chat([
    { role: 'system', content: classPrompt },
    { role: 'user', content: question },
  ], { temperature: 0.1, maxTokens: 50, jsonMode: true, model: cfg.classificationModel });

  try {
    const parsed = JSON.parse(response.content ?? '{}');
    const cat = parsed.category;
    if (['in-domain', 'off-topic', 'inappropriate', 'distress'].includes(cat)) {
      return cat;
    }
  } catch {
    // Parse failure — default to in-domain (safe fallback)
  }
  return 'in-domain';
}

async function draftResponse(
  llm: LLMProvider,
  request: NovaRequest,
  registry: SourceRegistry,
  cfg: NovaConfig,
): Promise<{
  claims: Array<{ text: string; sourceIds: string[] }>;
  followUps: string[];
  actions: AssistantAction[];
  guessFirst: boolean;
}> {
  const systemPrompt = getSystemPrompt(request.context.locale);
  const sourcesBlock = registry.formatForDraft();

  const contextBlock = [
    `Reading level: ${request.context.readingLevel}`,
    `Language: ${request.context.locale}`,
    request.context.selectedObjectId ? `Currently viewing: ${request.context.selectedObjectId}` : '',
    request.context.activeJourneyId ? `Active journey: ${request.context.activeJourneyId}` : '',
    sourcesBlock,
  ].filter(Boolean).join('\n');

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
  ];

  for (const entry of request.history) {
    messages.push({
      role: entry.role === 'child' ? 'user' : 'assistant',
      content: entry.text,
    });
  }

  messages.push({
    role: 'user',
    content: `${contextBlock}\n\nQuestion: ${request.question}`,
  });

  const response = await llm.chat(messages, {
    temperature: 0.4,
    maxTokens: 4096,
    jsonMode: true,
    model: cfg.draftModel,
  });

  try {
    const parsed = JSON.parse(response.content ?? '{}');

    // Filter claim sourceIds to only server-registered IDs (closed sources)
    const claims: Array<{ text: string; sourceIds: string[] }> = [];
    if (Array.isArray(parsed.claims)) {
      for (const c of parsed.claims) {
        if (typeof c?.text !== 'string' || !c.text) continue;
        const validIds = Array.isArray(c.sourceIds)
          ? c.sourceIds.filter((id: unknown) => typeof id === 'string' && registry.hasId(id as string))
          : [];
        claims.push({ text: c.text, sourceIds: validIds });
      }
    }

    return {
      claims,
      followUps: Array.isArray(parsed.followUps) ? parsed.followUps.slice(0, 3) : [],
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      guessFirst: parsed.guessFirst === true,
    };
  } catch {
    return { claims: [], followUps: [], actions: [], guessFirst: false };
  }
}

async function verifyClaims(
  llm: LLMProvider,
  claims: Array<{ text: string; sourceIds: string[] }>,
  registry: SourceRegistry,
  locale: 'fr' | 'en',
): Promise<Array<{ claimIndex: number; verdict: 'supported' | 'unsupported' | 'debated' }>> {
  if (claims.length === 0) return [];

  const verifyPrompt = getVerificationPrompt(locale);

  // Build claims block with REAL EXTRACTS from registry
  const claimsBlock = claims.map((c, i) => {
    const extracts = c.sourceIds
      .map((sid) => {
        const extract = registry.getExtract(sid);
        return extract ? `  [${sid}] ${extract}` : null;
      })
      .filter(Boolean)
      .join('\n');
    return `Claim ${i}: "${c.text}"\n${extracts || '  No source extracts available.'}`;
  }).join('\n\n');

  const response = await llm.chat([
    { role: 'system', content: verifyPrompt },
    { role: 'user', content: claimsBlock },
  ], { temperature: 0.1, maxTokens: 2048, jsonMode: true });

  try {
    const parsed = JSON.parse(response.content ?? '{}');
    if (Array.isArray(parsed.results)) {
      return parsed.results.map((r: { claimIndex: number; verdict: string }) => ({
        claimIndex: typeof r.claimIndex === 'number' ? r.claimIndex : 0,
        verdict: ['supported', 'unsupported', 'debated'].includes(r.verdict)
          ? r.verdict as 'supported' | 'unsupported' | 'debated'
          : 'unsupported',
      }));
    }
  } catch {
    // Verification parse failure — mark all as unsupported (safe)
  }
  return claims.map((_, i) => ({ claimIndex: i, verdict: 'unsupported' as const }));
}

/**
 * Assemble natural text from retained claims using the small model.
 * Falls back to simple concatenation if the LLM adds new content.
 */
async function assembleText(
  llm: LLMProvider,
  retainedClaims: AssistantClaim[],
  locale: 'fr' | 'en',
  readingLevel: string,
  cfg: NovaConfig,
): Promise<string> {
  if (retainedClaims.length === 0) return '';

  const claimTexts = retainedClaims.map((c) => c.text);
  const concatenated = claimTexts.join(' ');

  // If only one claim, just return it directly
  if (retainedClaims.length === 1) return claimTexts[0]!;

  const prompt = getTextAssemblyPrompt(locale);

  try {
    const response = await llm.chat([
      { role: 'system', content: prompt },
      {
        role: 'user',
        content: `Claims:\n${claimTexts.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nLanguage: ${locale}\nReading level: ${readingLevel}`,
      },
    ], { temperature: 0.3, maxTokens: 1024, model: cfg.classificationModel });

    const assembled = response.content?.trim() ?? '';
    if (!assembled) return concatenated;

    return assembled;
  } catch {
    return concatenated;
  }
}

/* ------------------------------------------------------------------ */
/*  Main handler                                                       */
/* ------------------------------------------------------------------ */

export async function handleNovaRequest(request: Request): Promise<Response> {
  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request),
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
    });
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
    });
  }

  // Validate
  const validation = validateRequest(body);
  if (!validation.ok) {
    return new Response(JSON.stringify({ error: validation.error }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
    });
  }
  const req = validation.data;

  // Rate limit
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown';
  let rateLimitResult: RateLimitResult;
  try {
    const { config: cfg } = getProviderAndConfig();
    rateLimitResult = checkRateLimit(clientIp, cfg.maxQuestionsPerHour);
  } catch {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
    });
  }

  if (!rateLimitResult.allowed) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil(rateLimitResult.retryAfterMs / 1000)),
        ...corsHeaders(request),
      },
    });
  }

  // SSE response setup
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string) => controller.enqueue(encoder.encode(data));

      try {
        const { provider: llm, config: cfg } = getProviderAndConfig();

        // Check cache
        const ck = cacheKey(req.question, req.context.locale, req.context.readingLevel);
        const cached = getCached(ck);
        if (cached) {
          send(ssePhase('done'));
          send(sseResult(cached, rateLimitResult.remaining));
          controller.close();
          return;
        }

        // --- Step 1: Privacy check (no LLM call needed) ---
        send(ssePhase('checking'));

        if (containsPersonalInfo(req.question)) {
          const privacyResult: NovaResult = {
            text: req.context.locale === 'fr'
              ? 'Attention ! Ne partage jamais ton nom complet, ton adresse, le nom de ton école, ton numéro de téléphone ou ton e-mail en ligne. C\'est une règle importante pour ta sécurité. Pose-moi plutôt une question sur l\'espace !'
              : 'Be careful! Never share your full name, address, school name, phone number, or email online. That\'s an important safety rule. Ask me a space question instead!',
            claims: [],
            sources: [],
            followUps: req.context.locale === 'fr'
              ? ['Qu\'est-ce qu\'un trou noir ?', 'Combien y a-t-il de planètes ?']
              : ['What is a black hole?', 'How many planets are there?'],
            actions: [],
            guessFirst: false,
            kind: 'privacy',
          };
          send(ssePhase('done'));
          send(sseResult(privacyResult, rateLimitResult.remaining));
          controller.close();
          return;
        }

        // --- Step 2: Classification + Catalog search (parallel) ---
        const [category, catalogResults] = await Promise.all([
          classifyQuestion(llm, req.question, req.context.locale, cfg),
          searchCatalog(req.question, req.context.locale),
        ]);

        if (category === 'distress') {
          const safetyResult: NovaResult = {
            text: req.context.locale === 'fr'
              ? 'Ce que tu ressens est important et je t\'entends. Je suis une IA qui connaît l\'espace, mais pour ce sujet, parle à un adulte de confiance — un parent, un·e enseignant·e, ou un autre adulte que tu connais bien. Tu n\'es pas seul·e et il y a des gens qui peuvent t\'aider.'
              : 'What you\'re feeling matters and I hear you. I\'m an AI that knows about space, but for this, please talk to a trusted adult — a parent, a teacher, or another grown-up you know well. You\'re not alone and there are people who can help.',
            claims: [],
            sources: [],
            followUps: [],
            actions: [],
            guessFirst: false,
            kind: 'safety',
          };
          send(ssePhase('done'));
          send(sseResult(safetyResult, rateLimitResult.remaining));
          controller.close();
          return;
        }

        if (category === 'off-topic' || category === 'inappropriate') {
          const offTopicResult: NovaResult = {
            text: req.context.locale === 'fr'
              ? 'Bonne question, mais moi je suis spécialiste de l\'espace ! Savais-tu que les astronautes de l\'ISS voient 16 levers de soleil par jour ? Pose-moi une question sur l\'Univers, les planètes ou les étoiles !'
              : 'Good question, but I\'m a space specialist! Did you know ISS astronauts see 16 sunrises every day? Ask me something about the Universe, planets, or stars!',
            claims: [],
            sources: [],
            followUps: req.context.locale === 'fr'
              ? ['Que mangent les astronautes ?', 'C\'est quoi l\'ISS ?', 'Pourquoi l\'espace est-il noir ?']
              : ['What do astronauts eat?', 'What is the ISS?', 'Why is space dark?'],
            actions: [],
            guessFirst: false,
            kind: 'off-topic',
          };
          send(ssePhase('done'));
          send(sseResult(offTopicResult, rateLimitResult.remaining));
          controller.close();
          return;
        }

        // --- Step 3: Register catalog sources ---
        send(ssePhase('searching-catalog'));
        const registry = new SourceRegistry();
        for (const entry of catalogResults) {
          if (entry.sourceUrl) {
            registry.addCatalog(entry, req.context.locale);
          }
        }

        // --- Step 4: Web search (if catalog insufficient) ---
        if (catalogResults.length < 2 && cfg.braveSearchApiKey) {
          send(ssePhase('searching-web'));
          try {
            const webResults = await searchWeb(req.question, {
              apiKey: cfg.braveSearchApiKey,
              timeoutMs: Math.min(cfg.timeoutMs, 10_000),
              maxResults: 5,
            });

            for (const r of webResults) {
              const extractText = r.pageText || r.snippet;
              if (extractText) {
                registry.addWeb(r.title, r.url, extractPublisher(r.url), extractText);
              }
            }
          } catch {
            // Web search failure is non-fatal; proceed with catalog only
          }
        }

        // --- Step 5: If no sources at all, return 'unknown' immediately ---
        if (registry.isEmpty()) {
          const unknownResult: NovaResult = {
            text: req.context.locale === 'fr'
              ? 'Je n\'ai pas trouvé d\'information vérifiée à ce sujet dans mes sources. Les scientifiques ne le savent peut-être pas encore !'
              : 'I couldn\'t find verified information about this in my sources. Scientists may not know yet!',
            status: 'unknown',
            claims: [],
            sources: [],
            followUps: req.context.locale === 'fr'
              ? ['Combien de lunes a Saturne ?', 'Quelle est la taille du Soleil ?']
              : ['How many moons does Saturn have?', 'How big is the Sun?'],
            actions: [],
            guessFirst: false,
            kind: 'answer',
          };
          send(ssePhase('done'));
          send(sseResult(unknownResult, rateLimitResult.remaining));
          controller.close();
          return;
        }

        // --- Step 6: Drafting (with closed source IDs) ---
        send(ssePhase('verifying'));
        const draft = await draftResponse(llm, req, registry, cfg);

        // --- Step 7: Verification (extract-based) ---
        const verificationResults = await verifyClaims(
          llm, draft.claims, registry, req.context.locale,
        );

        // Apply verification verdicts — drop unsupported claims
        const verifiedClaims: AssistantClaim[] = [];
        let worstStatus: ClaimStatus = 'verified';

        for (let i = 0; i < draft.claims.length; i++) {
          const claim = draft.claims[i]!;
          const verdict = verificationResults.find((v) => v.claimIndex === i);

          if (!verdict || verdict.verdict === 'unsupported') {
            continue; // Drop unsupported claims
          }

          const status: ClaimStatus =
            verdict.verdict === 'debated' ? 'debated' :
            verdict.verdict === 'supported' ? 'verified' :
            'unknown';

          // Only keep sourceIds that exist in registry
          const validSourceIds = claim.sourceIds.filter((id) => registry.hasId(id));

          verifiedClaims.push({
            text: claim.text,
            status,
            sourceIds: validSourceIds,
          });

          if (status === 'unknown') worstStatus = 'unknown';
          else if (status === 'debated' && worstStatus === 'verified') worstStatus = 'debated';
        }

        // --- Step 8: Assemble text from retained claims only ---
        let finalText: string;
        if (verifiedClaims.length === 0) {
          worstStatus = 'unknown';
          finalText = req.context.locale === 'fr'
            ? 'Je n\'ai pas pu vérifier cette information avec mes sources. Les scientifiques ne le savent peut-être pas encore, ou bien personne ne le sait pour l\'instant.'
            : 'I couldn\'t verify this information with my sources. Scientists may not know yet, or nobody knows for now.';
        } else {
          finalText = await assembleText(
            llm, verifiedClaims, req.context.locale, req.context.readingLevel, cfg,
          );
        }

        // --- Step 9: Filter actions (whitelist destinations) ---
        const validActions = draft.actions
          .filter((a): a is AssistantAction =>
            a.kind === 'travel' &&
            typeof a.destinationId === 'string' &&
            isValidTravelDestination(a.destinationId) &&
            typeof a.label === 'string',
          );

        // Build final result — only sources referenced by verified claims
        const usedSourceIds = new Set(verifiedClaims.flatMap((c) => c.sourceIds));
        const result: NovaResult = {
          text: finalText,
          status: worstStatus,
          claims: verifiedClaims,
          sources: registry.filterByIds([...usedSourceIds]),
          followUps: draft.followUps.slice(0, 3),
          actions: validActions,
          guessFirst: draft.guessFirst,
          kind: 'answer',
        };

        // Cache the result
        setCache(ck, result);

        send(ssePhase('done'));
        send(sseResult(result, rateLimitResult.remaining));
      } catch (err) {
        const isTimeout = (err as Error).name === 'AbortError'
          || (err as Error).message?.includes('abort');

        const errorResult: NovaResult = {
          text: isTimeout
            ? (req.context.locale === 'fr'
              ? 'Ma recherche prend trop de temps… Réessaie dans un instant !'
              : 'My search is taking too long… Try again in a moment!')
            : (req.context.locale === 'fr'
              ? 'Oups, quelque chose n\'a pas fonctionné. Réessaie dans un instant !'
              : 'Oops, something went wrong. Try again in a moment!'),
          claims: [],
          sources: [],
          followUps: [],
          actions: [],
          guessFirst: false,
          kind: 'error',
        };
        send(ssePhase('error'));
        send(sseResult(errorResult, rateLimitResult.remaining));
        console.error('[Nova] Pipeline error:', (err as Error).message);
      } finally {
        try { controller.close(); } catch { /* already closed by early-return path */ }
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      ...corsHeaders(request),
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') ?? '';
  const allowedOrigin = process.env.NOVA_CORS_ORIGIN ?? origin;
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function extractPublisher(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    if (hostname.includes('nasa.gov')) return 'NASA';
    if (hostname.includes('esa.int')) return 'ESA';
    if (hostname.includes('eso.org')) return 'ESO';
    if (hostname.includes('cnes.fr')) return 'CNES';
    if (hostname.includes('iau.org')) return 'IAU';
    if (hostname.includes('obspm.fr')) return 'Observatoire de Paris';
    if (hostname.includes('stsci.edu')) return 'STScI';
    if (hostname.includes('noirlab.edu')) return 'NOIRLab';
    if (hostname.includes('cfa.harvard.edu')) return 'CfA Harvard';
    if (hostname.includes('spacetelescope.org')) return 'ESA/Hubble';
    return hostname;
  } catch {
    return 'Unknown';
  }
}
