import { useCallback, useEffect, useState, useSyncExternalStore, type RefObject } from 'react';
import type { Locale } from '../../data/types';

/* ------------------------------------------------------------------ */
/*  Media query                                                        */
/* ------------------------------------------------------------------ */

/** Below this width Nova opens as a modal bottom sheet instead of a side panel. */
export const NOVA_SHEET_QUERY = '(max-width: 1023px)';

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback((notify: () => void) => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => undefined;
    const list = window.matchMedia(query);
    list.addEventListener?.('change', notify);
    return () => list.removeEventListener?.('change', notify);
  }, [query]);
  const read = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
  return useSyncExternalStore(subscribe, read, () => false);
}

/* ------------------------------------------------------------------ */
/*  Online / offline                                                   */
/* ------------------------------------------------------------------ */

function subscribeOnline(notify: () => void) {
  window.addEventListener('online', notify);
  window.addEventListener('offline', notify);
  return () => {
    window.removeEventListener('online', notify);
    window.removeEventListener('offline', notify);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false),
    () => true,
  );
}

/* ------------------------------------------------------------------ */
/*  Speech synthesis                                                   */
/* ------------------------------------------------------------------ */

export function speechSupported(): boolean {
  return typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && typeof window.SpeechSynthesisUtterance === 'function';
}

export interface SpeechControls {
  readonly supported: boolean;
  readonly speakingId: string | null;
  toggle(id: string, text: string): void;
  stop(): void;
}

/** Reads a message aloud in the current locale; only one message at a time. */
export function useSpeech(locale: Locale): SpeechControls {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const supported = speechSupported();

  const stop = useCallback(() => {
    if (!speechSupported()) return;
    window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, []);

  const toggle = useCallback((id: string, text: string) => {
    if (!speechSupported()) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    if (speakingId === id) {
      setSpeakingId(null);
      return;
    }
    const utterance = new window.SpeechSynthesisUtterance(text);
    const lang = locale === 'fr' ? 'fr-FR' : 'en-GB';
    utterance.lang = lang;
    utterance.rate = 0.95;
    const voice = synth.getVoices?.().find((candidate) => candidate.lang?.toLowerCase().startsWith(locale));
    if (voice) utterance.voice = voice;
    utterance.onend = () => setSpeakingId((current) => (current === id ? null : current));
    utterance.onerror = utterance.onend;
    setSpeakingId(id);
    synth.speak(utterance);
  }, [locale, speakingId]);

  // Stop speaking when the language changes or the component goes away.
  useEffect(() => () => {
    if (speechSupported()) window.speechSynthesis.cancel();
  }, [locale]);

  return { supported, speakingId, toggle, stop };
}

/* ------------------------------------------------------------------ */
/*  Focus trap (bottom sheet)                                          */
/* ------------------------------------------------------------------ */

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keeps Tab / Shift+Tab inside `ref` while `active` is true. */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    const root = ref.current;
    if (!active || !root) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter((element) => !element.closest('[hidden]') && element.getAttribute('aria-hidden') !== 'true');
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const current = document.activeElement;
      if (event.shiftKey && (current === first || !root.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || !root.contains(current))) {
        event.preventDefault();
        first.focus();
      }
    };
    root.addEventListener('keydown', onKeyDown);
    return () => root.removeEventListener('keydown', onKeyDown);
  }, [ref, active]);
}

/* ------------------------------------------------------------------ */
/*  First meeting flag (not a conversation: just "Nova said hello")    */
/* ------------------------------------------------------------------ */

export const NOVA_MET_STORAGE_KEY = 'cosmos-kids-nova-met';

export function readNovaMet(): boolean {
  try {
    return window.localStorage.getItem(NOVA_MET_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeNovaMet(): void {
  try {
    window.localStorage.setItem(NOVA_MET_STORAGE_KEY, '1');
  } catch {
    // Private mode or blocked storage: the greeting may simply show again.
  }
}
