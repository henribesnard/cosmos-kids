import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware';
import type { CelestialObjectId, CosmicObjectId, DeepSkyObjectId, Locale } from '../data';
import { isCelestialObjectId, isDeepSkyObjectId } from '../data/types';
import { isConstellationAbbr, type ConstellationAbbr } from '../data/constellationTypes';
import {
  ALL_JOURNEY_IDS,
  type JourneyId,
  type MissionStepTarget,
} from '../data/journeyTypes';
import { publish } from '../domain/events';

export type { CelestialObjectId, CosmicObjectId, DeepSkyObjectId, Locale } from '../data';
export type { ConstellationAbbr } from '../data/constellationTypes';
export type { JourneyId } from '../data/journeyTypes';

export type CosmosView = 'landing' | 'earth' | 'constellations' | 'solar' | 'planet' | 'milkyway' | 'localgroup' | 'deepsky';
export type CosmosOverlay = 'search' | 'compare' | 'credits' | null;
export type SimulationTimeScale = 0 | 1 | 10 | 100 | 1_000 | 10_000;
export type TravelPhase =
  | 'idle'
  | 'preparing'
  | 'departing'
  | 'cruising'
  | 'approaching'
  | 'arrived';

export type TravelDestinationId =
  | CosmicObjectId
  | ConstellationAbbr
  | 'iss'
  | 'night-sky'
  | 'solar'
  | 'milkyway'
  | 'localgroup';

export interface MissionRun {
  readonly startedAt: number | null;
  readonly completedStepIds: readonly string[];
  readonly completedAt: number | null;
}

export interface MissionState {
  readonly visitedObjectIds: readonly CelestialObjectId[];
  readonly visitedDeepSkyIds: readonly DeepSkyObjectId[];
  readonly visitedConstellationIds: readonly ConstellationAbbr[];
  readonly visitedSpecialIds: readonly ('iss' | 'night-sky')[];
  /** Unix milliseconds for new discoveries; null means a migrated legacy visit. */
  readonly firstVisitedAt: Readonly<Partial<Record<MissionStepTarget, number | null>>>;
  readonly activeJourneyId: JourneyId | null;
  readonly runs: Readonly<Partial<Record<JourneyId, MissionRun>>>;
}

export interface TravelState {
  readonly phase: TravelPhase;
  readonly originId: CosmicObjectId | null;
  readonly destinationId: TravelDestinationId | null;
  readonly progress: number;
}

export interface CosmosState {
  readonly view: CosmosView;
  readonly selectedObjectId: CosmicObjectId | null;
  readonly hoveredObjectId: CosmicObjectId | null;
  readonly selectedConstellationId: ConstellationAbbr | null;
  readonly overlay: CosmosOverlay;
  readonly locale: Locale;
  readonly reducedMotion: boolean;
  readonly showOrbits: boolean;
  readonly showLabels: boolean;
  readonly showConstellationLines: boolean;
  readonly timeScale: SimulationTimeScale;
  readonly snapshotDate: string | null;
  readonly mission: MissionState;
  readonly travel: TravelState;
}

export interface CosmosActions {
  setView: (view: CosmosView) => void;
  selectObject: (id: CosmicObjectId | null) => void;
  hoverObject: (id: CosmicObjectId | null) => void;
  selectConstellation: (id: ConstellationAbbr | null) => void;
  openOverlay: (overlay: NonNullable<CosmosOverlay>) => void;
  closeOverlay: () => void;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  setReducedMotion: (value: boolean) => void;
  setShowOrbits: (value: boolean) => void;
  toggleOrbits: () => void;
  setShowLabels: (value: boolean) => void;
  toggleLabels: () => void;
  setShowConstellationLines: (value: boolean) => void;
  toggleConstellationLines: () => void;
  setTimeScale: (value: SimulationTimeScale) => void;
  markVisited: (id: CelestialObjectId) => void;
  markVisitedDeepSky: (id: DeepSkyObjectId) => void;
  markVisitedConstellation: (id: ConstellationAbbr) => void;
  recordDiscovery: (id: MissionStepTarget, at: number) => void;
  setActiveJourney: (id: JourneyId | null) => void;
  startJourney: (id: JourneyId) => void;
  completeStep: (journeyId: JourneyId, stepId: string) => void;
  completeJourney: (journeyId: JourneyId) => void;
  resetMission: () => void;
  startTravel: (
    destinationId: TravelDestinationId,
    originId?: CosmicObjectId | null,
  ) => void;
  setTravelPhase: (phase: TravelPhase) => void;
  setTravelProgress: (progress: number) => void;
  finishTravel: () => void;
  setSnapshotDate: (date: string | null) => void;
  cancelTravel: () => void;
  reset: () => void;
}

export type CosmosStore = CosmosState & CosmosActions;

