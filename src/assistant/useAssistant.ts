import { useCallback, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useCosmosStore } from '../store/useCosmosStore';
import type {
  AssistantContext,
  AssistantMessage,
  AssistantPhase,
  ReadingLevel,
  UseAssistant,
} from './types';
import { useMockAssistant } from './mockAssistant';

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

/* ------------------------------------------------------------------ */
/*  Context builder                                                   */
/* ------------------------------------------------------------------ */

function useAssistantContext(): AssistantContext {
  const locale = useCosmosStore((s) => s.locale);
  const view = useCosmosStore((s) => s.view);
  const selectedObjectId = useCosmosStore((s) => s.selectedObjectId);
  const activeJourneyId = useCosmosStore((s) => s.mission.activeJourneyId);
  const { pathname } = useLocation();

  return {
    locale,
    view: pathname || view,
    selectedObjectId: selectedObjectId ?? null,
    activeJourneyId: activeJourneyId ?? null,
    readingLevel: 'curious',
  };
}

/* ------------------------------------------------------------------ */
/*  Real assistant (calls /api/nova via SSE)                          */
/* ------------------------------------------------------------------ */

function useRealAssistant(): UseAssistant {
  const context = useAssistantContext();
  const [messages, setMessages] = useState<readonly AssistantMessage[]>([]);
  const [phase, setPhase] = useState<AssistantPhase>('idle');
  const [isOpen, setIsOpen] = useState(false);
  const [readingLevel, setReadingLevel] = useState<ReadingLevel>('curious');
  const [remainingQuestions, setRemainingQuestions] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const ask = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || phase === 'checking') return;

    const childMsg: AssistantMessage = {
      id: generateId(),
      role: 'child',
      text: trimmed,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, childMsg]);
    setPhase('checking');

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const body = JSON.stringify({
        question: trimmed,
        context: { ...context, readingLevel },
        history: messages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
      });

      const res = await fetch('/api/nova', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
      });

      if (!res.ok) {
        if (res.status === 429) {
          setPhase('rate-limited');
          const errorMsg: AssistantMessage = {
            id: generateId(),
            role: 'nova',
            text: context.locale === 'fr'
              ? 'Tu as posé beaucoup de questions ! Attends un peu avant de continuer.'
              : 'You\'ve asked a lot of questions! Wait a bit before continuing.',
            createdAt: Date.now(),
            kind: 'error',
          };
          setMessages((prev) => [...prev, errorMsg]);
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('event: phase')) {
            const dataLine = lines[lines.indexOf(line) + 1];
            if (dataLine?.startsWith('data: ')) {
              const phaseData = dataLine.slice(6).trim() as AssistantPhase;
              setPhase(phaseData);
            }
          } else if (line.startsWith('data: ')) {
            const raw = line.slice(6).trim();
            if (!raw || raw === '[DONE]') continue;
            try {
              const parsed = JSON.parse(raw);
              if (parsed.type === 'phase') {
                setPhase(parsed.phase as AssistantPhase);
              } else if (parsed.type === 'result') {
                const novaMsg: AssistantMessage = {
                  id: generateId(),
                  role: 'nova',
                  createdAt: Date.now(),
                  ...parsed.message,
                };
                setMessages((prev) => [...prev, novaMsg]);
                setPhase('done');
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
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setPhase('error');
      const errorMsg: AssistantMessage = {
        id: generateId(),
        role: 'nova',
        text: context.locale === 'fr'
          ? 'Oups, quelque chose n\'a pas fonctionné. Réessaie dans un instant !'
          : 'Oops, something went wrong. Try again in a moment!',
        createdAt: Date.now(),
        kind: 'error',
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  }, [context, messages, phase, readingLevel]);

  const suggestions = getSuggestionsForContext(context);

  return {
    messages,
    phase,
    isOpen,
    suggestions,
    remainingQuestions,
    ask,
    open: useCallback(() => setIsOpen(true), []),
    close: useCallback(() => setIsOpen(false), []),
    reset: useCallback(() => {
      abortRef.current?.abort();
      setMessages([]);
      setPhase('idle');
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
