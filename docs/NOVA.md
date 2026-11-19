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
                                  |     3. classifyQuestion() ──┐ parallel|
                                  |     4. searchCatalog()   ───┘        |
                                  |     5. searchWeb()  (Brave, optional)|
                                  |     6. SourceRegistry (closed)       |
                                  |     7. draftResponse()  (small model)|
                                  |     8. verifyClaims()   (main model) |
                                  |     9. assembleText()   (small model)|
                                  |    10. filterActions()  (whitelist)  |
                                  +--------------------------------------+
                                       |
                                       v
                                  Mistral AI API + Brave Search (optional)
```

### Key files

| File | Purpose |
|------|---------|
| `src/assistant/types.ts` | Contract types shared with the design agent |
| `src/assistant/useAssistant.ts` | React hook (SSE client + mock delegation) |
| `src/assistant/mockAssistant.ts` | Full mock with all scenarios |
| `server/nova/handler.ts` | Main pipeline handler + SourceRegistry |
| `server/nova/provider.ts` | LLM provider abstraction (Mistral impl) |
| `server/nova/webSearch.ts` | Brave Search + page fetching + text extraction |
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
2. **Classification + catalog search** (parallel) — classification via small model; catalog search via local keyword matching
3. **Web search** (Brave Search API, optional) — triggered if catalog has < 2 results, filtered to 13 allowed domains, page text extracted as DATA
4. **Source Registry** (closed) — only sources created by the server (catalog entries, web pages) are accepted. The LLM cannot invent sources.
5. **Drafting** (small model, JSON mode) — generates claims with source IDs from the registry. Source IDs not in the registry are silently dropped.
6. **Extract-based verification** (main model, JSON mode) — each claim is checked against real source extracts. The verifier is explicitly told: "Use ONLY the provided extracts. Do NOT use your own knowledge."
7. **Unsupported claims are dropped** — if all claims are unsupported, a fallback "I couldn't verify this" response is shown with status `'unknown'`
8. **Text assembly** (small model) — final text is generated from retained claims only, not from the original draft. No new facts can be introduced.
9. **Action whitelist** — `travel` actions only allowed for known destination IDs

### Key invariants

- **Closed sources**: The LLM can only reference source IDs created by the server. Any invented ID is silently dropped.
- **Extract-based verification**: The verifier receives the actual text content (catalog facts, web page text), not just titles and URLs.
- **No model knowledge**: The verification prompt explicitly prohibits using the model's own knowledge.
- **Text from claims only**: The final text is assembled from verified claims, never from the raw draft.
- **Refusal = no status**: Off-topic, privacy, safety, and error responses have no `status` field — they never show a "Verified" badge.

## Allowed Domains (web search)

Sources are restricted to these 13 authoritative domains:

- `nasa.gov`, `science.nasa.gov`, `jpl.nasa.gov`, `ssd.jpl.nasa.gov`
- `esa.int`, `eso.org`, `cnes.fr`, `iau.org`, `obspm.fr`
- `stsci.edu`, `noirlab.edu`, `cfa.harvard.edu`, `spacetelescope.org`

Any web search result from outside these domains is silently discarded.

## Data Sent to Provider

Each pipeline run sends up to 4 API calls to Mistral:

| Call | Model | Purpose | Data sent |
|------|-------|---------|-----------|
| Classification | `mistral-small-latest` | Is the question in-domain? | System prompt + question (no personal data) |
| Draft | `mistral-small-latest` (configurable) | Generate claims from source data | System prompt + source registry extracts + question |
| Verification | `mistral-large-latest` | Verify each claim against extracts | Verification prompt + claims + real source extracts |
| Text assembly | `mistral-small-latest` | Assemble text from verified claims | Assembly prompt + retained claim texts |

**Never sent**: API key, child's identity, IP address, conversation history beyond the configured limit (default: 6 messages).

The API key is **server-side only** (`process.env.MISTRAL_API_KEY`). No `VITE_` prefix is used for secrets.

## SSE Protocol

The server streams Server-Sent Events:

```
data: {"type":"phase","phase":"checking"}
data: {"type":"phase","phase":"searching-catalog"}
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

