import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AssistantContext,
  AssistantMessage,
  AssistantPhase,
  UseAssistant,
} from './types';
import { useMockAssistant } from './mockAssistant';
import {
  isNavigatorOnline,
  isNetworkError,
  offlineText,
  parseRetryAfter,
  rateLimitedText,
  useAssistantContext,
  useLeaveOfflineOnReconnect,
  useNavigatorOnline,
  useSharedReadingLevel,
} from './assistantShared';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function isMockMode(): boolean {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('nova') === 'mock') return true;
  }
  try {
    return import.meta.env.VITE_NOVA_MOCK === '1';
  } catch {
    return false;
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const JOURNEY: readonly AssistantPhase[] = ['checking', 'searching-catalog', 'searching-web', 'verifying'];

/* ------------------------------------------------------------------ */
/*  Real assistant (calls /api/nova via SSE)                          */
/* ------------------------------------------------------------------ */

function useRealAssistant(): UseAssistant {
  const context = useAssistantContext();
  const [readingLevel, setReadingLevel] = useSharedReadingLevel();
  const navigatorOnline = useNavigatorOnline();
  const [messages, setMessages] = useState<readonly AssistantMessage[]>([]);
  const [phase, setPhase] = useState<AssistantPhase>('idle');
  const [isOpen, setIsOpen] = useState(false);
  const [remainingQuestions, setRemainingQuestions] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const messagesRef = useRef<readonly AssistantMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useLeaveOfflineOnReconnect(setPhase);

  const push = useCallback((message: AssistantMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const ask = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || inFlightRef.current) return;
    if (!isNavigatorOnline()) {
      setPhase('offline');
      return;
    }
    inFlightRef.current = true;

    const history = messagesRef.current.slice(-6).map((m) => ({ role: m.role, text: m.text }));
    push({ id: generateId(), role: 'child', text: trimmed, createdAt: Date.now() });
    setPhase('checking');

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/nova', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed, context: { ...context, readingLevel }, history }),
        signal: controller.signal,
      });

      if (!res.ok) {
        if (res.status === 429) {
          let body: unknown = null;
          try { body = await res.json(); } catch { /* no JSON body */ }
          const retryAfterSeconds = parseRetryAfter(res.headers.get('Retry-After'), body);
          setRemainingQuestions(0);
          setPhase('rate-limited');
          push({
            id: generateId(),
            role: 'nova',
            text: rateLimitedText(context.locale),
            createdAt: Date.now(),
            kind: 'rate-limited',
            retryAfterSeconds,
          });
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let gotResult = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const [index, line] of lines.entries()) {
          if (line.startsWith('event: phase')) {
            const dataLine = lines[index + 1];
            if (dataLine?.startsWith('data: ')) setPhase(dataLine.slice(6).trim() as AssistantPhase);
          } else if (line.startsWith('data: ')) {
            const raw = line.slice(6).trim();
            if (!raw || raw === '[DONE]') continue;
            try {
              const parsed = JSON.parse(raw);
              if (parsed.type === 'phase') {
                // 'done'/'error' arrive just before the result: keep the journey until then.
                if (JOURNEY.includes(parsed.phase)) setPhase(parsed.phase as AssistantPhase);
              } else if (parsed.type === 'result') {
                gotResult = true;
                const novaMsg: AssistantMessage = {
                  id: generateId(),
                  role: 'nova',
                  createdAt: Date.now(),
                  ...parsed.message,
                };
                push(novaMsg);
                setPhase(novaMsg.kind === 'error' ? 'error' : 'done');
                if (typeof parsed.remainingQuestions === 'number') {
                  setRemainingQuestions(parsed.remainingQuestions);
                }
              }
            } catch {
              // Skip unparseable SSE data
            }
          }
        }
      }
      if (!gotResult) throw new Error('Stream ended without a result');
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const offline = isNetworkError(err);
      setPhase(offline ? 'offline' : 'error');
      push({
        id: generateId(),
        role: 'nova',
        text: offline
          ? offlineText(context.locale)
          : (context.locale === 'fr'
            ? 'Oups, quelque chose n\'a pas fonctionné. Réessaie dans un instant !'
            : 'Oops, something went wrong. Try again in a moment!'),
        createdAt: Date.now(),
        kind: 'error',
      });
    } finally {
      if (abortRef.current === controller) inFlightRef.current = false;
    }
  }, [context, push, readingLevel]);

  const suggestions = getSuggestionsForContext(context);

  return {
    messages,
    // Single source of truth for 'offline': the browser says so, or a request failed for a network reason.
    phase: navigatorOnline ? phase : 'offline',
    isOpen,
    suggestions,
    remainingQuestions,
    ask,
    open: useCallback(() => setIsOpen(true), []),
    close: useCallback(() => setIsOpen(false), []),
    reset: useCallback(() => {
      abortRef.current?.abort();
      inFlightRef.current = false;
      setMessages([]);
      setPhase((p) => (p === 'offline' ? 'offline' : 'idle'));
    }, []),
    setReadingLevel,
    readingLevel,
  };
}

/* ------------------------------------------------------------------ */
/*  Suggestions based on context                                      */
/* ------------------------------------------------------------------ */

const SUGGESTIONS: Record<string, { fr: readonly string[]; en: readonly string[] }> = {
  earth: {
    fr: ['Pourquoi la Terre tourne-t-elle ?', 'Comment s\'est formée la Lune ?', 'C\'est quoi l\'atmosphère ?'],
    en: ['Why does Earth rotate?', 'How was the Moon formed?', 'What is the atmosphere?'],
  },
  mars: {
    fr: ['Y a-t-il de l\'eau sur Mars ?', 'Pourquoi Mars est-elle rouge ?', 'Peut-on vivre sur Mars ?'],
    en: ['Is there water on Mars?', 'Why is Mars red?', 'Can we live on Mars?'],
  },
  jupiter: {
    fr: ['Qu\'est-ce que la Grande Tache Rouge ?', 'Combien de lunes a Jupiter ?', 'Jupiter est-elle une étoile ratée ?'],
    en: ['What is the Great Red Spot?', 'How many moons does Jupiter have?', 'Is Jupiter a failed star?'],
  },
  saturn: {
    fr: ['De quoi sont faits les anneaux de Saturne ?', 'Combien de lunes a Saturne ?', 'Saturne peut-elle flotter sur l\'eau ?'],
    en: ['What are Saturn\'s rings made of?', 'How many moons does Saturn have?', 'Could Saturn float on water?'],
  },
  sun: {
    fr: ['Comment le Soleil brille-t-il ?', 'Quelle est la température du Soleil ?', 'Le Soleil va-t-il s\'éteindre ?'],
    en: ['How does the Sun shine?', 'What is the Sun\'s temperature?', 'Will the Sun ever die?'],
  },
  default: {
    fr: ['Qu\'est-ce qu\'un trou noir ?', 'Combien y a-t-il d\'étoiles ?', 'C\'est quoi une année-lumière ?'],
    en: ['What is a black hole?', 'How many stars are there?', 'What is a light-year?'],
  },
};

function getSuggestionsForContext(context: AssistantContext): readonly string[] {
  const objectSuggestions = context.selectedObjectId
    ? SUGGESTIONS[context.selectedObjectId]
    : undefined;
  const pool = objectSuggestions ?? SUGGESTIONS['default'];
  return pool?.[context.locale] ?? pool?.fr ?? [];
}

/* ------------------------------------------------------------------ */
/*  Public hook — delegates to mock or real                           */
/* ------------------------------------------------------------------ */

export function useAssistant(): UseAssistant {
  if (isMockMode()) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useMockAssistant();
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useRealAssistant();
}
