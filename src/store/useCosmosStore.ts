import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware';
import type { CelestialObjectId, CosmicObjectId, Locale } from '../data';

export type { CelestialObjectId, CosmicObjectId, Locale } from '../data';

export type CosmosView = 'landing' | 'earth' | 'solar' | 'planet' | 'milkyway' | 'localgroup' | 'deepsky';
export type CosmosOverlay = 'search' | 'compare' | 'credits' | null;
export type SimulationTimeScale = 0 | 1 | 10 | 100 | 1_000 | 10_000;
export type TravelPhase =
  | 'idle'
  | 'preparing'
  | 'departing'
  | 'cruising'
  | 'approaching'
  | 'arrived';

export interface MissionState {
  readonly visitedObjectIds: CelestialObjectId[];
}

export interface TravelState {
  readonly phase: TravelPhase;
  readonly originId: CosmicObjectId | null;
  readonly destinationId: CosmicObjectId | null;
  readonly progress: number;
}

export interface CosmosState {
  readonly view: CosmosView;
  readonly selectedObjectId: CosmicObjectId | null;
  readonly hoveredObjectId: CosmicObjectId | null;
  readonly overlay: CosmosOverlay;
  readonly locale: Locale;
  readonly reducedMotion: boolean;
  readonly showOrbits: boolean;
  readonly showLabels: boolean;
  readonly timeScale: SimulationTimeScale;
  readonly snapshotDate: string | null;
  readonly mission: MissionState;
  readonly travel: TravelState;
}

export interface CosmosActions {
  setView: (view: CosmosView) => void;
  selectObject: (id: CosmicObjectId | null) => void;
  hoverObject: (id: CosmicObjectId | null) => void;
  openOverlay: (overlay: NonNullable<CosmosOverlay>) => void;
  closeOverlay: () => void;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  setReducedMotion: (value: boolean) => void;
  setShowOrbits: (value: boolean) => void;
  toggleOrbits: () => void;
  setShowLabels: (value: boolean) => void;
  toggleLabels: () => void;
  setTimeScale: (value: SimulationTimeScale) => void;
  markVisited: (id: CelestialObjectId) => void;
  resetMission: () => void;
  startTravel: (
    destinationId: CosmicObjectId,
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
    overlay: null,
    locale: 'fr',
    reducedMotion: systemPrefersReducedMotion(),
    showOrbits: true,
    showLabels: true,
    timeScale: 1,
    snapshotDate: null,
    mission: { visitedObjectIds: [] },
    travel: { ...IDLE_TRAVEL },
  };
}

export const initialCosmosState: Readonly<CosmosState> = createInitialState();
export const COSMOS_STORE_STORAGE_KEY = 'cosmos-kids-v1';

type PersistedCosmosState = Pick<
  CosmosState,
  | 'view'
  | 'selectedObjectId'
  | 'locale'
  | 'reducedMotion'
  | 'showOrbits'
  | 'showLabels'
  | 'timeScale'
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

export const useCosmosStore = create<CosmosStore>()(
  persist<CosmosStore, [], [], PersistedCosmosState>(
    (set) => ({
      ...createInitialState(),

      setView: (view) => set({ view }),
      selectObject: (selectedObjectId) => set({ selectedObjectId }),
      hoverObject: (hoveredObjectId) => set({ hoveredObjectId }),
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
      setTimeScale: (timeScale) => set({ timeScale }),
      setSnapshotDate: (snapshotDate) =>
        set(snapshotDate ? { snapshotDate, timeScale: 0 } : { snapshotDate: null }),

      markVisited: (id) =>
        set((state) =>
          state.mission.visitedObjectIds.includes(id)
            ? state
            : {
                mission: {
                  visitedObjectIds: [...state.mission.visitedObjectIds, id],
                },
              },
        ),
      resetMission: () => set({ mission: { visitedObjectIds: [] } }),

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
      finishTravel: () =>
        set((state) => {
          const destinationId = state.travel.destinationId;
          if (!destinationId) return { travel: { ...IDLE_TRAVEL } };

          const visitedObjectIds = state.mission.visitedObjectIds.includes(destinationId as CelestialObjectId)
            ? state.mission.visitedObjectIds
            : [...state.mission.visitedObjectIds, destinationId as CelestialObjectId];

          return {
            view: 'planet',
            selectedObjectId: destinationId,
            hoveredObjectId: null,
            mission: { visitedObjectIds },
            travel: { ...state.travel, phase: 'arrived', progress: 1 },
          };
        }),
      cancelTravel: () => set({ travel: { ...IDLE_TRAVEL } }),
      reset: () => set(createInitialState()),
    }),
    {
      name: COSMOS_STORE_STORAGE_KEY,
      version: 1,
      storage,
      partialize: (state) => ({
        view: state.view,
        selectedObjectId: state.selectedObjectId,
        locale: state.locale,
        reducedMotion: state.reducedMotion,
        showOrbits: state.showOrbits,
        showLabels: state.showLabels,
        timeScale: state.timeScale,
        snapshotDate: state.snapshotDate,
        mission: state.mission,
      }),
    },
  ),
);

export const selectIsTravelling = (state: CosmosStore): boolean =>
  state.travel.phase !== 'idle' && state.travel.phase !== 'arrived';
