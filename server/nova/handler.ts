/**
 * Nova request handler — framework-agnostic (Request → Response).
 *
 * Orchestrates the full verification pipeline:
 * 1. Validation
 * 2. Privacy detection
 * 3. Domain/safety guard (classification)
 * 4. Catalog search
 * 5. Web search (restricted domains)
 * 6. Drafting (JSON output with claims)
 * 7. Verification (second LLM call)
 * 8. Action extraction + follow-ups
 *
 * Returns SSE: phase events then a final result block.
 */

import { type LLMProvider, type ChatMessage, type NovaConfig, loadConfig, createMistralProvider } from './provider';
import { validateRequest, containsPersonalInfo, isValidTravelDestination, type NovaRequest } from './validation';
import { isAllowedDomain } from './allowedDomains';
import { searchCatalog, formatCatalogResults } from './catalogSearch';
import { getSystemPrompt, getClassificationPrompt, getVerificationPrompt } from './prompts';
import { checkRateLimit, type RateLimitResult } from './rateLimit';

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
  status: ClaimStatus;
  claims: AssistantClaim[];
  sources: AssistantSource[];
  followUps: string[];
  actions: AssistantAction[];
  guessFirst: boolean;
  kind: 'answer' | 'off-topic' | 'safety' | 'privacy' | 'error';
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
  // Cap cache size
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

  // Use the smaller/faster classification model
  const tempProvider = createMistralProvider({ ...cfg, model: cfg.classificationModel });
  const response = await tempProvider.chat([
    { role: 'system', content: classPrompt },
    { role: 'user', content: question },
  ], { temperature: 0.1, maxTokens: 50, jsonMode: true });

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
  catalogContext: string,
  webContext: string,
): Promise<{
  text: string;
  claims: Array<{ text: string; sourceIds: string[] }>;
  sources: AssistantSource[];
  followUps: string[];
  actions: AssistantAction[];
  guessFirst: boolean;
}> {
  const systemPrompt = getSystemPrompt(request.context.locale);

  const contextBlock = [
    `Reading level: ${request.context.readingLevel}`,
    `Language: ${request.context.locale}`,
    request.context.selectedObjectId ? `Currently viewing: ${request.context.selectedObjectId}` : '',
    request.context.activeJourneyId ? `Active journey: ${request.context.activeJourneyId}` : '',
    catalogContext ? `\n--- CATALOG DATA (use as "catalog" sources) ---\n${catalogContext}` : '',
    webContext ? `\n--- WEB SEARCH RESULTS (use as "web" sources) ---\n${webContext}` : '',
  ].filter(Boolean).join('\n');

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
  ];

  // Add conversation history
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
    maxTokens: 16384,
    jsonMode: true,
  });

  try {
    const parsed = JSON.parse(response.content ?? '{}');
    return {
      text: typeof parsed.text === 'string' ? parsed.text : '',
      claims: Array.isArray(parsed.claims) ? parsed.claims : [],
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
      followUps: Array.isArray(parsed.followUps) ? parsed.followUps.slice(0, 3) : [],
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      guessFirst: parsed.guessFirst === true,
    };
  } catch {
    return { text: '', claims: [], sources: [], followUps: [], actions: [], guessFirst: false };
  }
}

