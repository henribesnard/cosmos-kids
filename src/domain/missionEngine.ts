import { JOURNEY_RULES, type MissionRuleStep } from '../data/journeyRules';
import type { MissionStepDef } from '../data/journeyTypes';
import { useCosmosStore } from '../store/useCosmosStore';
import { publish, subscribe, type CosmosEvent } from './events';

/** Return whether one event satisfies one mission step. */
export function eventSatisfiesStep(
  event: CosmosEvent,
  step: MissionStepDef | MissionRuleStep,
): boolean {
  switch (step.kind) {
    case 'visit':
      return event.type === 'OBJECT_VISITED' && event.id === step.target;
    case 'observe':
      return event.type === 'OBJECT_OBSERVED'
        && event.id === step.target
        && event.durationMs >= step.holdMs;
    case 'compare':
      return event.type === 'COMPARISON_COMPLETED'
        && (
          (event.a === step.a && event.b === step.b)
          || (event.a === step.b && event.b === step.a)
        );
    case 'reach-scale':
      return event.type === 'SCALE_CHANGED' && event.level === step.level;
    case 'quiz':
      return event.type === 'QUIZ_ANSWERED'
        && event.stepId === step.id
        && event.correct;
    case 'real-world':
      return event.type === 'REAL_WORLD_CHECKED' && event.stepId === step.id;
  }
}

/**
 * Ordered steps depend only on earlier ordered steps. Unordered educational
 * activities remain available independently.
 */
export function orderedPredecessorsAreComplete(
  steps: readonly (MissionStepDef | MissionRuleStep)[],
  stepId: string,
  completedStepIds: readonly string[],
): boolean {
  const stepIndex = steps.findIndex((step) => step.id === stepId);
  if (stepIndex < 0) return false;

  return steps
    .slice(0, stepIndex)
    .filter((step) => step.ordered)
    .every((step) => completedStepIds.includes(step.id));
}

function handleEvent(event: CosmosEvent): void {
  if (event.type === 'OBJECT_VISITED') {
    useCosmosStore.getState().recordDiscovery(event.id, event.at);
  }

  const initialState = useCosmosStore.getState();
  const journeyId = initialState.mission.activeJourneyId;
  if (!journeyId) return;

  const steps = JOURNEY_RULES[journeyId];
  if (!steps) return;

  const initialRun = initialState.mission.runs[journeyId];
  if (!initialRun || initialRun.startedAt == null || initialRun.completedAt != null) return;

  for (const step of steps) {
    const currentState = useCosmosStore.getState();
    const currentRun = currentState.mission.runs[journeyId];
    if (!currentRun || currentRun.startedAt == null || currentRun.completedAt != null) return;
    if (currentRun.completedStepIds.includes(step.id)) continue;
    if (!eventSatisfiesStep(event, step)) continue;
    if (
      step.ordered
      && !orderedPredecessorsAreComplete(
        steps,
        step.id,
        currentRun.completedStepIds,
      )
    ) {
      continue;
    }

    currentState.completeStep(journeyId, step.id);
  }

  const completionState = useCosmosStore.getState();
  const runBeforeCompletion = completionState.mission.runs[journeyId];
  const allStepsComplete = steps.length > 0
    && steps.every((step) => runBeforeCompletion?.completedStepIds.includes(step.id));

  if (!runBeforeCompletion || runBeforeCompletion.completedAt != null || !allStepsComplete) return;

  completionState.completeJourney(journeyId);
  const completedRun = useCosmosStore.getState().mission.runs[journeyId];
  if (completedRun?.completedAt != null) {
    publish({ type: 'JOURNEY_COMPLETED', id: journeyId });
  }
}

let unsubscribe: (() => void) | null = null;

/** Start the application mission engine. Calling this twice is harmless. */
export function startMissionEngine(): void {
  if (unsubscribe) return;
  unsubscribe = subscribe(handleEvent);
}

/** Stop the application mission engine. */
export function stopMissionEngine(): void {
  unsubscribe?.();
  unsubscribe = null;
}
