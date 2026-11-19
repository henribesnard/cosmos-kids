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
import { validateRequest, analyzePersonalInfo, maskPersonalInfo, isValidTravelDestination, type NovaRequest } from './validation';
import { searchCatalog, type CatalogEntry } from './catalogSearch';
import { getSystemPrompt, getClassificationPrompt, getVerificationPrompt, getTextAssemblyPrompt } from './prompts';
import { checkRateLimit, type RateLimitResult } from './rateLimit';
import { allowedTravelDestinations, computeTravelActions } from './travelActions';
import { toPlainText } from './plainText';
import { createSearchProvider, type SearchProvider } from './webSearch';

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
  /** 2–3 short hypotheses for "Guess first!" — never verified, never facts. */
  guessChoices?: string[];
  /** Short reminder when the child gave a first name (masked before the provider). */
  privacyNote?: string;
  kind: 'answer' | 'off-topic' | 'safety' | 'privacy' | 'error' | 'rate-limited';
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

  allSourcesWithExtracts(): Array<{ id: string; extract: string }> {
    return [...this.sources.entries()].map(([id, s]) => ({ id, extract: s.extract }));
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
let searchProvider: SearchProvider | null = null;

function getProviderAndConfig(): { provider: LLMProvider; config: NovaConfig; search: SearchProvider } {
  if (!config) config = loadConfig();
  if (!provider) provider = createMistralProvider(config);
  if (!searchProvider) searchProvider = createSearchProvider(config.exaApiKey);
  return { provider, config, search: searchProvider };
}

/** Reset singleton for testing. */
export function _resetProviderForTest(p: LLMProvider, c: NovaConfig): void {
  provider = p;
  config = c;
}

/* ------------------------------------------------------------------ */
/*  Pipeline steps                                                     */
/* ------------------------------------------------------------------ */

interface ClassificationResult {
  category: 'in-domain' | 'off-topic' | 'inappropriate' | 'distress';
  openQuestion: boolean;
}

async function classifyQuestion(
  llm: LLMProvider,
  question: string,
  locale: 'fr' | 'en',
  cfg: NovaConfig,
): Promise<ClassificationResult> {
  const classPrompt = getClassificationPrompt(locale);

  const response = await llm.chat([
    { role: 'system', content: classPrompt },
    { role: 'user', content: question },
  ], { temperature: 0.1, maxTokens: 100, jsonMode: true, model: cfg.classificationModel });

  try {
    const parsed = JSON.parse(response.content ?? '{}');
    const cat = parsed.category;
    const validCategory = ['in-domain', 'off-topic', 'inappropriate', 'distress'].includes(cat)
      ? cat as ClassificationResult['category']
      : 'in-domain';
    return {
      category: validCategory,
      openQuestion: parsed.openQuestion === true,
    };
  } catch {
    // Parse failure — default to in-domain (safe fallback)
  }
  return { category: 'in-domain', openQuestion: false };
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
  guessChoices: string[];
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
    if (process.env.NOVA_DEBUG === '1') console.log('[Nova debug] draft:', response.content);

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
      guessChoices: parsed.guessFirst === true ? sanitizeGuessChoices(parsed.guessChoices) : [],
    };
  } catch {
    return { claims: [], followUps: [], actions: [], guessFirst: false, guessChoices: [] };
  }
}

/**
 * "Guess first!" choices are hypotheses offered to the child, not claims:
 * they never go through verification and are never shown as facts. Only
 * 2–3 short, distinct, plain-text strings are kept; otherwise none.
 */
export function sanitizeGuessChoices(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const text = toPlainText(item).replace(/\s+/g, ' ').replace(/^•\s*/, '').trim();
    if (!text || text.length > 60) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length === 3) break;
  }
  return out.length >= 2 ? out : [];
}

export interface VerificationResult {
  claimIndex: number;
  verdict: 'supported' | 'unsupported' | 'debated';
  supportingSourceIds?: string[];
}

const MAX_EXTRACT_CHARS = 1500;

