import type { Locale } from '../data/types';
export type ReadingLevel = 'simple' | 'curious' | 'expert';
export type ClaimStatus = 'verified' | 'debated' | 'unknown';
export type AssistantPhase = 'idle' | 'checking' | 'searching-catalog' | 'searching-web' | 'verifying' | 'done' | 'error' | 'rate-limited' | 'offline';
export interface AssistantSource { readonly id: string; readonly title: string; readonly publisher: string; readonly url: string; readonly kind: 'catalog' | 'web'; }
export interface AssistantClaim { readonly text: string; readonly status: ClaimStatus; readonly sourceIds: readonly string[]; }
export interface AssistantAction { readonly kind: 'travel'; readonly destinationId: string; readonly label: string; }
export interface AssistantMessage {
  readonly id: string; readonly role: 'child' | 'nova'; readonly text: string; readonly createdAt: number;
  readonly status?: ClaimStatus; readonly claims?: readonly AssistantClaim[]; readonly sources?: readonly AssistantSource[];
  readonly followUps?: readonly string[]; readonly actions?: readonly AssistantAction[];
  readonly guessFirst?: boolean; readonly kind?: 'answer' | 'off-topic' | 'safety' | 'privacy' | 'error' | 'rate-limited';
  /** Lot 2 — with kind 'rate-limited': real delay before the next question (server Retry-After). */
  readonly retryAfterSeconds?: number;
  /** Lot 2 — with guessFirst: 2–3 short hypotheses. Never verified, never facts. */
  readonly guessChoices?: readonly string[];
  /** Lot 2 — short reminder when the child gave a first name (masked before the provider). */
  readonly privacyNote?: string;
}
export interface AssistantContext { readonly locale: Locale; readonly view: string; readonly selectedObjectId: string | null; readonly activeJourneyId: string | null; readonly readingLevel: ReadingLevel; }
export interface UseAssistant {
  readonly messages: readonly AssistantMessage[]; readonly phase: AssistantPhase; readonly isOpen: boolean;
  readonly suggestions: readonly string[]; readonly remainingQuestions: number | null;
  ask(text: string): Promise<void>; open(): void; close(): void; reset(): void;
  /** Lot 2 — reads and writes the shared, persisted reading level of the store. */
  setReadingLevel(level: ReadingLevel): void; readonly readingLevel: ReadingLevel;
}
