import {
  COSMOS_STORE_STORAGE_KEY,
  selectIsTravelling,
  useCosmosStore,
} from './useCosmosStore';

describe('useCosmosStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useCosmosStore.getState().reset();
    useCosmosStore.persist.clearStorage();
  });

  it('expose un état initial cohérent pour la V1', () => {
    const state = useCosmosStore.getState();

    expect(state.view).toBe('landing');
    expect(state.selectedObjectId).toBe('earth');
    expect(state.overlay).toBeNull();
    expect(state.locale).toBe('fr');
    expect(state.showOrbits).toBe(true);
    expect(state.showLabels).toBe(true);
    expect(state.timeScale).toBe(1);
    expect(state.travel.phase).toBe('idle');
  });

  it('gère le cycle de voyage et marque la destination visitée', () => {
    const actions = useCosmosStore.getState();

    actions.selectObject('earth');
    actions.startTravel('saturn');
    expect(useCosmosStore.getState().travel).toMatchObject({
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
    const arrived = useCosmosStore.getState();
    expect(arrived.view).toBe('landing');
    expect(arrived.selectedObjectId).toBe('earth');
    expect(arrived.travel.phase).toBe('arrived');
    expect(arrived.mission.visitedObjectIds).toEqual([]);
    expect(selectIsTravelling(arrived)).toBe(false);
  });

  it.each(['solar', 'milkyway', 'localgroup'] as const)(
    'conserve la destination de vue %s sans polluer la mission',
    (destinationId) => {
      const actions = useCosmosStore.getState();
      actions.startTravel(destinationId);
      actions.finishTravel();

      const arrived = useCosmosStore.getState();
      expect(arrived.travel).toMatchObject({ destinationId, phase: 'arrived', progress: 1 });
      expect(arrived.mission.visitedObjectIds).toEqual([]);
      expect(arrived.selectedObjectId).toBe('earth');
    },
  );

  it('ne duplique pas un objet visité', () => {
    const { markVisited } = useCosmosStore.getState();
    markVisited('mars');
    markVisited('mars');

    expect(useCosmosStore.getState().mission.visitedObjectIds).toEqual(['mars']);
  });

  it('conserve uniquement les préférences et la progression persistantes', () => {
    const actions = useCosmosStore.getState();
    actions.setView('solar');
    actions.selectObject('jupiter');
    actions.hoverObject('mars');
    actions.openOverlay('search');
    actions.setLocale('en');
    actions.markVisited('moon');
    actions.startTravel('saturn');

    const raw = window.localStorage.getItem(COSMOS_STORE_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const persisted = JSON.parse(raw ?? '{}') as {
      state: Record<string, unknown>;
      version: number;
    };

    expect(persisted.version).toBe(2);
    expect(persisted.state).toMatchObject({
      view: 'solar',
      selectedObjectId: 'jupiter',
      locale: 'en',
      mission: { visitedObjectIds: ['moon'], visitedDeepSkyIds: [], visitedConstellationIds: [], activeMissionId: null },
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

  it('marque un objet deep-sky comme visité sans doublon', () => {
    const { markVisitedDeepSky } = useCosmosStore.getState();
    markVisitedDeepSky('orion-nebula');
    markVisitedDeepSky('orion-nebula');

    expect(useCosmosStore.getState().mission.visitedDeepSkyIds).toEqual(['orion-nebula']);
  });

  it('marque une constellation comme visitée sans doublon', () => {
    const { markVisitedConstellation } = useCosmosStore.getState();
    markVisitedConstellation('Ori');
    markVisitedConstellation('Ori');

    expect(useCosmosStore.getState().mission.visitedConstellationIds).toEqual(['Ori']);
  });

  it('change la mission active', () => {
    const { setActiveMission } = useCosmosStore.getState();
    setActiveMission('nebula-hunt');

    expect(useCosmosStore.getState().mission.activeMissionId).toBe('nebula-hunt');

    setActiveMission(null);
    expect(useCosmosStore.getState().mission.activeMissionId).toBeNull();
  });

  it('resetMission vide toutes les listes et la mission active', () => {
    const actions = useCosmosStore.getState();
    actions.markVisited('mars');
    actions.markVisitedDeepSky('sgr-a');
    actions.markVisitedConstellation('Cyg');
    actions.setActiveMission('galaxy-voyage');
    actions.resetMission();

    const { mission } = useCosmosStore.getState();
    expect(mission.visitedObjectIds).toEqual([]);
    expect(mission.visitedDeepSkyIds).toEqual([]);
    expect(mission.visitedConstellationIds).toEqual([]);
    expect(mission.activeMissionId).toBeNull();
  });

  it('migre v1 → v2 en conservant visitedObjectIds', () => {
    const v1Data = {
      state: {
        view: 'solar',
        selectedObjectId: 'mars',
        locale: 'en',
        showOrbits: true,
        showLabels: true,
        snapshotDate: null,
        mission: { visitedObjectIds: ['earth', 'moon'] },
      },
      version: 1,
    };
    window.localStorage.setItem(COSMOS_STORE_STORAGE_KEY, JSON.stringify(v1Data));

    // Force rehydration
    useCosmosStore.persist.rehydrate();

    const { mission } = useCosmosStore.getState();
    expect(mission.visitedObjectIds).toEqual(['earth', 'moon']);
    expect(mission.visitedDeepSkyIds).toEqual([]);
    expect(mission.visitedConstellationIds).toEqual([]);
    expect(mission.activeMissionId).toBeNull();
  });
});
