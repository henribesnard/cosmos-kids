import type {
  JourneyId,
  MissionStepTarget,
  ScaleLevelId,
} from './journeyTypes';

/**
 * Compact rules needed by the always-on mission engine.
 *
 * The full bilingual catalogue is route-loaded. Keeping only event matchers
 * here prevents that educational copy from inflating the initial bundle while
 * preserving synchronous mission handling on every scene route.
 */
export type MissionRuleStep =
  | {
      readonly id: string;
      readonly kind: 'visit';
      readonly target: MissionStepTarget;
      readonly ordered?: boolean;
    }
  | {
      readonly id: string;
      readonly kind: 'observe';
      readonly target: MissionStepTarget;
      readonly holdMs: number;
      readonly ordered?: boolean;
    }
  | {
      readonly id: string;
      readonly kind: 'compare';
      readonly a: MissionStepTarget;
      readonly b: MissionStepTarget;
      readonly ordered?: boolean;
    }
  | {
      readonly id: string;
      readonly kind: 'reach-scale';
      readonly level: ScaleLevelId;
      readonly ordered?: boolean;
    }
  | { readonly id: string; readonly kind: 'quiz'; readonly ordered?: boolean }
  | { readonly id: string; readonly kind: 'real-world'; readonly ordered?: boolean };

export const JOURNEY_RULES: Readonly<Record<JourneyId, readonly MissionRuleStep[]>> = {
  'earth-to-iss': [
    { id: 'iss-visit-earth', kind: 'visit', target: 'earth', ordered: true },
    { id: 'iss-visit-station', kind: 'visit', target: 'iss', ordered: true },
    {
      id: 'iss-observe-station',
      kind: 'observe',
      target: 'iss',
      holdMs: 1_500,
      ordered: true,
    },
    { id: 'iss-quiz-orbit', kind: 'quiz' },
  ],
  'earth-to-moon': [
    { id: 'moon-visit-earth', kind: 'visit', target: 'earth', ordered: true },
    { id: 'moon-visit-moon', kind: 'visit', target: 'moon', ordered: true },
    { id: 'moon-quiz-distance', kind: 'quiz' },
    { id: 'moon-compare', kind: 'compare', a: 'earth', b: 'moon' },
  ],
  'earth-to-mars': [
    { id: 'mars-visit-earth', kind: 'visit', target: 'earth', ordered: true },
    { id: 'mars-visit-mars', kind: 'visit', target: 'mars', ordered: true },
    { id: 'mars-quiz-distance', kind: 'quiz' },
    { id: 'mars-compare', kind: 'compare', a: 'earth', b: 'mars' },
  ],
  'earth-to-outer-planets': [
    {
      id: 'outer-reach-solar-scale',
      kind: 'reach-scale',
      level: 'solar',
      ordered: true,
    },
    {
      id: 'outer-visit-jupiter',
      kind: 'visit',
      target: 'jupiter',
      ordered: true,
    },
    { id: 'outer-visit-saturn', kind: 'visit', target: 'saturn' },
    { id: 'outer-visit-uranus', kind: 'visit', target: 'uranus' },
    { id: 'outer-visit-neptune', kind: 'visit', target: 'neptune' },
    { id: 'outer-quiz-rings', kind: 'quiz' },
  ],
  'milkyway-to-andromeda': [
    {
      id: 'andromeda-reach-localgroup',
      kind: 'reach-scale',
      level: 'localgroup',
      ordered: true,
    },
    { id: 'andromeda-visit-sgra', kind: 'visit', target: 'sgr-a' },
    {
      id: 'andromeda-visit-andromeda',
      kind: 'visit',
      target: 'andromeda',
      ordered: true,
    },
    { id: 'andromeda-quiz-collision', kind: 'quiz' },
    {
      id: 'andromeda-compare',
      kind: 'compare',
      a: 'andromeda',
      b: 'triangulum',
    },
  ],
  'into-a-black-hole': [
    {
      id: 'bh-reach-milkyway',
      kind: 'reach-scale',
      level: 'milkyway',
      ordered: true,
    },
    { id: 'bh-visit-sgra', kind: 'visit', target: 'sgr-a', ordered: true },
    { id: 'bh-quiz-mass', kind: 'quiz' },
  ],
  'constellations-from-earth': [
    { id: 'const-visit-night-sky', kind: 'visit', target: 'night-sky' },
    { id: 'const-visit-ori', kind: 'visit', target: 'Ori' },
    { id: 'const-visit-uma', kind: 'visit', target: 'UMa' },
    { id: 'const-visit-cyg', kind: 'visit', target: 'Cyg' },
    { id: 'const-quiz-polaris', kind: 'quiz' },
    { id: 'const-real-world', kind: 'real-world' },
  ],
};

export const SIMULATED_JOURNEY_IDS: ReadonlySet<JourneyId> = new Set([
  'milkyway-to-andromeda',
  'into-a-black-hole',
]);