- Classification and catalog search run in parallel
- Drafting uses a fast model (default: `mistral-small-latest`, configurable via `NOVA_DRAFT_MODEL`)
- Verification uses the main model (`mistral-large-latest` by default)
- Default timeout: 60s per API call, with child-friendly timeout message
- Text assembly uses the small model (fast)
- Refusal responses (off-topic, privacy, safety) return in < 2s
- Factual questions with catalog data: typically 10–25s (3 sequential API calls)
- Latency is dominated by the verification call to `mistral-large-latest`

## Real Integration Test Results

Test run on 2026-11-19 against `mistral-small-latest` (draft) + `mistral-large-latest` (verification), catalog-only mode (no Brave Search API key).

| # | Question | Lang | Kind | Status | Claims | Sources | Latency |
|---|----------|------|------|--------|--------|---------|---------|
| 1 | Combien de lunes a Saturne ? | fr | answer | unknown | 0 | — | 16.3s |
| 2 | Qu'y a-t-il dans un trou noir ? | fr | answer | verified | 1 | eventhorizontelescope.org | 18.2s |
| 3 | How far is Mars from the Sun? | en | answer | unknown | 0 | — | 41.6s |
| 4 | Combien de temps pour aller sur la Lune ? | fr | answer | unknown | 0 | — | 26.8s |
| 5 | Qu'est-ce que la nébuleuse d'Orion ? | fr | answer | verified | 3 | esahubble.org | 14.1s |
| 6 | Quelle est la meilleure recette de gâteau ? | fr | off-topic | — | 0 | — | 0.4s |
| 7 | Mon nom est Jean Dupont et j'habite... | fr | privacy | — | 0 | — | 0.003s |
| 8 | Je me sens très mal et j'ai peur | fr | safety | — | 0 | — | 0.4s |
| 9 | Y a-t-il de la vie extraterrestre ? | fr | answer | unknown | 0 | — | 0.5s |
| 10 | What is the International Space Station? | en | answer | verified | 3 | nasa.gov, science.nasa.gov | 22.2s |

**Latency**: p50 = 16.3s, p90 = 41.6s, max = 41.6s

**Key observations**:
- Refusals (off-topic, privacy, safety) are fast (< 2s) and have no `status` field
- Extraterrestrial life correctly returns `unknown` (no catalog data, no web search)
- Black hole question returns `verified` because the catalog has factual Sagittarius A* data — this is correct pipeline behavior
- Some factual questions return `unknown` when the draft model fails to reference source IDs — the strict verification drops claims without supporting extracts
- Latency is high because `mistral-large-latest` verification calls take 10–40s; consider using `mistral-small-latest` for verification via `NOVA_MODEL` to reduce latency at the cost of verification quality

## Known Limitations

1. **Rate limiter is in-memory**: resets on server restart. For production with multiple instances, replace with Redis.
2. **No streaming of answer text**: the full verified answer is sent as a single block after verification completes.
3. **Web search requires separate API key**: Brave Search API key is optional. Without it, Nova relies on catalog data only.
4. **Open science questions**: Questions about topics not in the catalog and without web search will correctly return 'unknown' — this is by design, not a bug.

## Estimated Cost per Question

Using Mistral's current pricing (approximate):

| Call | Input tokens | Output tokens | Estimated cost |
|------|-------------|---------------|----------------|
| Classification (small) | ~200 | ~20 | ~$0.0001 |
| Draft (small) | ~1,500 | ~400 | ~$0.001 |
| Verification (large) | ~1,500 | ~300 | ~$0.007 |
| Text assembly (small) | ~300 | ~200 | ~$0.0003 |
| **Total per question** | | | **~$0.009** |

At 20 questions/hour/user, daily cost per active user: ~$0.18 (assuming ~20 questions/day).

## Deployment

### Development (Vite dev server)

```bash
cp .env.example .env
# Fill in MISTRAL_API_KEY (required)
# Optionally fill in BRAVE_SEARCH_API_KEY for web search
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
- Network access to `api.mistral.ai` (and optionally `api.search.brave.com`)
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
