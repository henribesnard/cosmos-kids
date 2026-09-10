import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { subscribe, type CosmosEvent } from '../domain/events';
import { startMissionEngine, stopMissionEngine } from '../domain/missionEngine';
import {
  COSMOS_STORE_STORAGE_KEY,
  migratePersistedState,
  selectIsTravelling,
  useCosmosStore,
} from './useCosmosStore';

describe('useCosmosStore', () => {
  beforeEach(() => {
    stopMissionEngine();
    window.localStorage.clear();
    useCosmosStore.getState().reset();
    useCosmosStore.persist.clearStorage();
  });

  afterEach(() => {
    stopMissionEngine();
    vi.restoreAllMocks();
  });

  it('expose un état initial cohérent pour la v3', () => {
    const state = useCosmosStore.getState();

    expect(state).toMatchObject({
      view: 'landing',
      selectedObjectId: 'earth',
      overlay: null,
      locale: 'fr',
      showOrbits: true,
      showLabels: true,
      timeScale: 1,
      travel: { phase: 'idle' },
      mission: {
        visitedObjectIds: [],
        visitedDeepSkyIds: [],
        visitedConstellationIds: [],
        visitedSpecialIds: [],
        firstVisitedAt: {},
        activeJourneyId: null,
        runs: {},
      },
    });
  });

  it('gère le cycle de voyage et borne sa progression', () => {
    const actions = useCosmosStore.getState();

    actions.selectObject('earth');
    actions.startTravel('saturn');
    expect(useCosmosStore.getState().travel).toEqual({
      phase: 'preparing',
      originId: 'earth',
      destinationId: 'saturn',
      progress: 0,
    });
    expect(selectIsTravelling(useCosmosStore.getState())).toBe(true);

    actions.setTravelPhase('cruising');
    actions.setTravelProgress(4);
    expect(useCosmosStore.getState().travel.progress).toBe(1);

    actions.finishTravel();
    expect(useCosmosStore.getState().travel).toMatchObject({
      phase: 'arrived',
      destinationId: 'saturn',
      progress: 1,
    });
    expect(selectIsTravelling(useCosmosStore.getState())).toBe(false);
  });

  it('finishTravel publie OBJECT_VISITED et ne duplique pas le carnet', () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValueOnce(1_000).mockReturnValueOnce(2_000);
    const visitedEvents: CosmosEvent[] = [];
    startMissionEngine();
    const unsubscribe = subscribe((event) => {
      if (event.type === 'OBJECT_VISITED') visitedEvents.push(event);
    });

    useCosmosStore.getState().startTravel('saturn');
    useCosmosStore.getState().finishTravel();
    const firstVisitedAt = useCosmosStore.getState().mission.firstVisitedAt.saturn;

    useCosmosStore.getState().cancelTravel();
    useCosmosStore.getState().startTravel('saturn');
    useCosmosStore.getState().finishTravel();

    expect(visitedEvents).toEqual([
      { type: 'OBJECT_VISITED', id: 'saturn', at: 1_000 },
      { type: 'OBJECT_VISITED', id: 'saturn', at: 2_000 },
    ]);
    expect(useCosmosStore.getState().mission.visitedObjectIds).toEqual(['saturn']);
    expect(firstVisitedAt).toBe(1_000);
    expect(useCosmosStore.getState().mission.firstVisitedAt.saturn).toBe(1_000);
    unsubscribe();
  });

  it.each(['solar', 'milkyway', 'localgroup'] as const)(
    'conserve la destination de vue %s sans l’ajouter au carnet',
    (destinationId) => {
      const actions = useCosmosStore.getState();
      actions.startTravel(destinationId);
      actions.finishTravel();

      const arrived = useCosmosStore.getState();
      expect(arrived.travel).toMatchObject({ destinationId, phase: 'arrived', progress: 1 });
      expect(arrived.mission.visitedObjectIds).toEqual([]);
      expect(arrived.mission.visitedSpecialIds).toEqual([]);
    },
  );

  it('recordDiscovery conserve une seule entrée et la date de première visite', () => {
    const { recordDiscovery } = useCosmosStore.getState();

    recordDiscovery('mars', 100);
    recordDiscovery('mars', 200);
    recordDiscovery('orion-nebula', 300);
    recordDiscovery('Ori', 400);
    recordDiscovery('iss', 500);

    expect(useCosmosStore.getState().mission).toMatchObject({
      visitedObjectIds: ['mars'],
      visitedDeepSkyIds: ['orion-nebula'],
      visitedConstellationIds: ['Ori'],
      visitedSpecialIds: ['iss'],
      firstVisitedAt: {
        mars: 100,
        'orion-nebula': 300,
        Ori: 400,
        iss: 500,
      },
    });
  });

  it('partialize persiste les runs et le trajet actif, mais aucun état éphémère', () => {
    vi.spyOn(Date, 'now').mockReturnValue(42_000);
    const actions = useCosmosStore.getState();

    actions.setView('solar');
    actions.selectObject('jupiter');
    actions.setLocale('en');
    actions.recordDiscovery('moon', 12_345);
    actions.startJourney('earth-to-moon');
    actions.completeStep('earth-to-moon', 'moon-visit-earth');
    actions.startTravel('saturn');
    actions.hoverObject('mars');
    actions.openOverlay('search');

    const raw = window.localStorage.getItem(COSMOS_STORE_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const persisted = JSON.parse(raw ?? '{}') as {
      state: Record<string, unknown> & {
        mission?: {
          activeJourneyId?: unknown;
          runs?: Record<string, unknown>;
          firstVisitedAt?: Record<string, unknown>;
        };
      };
      version: number;
    };

    expect(persisted.version).toBe(3);
    expect(persisted.state).toMatchObject({
      view: 'solar',
      selectedObjectId: 'jupiter',
      locale: 'en',
      mission: {
        activeJourneyId: 'earth-to-moon',
        firstVisitedAt: { moon: 12_345 },
        runs: {
          'earth-to-moon': {
            startedAt: 42_000,
            completedStepIds: ['moon-visit-earth'],
            completedAt: null,
          },
        },
      },
    });
    expect(persisted.state).not.toHaveProperty('hoveredObjectId');
    expect(persisted.state).not.toHaveProperty('overlay');
    expect(persisted.state).not.toHaveProperty('travel');
  });

  it('annule un voyage et restaure son état éphémère', () => {
    const actions = useCosmosStore.getState();
    actions.startTravel('mars', 'earth');
    actions.cancelTravel();

    expect(useCosmosStore.getState().travel).toEqual({
      phase: 'idle',
      originId: null,
      destinationId: null,
      progress: 0,
    });
  });

  it('startJourney initialise un run sans réinitialiser un run existant', () => {
    vi.spyOn(Date, 'now').mockReturnValue(10_000);
    const { startJourney, completeStep } = useCosmosStore.getState();

    startJourney('earth-to-iss');
    completeStep('earth-to-iss', 'iss-visit-earth');
    startJourney('earth-to-iss');

    expect(useCosmosStore.getState().mission).toMatchObject({
      activeJourneyId: 'earth-to-iss',
      runs: {
        'earth-to-iss': {
          startedAt: 10_000,
          completedStepIds: ['iss-visit-earth'],
          completedAt: null,
        },
      },
    });
  });

  it('migre v1 → v3 en conservant les trois listes et en remappant la mission', () => {
    const migrated = migratePersistedState({
      view: 'solar',
      selectedObjectId: 'mars',
      locale: 'en',
      showOrbits: true,
      showLabels: false,
      snapshotDate: null,
      mission: {
        visitedObjectIds: ['earth', 'moon'],
        visitedDeepSkyIds: ['orion-nebula'],
        visitedConstellationIds: ['Ori'],
        activeMissionId: 'solar-neighbourhood',
        runs: { 'earth-to-moon': { startedAt: 1, completedStepIds: ['legacy'], completedAt: 2 } },
      },
    }, 1);

    expect(migrated.mission).toMatchObject({
      visitedObjectIds: ['earth', 'moon'],
      visitedDeepSkyIds: ['orion-nebula'],
      visitedConstellationIds: ['Ori'],
      activeJourneyId: 'earth-to-moon',
      runs: {},
      firstVisitedAt: {
        earth: null,
        moon: null,
        'orion-nebula': null,
        Ori: null,
      },
    });
  });

  it('migre v2 → v3 sans reconstruire rétroactivement les runs', () => {
    const migrated = migratePersistedState({
      view: 'milkyway',
      selectedObjectId: 'sgr-a',
      locale: 'fr',
      showOrbits: false,
      showLabels: true,
      snapshotDate: '2026-08-28',
      mission: {
        visitedObjectIds: ['mars'],
        visitedDeepSkyIds: ['sgr-a'],
        visitedConstellationIds: ['Cyg'],
        activeMissionId: 'galaxy-voyage',
        runs: { 'milkyway-to-andromeda': { startedAt: 1, completedStepIds: ['legacy'], completedAt: null } },
      },
    }, 2);

    expect(migrated.mission).toMatchObject({
      visitedObjectIds: ['mars'],
      visitedDeepSkyIds: ['sgr-a'],
      visitedConstellationIds: ['Cyg'],
      activeJourneyId: 'milkyway-to-andromeda',
      runs: {},
      firstVisitedAt: { mars: null, 'sgr-a': null, Cyg: null },
    });
  });

  it('résiste à une forme persistée corrompue et retombe sur l’état initial', () => {
    expect(() => migratePersistedState(null, 2)).not.toThrow();

    const migrated = migratePersistedState(null, 2);
    expect(migrated).toMatchObject({
      view: 'landing',
      selectedObjectId: 'earth',
      locale: 'fr',
      mission: {
        visitedObjectIds: [],
        visitedDeepSkyIds: [],
        visitedConstellationIds: [],
        visitedSpecialIds: [],
        firstVisitedAt: {},
        activeJourneyId: null,
        runs: {},
      },
    });

    expect(() => migratePersistedState({ mission: 'cassée' }, 2)).not.toThrow();
    expect(migratePersistedState({ mission: 'cassée' }, 2).mission).toMatchObject({
      visitedObjectIds: [],
      visitedDeepSkyIds: [],
      visitedConstellationIds: [],
      activeJourneyId: null,
      runs: {},
    });
  });

  it('reset restaure entièrement l’état initial', () => {
    const actions = useCosmosStore.getState();
    actions.setView('solar');
    actions.selectObject('mars');
    actions.openOverlay('compare');
    actions.recordDiscovery('mars', 100);
    actions.startJourney('earth-to-mars');
    actions.startTravel('jupiter');

    actions.reset();

    expect(useCosmosStore.getState()).toMatchObject({
      view: 'landing',
      selectedObjectId: 'earth',
      overlay: null,
      mission: {
        visitedObjectIds: [],
        visitedDeepSkyIds: [],
        visitedConstellationIds: [],
        visitedSpecialIds: [],
        firstVisitedAt: {},
        activeJourneyId: null,
        runs: {},
      },
      travel: {
        phase: 'idle',
        originId: null,
        destinationId: null,
        progress: 0,
      },
    });
  });
});