async function verifyClaims(
  llm: LLMProvider,
  claims: Array<{ text: string; sourceIds: string[] }>,
  registry: SourceRegistry,
  locale: 'fr' | 'en',
  cfg: NovaConfig,
): Promise<VerificationResult[]> {
  if (claims.length === 0) return [];

  const verifyPrompt = getVerificationPrompt(locale);

  // Build claims block with REAL EXTRACTS from registry
  // Always provide ALL registry extracts so the verifier can find supporting sources
  // even when the draft didn't cite them
  const allExtracts = registry.allSourcesWithExtracts();
  const claimsBlock = claims.map((c, i) => {
    const extracts = allExtracts
      .map((s) => `  [${s.id}] ${s.extract.slice(0, MAX_EXTRACT_CHARS)}`)
      .join('\n');
    return `Claim ${i}: "${c.text}"\n${extracts || '  No source extracts available.'}`;
  }).join('\n\n');

  const response = await llm.chat([
    { role: 'system', content: verifyPrompt },
    { role: 'user', content: claimsBlock },
  ], { temperature: 0.1, maxTokens: 2048, jsonMode: true, model: cfg.verificationModel });

  try {
    const parsed = JSON.parse(response.content ?? '{}');
    if (process.env.NOVA_DEBUG === '1') {
      console.log('[Nova debug] claims:', JSON.stringify(claims, null, 1));
      console.log('[Nova debug] verdicts:', JSON.stringify(parsed.results, null, 1));
    }
    if (Array.isArray(parsed.results)) {
      return parsed.results.map((r: { claimIndex: number; verdict: string; supportingSourceIds?: string[] }) => ({
        claimIndex: typeof r.claimIndex === 'number' ? r.claimIndex : 0,
        verdict: ['supported', 'unsupported', 'debated'].includes(r.verdict)
          ? r.verdict as 'supported' | 'unsupported' | 'debated'
          : 'unsupported',
        supportingSourceIds: Array.isArray(r.supportingSourceIds) ? r.supportingSourceIds : undefined,
      }));
    }
  } catch {
    // Verification parse failure — mark all as unsupported (safe)
  }
  return claims.map((_, i) => ({ claimIndex: i, verdict: 'unsupported' as const }));
}

/**
 * Apply the verifier's verdicts to the draft claims.
 *
 * - unsupported (or missing verdict) → dropped;
 * - supported → verified, debated → debated;
 * - sources = draft sourceIds ∪ verifier supportingSourceIds, both filtered
 *   to the closed registry (no fallback to all sources);
 * - lot 2: a claim that ends up with NO registry source is dropped, so a
 *   "Vérifié" or "Débattu" claim always shows at least one real source.
 */
