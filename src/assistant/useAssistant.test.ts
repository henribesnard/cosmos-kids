import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { useAssistant } from './useAssistant';
import { parseRetryAfter, DEFAULT_RETRY_AFTER_SECONDS } from './assistantShared';
import { useCosmosStore } from '../store/useCosmosStore';

function wrapper({ children }: { children: ReactNode }) {
  return createElement(MemoryRouter, { initialEntries: ['/explore/solar-system'] }, children);
}

function sseResponse(message: Record<string, unknown>, remaining = 7): Response {
  const body = [
    `data: ${JSON.stringify({ type: 'phase', phase: 'checking' })}`,
    '',
    `data: ${JSON.stringify({ type: 'phase', phase: 'done' })}`,
    '',
    `data: ${JSON.stringify({ type: 'result', message, remainingQuestions: remaining })}`,
    '',
    'data: [DONE]',
    '',
    '',
  ].join('\n');
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  useCosmosStore.getState().reset();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('parseRetryAfter', () => {
  it('reads delta-seconds', () => expect(parseRetryAfter('1234', null)).toBe(1234));
  it('reads an HTTP date', () => {
    const now = Date.parse('2026-11-19T10:00:00Z');
    expect(parseRetryAfter('Thu, 19 Nov 2026 10:02:30 GMT', null, now)).toBe(150);
  });
  it('falls back to the JSON body', () => expect(parseRetryAfter(null, { retryAfterSeconds: 90.2 })).toBe(91));
  it('falls back to 60 s', () => {
    expect(parseRetryAfter(null, null)).toBe(DEFAULT_RETRY_AFTER_SECONDS);
    expect(parseRetryAfter('garbage', { retryAfterSeconds: -3 })).toBe(DEFAULT_RETRY_AFTER_SECONDS);
  });
  it('never returns less than 1 s', () => expect(parseRetryAfter('0', null)).toBe(1));
});

describe('useAssistant (real) — lot 2', () => {
  it('429 → kind rate-limited with the server Retry-After', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'Rate limit exceeded', retryAfterSeconds: 1800 }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '1742' },
    }));
    const { result } = renderHook(() => useAssistant(), { wrapper });
    await act(async () => {
      await result.current.ask('Combien de lunes a Saturne ?');
    });
    const nova = result.current.messages.at(-1)!;
    expect(result.current.phase).toBe('rate-limited');
    expect(nova.kind).toBe('rate-limited');
    expect(nova.retryAfterSeconds).toBe(1742);
    expect(result.current.remainingQuestions).toBe(0);
  });

  it('a network failure → phase offline, left when the browser is back online', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useAssistant(), { wrapper });
    await act(async () => {
      await result.current.ask('Pourquoi Mars est rouge ?');
    });
    expect(result.current.phase).toBe('offline');
    expect(result.current.messages.at(-1)!.kind).toBe('error');
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current.phase).toBe('idle');
  });

  it('an HTTP 500 stays an error, not offline', async () => {
    fetchMock.mockResolvedValue(new Response('boom', { status: 500 }));
    const { result } = renderHook(() => useAssistant(), { wrapper });
    await act(async () => {
      await result.current.ask('Pourquoi Mars est rouge ?');
    });
    expect(result.current.phase).toBe('error');
  });

  it('navigator.onLine false → phase offline without calling the server', async () => {
    const spy = vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    const { result } = renderHook(() => useAssistant(), { wrapper });
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.phase).toBe('offline');
    await act(async () => {
      await result.current.ask('Pourquoi Mars est rouge ?');
    });
    expect(fetchMock).not.toHaveBeenCalled();
    spy.mockReturnValue(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current.phase).not.toBe('offline');
  });

  it('sends the shared reading level and keeps the new contract fields', async () => {
    useCosmosStore.getState().setReadingLevel('simple');
    fetchMock.mockResolvedValue(sseResponse({
      text: 'Saturne a au moins 146 lunes.',
      status: 'verified',
      claims: [],
      sources: [],
      followUps: [],
      actions: [],
      guessFirst: true,
      guessChoices: ['Une seule', 'Plus de 100'],
      privacyNote: 'Petit rappel',
      kind: 'answer',
    }));
    const { result } = renderHook(() => useAssistant(), { wrapper });
    expect(result.current.readingLevel).toBe('simple');
    await act(async () => {
      await result.current.ask('Combien de lunes a Saturne ?');
    });
    const body = JSON.parse(String(fetchMock.mock.calls[0]![1]!.body));
    expect(body.context.readingLevel).toBe('simple');
    const nova = result.current.messages.at(-1)!;
    expect(nova.guessChoices).toEqual(['Une seule', 'Plus de 100']);
    expect(nova.privacyNote).toBe('Petit rappel');
    expect(result.current.phase).toBe('done');
    expect(result.current.remainingQuestions).toBe(7);

    act(() => result.current.setReadingLevel('expert'));
    expect(useCosmosStore.getState().readingLevel).toBe('expert');
  });
});
