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

/** Cool-down shown after a rate-limited answer, before the child can ask again. */
export const RECHARGE_MS = 60_000;

/**
 * Which special situation (if any) a Nova message represents.
 * `arrivalPhase` is the assistant phase recorded when the message arrived:
 * the contract has no dedicated "rate-limited" message kind, so a message of
 * kind `error` received while the phase is `rate-limited` is a recharge.
 */
export function specialCaseOf(
  message: AssistantMessage,
  arrivalPhase: AssistantPhase | undefined,
  online: boolean,
): SpecialCase | null {
  if (message.role !== 'nova') return null;
  switch (message.kind) {
    case 'off-topic':
    case 'privacy':
    case 'safety':
      return message.kind;
    case 'error':
      if (arrivalPhase === 'rate-limited') return 'rate-limited';
      if (arrivalPhase === 'offline' || !online) return 'offline';
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
