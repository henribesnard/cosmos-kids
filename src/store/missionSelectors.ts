import type { MissionDef, MissionStepTarget } from '../data/missions';
import { isCelestialObjectId, isDeepSkyObjectId } from '../data/types';
import { isConstellationAbbr } from '../data/constellationTypes';
import type { MissionState } from './useCosmosStore';

export function isTargetVisited(target: MissionStepTarget, state: MissionState): boolean {
  if (isCelestialObjectId(target)) return state.visitedObjectIds.includes(target);
  if (isDeepSkyObjectId(target)) return state.visitedDeepSkyIds.includes(target);
  if (isConstellationAbbr(target)) return state.visitedConstellationIds.includes(target);
  return false;
}

export function missionProgress(
  def: MissionDef,
  state: MissionState,
): { done: number; total: number; percent: number } {
  const done = def.steps.filter((s) => isTargetVisited(s.target, state)).length;
  return { done, total: def.steps.length, percent: Math.round((done / def.steps.length) * 100) };
}

export function overallProgress(missions: readonly MissionDef[], state: MissionState): number {
  const totalSteps = missions.reduce((sum, m) => sum + m.steps.length, 0);
  const doneSteps = missions.reduce(
    (sum, m) => sum + m.steps.filter((s) => isTargetVisited(s.target, state)).length,
    0,
  );
  return totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;
}
