/**
 * Pieces shared by the real assistant hook and the mock (?nova=mock):
 * context (with the persisted reading level), network status and the
 * Retry-After parsing. Lot 2: the hook is the single source of truth for the
 * 'offline' phase; the interface no longer reads navigator.onLine itself.
 */
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { useCosmosStore } from '../store/useCosmosStore';
import type { AssistantContext, AssistantPhase, ReadingLevel } from './types';

/** Fallback delay when the server gives no usable Retry-After (seconds). */
export const DEFAULT_RETRY_AFTER_SECONDS = 60;

export function useAssistantContext(): AssistantContext {
  const locale = useCosmosStore((s) => s.locale);
  const view = useCosmosStore((s) => s.view);
  const selectedObjectId = useCosmosStore((s) => s.selectedObjectId);
  const activeJourneyId = useCosmosStore((s) => s.mission.activeJourneyId);
  const readingLevel = useCosmosStore((s) => s.readingLevel);
  const { pathname } = useLocation();

  return {
    locale,
    view: pathname || view,
    selectedObjectId: selectedObjectId ?? null,
    activeJourneyId: activeJourneyId ?? null,
    readingLevel,
  };
}

/** Shared reading level (store, persisted): Nova and the InfoPanel stay in sync. */
export function useSharedReadingLevel(): [ReadingLevel, (level: ReadingLevel) => void] {
  const readingLevel = useCosmosStore((s) => s.readingLevel);
  const setStoreLevel = useCosmosStore((s) => s.setReadingLevel);
  const setReadingLevel = useCallback((level: ReadingLevel) => setStoreLevel(level), [setStoreLevel]);
  return [readingLevel, setReadingLevel];
}

/* ------------------------------------------------------------------ */
/*  Network status                                                     */
/* ------------------------------------------------------------------ */

function subscribeOnline(notify: () => void) {
  window.addEventListener('online', notify);
  window.addEventListener('offline', notify);
  return () => {
    window.removeEventListener('online', notify);
    window.removeEventListener('offline', notify);
  };
}

export function isNavigatorOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
}

export function useNavigatorOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, isNavigatorOnline, () => true);
}

/**
 * Leaves the 'offline' phase when the connection comes back (the browser
 * fires `online`), whatever put it there (navigator offline or a request
 * that failed for a network reason).
 */
export function useLeaveOfflineOnReconnect(setPhase: (update: (p: AssistantPhase) => AssistantPhase) => void): void {
  useEffect(() => {
    const onOnline = () => setPhase((p) => (p === 'offline' ? 'idle' : p));
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [setPhase]);
}

/** A rejected fetch caused by the network (not an abort, not an HTTP error). */
export function isNetworkError(error: unknown): boolean {
  if (!isNavigatorOnline()) return true;
  return error instanceof TypeError;
}

/* ------------------------------------------------------------------ */
/*  Retry-After                                                        */
/* ------------------------------------------------------------------ */

/**
 * Seconds to wait before the next question, from the Retry-After header
 * (delta-seconds or HTTP-date), else the JSON body's retryAfterSeconds,
 * else 60 s. Always an integer ≥ 1.
 */
export function parseRetryAfter(header: string | null, body: unknown, now: number = Date.now()): number {
  if (header) {
    const trimmed = header.trim();
    if (/^\d+$/.test(trimmed)) return Math.max(1, Number(trimmed));
    const date = Date.parse(trimmed);
    if (!Number.isNaN(date)) return Math.max(1, Math.ceil((date - now) / 1000));
  }
  if (body && typeof body === 'object' && 'retryAfterSeconds' in body) {
    const value = (body as { retryAfterSeconds: unknown }).retryAfterSeconds;
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.ceil(value);
  }
  return DEFAULT_RETRY_AFTER_SECONDS;
}

export function rateLimitedText(locale: 'fr' | 'en'): string {
  return locale === 'fr'
    ? 'Tu as posé beaucoup de questions ! Je recharge mes panneaux solaires avant la suivante.'
    : 'You’ve asked a lot of questions! I’m recharging my solar panels before the next one.';
}

export function offlineText(locale: 'fr' | 'en'): string {
  return locale === 'fr'
    ? 'Je ne capte plus la Terre : ta connexion Internet semble coupée. Je réessaierai dès que le signal revient.'
    : 'I can’t reach Earth: your Internet connection seems to be off. I’ll try again as soon as the signal is back.';
}
