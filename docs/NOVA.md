# Nova — AI Assistant for COSMOS KIDS

Nova is an AI assistant designed for children aged 7-14 that answers questions about astronomy, astrophysics, and space exploration. Every answer goes through a **verification circuit** before being shown to the child.

## Architecture

```
Client (React)                    Server (Node.js)
+-----------------+               +---------------------------+
| useAssistant()  | -- SSE/POST ->| POST /api/nova            |
|   or            |               |   handler.ts              |
| useMockAssistant|               |     1. validateRequest()  |
+-----------------+               |     2. containsPersonalInfo()
                                  |     3. classifyQuestion()  (small model)
                                  |     4. searchCatalog()     (local data)
                                  |     5. webSearch()         (Mistral Conversations API)
                                  |     6. draftResponse()     (large model, JSON)
                                  |     7. verifyClaims()      (large model, JSON)
                                  |     8. filterActions()     (whitelist)
                                  |     9. extractFollowUps()
                                  +---------------------------+
                                       |
                                       v
                                  Mistral AI API
                                  (api.mistral.ai)
```

### Key files

| File | Purpose |
|------|---------|
| `src/assistant/types.ts` | Contract types shared with the design agent |
| `src/assistant/useAssistant.ts` | React hook (SSE client + mock delegation) |
| `src/assistant/mockAssistant.ts` | Full mock with all scenarios |
| `server/nova/handler.ts` | Main pipeline handler (Request -> Response) |
| `server/nova/provider.ts` | LLM provider abstraction (Mistral impl) |
| `server/nova/validation.ts` | Input validation + privacy detection |
| `server/nova/catalogSearch.ts` | Searches app's internal celestial data |
| `server/nova/allowedDomains.ts` | 13-domain whitelist for web sources |
| `server/nova/rateLimit.ts` | In-memory sliding-window rate limiter |
| `server/nova/prompts/` | System prompts (fr/en) for classify/draft/verify |
| `server/nova/vitePlugin.ts` | Vite dev/preview plugin |
| `server/index.ts` | Standalone Node.js server for VPS |

## Verification Circuit

The pipeline ensures **no unverified text reaches the child**:

1. **Privacy detection** (regex, no LLM) — catches names, addresses, phone numbers, emails, school names
2. **Domain classification** (small model: `mistral-small-latest`) — in-domain / off-topic / inappropriate / distress
3. **Catalog search** (local) — searches COSMOS KIDS data (solar system, deep-sky objects, journeys)
4. **Web search** (Mistral Conversations API) — only triggered if catalog has < 2 results, filtered to allowed domains
5. **Drafting** (large model: `mistral-large-latest`, JSON mode) — generates answer with structured claims and source IDs
6. **Independent verification** (large model, JSON mode) — second LLM call verifies each claim as supported/debated/unsupported
7. **Unsupported claims are dropped** — if all claims are unsupported, a fallback "scientists don't know yet" response is shown
8. **Action whitelist** — `travel` actions only allowed for known destination IDs

## Allowed Domains (web search)

Sources are restricted to these 13 authoritative domains:

- `nasa.gov`, `science.nasa.gov`, `jpl.nasa.gov`, `ssd.jpl.nasa.gov`
- `esa.int`, `eso.org`, `cnes.fr`, `iau.org`, `obspm.fr`
- `stsci.edu`, `noirlab.edu`, `cfa.harvard.edu`, `spacetelescope.org`

Any web search result from outside these domains is silently discarded.

## Data Sent to Provider

Each pipeline run sends up to 3 API calls to Mistral:

| Call | Model | Purpose | Data sent |
|------|-------|---------|-----------|
| Classification | `mistral-small-latest` | Is the question in-domain? | System prompt + question (no personal data) |
| Draft | `mistral-large-latest` | Generate answer with claims | System prompt + catalog context + web context + question |
| Verification | `mistral-large-latest` | Verify each claim independently | Verification prompt + claims + sources |

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

## Known Limitations

1. **Latency**: Mistral's large model with internal thinking takes 30-90s per factual question (3 LLM calls). The default timeout is 120s per individual API call.
2. **Thinking tokens**: `mistral-large-latest` uses extended thinking that consumes tokens. `max_tokens` is set to 16384 for drafting and 8192 for verification to accommodate this.
3. **Web search reliability**: The Conversations API web search may fail silently; the pipeline falls back to catalog-only context.
4. **Rate limiter is in-memory**: resets on server restart. For production with multiple instances, replace with Redis.
5. **No streaming of answer text**: the full verified answer is sent as a single block after verification completes.

## Estimated Cost per Question

Using Mistral's current pricing (approximate):

| Call | Input tokens | Output tokens | Estimated cost |
|------|-------------|---------------|----------------|
| Classification (small) | ~200 | ~20 | ~$0.0001 |
| Draft (large) | ~2,000 | ~500 | ~$0.01 |
| Verification (large) | ~1,500 | ~300 | ~$0.007 |
| **Total per question** | | | **~$0.02** |

At 20 questions/hour/user, daily cost per active user: ~$0.40 (assuming ~20 questions/day).

## Deployment

### Development (Vite dev server)

```bash
cp .env.example .env
# Fill in MISTRAL_API_KEY
npm run dev
# Nova is available at http://localhost:4173/api/nova
```

### Standalone server (VPS)

```bash
# Install tsx globally or use npx
npm install -g tsx

# Start the server
node --env-file=.env --import=tsx server/index.ts
# Or: npx tsx server/index.ts (after sourcing .env)

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
- Network access to `api.mistral.ai`
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
