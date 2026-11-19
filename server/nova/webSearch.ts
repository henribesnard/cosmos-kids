/**
 * Web search module for Nova.
 *
 * Uses the Exa Search API (optional) to find information from
 * the 13 allowed astronomy domains. If EXA_API_KEY is not set,
 * web search is disabled and the pipeline relies on catalog data only.
 *
 * Page text is retrieved inline via Exa's `contents` parameter.
 * All page content is treated as DATA, never as instruction.
 */

import { ALLOWED_DOMAINS } from './allowedDomains';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SearchOptions {
  readonly maxResults: number;
  readonly timeoutMs: number;
}

export interface WebResult {
  readonly title: string;
  readonly url: string;
  readonly snippet: string;
  readonly pageText: string;
}

export interface SearchProvider {
  search(query: string, options: SearchOptions): Promise<readonly WebResult[]>;
}

/* ------------------------------------------------------------------ */
/*  Exa Search API                                                     */
/* ------------------------------------------------------------------ */

const EXA_SEARCH_URL = 'https://api.exa.ai/search';

/**
 * Create an Exa search provider.
 * Uses `includeDomains` to restrict results to the 13 allowed domains
 * and `contents.text` to retrieve page text inline (no extra fetch).
 */
export function createExaProvider(apiKey: string): SearchProvider {
  return {
    async search(query, options) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);

      try {
        const res = await fetch(EXA_SEARCH_URL, {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            numResults: options.maxResults,
            includeDomains: [...ALLOWED_DOMAINS],
            contents: {
              text: { maxCharacters: 2000 },
              highlights: true,
            },
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          console.error(`[Nova] Exa Search API error ${res.status}: ${text.slice(0, 200)}`);
          return [];
        }

        const json = await res.json() as {
          results?: Array<{
            title?: string;
            url?: string;
            text?: string;
            highlights?: string[];
          }>;
          costDollars?: number;
        };

        const results = json.results ?? [];

        // Log cost for observability
        if (json.costDollars != null) {
          const cost = typeof json.costDollars === 'number' ? json.costDollars.toFixed(4) : String(json.costDollars);
          console.error(`[Nova] Exa search cost: $${cost} (${results.length} results)`);
        }

        return results.map((r) => ({
          title: r.title ?? '',
          url: r.url ?? '',
          snippet: r.highlights?.join(' ') ?? '',
          pageText: r.text ?? '',
        }));
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          console.error('[Nova] Exa Search timed out');
        } else {
          console.error('[Nova] Exa Search error:', (err as Error).message);
        }
        return [];
      } finally {
        clearTimeout(timeoutId);
      }
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Noop provider (when no API key is set)                             */
/* ------------------------------------------------------------------ */

export function createNoopProvider(): SearchProvider {
  return {
    async search() {
      return [];
    },
  };
}

/**
 * Create the appropriate search provider based on configuration.
 */
export function createSearchProvider(exaApiKey: string): SearchProvider {
  if (exaApiKey) {
    return createExaProvider(exaApiKey);
  }
  return createNoopProvider();
}
