/**
 * Type definitions for the Journey system.
 *
 * A Journey replaces the old Mission concept. It models a real trip
 * from point A to point B, documented along five axes:
 * duration, waypoints, hazards, human precedent, robot precedent.
 */

import type {
  LocalizedText,
  CelestialObjectId,
  DeepSkyObjectId,
  ScientificQuantity,
} from './types';
import type { ConstellationAbbr } from './constellationTypes';
import type { VehicleId } from '../domain/travelTime';

export type { VehicleId } from '../domain/travelTime';

/* ------------------------------------------------------------------ */
/*  Journey identifiers                                               */
/* ------------------------------------------------------------------ */

export type JourneyId =
  | 'earth-to-iss'
  | 'earth-to-moon'
  | 'earth-to-mars'
  | 'earth-to-outer-planets'
  | 'milkyway-to-andromeda'
  | 'into-a-black-hole'
  | 'constellations-from-earth';

export const ALL_JOURNEY_IDS: readonly JourneyId[] = [
  'earth-to-iss',
  'earth-to-moon',
  'earth-to-mars',
  'earth-to-outer-planets',
  'milkyway-to-andromeda',
  'into-a-black-hole',
  'constellations-from-earth',
];

/* ------------------------------------------------------------------ */
/*  Feasibility — the pedagogical heart of each journey               */
/* ------------------------------------------------------------------ */

export type JourneyFeasibility =
  | 'done-by-humans'
  | 'done-by-robots-only'
  | 'out-of-reach'
  | 'impossible-today'
  | 'do-it-tonight';

/* ------------------------------------------------------------------ */
/*  Endpoints                                                          */
/* ------------------------------------------------------------------ */

export type JourneyEndpointId =
  | CelestialObjectId
  | DeepSkyObjectId
  | 'iss'
  | 'night-sky'
  | 'milky-way'
  | 'outer-planets';

export interface JourneyEndpoint {
  readonly id: JourneyEndpointId;
  readonly label: LocalizedText;
}

/* ------------------------------------------------------------------ */
/*  Distance                                                           */
/* ------------------------------------------------------------------ */

/**
 * Journey distances reuse the repository scientific-quantity contract so a
 * number can never be detached from its unit and provenance.
 */
export type Quantity = ScientificQuantity<'km'>;

export type DistanceSpec =
  | { readonly kind: 'fixed'; readonly value: Quantity }
  | {
      readonly kind: 'variable';
      readonly min: Quantity;
      readonly max: Quantity;
      readonly typical: Quantity;
      readonly why: LocalizedText;
    };

/* ------------------------------------------------------------------ */
/*  Sources                                                            */
/* ------------------------------------------------------------------ */

export interface SourceRef {
  readonly url: string;
  readonly label: string;
  readonly retrievedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Durations                                                          */
/* ------------------------------------------------------------------ */

export interface DurationEntry {
  readonly vehicle: VehicleId;
  /** Distinguishes several real missions using the same vehicle category. */
  readonly label?: LocalizedText;
  /** Duration in seconds. null = computed at runtime from distance. */
  readonly seconds: number | null;
  readonly approximate?: boolean;
  /** Required when the speed deserves a caveat (e.g. peak vs cruise). */
  readonly note?: LocalizedText;
  readonly source?: SourceRef;
}

/* ------------------------------------------------------------------ */
/*  Journey legs (physical waypoints, not game steps)                  */
/* ------------------------------------------------------------------ */

export interface JourneyLeg {
  readonly id: string;
  readonly label: LocalizedText;
  readonly atDistance?: Quantity;
  readonly encounter: LocalizedText;
  readonly source?: SourceRef;
}

/* ------------------------------------------------------------------ */
/*  Hazards                                                            */
/* ------------------------------------------------------------------ */

export type HazardKind =
  | 'radiation' | 'vacuum' | 'temperature' | 'gravity'
  | 'debris' | 'isolation' | 'supplies' | 'comms'
  | 'landing' | 'tidal-forces' | 'light-pollution' | 'weather';

export interface Hazard {
  readonly kind: HazardKind;
  readonly label: LocalizedText;
  readonly simple: LocalizedText;
  readonly curious: LocalizedText;
  readonly expert?: LocalizedText;
  readonly source?: SourceRef;
}

/* ------------------------------------------------------------------ */
/*  Precedents                                                         */
/* ------------------------------------------------------------------ */

export interface Precedent {
  readonly achieved: boolean;
  readonly firstMission?: string;
  readonly firstDate?: string;        // ISO 8601
  readonly latestMission?: string;
  readonly latestDate?: string;
  readonly count?: number;
  readonly note: LocalizedText;
  readonly source: SourceRef;
}

/* ------------------------------------------------------------------ */
/*  Game steps — discriminated union                                   */
/* ------------------------------------------------------------------ */

export type MissionStepTarget =
  | CelestialObjectId
  | DeepSkyObjectId
  | ConstellationAbbr
  | 'iss'
  | 'night-sky';

export type ScaleLevelId =
  | 'earth'
  | 'constellations'
  | 'solar'
  | 'milkyway'
  | 'localgroup';

interface StepBase {
  readonly id: string;
  readonly label: LocalizedText;
  readonly detail: LocalizedText;
  readonly ordered?: boolean;
}

export interface QuizDef {
  readonly prompt: LocalizedText;
  readonly options: readonly LocalizedText[];
  readonly correctIndex: number;
  readonly explain: LocalizedText;
  readonly source?: SourceRef;
}

export type MissionStepDef =
  | (StepBase & { readonly kind: 'visit'; readonly target: MissionStepTarget })
  | (StepBase & { readonly kind: 'observe'; readonly target: MissionStepTarget; readonly holdMs: number })
  | (StepBase & { readonly kind: 'compare'; readonly a: MissionStepTarget; readonly b: MissionStepTarget })
  | (StepBase & { readonly kind: 'reach-scale'; readonly level: ScaleLevelId })
  | (StepBase & { readonly kind: 'quiz'; readonly question: QuizDef })
  | (StepBase & { readonly kind: 'real-world'; readonly checklist: readonly LocalizedText[] });

/* ------------------------------------------------------------------ */
/*  Journey definition                                                 */
/* ------------------------------------------------------------------ */

export interface JourneyDef {
  readonly id: JourneyId;
  readonly number: number;            // 1..7, display order
  readonly icon: string;
  readonly title: LocalizedText;
  readonly pitch: LocalizedText;      // one sentence, max ~120 chars
  readonly difficulty: 1 | 2 | 3;
  readonly from: JourneyEndpoint;
  readonly to: JourneyEndpoint;
  readonly feasibility: JourneyFeasibility;
  readonly distance: DistanceSpec;
  readonly durations: readonly DurationEntry[];
  readonly launchWindow?: LocalizedText;
  readonly launchWindowSource?: SourceRef;
  readonly legs: readonly JourneyLeg[];
  readonly hazards: readonly Hazard[];
  readonly humanPrecedent: Precedent;
  readonly robotPrecedent: Precedent;
  /** Key pedagogical reveal or consolation, kept in data and sourced. */
  readonly highlights?: readonly {
    readonly text: LocalizedText;
    readonly source: SourceRef;
  }[];
  readonly steps: readonly MissionStepDef[];
  readonly reward: LocalizedText;
}
