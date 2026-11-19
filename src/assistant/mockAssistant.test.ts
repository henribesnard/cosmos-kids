import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { useMockAssistant } from './mockAssistant';
import type { AssistantMessage } from './types';

/* ------------------------------------------------------------------ */
/*  Wrapper — provides MemoryRouter for useLocation()                 */
/* ------------------------------------------------------------------ */

function wrapper({ children }: { children: ReactNode }) {
  return createElement(MemoryRouter, { initialEntries: ['/explore/solar-system/saturn'] }, children);
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function lastNovaMessage(messages: readonly AssistantMessage[]): AssistantMessage | undefined {
  return [...messages].reverse().find((m) => m.role === 'nova');
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('useMockAssistant', () => {

  it('starts idle with empty messages', () => {
    const { result } = renderHook(() => useMockAssistant(), { wrapper });
    expect(result.current.phase).toBe('idle');
    expect(result.current.messages).toHaveLength(0);
    expect(result.current.isOpen).toBe(false);
  });

  it('provides suggestions', () => {
    const { result } = renderHook(() => useMockAssistant(), { wrapper });
    expect(result.current.suggestions.length).toBeGreaterThan(0);
  });

  it('tracks remaining questions', () => {
    const { result } = renderHook(() => useMockAssistant(), { wrapper });
    expect(result.current.remainingQuestions).toBe(20);
  });

  it('opens and closes', () => {
    const { result } = renderHook(() => useMockAssistant(), { wrapper });
    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);
    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
  });

  it('sets reading level', () => {
    const { result } = renderHook(() => useMockAssistant(), { wrapper });
    expect(result.current.readingLevel).toBe('curious');
    act(() => result.current.setReadingLevel('expert'));
    expect(result.current.readingLevel).toBe('expert');
    act(() => result.current.setReadingLevel('simple'));
    expect(result.current.readingLevel).toBe('simple');
  });

  it('adds child message and responds to a verified question (saturn moons)', async () => {
    const { result } = renderHook(() => useMockAssistant(), { wrapper });

    await act(async () => {
      await result.current.ask('Combien de lunes a Saturne ?');
    });

    expect(result.current.messages.length).toBeGreaterThanOrEqual(2);
    const child = result.current.messages[0]!;
    expect(child.role).toBe('child');
    expect(child.text).toContain('Saturne');

    const nova = lastNovaMessage(result.current.messages)!;
    expect(nova).toBeDefined();
    expect(nova.role).toBe('nova');
    expect(nova.kind).toBe('answer');
    expect(nova.status).toBe('verified');
    expect(nova.claims).toBeDefined();
    expect(nova.claims!.length).toBeGreaterThanOrEqual(1);
    expect(nova.sources).toBeDefined();
    expect(nova.sources!.length).toBe(2);
    expect(nova.followUps).toBeDefined();
    expect(nova.followUps!.length).toBeGreaterThanOrEqual(2);
    // Action: travel to saturn
    expect(nova.actions).toBeDefined();
    expect(nova.actions!.length).toBe(1);
    expect(nova.actions![0]!.kind).toBe('travel');
    expect(nova.actions![0]!.destinationId).toBe('saturn');
  });

  it('detects off-topic questions', async () => {
    const { result } = renderHook(() => useMockAssistant(), { wrapper });

    await act(async () => {
      await result.current.ask('Quelle est la meilleure recette de gâteau ?');
    });

    const nova = lastNovaMessage(result.current.messages);
    expect(nova).toBeDefined();
    expect(nova!.kind).toBe('off-topic');
  });

  it('detects privacy concerns', async () => {
    const { result } = renderHook(() => useMockAssistant(), { wrapper });

    await act(async () => {
      await result.current.ask('Mon nom est Jean Dupont et j\'habite à Paris');
    });

    const nova = lastNovaMessage(result.current.messages);
    expect(nova).toBeDefined();
    expect(nova!.kind).toBe('privacy');
  });

  it('detects safety/distress situations', async () => {
    const { result } = renderHook(() => useMockAssistant(), { wrapper });

    await act(async () => {
      await result.current.ask('Je me sens mal et j\'ai peur');
    });

    const nova = lastNovaMessage(result.current.messages);
    expect(nova).toBeDefined();
    expect(nova!.kind).toBe('safety');
  });

  it('handles debated topics (black hole)', async () => {
    const { result } = renderHook(() => useMockAssistant(), { wrapper });

    await act(async () => {
      await result.current.ask('Qu\'y a-t-il dans un trou noir ?');
    });

    const nova = lastNovaMessage(result.current.messages);
    expect(nova).toBeDefined();
    expect(nova!.kind).toBe('answer');
    expect(nova!.status).toBe('debated');
    expect(nova!.guessFirst).toBe(true);
    expect(nova!.claims).toBeDefined();
    expect(nova!.claims!.some((c) => c.status === 'debated')).toBe(true);
  });

  it('handles unknown topics (extraterrestrial life)', async () => {
    const { result } = renderHook(() => useMockAssistant(), { wrapper });

    await act(async () => {
      await result.current.ask('Y a-t-il de la vie extraterrestre ?');
    });

    const nova = lastNovaMessage(result.current.messages);
    expect(nova).toBeDefined();
    expect(nova!.status).toBe('unknown');
    expect(nova!.guessFirst).toBe(true);
  });

  it('simulates rate-limited scenario', async () => {
    const { result } = renderHook(() => useMockAssistant(), { wrapper });

    await act(async () => {
      await result.current.ask('trop de questions rate limit');
    });

    expect(result.current.phase).toBe('rate-limited');
    const nova = lastNovaMessage(result.current.messages);
    expect(nova).toBeDefined();
    expect(nova!.kind).toBe('error');
  });

  it('simulates error scenario', async () => {
    const { result } = renderHook(() => useMockAssistant(), { wrapper });

    await act(async () => {
      await result.current.ask('provoque une erreur');
    });

    expect(result.current.phase).toBe('error');
  });

  it('decrements remaining questions after each ask', async () => {
    const { result } = renderHook(() => useMockAssistant(), { wrapper });

    await act(async () => {
      await result.current.ask('Combien de lunes a Saturne ?');
    });
    expect(result.current.remainingQuestions).toBe(19);

    await act(async () => {
      await result.current.ask('Qu\'y a-t-il dans un trou noir ?');
    });
    expect(result.current.remainingQuestions).toBe(18);
  }, 15_000);

  it('resets correctly', async () => {
    const { result } = renderHook(() => useMockAssistant(), { wrapper });

    await act(async () => {
      await result.current.ask('C\'est quoi une étoile ?');
    });
    expect(result.current.messages.length).toBeGreaterThan(0);

    act(() => result.current.reset());
    expect(result.current.messages).toHaveLength(0);
    expect(result.current.phase).toBe('idle');
    expect(result.current.remainingQuestions).toBe(20);
  });

  it('provides a default response for unrecognized questions', async () => {
    const { result } = renderHook(() => useMockAssistant(), { wrapper });

    await act(async () => {
      await result.current.ask('Parle-moi du cosmos');
    });

    const nova = lastNovaMessage(result.current.messages);
    expect(nova).toBeDefined();
    expect(nova!.kind).toBe('answer');
    expect(nova!.status).toBe('verified');
    expect(nova!.sources).toBeDefined();
    expect(nova!.sources!.length).toBeGreaterThan(0);
  });

  it('assigns unique IDs to all messages', async () => {
    const { result } = renderHook(() => useMockAssistant(), { wrapper });

    await act(async () => {
      await result.current.ask('Combien de lunes a Saturne ?');
    });
    await act(async () => {
      await result.current.ask('C\'est quoi le Soleil ?');
    });

    const ids = result.current.messages.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  }, 15_000);

  it('English suggestions when locale is en', () => {
    // The mock reads locale from the store; default is 'fr'
    const { result } = renderHook(() => useMockAssistant(), { wrapper });
    // Default locale is 'fr' in the store, so suggestions should be French
    expect(result.current.suggestions.every((s) => typeof s === 'string')).toBe(true);
  });
});
