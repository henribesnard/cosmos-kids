import { JOURNEY_RULES } from '../data/journeyRules';
import type { MissionState } from './useCosmosStore';

/** Progress is derived exclusively from non-retroactive journey runs. */
export function overallJourneyProgress(state: MissionState): number {
  const entries = Object.entries(JOURNEY_RULES);
  const journeyTotal = entries.reduce((sum, [, steps]) => sum + steps.length, 0);
  const journeyDone = entries.reduce((sum, [id]) => {
    const run = state.runs[id as keyof typeof JOURNEY_RULES];
    return sum + (run?.completedStepIds.length ?? 0);
  }, 0);

  return journeyTotal > 0 ? Math.round((journeyDone / journeyTotal) * 100) : 0;
}