const IDLE_TRAVEL: TravelState = {
  phase: 'idle',
  originId: null,
  destinationId: null,
  progress: 0,
};

function systemPrefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function createInitialState(): CosmosState {
  return {
    view: 'landing',
    selectedObjectId: 'earth',
    hoveredObjectId: null,
    selectedConstellationId: null,
    overlay: null,
    locale: 'fr',
    reducedMotion: systemPrefersReducedMotion(),
    showOrbits: true,
    showLabels: true,
    showConstellationLines: true,
    timeScale: 1,
    snapshotDate: null,
    mission: {
      visitedObjectIds: [],
      visitedDeepSkyIds: [],
      visitedConstellationIds: [],
      visitedSpecialIds: [],
      firstVisitedAt: {},
      activeJourneyId: null,
      runs: {},
    },
    travel: { ...IDLE_TRAVEL },
  };
}

export const initialCosmosState: Readonly<CosmosState> = createInitialState();
export const COSMOS_STORE_STORAGE_KEY = 'cosmos-kids-v1';

const OLD_MISSION_TO_JOURNEY: Readonly<Record<string, JourneyId | null>> = {
  'solar-neighbourhood': 'earth-to-moon',
  'grand-tour': 'earth-to-outer-planets',
  'constellation-quest': 'constellations-from-earth',
  'nebula-hunt': null,
  'galaxy-voyage': 'milkyway-to-andromeda',
};

type PersistedCosmosState = Pick<
  CosmosState,
  | 'view'
  | 'selectedObjectId'
  | 'locale'
  | 'showOrbits'
  | 'showLabels'
  | 'snapshotDate'
  | 'mission'
>;

const fallbackStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

const storage = createJSONStorage<PersistedCosmosState>(() =>
  typeof window === 'undefined' ? fallbackStorage : window.localStorage,
);

const clampProgress = (value: number): number =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isJourneyId = (value: unknown): value is JourneyId =>
  typeof value === 'string' && (ALL_JOURNEY_IDS as readonly string[]).includes(value);

const isSpecialDiscoveryId = (value: string): value is 'iss' | 'night-sky' =>
  value === 'iss' || value === 'night-sky';

const isMissionStepTarget = (value: string): value is MissionStepTarget =>
  isCelestialObjectId(value) ||
  isDeepSkyObjectId(value) ||
  isConstellationAbbr(value) ||
  isSpecialDiscoveryId(value);

function safeIdArray<T extends string>(
  value: unknown,
  predicate: (candidate: string) => candidate is T,
): T[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is T => typeof item === 'string' && predicate(item)))];
}

function safeRuns(value: unknown): Partial<Record<JourneyId, MissionRun>> {
  if (!isRecord(value)) return {};
  const result: Partial<Record<JourneyId, MissionRun>> = {};
  for (const id of ALL_JOURNEY_IDS) {
    const raw = value[id];
    if (!isRecord(raw)) continue;
    const startedAt = typeof raw.startedAt === 'number' && Number.isFinite(raw.startedAt)
      ? raw.startedAt
      : null;
    if (startedAt === null) continue;
    const completedStepIds = Array.isArray(raw.completedStepIds)
      ? [...new Set(raw.completedStepIds.filter((step): step is string => typeof step === 'string'))]
      : [];
    const completedAt = typeof raw.completedAt === 'number' && Number.isFinite(raw.completedAt)
      ? raw.completedAt
      : null;
    result[id] = { startedAt, completedStepIds, completedAt };
  }
  return result;
}

function safeFirstVisitedAt(value: unknown): Partial<Record<MissionStepTarget, number | null>> {
  if (!isRecord(value)) return {};
  const result: Partial<Record<MissionStepTarget, number | null>> = {};
  for (const [id, rawDate] of Object.entries(value)) {
    if (!isMissionStepTarget(id)) continue;
    result[id] = typeof rawDate === 'number' && Number.isFinite(rawDate) ? rawDate : null;
  }
  return result;
}

