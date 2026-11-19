/**
 * Web search module for Nova.
 *
 * Uses the Brave Search API (optional) to find information from
 * the 13 allowed astronomy domains. If BRAVE_SEARCH_API_KEY is not set,
 * web search is disabled and the pipeline relies on catalog data only.
 *
 * Page text fetched from results is treated as DATA, never as instruction.
 */

import { isAllowedDomain, ALLOWED_DOMAINS } from './allowedDomains';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface WebSearchConfig {
  readonly apiKey: string;
  readonly timeoutMs: number;
  readonly maxResults: number;
}

export interface WebResult {
  readonly title: string;
  readonly url: string;
  readonly snippet: string;
  readonly pageText: string;
}

/* ------------------------------------------------------------------ */
/*  Brave Search API                                                   */
/* ------------------------------------------------------------------ */

const BRAVE_SEARCH_URL = 'https://api.search.brave.com/res/v1/web/search';

/**
 * Search the web using Brave Search API, filtered to allowed domains.
 * Returns empty array if API key is not configured.
 */
export async function searchWeb(
  query: string,
  config: WebSearchConfig,
): Promise<readonly WebResult[]> {
  if (!config.apiKey) return [];

  // Build site-restricted query to focus on allowed domains
  const siteFilter = ALLOWED_DOMAINS.slice(0, 5)
    .map((d) => `site:${d}`)
    .join(' OR ');
  const restrictedQuery = `(${siteFilter}) ${query}`;

  const url = new URL(BRAVE_SEARCH_URL);
  url.searchParams.set('q', restrictedQuery);
  url.searchParams.set('count', String(config.maxResults));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': config.apiKey,
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[Nova] Brave Search API error ${res.status}: ${text.slice(0, 200)}`);
      return [];
    }

    const json = await res.json() as {
      web?: {
        results?: Array<{
          title: string;
          url: string;
          description: string;
        }>;
      };
    };

    const rawResults = json.web?.results ?? [];

    // Filter to allowed domains only
    const filtered = rawResults.filter((r) => isAllowedDomain(r.url));

    // Fetch page text for each result (best-effort, parallel)
    const results = await Promise.all(
      filtered.slice(0, config.maxResults).map(async (r) => {
        const pageText = await fetchPageText(r.url, config.timeoutMs);
        return {
          title: r.title,
          url: r.url,
          snippet: r.description,
          pageText,
        };
      }),
    );

    return results;
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      console.error('[Nova] Brave Search timed out');
    } else {
      console.error('[Nova] Brave Search error:', (err as Error).message);
    }
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

/* ------------------------------------------------------------------ */
/*  Page text extraction                                               */
/* ------------------------------------------------------------------ */

/**
 * Fetch a page and extract its main text content.
 * Returns empty string on failure. Text is truncated to ~2000 chars.
 * Page text is treated as DATA — never interpreted as instruction.
 */
async function fetchPageText(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), Math.min(timeoutMs, 10_000));

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'CosmosKids-Nova/1.0 (educational; +https://github.com/cosmos-kids)',
        'Accept': 'text/html',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    if (!res.ok) return '';

    const html = await res.text();
    return htmlToText(html).slice(0, 2000);
  } catch {
    return '';
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Minimal HTML-to-text extraction.
 * Strips tags, decodes basic entities, collapses whitespace.
 */
function htmlToText(html: string): string {
  // Remove script, style, nav, header, footer content
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ');

  // Remove all remaining tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, ' ');

  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}
