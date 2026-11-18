/**
 * In-memory rate limiter for Nova.
 *
 * Tracks requests per IP using a sliding window (1 hour).
 * No persistent storage — resets on server restart.
 */

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterMs: number;
}

interface BucketEntry {
  readonly timestamps: number[];
}

const buckets = new Map<string, BucketEntry>();
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

/** Prune expired entries periodically */
let lastPrune = Date.now();
const PRUNE_INTERVAL_MS = 5 * 60 * 1000; // 5 min

function pruneIfNeeded(): void {
  const now = Date.now();
  if (now - lastPrune < PRUNE_INTERVAL_MS) return;
  lastPrune = now;

  for (const [key, entry] of buckets) {
    const valid = entry.timestamps.filter((t) => now - t < WINDOW_MS);
    if (valid.length === 0) {
      buckets.delete(key);
    } else {
      entry.timestamps.length = 0;
      entry.timestamps.push(...valid);
    }
  }
}

export function checkRateLimit(clientId: string, maxPerHour: number): RateLimitResult {
  pruneIfNeeded();

  const now = Date.now();
  let entry = buckets.get(clientId);

  if (!entry) {
    entry = { timestamps: [] };
    buckets.set(clientId, entry);
  }

  // Remove timestamps outside the window
  const valid = entry.timestamps.filter((t) => now - t < WINDOW_MS);
  entry.timestamps.length = 0;
  entry.timestamps.push(...valid);

  if (entry.timestamps.length >= maxPerHour) {
    const oldest = entry.timestamps[0]!;
    const retryAfterMs = oldest + WINDOW_MS - now;
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, retryAfterMs),
    };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: maxPerHour - entry.timestamps.length,
    retryAfterMs: 0,
  };
}

/** Reset rate limit for a client (useful in tests). */
export function resetRateLimit(clientId: string): void {
  buckets.delete(clientId);
}

/** Reset all rate limits (useful in tests). */
export function resetAllRateLimits(): void {
  buckets.clear();
}