/** Defensive v1/v2 → v3 migration, exported so corrupted shapes are testable. */
export function migratePersistedState(persisted: unknown, version: number): PersistedCosmosState {
  const initial = createInitialState();
  if (!isRecord(persisted)) {
    return {
      view: initial.view,
      selectedObjectId: initial.selectedObjectId,
      locale: initial.locale,
      showOrbits: initial.showOrbits,
      showLabels: initial.showLabels,
      snapshotDate: initial.snapshotDate,
      mission: initial.mission,
    };
  }

  const rawMission = isRecord(persisted.mission) ? persisted.mission : {};
  const visitedObjectIds = safeIdArray(rawMission.visitedObjectIds, isCelestialObjectId);
  const visitedDeepSkyIds = safeIdArray(rawMission.visitedDeepSkyIds, isDeepSkyObjectId);
  const visitedConstellationIds = safeIdArray(rawMission.visitedConstellationIds, isConstellationAbbr);
  const visitedSpecialIds = safeIdArray(rawMission.visitedSpecialIds, isSpecialDiscoveryId);
  const allLegacyVisits: MissionStepTarget[] = [
    ...visitedObjectIds,
    ...visitedDeepSkyIds,
    ...visitedConstellationIds,
    ...visitedSpecialIds,
  ];

  let activeJourneyId: JourneyId | null;
  let runs: Partial<Record<JourneyId, MissionRun>>;
  let firstVisitedAt: Partial<Record<MissionStepTarget, number | null>>;

  if (version < 3) {
    const oldId = typeof rawMission.activeMissionId === 'string' ? rawMission.activeMissionId : '';
    activeJourneyId = OLD_MISSION_TO_JOURNEY[oldId] ?? null;
    // Deliberately do not infer journey progress from legacy global visits.
    runs = {};
    firstVisitedAt = Object.fromEntries(allLegacyVisits.map((id) => [id, null]));
  } else {
    activeJourneyId = isJourneyId(rawMission.activeJourneyId) ? rawMission.activeJourneyId : null;
    runs = safeRuns(rawMission.runs);
    firstVisitedAt = safeFirstVisitedAt(rawMission.firstVisitedAt);
    for (const id of allLegacyVisits) {
      if (!(id in firstVisitedAt)) firstVisitedAt[id] = null;
    }
  }

  const candidateView = persisted.view;
  const view = typeof candidateView === 'string' && [
    'landing', 'earth', 'constellations', 'solar', 'planet', 'milkyway', 'localgroup', 'deepsky',
  ].includes(candidateView)
    ? candidateView as CosmosView
    : initial.view;
  const selectedObjectId = typeof persisted.selectedObjectId === 'string' &&
    (isCelestialObjectId(persisted.selectedObjectId) || isDeepSkyObjectId(persisted.selectedObjectId))
    ? persisted.selectedObjectId
    : null;

  return {
    view,
    selectedObjectId,
    locale: persisted.locale === 'en' ? 'en' : 'fr',
    showOrbits: typeof persisted.showOrbits === 'boolean' ? persisted.showOrbits : initial.showOrbits,
    showLabels: typeof persisted.showLabels === 'boolean' ? persisted.showLabels : initial.showLabels,
    snapshotDate: typeof persisted.snapshotDate === 'string' ? persisted.snapshotDate : null,
    mission: {
      visitedObjectIds,
      visitedDeepSkyIds,
      visitedConstellationIds,
      visitedSpecialIds,
      firstVisitedAt,
      activeJourneyId,
      runs,
    },
  };
}