async function verifyClaims(
  llm: LLMProvider,
  claims: Array<{ text: string; sourceIds: string[] }>,
  sources: AssistantSource[],
  locale: 'fr' | 'en',
): Promise<Array<{ claimIndex: number; verdict: 'supported' | 'unsupported' | 'debated' }>> {
  if (claims.length === 0) return [];

  const verifyPrompt = getVerificationPrompt(locale);

  const sourceMap = Object.fromEntries(sources.map((s) => [s.id, s]));
  const claimsBlock = claims.map((c, i) => {
    const sourceExcerpts = c.sourceIds
      .map((sid) => sourceMap[sid])
      .filter(Boolean)
      .map((s) => `  Source: ${s!.title} (${s!.url})`)
      .join('\n');
    return `Claim ${i}: "${c.text}"\n${sourceExcerpts || '  No sources'}`;
  }).join('\n\n');

  // Use the main model for verification (need reasoning capability)
  const response = await llm.chat([
    { role: 'system', content: verifyPrompt },
    { role: 'user', content: claimsBlock },
  ], { temperature: 0.1, maxTokens: 8192, jsonMode: true });

  try {
    const parsed = JSON.parse(response.content ?? '{}');
    if (Array.isArray(parsed.results)) {
      return parsed.results.map((r: { claimIndex: number; verdict: string }) => ({
        claimIndex: typeof r.claimIndex === 'number' ? r.claimIndex : 0,
        verdict: ['supported', 'unsupported', 'debated'].includes(r.verdict) ? r.verdict as 'supported' | 'unsupported' | 'debated' : 'unsupported',
      }));
    }
  } catch {
    // Verification parse failure — mark all as unknown
  }
  return claims.map((_, i) => ({ claimIndex: i, verdict: 'unsupported' as const }));
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
            status: 'verified',
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

        // --- Step 2: Classification ---
        const category = await classifyQuestion(llm, req.question, req.context.locale, cfg);

        if (category === 'distress') {
          const safetyResult: NovaResult = {
            text: req.context.locale === 'fr'
              ? 'Ce que tu ressens est important et je t\'entends. Je suis une IA qui connaît l\'espace, mais pour ce sujet, parle à un adulte de confiance — un parent, un·e enseignant·e, ou un autre adulte que tu connais bien. Tu n\'es pas seul·e et il y a des gens qui peuvent t\'aider.'
              : 'What you\'re feeling matters and I hear you. I\'m an AI that knows about space, but for this, please talk to a trusted adult — a parent, a teacher, or another grown-up you know well. You\'re not alone and there are people who can help.',
            status: 'verified',
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
            status: 'verified',
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

        // --- Step 3: Catalog search ---
        send(ssePhase('searching-catalog'));
        const catalogResults = await searchCatalog(req.question, req.context.locale);
        const catalogContext = formatCatalogResults(catalogResults, req.context.locale);

        // Build catalog sources
        const catalogSources: AssistantSource[] = catalogResults
          .filter((r) => r.sourceUrl)
          .map((r, i) => ({
            id: `cat-${r.id}-${i}`,
            title: r.name[req.context.locale],
            publisher: r.sourceLabel || 'COSMOS KIDS catalog',
            url: r.sourceUrl,
            kind: 'catalog' as const,
          }));

        // --- Step 4: Web search (if catalog insufficient) ---
        let webContext = '';
        const webSources: AssistantSource[] = [];

        if (catalogResults.length < 2) {
          send(ssePhase('searching-web'));
          try {
            const webResults = await llm.webSearch(req.question);
            // Filter to allowed domains only
            const filtered = webResults.filter((r) => r.url && isAllowedDomain(r.url));

            for (const r of filtered.slice(0, 5)) {
              webSources.push({
                id: `web-${webSources.length}`,
                title: r.title,
                publisher: extractPublisher(r.url),
                url: r.url,
                kind: 'web',
              });
            }

            webContext = filtered
              .slice(0, 5)
              .map((r) => `[${r.title}] (${r.url})\n${r.snippet}`)
              .join('\n\n');
          } catch {
            // Web search failure is non-fatal; proceed with catalog only
          }
        }

        // --- Step 5: Drafting ---
        send(ssePhase('verifying')); // We label this "verifying" as we're generating + will verify
        const allSources = [...catalogSources, ...webSources];

        const draft = await draftResponse(llm, req, catalogContext, webContext);

        // Merge draft sources with our tracked sources
        const mergedSources = mergeSources(allSources, draft.sources);

        // --- Step 6: Verification ---
        const verificationResults = await verifyClaims(
          llm, draft.claims, mergedSources, req.context.locale,
        );

        // Apply verification verdicts
        const verifiedClaims: AssistantClaim[] = [];
        let worstStatus: ClaimStatus = 'verified';

        for (let i = 0; i < draft.claims.length; i++) {
          const claim = draft.claims[i]!;
          const verdict = verificationResults.find((v) => v.claimIndex === i);

          if (verdict?.verdict === 'unsupported') {
            continue; // Drop unsupported claims
          }

          const status: ClaimStatus =
            verdict?.verdict === 'debated' ? 'debated' :
            verdict?.verdict === 'supported' ? 'verified' :
            'unknown';

          verifiedClaims.push({
            text: claim.text,
            status,
            sourceIds: claim.sourceIds,
          });

          // Track worst status
          if (status === 'unknown') worstStatus = 'unknown';
          else if (status === 'debated' && worstStatus === 'verified') worstStatus = 'debated';
        }

        // If all claims were unsupported, respond honestly
        if (verifiedClaims.length === 0 && draft.claims.length > 0) {
          worstStatus = 'unknown';
        }

        // --- Step 7: Filter actions (whitelist destinations) ---
        const validActions = draft.actions
          .filter((a): a is AssistantAction =>
            a.kind === 'travel' &&
            typeof a.destinationId === 'string' &&
            isValidTravelDestination(a.destinationId) &&
            typeof a.label === 'string',
          );

        // Build final result
        const finalText = verifiedClaims.length === 0 && draft.claims.length > 0
          ? (req.context.locale === 'fr'
            ? 'Je n\'ai pas pu vérifier cette information avec mes sources. Les scientifiques ne le savent peut-être pas encore, ou bien personne ne le sait pour l\'instant.'
            : 'I couldn\'t verify this information with my sources. Scientists may not know yet, or nobody knows for now.')
          : draft.text;

        const result: NovaResult = {
          text: finalText,
          status: worstStatus,
          claims: verifiedClaims,
          sources: mergedSources.filter((s) =>
            verifiedClaims.some((c) => c.sourceIds.includes(s.id)),
          ),
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
        const errorResult: NovaResult = {
          text: req.context.locale === 'fr'
            ? 'Oups, quelque chose n\'a pas fonctionné. Réessaie dans un instant !'
            : 'Oops, something went wrong. Try again in a moment!',
          status: 'unknown',
          claims: [],
          sources: [],
          followUps: [],
          actions: [],
          guessFirst: false,
          kind: 'error',
        };
        send(ssePhase('error'));
        send(sseResult(errorResult, rateLimitResult.remaining));
        // Log error without question content
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
  // Restrict CORS to app origin in production
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

function mergeSources(tracked: AssistantSource[], draft: AssistantSource[]): AssistantSource[] {
  const seen = new Set(tracked.map((s) => s.id));
  const merged = [...tracked];

  for (const s of draft) {
    if (!seen.has(s.id) && s.url) {
      // Only keep sources from allowed domains for web sources
      if (s.kind === 'web' && !isAllowedDomain(s.url)) continue;
      seen.add(s.id);
      merged.push(s);
    }
  }

  return merged;
}
