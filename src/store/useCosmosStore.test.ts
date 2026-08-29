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
    expect(arrived.view).toBe('planet');
    expect(arrived.selectedObjectId).toBe('saturn');
    expect(arrived.travel.phase).toBe('arrived');
    expect(arrived.mission.visitedObjectIds).toEqual(['saturn']);
    expect(selectIsTravelling(arrived)).toBe(false);
  });

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

    expect(persisted.version).toBe(1);
    expect(persisted.state).toMatchObject({
      view: 'solar',
      selectedObjectId: 'jupiter',
      locale: 'en',
      mission: { visitedObjectIds: ['moon'] },
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
});