export const useCosmosStore = create<CosmosStore>()(
  persist<CosmosStore, [], [], PersistedCosmosState>(
    (set, get) => ({
      ...createInitialState(),

      setView: (view) => set({ view }),
      selectObject: (selectedObjectId) => set({ selectedObjectId }),
      hoverObject: (hoveredObjectId) => set({ hoveredObjectId }),
      selectConstellation: (selectedConstellationId) => set({ selectedConstellationId }),
      openOverlay: (overlay) => set({ overlay }),
      closeOverlay: () => set({ overlay: null }),
      setLocale: (locale) => set({ locale }),
      toggleLocale: () =>
        set((state) => ({ locale: state.locale === 'fr' ? 'en' : 'fr' })),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      setShowOrbits: (showOrbits) => set({ showOrbits }),
      toggleOrbits: () => set((state) => ({ showOrbits: !state.showOrbits })),
      setShowLabels: (showLabels) => set({ showLabels }),
      toggleLabels: () => set((state) => ({ showLabels: !state.showLabels })),
      setShowConstellationLines: (showConstellationLines) => set({ showConstellationLines }),
      toggleConstellationLines: () => set((state) => ({ showConstellationLines: !state.showConstellationLines })),
      setTimeScale: (timeScale) => set({ timeScale }),
      setSnapshotDate: (snapshotDate) =>
        set(snapshotDate ? { snapshotDate, timeScale: 0 } : { snapshotDate: null, timeScale: 1 }),

      markVisited: (id) => get().recordDiscovery(id, Date.now()),
      markVisitedDeepSky: (id) => get().recordDiscovery(id, Date.now()),
      markVisitedConstellation: (id) => get().recordDiscovery(id, Date.now()),
      recordDiscovery: (id, at) =>
        set((state) => {
          const mission = state.mission;
          const timestamp = Number.isFinite(at) ? at : Date.now();
          const firstVisitedAt = id in mission.firstVisitedAt
            ? mission.firstVisitedAt
            : { ...mission.firstVisitedAt, [id]: timestamp };

          if (isCelestialObjectId(id)) {
            return {
              mission: {
                ...mission,
                firstVisitedAt,
                visitedObjectIds: mission.visitedObjectIds.includes(id)
                  ? mission.visitedObjectIds
                  : [...mission.visitedObjectIds, id],
              },
            };
          }
          if (isDeepSkyObjectId(id)) {
            return {
              mission: {
                ...mission,
                firstVisitedAt,
                visitedDeepSkyIds: mission.visitedDeepSkyIds.includes(id)
                  ? mission.visitedDeepSkyIds
                  : [...mission.visitedDeepSkyIds, id],
              },
            };
          }
          if (isConstellationAbbr(id)) {
            return {
              mission: {
                ...mission,
                firstVisitedAt,
                visitedConstellationIds: mission.visitedConstellationIds.includes(id)
                  ? mission.visitedConstellationIds
                  : [...mission.visitedConstellationIds, id],
              },
            };
          }
          return {
            mission: {
              ...mission,
              firstVisitedAt,
              visitedSpecialIds: mission.visitedSpecialIds.includes(id)
                ? mission.visitedSpecialIds
                : [...mission.visitedSpecialIds, id],
            },
          };
        }),
      setActiveJourney: (id) =>
        set((state) => ({
          mission: { ...state.mission, activeJourneyId: id },
        })),
      startJourney: (id) => {
        const isFirstStart = get().mission.runs[id]?.startedAt == null;
        set((state) => ({
          mission: {
            ...state.mission,
            activeJourneyId: id,
            runs: {
              ...state.mission.runs,
              [id]: state.mission.runs[id]?.startedAt != null
                ? state.mission.runs[id]!
                : { startedAt: Date.now(), completedStepIds: [], completedAt: null },
            },
          },
        }));
        if (isFirstStart) publish({ type: 'JOURNEY_STARTED', id });
      },
      completeStep: (journeyId, stepId) =>
        set((state) => {
          const run = state.mission.runs[journeyId];
          if (!run || run.completedStepIds.includes(stepId)) return state;
          return {
            mission: {
              ...state.mission,
              runs: {
                ...state.mission.runs,
                [journeyId]: {
                  ...run,
                  completedStepIds: [...run.completedStepIds, stepId],
                },
              },
            },
          };
        }),
      completeJourney: (journeyId) =>
        set((state) => {
          const run = state.mission.runs[journeyId];
          if (!run || run.completedAt != null) return state;
          return {
            mission: {
              ...state.mission,
              runs: {
                ...state.mission.runs,
                [journeyId]: { ...run, completedAt: Date.now() },
              },
            },
          };
        }),
      resetMission: () =>
        set({
          mission: {
            visitedObjectIds: [],
            visitedDeepSkyIds: [],
            visitedConstellationIds: [],
            visitedSpecialIds: [],
            firstVisitedAt: {},
            activeJourneyId: null,
            runs: {},
          },
        }),

      startTravel: (destinationId, originId) =>
        set((state) => ({
          overlay: null,
          hoveredObjectId: null,
          travel: {
            phase: 'preparing',
            originId: originId === undefined ? state.selectedObjectId : originId,
            destinationId,
            progress: 0,
          },
        })),
      setTravelPhase: (phase) =>
        set((state) => ({
          travel:
            phase === 'idle'
              ? { ...IDLE_TRAVEL }
              : {
                  ...state.travel,
                  phase,
                  progress: phase === 'arrived' ? 1 : state.travel.progress,
                },
        })),
      setTravelProgress: (progress) =>
        set((state) => ({
          travel: { ...state.travel, progress: clampProgress(progress) },
        })),
      finishTravel: () => {
        const destinationId = get().travel.destinationId;
        set((state) => {
          if (!state.travel.destinationId) return { travel: { ...IDLE_TRAVEL } };
          return {
            hoveredObjectId: null,
            travel: { ...state.travel, phase: 'arrived', progress: 1 },
          };
        });
        if (destinationId && isMissionStepTarget(destinationId)) {
          publish({ type: 'OBJECT_VISITED', id: destinationId, at: Date.now() });
        }
      },
      cancelTravel: () => set({ travel: { ...IDLE_TRAVEL } }),
      reset: () => set(createInitialState()),
    }),
    {
      name: COSMOS_STORE_STORAGE_KEY,
      version: 3,
      storage,
      partialize: (state) => ({
        view: state.view,
        selectedObjectId: state.selectedObjectId,
        locale: state.locale,
        showOrbits: state.showOrbits,
        showLabels: state.showLabels,
        snapshotDate: state.snapshotDate,
        mission: state.mission,
      }),
      migrate: migratePersistedState,
      merge: (persisted, current) => ({
        ...current,
        ...migratePersistedState(persisted, 3),
      }),
    },
  ),
);

export const selectIsTravelling = (state: CosmosStore): boolean =>
  state.travel.phase !== 'idle' && state.travel.phase !== 'arrived';
