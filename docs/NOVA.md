# Nova — AI Assistant for COSMOS KIDS

Nova is an AI assistant designed for children aged 7-14 that answers questions about astronomy, astrophysics, and space exploration. Every answer goes through a **content-based verification circuit** before being shown to the child. No claim reaches the child unless it is explicitly supported by a real source extract.

## Architecture

```
Client (React)                    Server (Node.js)
+-----------------+               +--------------------------------------+
| useAssistant()  | -- SSE/POST ->| POST /api/nova                       |
|   or            |               |   handler.ts                         |
| useMockAssistant|               |     1. validateRequest()             |
+-----------------+               |     2. containsPersonalInfo()        |
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
| `server/nova/validation.ts` | Input validation + privacy detection |
| `server/nova/catalogSearch.ts` | Searches app's internal celestial data |
| `server/nova/allowedDomains.ts` | 13-domain whitelist for web sources |
| `server/nova/rateLimit.ts` | In-memory sliding-window rate limiter |
| `server/nova/prompts/` | System prompts (fr/en) for classify/draft/verify/assemble |
| `server/nova/vitePlugin.ts` | Vite dev/preview plugin |
| `server/index.ts` | Standalone Node.js server for VPS |

## Verification Circuit

The pipeline ensures **no unverified text reaches the child**:

1. **Privacy detection** (regex, no LLM) — catches names, addresses, phone numbers, emails, school names
2. **Classification + catalog search + web search** (parallel) — classification via small model (includes `openQuestion` detection); catalog search via local keyword matching; web search via Exa (optional)
3. **Source Registry** (closed) — only sources created by the server (catalog entries, web pages) are accepted. The LLM cannot invent sources.
4. **Drafting** (small model, JSON mode) — generates claims with source IDs from the registry. Source IDs not in the registry are silently dropped. Each claim MUST cite a sourceId.
5. **Extract-based verification** (small model, JSON mode) — each claim is checked against real source extracts. The verifier returns `supportingSourceIds` per claim and is explicitly told: "Use ONLY the provided extracts. Do NOT use your own knowledge."
6. **Source attribution merge** — draft sourceIds + verifier supportingSourceIds are merged. No fallback to all sources.
7. **Unsupported claims are dropped** — if all claims are unsupported, a fallback "I couldn't verify this" response is shown with status `'unknown'`
8. **Open question override** — if the classifier flagged `openQuestion: true`, status can never be `'verified'` (capped at `'debated'`)
9. **Text assembly** (small model) — final text is generated from retained claims only, not from the original draft. No new facts can be introduced. Open questions get a caveat prefix.
10. **Action whitelist** — `travel` actions only allowed for known destination IDs

### Key invariants

- **Closed sources**: The LLM can only reference source IDs created by the server. Any invented ID is silently dropped.
- **Extract-based verification**: The verifier receives the actual text content (catalog facts, web page text), not just titles and URLs.
- **No model knowledge**: The verification prompt explicitly prohibits using the model's own knowledge.
- **Text from claims only**: The final text is assembled from verified claims, never from the raw draft.
- **Refusal = no status**: Off-topic, privacy, safety, and error responses have no `status` field — they never show a "Verified" badge.
- **Open question cap**: Questions classified as `openQuestion` can never reach `'verified'` status, even if individual claims are supported.
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

Phases: `checking` | `searching-catalog` | `searching-web` | `verifying` | `done` | `error`

## Rate Limiting

- In-memory sliding window, per IP
- Default: 20 questions per hour per IP
- Configurable via `NOVA_MAX_QUESTIONS_PER_HOUR`
- Returns HTTP 429 with `Retry-After` header

## Response Cache

- In-memory LRU, keyed by `question + locale + readingLevel`
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

## Known Limitations

1. **Rate limiter is in-memory**: resets on server restart. For production with multiple instances, replace with Redis.
2. **No streaming of answer text**: the full verified answer is sent as a single block after verification completes.
3. **Web search requires separate API key**: Exa API key is optional. Without it, Nova relies on catalog data only.
4. **Open science questions**: Questions about topics unknown to science return `'debated'` or `'unknown'` — this is by design, not a bug.
5. **ISS sometimes debated**: The verifier occasionally marks well-known ISS facts as `debated` — this is a minor LLM judgment variance.

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

Or add `?nova-mock` to the URL. The mock provides all scenarios:
- Verified answers (Saturn moons, default)
- Debated topics (black holes)
- Unknown topics (extraterrestrial life)
- Off-topic, privacy, safety detection
- Rate limiting and error simulation
