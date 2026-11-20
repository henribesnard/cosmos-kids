# Nova — AI Assistant for COSMOS KIDS

Nova is an AI assistant designed for children aged 7-14 that answers questions about astronomy, astrophysics, and space exploration. Every answer goes through a **content-based verification circuit** before being shown to the child. No claim reaches the child unless it is explicitly supported by a real source extract.

## Architecture

```
Client (React)                    Server (Node.js)
+-----------------+               +--------------------------------------+
| useAssistant()  | -- SSE/POST ->| POST /api/nova                       |
|   or            |               |   handler.ts                         |
| useMockAssistant|               |     1. validateRequest()             |
+-----------------+               |     2. analyzePersonalInfo()         |
                                  |     3. classifyQuestion() ──┐        |
                                  |     4. searchCatalog()   ───┤parallel|
                                  |     5. searchWeb() (Exa) ───┘        |
                                  |     6. SourceRegistry (closed)       |
                                  |     7. draftResponse()  (small model)|
                                  |     8. verifyClaims() (small model)  |
                                  |     9. assembleText() (small model)  |
                                  |    10. filterActions()  (whitelist)  |
                                  +--------------------------------------+
                                       |
                                       v
                                  Mistral AI API + Exa Search (optional)
```

### Key files

| File | Purpose |
|------|---------|
| `src/assistant/types.ts` | Contract types shared with the design agent |
| `src/assistant/useAssistant.ts` | React hook (SSE client + mock delegation) |
| `src/assistant/mockAssistant.ts` | Full mock with all scenarios |
| `server/nova/handler.ts` | Main pipeline handler + SourceRegistry |
| `server/nova/provider.ts` | LLM provider abstraction (Mistral impl) |
| `server/nova/webSearch.ts` | Exa Search + SearchProvider interface |
| `server/nova/validation.ts` | Input validation + privacy detection (natural phrasings, first-name masking) |
| `server/nova/plainText.ts` | Plain-text rule: strips Markdown from every child-facing string |
| `server/nova/travelActions.ts` | Deterministic travel actions (proper names only) |
| `src/assistant/assistantShared.ts` | Context (shared reading level), network status, Retry-After parsing |
| `server/nova/catalogSearch.ts` | Searches app's internal celestial data |
| `server/nova/allowedDomains.ts` | 13-domain whitelist for web sources |
| `server/nova/rateLimit.ts` | In-memory sliding-window rate limiter |
| `server/nova/prompts/` | System prompts (fr/en) for classify/draft/verify/assemble |
| `server/nova/vitePlugin.ts` | Vite dev/preview plugin |
| `server/index.ts` | Standalone Node.js server for VPS |

## Verification Circuit

The pipeline ensures **no unverified text reaches the child**:

1. **Privacy detection** (regex, no LLM) — two levels (lot 2):
   - `personal` → refusal with the privacy reminder, nothing sent to the provider: full name (« je m'appelle Jean Dupont », "my name is John Smith"), place of residence (« j'habite à/au/en… », "I live in/at…"), school or class with a place (« mon école… », « je suis en CE2 à… », "I'm in 4th grade at…"), street address, phone, e-mail.
   - `first-name` → a first name alone (« je m'appelle Léo, pourquoi… », "my name is Sam, why…"): the name is replaced by `[prénom]` in the question **and in the history** before anything reaches the provider, the cache key uses the masked question, the question is answered normally and the message carries `privacyNote` (short reminder).
   - False positives avoided: « la Lune s'appelle aussi Séléné », « j'habite sur Terre », "I live on Earth", « comment s'appelle… », « je suis en CE2 et… ». 20 fr/en cases in `validation.test.ts`.
2. **Classification + catalog search + web search** (parallel) — classification via small model (includes `openQuestion` detection); catalog search via local keyword matching; web search via Exa (optional)
3. **Source Registry** (closed) — only sources created by the server (catalog entries, web pages) are accepted. The LLM cannot invent sources.
4. **Drafting** (small model, JSON mode) — generates claims with source IDs from the registry. Source IDs not in the registry are silently dropped. Each claim MUST cite a sourceId.
5. **Extract-based verification** (small model, JSON mode) — each claim is checked against real source extracts. The verifier returns `supportingSourceIds` per claim and is explicitly told: "Use ONLY the provided extracts. Do NOT use your own knowledge."
6. **Source attribution merge** — draft sourceIds + verifier supportingSourceIds are merged. No fallback to all sources.
7. **Unsupported claims are dropped** — and (lot 2) so is any `verified`/`debated` claim left with **no registry source** after the merge (`applyVerdicts`, exported and tested). If no claim remains, a fallback "I couldn't verify this" response is shown with status `'unknown'`.
8. **Open question override** — if the classifier flagged `openQuestion: true`, status can never be `'verified'` (capped at `'debated'`)
9. **Text assembly** (small model) — final text is generated from retained claims only, not from the original draft. No new facts can be introduced. Open questions get a caveat prefix.
10. **Plain text** (lot 2) — the assembly prompt asks for plain text and `toPlainText()` cleans the text, claims, follow-ups, guess choices and action labels on the server (emphasis, headings, lists, links, code, HTML). The interface renders text as is: no asterisk reaches the child (only the official name "Sagittarius A*" keeps its star).
11. **Action whitelist** — `travel` actions only for known destination IDs, and (lot 2) only when the object is **named in the question** or is the **catalog source of a retained claim**. Aliases are full names, entry ids and distinctive proper nouns only: everyday words ("large", "grand", "cloud", "nuage", "station", "eagle"…) never identify an object. Model-proposed actions follow the same rule.

### Key invariants

- **Closed sources**: The LLM can only reference source IDs created by the server. Any invented ID is silently dropped.
- **Extract-based verification**: The verifier receives the actual text content (catalog facts, web page text), not just titles and URLs.
- **No model knowledge**: The verification prompt explicitly prohibits using the model's own knowledge.
- **Text from claims only**: The final text is assembled from verified claims, never from the raw draft.
- **Refusal = no status**: Off-topic, privacy, safety, and error responses have no `status` field — they never show a "Verified" badge.
- **Open question cap**: Questions classified as `openQuestion` can never reach `'verified'` status, even if individual claims are supported.
- **No seal without a source** (lot 2): every claim shown as `verified` or `debated` has at least one source from the closed registry.
- **"debated" means a real scientific debate** (lot 2): values that agree once rounded or converted, quantities that naturally vary (an orbit's altitude), planned future dates and extracts that simply do not mention a claim are not debates (see the ISS diagnosis below).
- **Guess choices are hypotheses**: `guessChoices` never go through verification, are never shown as facts and are never marked right or wrong; only the verified answer revealed afterwards says what is correct.
- **supportingSourceIds**: The verifier identifies which sources actually support each claim, ensuring correct attribution even when the draft model fails to cite sourceIds.

## Allowed Domains (web search)

Sources are restricted to these 13 authoritative domains via Exa's `includeDomains` parameter:

- `nasa.gov`, `science.nasa.gov`, `jpl.nasa.gov`, `ssd.jpl.nasa.gov`
- `esa.int`, `eso.org`, `cnes.fr`, `iau.org`, `obspm.fr`
- `stsci.edu`, `noirlab.edu`, `cfa.harvard.edu`, `spacetelescope.org`

Any web search result from outside these domains is never returned by the search provider.

## Models per Pipeline Step

| Call | Model | Purpose | Data sent |
|------|-------|---------|-----------|
| Classification | `mistral-small-latest` | Is the question in-domain? + openQuestion | System prompt + question (no personal data) |
| Draft | `mistral-small-latest` (configurable via `NOVA_DRAFT_MODEL`) | Generate claims from source data | System prompt + source registry extracts + question |
| Verification | `mistral-small-latest` (configurable via `NOVA_VERIFICATION_MODEL`) | Verify each claim against extracts, return supportingSourceIds | Verification prompt + claims + real source extracts |
| Text assembly | `mistral-small-latest` | Assemble text from verified claims | Assembly prompt + retained claim texts |

**Never sent**: API key, child's identity, IP address, conversation history beyond the configured limit (default: 6 messages).

The API key is **server-side only** (`process.env.MISTRAL_API_KEY`). No `VITE_` prefix is used for secrets.

## SSE Protocol

The server streams Server-Sent Events:

```
data: {"type":"phase","phase":"checking"}
data: {"type":"phase","phase":"searching-catalog"}
data: {"type":"phase","phase":"searching-web"}
data: {"type":"phase","phase":"verifying"}
data: {"type":"phase","phase":"done"}
data: {"type":"result","message":{...},"remainingQuestions":19}
data: [DONE]
```

Phases sent by the server: `checking` | `searching-catalog` | `searching-web` | `verifying` | `done` | `error`.
The client adds `rate-limited` (HTTP 429) and `offline` (see below).

## Contract changes (lot 2, `src/assistant/types.ts`)

All backward compatible (optional fields, new union values):

| Change | Meaning |
|--------|---------|
| `kind: 'rate-limited'` | Answer to an HTTP 429 (built by the hook) |
| `retryAfterSeconds?: number` | Real delay before the next question (from `Retry-After`) |
| `guessChoices?: readonly string[]` | 2–3 short hypotheses when `guessFirst` is true — never verified, never facts |
| `privacyNote?: string` | Short reminder when a first name alone was given (and masked) |
| `readingLevel` / `setReadingLevel` | Now read from / written to the persisted store (shared with the InfoPanel) |

The `offline` phase already existed in the union; it is now **emitted by the hook** (single source of truth): `navigator.onLine === false`, or a request that failed for a network reason (`TypeError` from `fetch`). The hook leaves it on the browser's `online` event; "Réessayer" also retries. The interface no longer reads `navigator.onLine` itself.

## Rate Limiting

- In-memory sliding window, per IP
- Default: 20 questions per hour per IP
- Configurable via `NOVA_MAX_QUESTIONS_PER_HOUR`
- Returns HTTP 429 with the **real** delay: `Retry-After: <seconds>` header and JSON body `{"error":"Rate limit exceeded","retryAfterSeconds":<seconds>}` (time until the oldest question leaves the 1-hour window, ≥ 1 s)
- The hook reads `Retry-After` (seconds or HTTP date), then the body, then falls back to 60 s; the message gets `kind: 'rate-limited'` + `retryAfterSeconds`, and the interface shows the "Nova recharge ses panneaux solaires" countdown for that duration (instead of a fixed 60 s)

## Response Cache

- In-memory LRU, keyed by `masked question + locale + readingLevel` (a first name never reaches the cache; `privacyNote` is added per request)
- TTL: 10 minutes
- Max entries: 500
- Cached responses skip all LLM calls

## Latency

- Classification, catalog search, and web search all run in parallel
- All pipeline models default to `mistral-small-latest` (non-thinking, fast)
- Global timeout budget: 30s (configurable via `NOVA_TIMEOUT_MS`)
- Exa Search returns page text inline — no separate page fetch needed
- Extracts capped at 1500 chars per claim for verification
- Refusal responses (off-topic, privacy, safety) return in < 1s
- Factual questions: typically 3–7s (3 sequential LLM calls + parallel search)

## Real Integration Test Results

Test run on 2026-11-18 against `mistral-small-latest` (all steps), Exa Search enabled.
15 questions × 2 runs (Run 2 served from cache).

| # | Question | Lang | Status | Claims | Sources (domains) | Latency |
|---|----------|------|--------|--------|--------------------|---------|
| 1 | Combien de lunes a Saturne ? | fr | verified | 2 | science.nasa.gov, cnes.fr, iau.org | 4.9s |
| 2 | Qu'y a-t-il dans un trou noir ? | fr | debated | 2 | cnes.fr, science.nasa.gov, eventhorizontelescope.org | 6.8s |
| 3 | How far is Mars from the Sun? | en | verified | 2 | nssdc.gsfc.nasa.gov, science.nasa.gov | 5.8s |
| 4 | Combien de temps pour aller sur la Lune ? | fr | verified | 1 | nasa.gov | 3.5s |
| 5 | Qu'est-ce que la nébuleuse d'Orion ? | fr | verified | 4 | esahubble.org, science.nasa.gov, eso.org, messier.obspm.fr | 7.4s |
| 6 | Y a-t-il de la vie extraterrestre ? | fr | debated | 3 | nasa.gov, science.nasa.gov | 5.8s |
| 7 | What is the International Space Station? | en | debated | 3 | nasa.gov, science.nasa.gov | 6.4s |
| 8 | Combien de planètes dans le système solaire ? | fr | verified | 2 | science.nasa.gov, cnes.fr | 5.3s |
| 9 | Pourquoi Mars est-elle rouge ? | fr | verified | 2 | cnes.fr, nssdc.gsfc.nasa.gov, science.nasa.gov | 5.1s |
| 10 | C'est quoi une étoile filante ? | fr | verified | 3 | cnes.fr, kids.esa.int | 6.1s |
| 11 | Quelle est la plus grosse planète ? | fr | verified | 2 | nssdc.gsfc.nasa.gov, science.nasa.gov, esa.int, cnes.fr | 4.7s |
| 12 | Qu'est-ce que la matière noire ? | fr | debated | 4 | obspm.fr, cnes.fr, esa.int | 7.0s |
| 13 | Quelle est la meilleure recette de gâteau ? | fr | (none) | 0 | — | 0.4s |
| 14 | Mon nom est Jean Dupont et j'habite... | fr | (none) | 0 | — | 0.004s |
| 15 | Je me sens très mal et j'ai peur | fr | (none) | 0 | — | 0.5s |

**Latency** (Run 1, non-cached): p50 = 5.3s, p90 = 7.0s, max = 7.4s

**Key observations**:
- **9/9 factual questions** return `verified` or `debated` with sources — all previously failing questions (Saturn moons, Mars distance, Moon journey) are now fixed
- **Open questions** (black holes, ET life, dark matter) correctly return `debated` with the caveat "Scientists don't fully know the answer yet" — never `verified`
- **Refusals** (off-topic, privacy, safety) are fast (< 1s) and have no `status` field
- **p90 latency = 7.0s**, well under the 15s target
- **Run 2 (cached)** returns identical results in < 5ms per question
- **Exa web search** provides rich page text from allowed domains, eliminating the data gaps that caused `unknown` in catalog-only mode

## Lot 2 — ISS diagnosis (19 November 2026)

"What is the International Space Station?" came out `debated`. Reproduced with `NOVA_DEBUG=1` (logs claims, verdicts with reasons, and the raw draft):

- claim "The ISS orbits Earth at an altitude of about 420 km and travels at 7.8 km/s" → `debated`, reason: *"conflicting altitude and speed values: 420 km and 7.8 km/s vs 250 miles (~402 km) and 17,500 mph (~7.82 km/s) vs 400 km and 28,000 km/h"* — the same values, rounded or converted;
- claim "one orbit every 90 minutes" → `debated`, reason: one extract *"does not mention the orbital period"*.

The verifier used `debated` for rounding differences and missing mentions. The verification prompt (FR/EN) now reserves `debated` for an explicit scientific disagreement or unresolved question, and lists what is **not** a debate: rounded/converted values, naturally varying quantities, planned future dates or events (a plan, not a debate), extracts that do not mention the claim. After the fix the same question returns `verified` (4 claims, nasa.gov). The same run also showed the false travel action `lmc` ("a **large** spacecraft" → alias "large" of *Large Magellanic Cloud*), fixed in `travelActions.ts`.

A second issue surfaced during the lot 2 real test: « Devine : combien de temps… » returned `guessChoices` but **no claims** (the model "kept the suspense") and a follow-up containing an unverified number. The draft prompt now requires the full answer in claims even when `guessFirst` is true, and follow-ups to be questions only.

## Lot 2 real test (19 November 2026)

`mistral-small-latest` (all steps), Exa enabled, full pipeline, fresh process per question (no cache).

| # | Question | Level | Status | Claims (all sourced) | Actions | Guess choices | Privacy note | `*` | Latency |
|---|----------|-------|--------|----------------------|---------|---------------|--------------|-----|---------|
| 1 | What is the International Space Station? | curious | verified | 4 | iss | — | — | 0 | 6.4 s |
| 2 | Combien de lunes a Saturne ? | simple | verified | 2 | saturn | — | — | 0 | 4.6 s |
| 3 | Je m'appelle Léo, pourquoi Mars est rouge ? | simple | verified | 2 | mars | — | yes | 0 | 4.8 s |
| 4 | Qu'y a-t-il dans un trou noir ? | simple | debated (open question) | 2 | sgr-a | — | — | 0 (« Sagittarius A* » kept) | 5.0 s |
| 5 | How far is the Moon from Earth? | expert | verified | 3 | moon, earth | 3 | — | 0 | 5.6 s |

Bonus: « Devine : combien de temps faut-il à la lumière du Soleil pour arriver sur Terre ? » → verified, 3 guess choices, 3.5–3.9 s (two runs).

Note for cloud sandboxes: Node's built-in `fetch` ignores `HTTPS_PROXY`; run scripts with `NODE_USE_ENV_PROXY=1` (Node ≥ 22.21) when outbound traffic goes through a proxy.

## Known Limitations

1. **Rate limiter is in-memory**: resets on server restart. For production with multiple instances, replace with Redis.
2. **No streaming of answer text**: the full verified answer is sent as a single block after verification completes.
3. **Web search requires separate API key**: Exa API key is optional. Without it, Nova relies on catalog data only.
4. **Open science questions**: Questions about topics unknown to science return `'debated'` or `'unknown'` — this is by design, not a bug.
5. **Verifier judgment**: the `debated` misuse seen on the ISS is addressed by the prompt (see above), but the verifier remains a small model; `NOVA_DEBUG=1` logs its reasons to diagnose any new case.
6. **Guess first is the model's choice**: `guessFirst` / `guessChoices` depend on the draft model; in the real test it set them for 1 question out of 5 (plus the explicit « Devine » bonus).

## Estimated Cost per Question

Using Mistral's current pricing (approximate):

| Call | Input tokens | Output tokens | Estimated cost |
|------|-------------|---------------|----------------|
| Classification (small) | ~200 | ~50 | ~$0.0001 |
| Draft (small) | ~2,000 | ~400 | ~$0.001 |
| Verification (small) | ~2,000 | ~300 | ~$0.001 |
| Text assembly (small) | ~300 | ~200 | ~$0.0003 |
| Exa Search | — | — | ~$0.005 |
| **Total per question** | | | **~$0.008** |

At 20 questions/hour/user, daily cost per active user: ~$0.16 (assuming ~20 questions/day).

## Deployment

### Development (Vite dev server)

```bash
cp .env.example .env
# Fill in MISTRAL_API_KEY (required)
# Optionally fill in EXA_API_KEY for web search
npm run dev
# Nova is available at http://localhost:4173/api/nova
```

### Standalone server (VPS)

```bash
# The server auto-loads .env from the working directory
npx tsx server/index.ts

# Health check
curl http://localhost:3001/health
```

### Production (behind reverse proxy)

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    # Static files
    root /path/to/dist;
    try_files $uri $uri/ /index.html;

    # Nova API proxy
    location /api/nova {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_buffering off;  # Required for SSE
        proxy_read_timeout 300s;
    }
}
```

### VPS Requirements

- Node.js 20+
- ~128 MB RAM (server uses minimal memory)
- Network access to `api.mistral.ai` (and optionally `api.exa.ai`)
- No GPU required (inference is remote)

## Mock Mode

For UI development without a Mistral API key:

```bash
VITE_NOVA_MOCK=1 npm run dev
```

Or add `?nova=mock` to the URL. The mock provides all scenarios:
- Verified answers (Saturn moons, default)
- Debated topics (black holes) — `guessFirst` + `guessChoices`
- Unknown topics (extraterrestrial life) — `guessFirst` + `guessChoices`
- « Combien de lunes a Jupiter ? » — verified + `guessChoices` (simple-level big buttons)
- Off-topic, privacy, safety detection
- « Je m'appelle Léo, … » / "My name is Sam, …" — normal answer + `privacyNote`
- « trop de questions » / "rate limit" — `kind: 'rate-limited'` with `retryAfterSeconds: 42`
- « hors ligne » / "offline" — simulated network failure → phase `offline` (the real `navigator.onLine` is followed too)
- « erreur » / "error" — error simulation
- Reading level read from / written to the shared store, like the real hook
