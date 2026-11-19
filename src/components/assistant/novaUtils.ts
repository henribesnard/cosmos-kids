import type { AssistantMessage, AssistantPhase } from '../../assistant/types';
import type { NovaMood } from './NovaAvatar';
import { JOURNEY_PHASES, type JourneyPhase, type SpecialCase } from './novaText';

/** Only http(s) links are rendered: a source URL is untrusted model output. */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isJourneyPhase(phase: AssistantPhase): phase is JourneyPhase {
  return (JOURNEY_PHASES as readonly string[]).includes(phase);
}

/**
 * Patience message threshold. Calibrated on the real latency measured in
 * November 2026 (5–7 s, p90 ≈ 7 s), no longer on the old 30–90 s.
 */
export const STILL_WORKING_AFTER_S = 10;

/** Fallback cool-down when a rate-limited message carries no delay (older servers). */
export const RECHARGE_MS = 60_000;

/** Real cool-down of a rate-limited message: the server's Retry-After, else 60 s. */
export function rechargeSecondsOf(message: AssistantMessage): number {
  const value = message.retryAfterSeconds;
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.ceil(value) : RECHARGE_MS / 1000;
}

/** Seconds left before the child can ask again (0 when recharged). */
export function rechargeLeftSeconds(message: AssistantMessage, now: number): number {
  const total = rechargeSecondsOf(message);
  return Math.min(total, Math.max(0, Math.ceil((message.createdAt + total * 1000 - now) / 1000)));
}

/**
 * Which special situation (if any) a Nova message represents.
 * Lot 2: the contract has a dedicated 'rate-limited' kind and the hook emits
 * the 'offline' phase; `arrivalPhase` is the phase recorded when the message
 * arrived (an error received while offline is an offline message).
 */
export function specialCaseOf(
  message: AssistantMessage,
  arrivalPhase: AssistantPhase | undefined,
): SpecialCase | null {
  if (message.role !== 'nova') return null;
  switch (message.kind) {
    case 'off-topic':
    case 'privacy':
    case 'safety':
    case 'rate-limited':
      return message.kind;
    case 'error':
      if (arrivalPhase === 'rate-limited') return 'rate-limited';
      if (arrivalPhase === 'offline') return 'offline';
      return 'error';
    default:
      if (arrivalPhase === 'rate-limited') return 'rate-limited';
      return null;
  }
}

export function moodForSpecial(special: SpecialCase): NovaMood {
  switch (special) {
    case 'off-topic': return 'elsewhere';
    case 'privacy': return 'shield';
    case 'safety': return 'caring';
    case 'rate-limited': return 'recharging';
    case 'offline': return 'offline';
    case 'error': return 'oops';
  }
}

export function moodForMessage(message: AssistantMessage, special: SpecialCase | null): NovaMood {
  if (special) return moodForSpecial(special);
  if (message.status === 'unknown') return 'mystery';
  if (message.status === 'debated') return 'thinking';
  return 'happy';
}

export function moodForPhase(phase: AssistantPhase): NovaMood | null {
  switch (phase) {
    case 'checking': return 'thinking';
    case 'searching-catalog':
    case 'searching-web': return 'searching';
    case 'verifying': return 'verifying';
    case 'rate-limited': return 'recharging';
    case 'offline': return 'offline';
    case 'error': return 'oops';
    default: return null;
  }
}

/** The child question that a Nova message answers (the closest previous child message). */
export function questionFor(messages: readonly AssistantMessage[], index: number): string | null {
  for (let i = index - 1; i >= 0; i -= 1) {
    const candidate = messages[i];
    if (candidate?.role === 'child') return candidate.text;
  }
  return null;
}