export function applyVerdicts(
  draftClaims: ReadonlyArray<{ text: string; sourceIds: readonly string[] }>,
  verdicts: readonly VerificationResult[],
  registry: Pick<SourceRegistry, 'hasId'>,
  openQuestion = false,
): { claims: AssistantClaim[]; worstStatus: ClaimStatus } {
  const claims: AssistantClaim[] = [];
  let worstStatus: ClaimStatus = 'verified';

  for (let i = 0; i < draftClaims.length; i++) {
    const claim = draftClaims[i]!;
    const verdict = verdicts.find((v) => v.claimIndex === i);
    if (!verdict || verdict.verdict === 'unsupported') continue;

    const status: ClaimStatus = verdict.verdict === 'debated' ? 'debated' : 'verified';
    const draftIds = claim.sourceIds.filter((id) => registry.hasId(id));
    const verifierIds = (verdict.supportingSourceIds ?? [])
      .filter((id): id is string => typeof id === 'string' && registry.hasId(id));
    const sourceIds = [...new Set([...draftIds, ...verifierIds])];
    if (sourceIds.length === 0) continue; // no "Vérifié" without a source

    claims.push({ text: claim.text, status, sourceIds });
    if (status === 'debated' && worstStatus === 'verified') worstStatus = 'debated';
  }

  if (claims.length === 0) worstStatus = 'unknown';
  if (openQuestion && worstStatus === 'verified') worstStatus = 'debated';
  return { claims, worstStatus };
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
    // Real delay before the next question (sliding window), at least 1 s.
    const retryAfterSeconds = Math.max(1, Math.ceil(rateLimitResult.retryAfterMs / 1000));
    return new Response(JSON.stringify({ error: 'Rate limit exceeded', retryAfterSeconds }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSeconds),
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
        const { provider: llm, config: cfg, search: webSearch } = getProviderAndConfig();

        // Global timeout budget
        const deadline = Date.now() + cfg.timeoutMs;
        const remainingMs = () => Math.max(deadline - Date.now(), 1000);

        // --- Step 1: Privacy check (no LLM call needed) ---
        // A first name alone is masked and the question is answered normally
        // (with a short reminder); anything more personal is refused.
        const privacy = analyzePersonalInfo(req.question);
        const privacyNote = privacy.level === 'first-name'
          ? (req.context.locale === 'fr'
            ? 'Petit rappel : en ligne, garde ton prénom pour toi. Je n’en ai pas besoin pour te répondre !'
            : 'Quick reminder: keep your name to yourself online. I don’t need it to answer you!')
          : undefined;
        const withNote = (result: NovaResult): NovaResult =>
          privacyNote ? { ...result, privacyNote } : result;
        const question = privacy.masked;
        // History comes from the client: mask it the same way before it can reach the provider.
        const history = req.history.map((entry) => {
          if (entry.role !== 'child') return entry;
          const analysis = analyzePersonalInfo(entry.text);
          if (analysis.level === 'personal') return { ...entry, text: maskPersonalInfo(entry.text) };
          return { ...entry, text: analysis.masked };
        });
        const maskedReq: NovaRequest = { ...req, question, history };

        // Check cache (keyed on the masked question: names never reach the cache)
        const ck = cacheKey(question, req.context.locale, req.context.readingLevel);
        const cached = privacy.level === 'personal' ? null : getCached(ck);
        if (cached) {
          send(ssePhase('done'));
          send(sseResult(withNote(cached), rateLimitResult.remaining));
          controller.close();
          return;
        }

        send(ssePhase('checking'));

        if (privacy.level === 'personal') {
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

        // --- Step 2: Classification + Catalog search + Web search (all parallel) ---
        send(ssePhase('searching-catalog'));
        const [classification, catalogResults, webResults] = await Promise.all([
          classifyQuestion(llm, question, req.context.locale, cfg),
          searchCatalog(question, req.context.locale),
          webSearch.search(question, {
            maxResults: 3,
            timeoutMs: Math.min(remainingMs(), 8_000),
          }).catch(() => [] as readonly import('./webSearch').WebResult[]),
        ]);

        const { category, openQuestion } = classification;

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
          send(sseResult(withNote(safetyResult), rateLimitResult.remaining));
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
          send(sseResult(withNote(offTopicResult), rateLimitResult.remaining));
          controller.close();
          return;
        }

        // --- Step 3: Register catalog + web sources ---
        const registry = new SourceRegistry();
        for (const entry of catalogResults) {
          if (entry.sourceUrl) {
            registry.addCatalog(entry, req.context.locale);
          }
        }

        if (webResults.length > 0) {
          send(ssePhase('searching-web'));
          for (const r of webResults) {
            const extractText = r.pageText || r.snippet;
            if (extractText) {
              registry.addWeb(r.title, r.url, extractPublisher(r.url), extractText);
            }
          }
        }

        // --- Step 4: If no sources at all, return 'unknown' immediately ---
        if (registry.isEmpty()) {
          // 'unknown' answer: an action only if the object is clearly the question's subject
          const unknownActions = await computeTravelActions(question, [], req.context.locale, { onlyIfInQuestion: true });
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
            actions: unknownActions,
            guessFirst: false,
            kind: 'answer',
          };
          send(ssePhase('done'));
          send(sseResult(withNote(unknownResult), rateLimitResult.remaining));
          controller.close();
          return;
        }

        // --- Step 5: Drafting (with closed source IDs) ---
        send(ssePhase('verifying'));
        const draft = await draftResponse(llm, maskedReq, registry, cfg);

        // --- Step 6: Verification (extract-based, with supportingSourceIds) ---
        const verificationResults = await verifyClaims(
          llm, draft.claims, registry, req.context.locale, cfg,
        );

        // Apply verification verdicts — drop unsupported and source-less claims,
        // cap open questions at 'debated'.
        const applied = applyVerdicts(draft.claims, verificationResults, registry, openQuestion);
        const verifiedClaims = applied.claims;
        let worstStatus: ClaimStatus = applied.worstStatus;

        // --- Step 8: Assemble text from retained claims only ---
        let finalText: string;
        if (verifiedClaims.length === 0) {
          worstStatus = 'unknown';
          finalText = req.context.locale === 'fr'
            ? 'Je n\'ai pas pu vérifier cette information avec mes sources. Les scientifiques ne le savent peut-être pas encore, ou bien personne ne le sait pour l\'instant.'
            : 'I couldn\'t verify this information with my sources. Scientists may not know yet, or nobody knows for now.';
        } else {
          let assembled = await assembleText(
            llm, verifiedClaims, req.context.locale, req.context.readingLevel, cfg,
          );

          // Prepend caveat for open questions
          if (openQuestion) {
            const caveat = req.context.locale === 'fr'
              ? 'Les scientifiques ne connaissent pas encore la réponse complète à cette question. '
              : 'Scientists don\'t fully know the answer to this yet. ';
            assembled = caveat + assembled;
          }

          finalText = assembled;
        }

        // --- Step 9: Travel actions ---
        // Deterministic: computed by the server from the question and the
        // catalog sources cited by the retained claims (the model draft is
        // unreliable here). 'unknown' answers only get an action when the
        // object is clearly the subject of the question.
        const serverActions = await computeTravelActions(
          question,
          verifiedClaims,
          req.context.locale,
          { onlyIfInQuestion: worstStatus === 'unknown' },
        );
        // Model-proposed actions are accepted only when valid AND allowed by the
        // same rule (named in the question or cited catalog source).
        const allowedIds = await allowedTravelDestinations(
          question, verifiedClaims, { onlyIfInQuestion: worstStatus === 'unknown' },
        );
        const modelActions = draft.actions
          .filter((a): a is AssistantAction =>
            a.kind === 'travel' &&
            allowedIds.has(a.destinationId) &&
            typeof a.destinationId === 'string' &&
            isValidTravelDestination(a.destinationId) &&
            typeof a.label === 'string' &&
            !serverActions.some((s) => s.destinationId === a.destinationId),
          );
        const validActions = [...serverActions, ...modelActions].slice(0, 2);

        // Build final result — only sources referenced by verified claims
        const usedSourceIds = new Set(verifiedClaims.flatMap((c) => c.sourceIds));
        // Plain-text rule: no Markdown ever reaches the child.
        const result: NovaResult = {
          text: toPlainText(finalText),
          status: worstStatus,
          claims: verifiedClaims.map((c) => ({ ...c, text: toPlainText(c.text) })),
          sources: registry.filterByIds([...usedSourceIds]),
          followUps: draft.followUps
            .filter((f): f is string => typeof f === 'string')
            .map(toPlainText)
            .filter(Boolean)
            .slice(0, 3),
          actions: validActions.map((a) => ({ ...a, label: toPlainText(a.label) })),
          guessFirst: draft.guessFirst,
          ...(draft.guessFirst && draft.guessChoices.length >= 2 ? { guessChoices: draft.guessChoices } : {}),
          kind: 'answer',
        };

        // Cache the result (without the per-request privacy note)
        setCache(ck, result);

        send(ssePhase('done'));
        send(sseResult(withNote(result), rateLimitResult.remaining));
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
