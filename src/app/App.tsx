import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  SOLAR_SYSTEM_BODIES,
  DEEP_SKY_OBJECTS,
  DEEP_SKY_BY_ID,
  isCelestialObjectId,
  isDeepSkyObjectId,
  isCosmicObjectId,
  type CelestialBody,
  type CelestialObjectId,
  type CosmicObjectId,
  type DeepSkyObjectId,
  type Locale,
} from '../data';
import {
  useCosmosStore,
  type CosmosView,
  type SimulationTimeScale,
  type TravelPhase,
} from '../store';
import { computePhasesAtDate } from '../scene/sceneCatalog';
import { AccessibleObjectList } from '../components/AccessibleObjectList';
import { CompareDialog } from '../components/CompareDialog';
import { CreditsDialog } from '../components/CreditsDialog';
import { Header } from '../components/Header';
import { InfoPanel } from '../components/InfoPanel';
import { LandingHero } from '../components/LandingHero';
import { MissionPanel } from '../components/MissionPanel';
import { ScaleNavigator } from '../components/ScaleNavigator';
import { SceneControls } from '../components/SceneControls';
import { SearchDialog } from '../components/SearchDialog';
import { TravelOverlay } from '../components/TravelOverlay';
import type { ObjectDisplay } from './uiTypes';

const objectSymbols: Record<CelestialObjectId, string> = {
  sun: '☉',
  mercury: '☿',
  venus: '♀',
  earth: '⊕',
  moon: '☾',
  mars: '♂',
  jupiter: '♃',
  saturn: '♄',
  uranus: '⛢',
  neptune: '♆',
};

const UniverseViewport = lazy(async () => {
  const module = await import('../scene/UniverseViewport');
  return { default: module.UniverseViewport };
});

const taglines: Record<CelestialObjectId, { fr: string; en: string }> = {
  sun: { fr: 'L\u2019étoile au cœur de notre système', en: 'The star at the heart of our system' },
  mercury: { fr: 'La petite planète la plus rapide', en: 'The fast little planet' },
  venus: { fr: 'Un monde caché sous les nuages', en: 'A world hidden beneath clouds' },
  earth: { fr: 'Notre monde bleu et vivant', en: 'Our living blue world' },
  moon: { fr: 'Notre voisine dans la nuit', en: 'Our neighbour in the night' },
  mars: { fr: 'Le désert rouge et glacé', en: 'The frozen red desert' },
  jupiter: { fr: 'La géante aux tempêtes immenses', en: 'The giant with enormous storms' },
  saturn: { fr: 'La planète aux milliers d\u2019anneaux', en: 'The world with thousands of rings' },
  uranus: { fr: 'La géante qui tourne couchée', en: 'The giant that spins sideways' },
  neptune: { fr: 'Le monde des vents extrêmes', en: 'The world of extreme winds' },
};

const kindNames: Record<CelestialBody['kind'], { fr: string; en: string }> = {
  star: { fr: 'Étoile', en: 'Star' },
  planet: { fr: 'Planète', en: 'Planet' },
  moon: { fr: 'Satellite naturel', en: 'Natural satellite' },
};

const deepSkyKindNames: Record<string, { fr: string; en: string }> = {
  'black-hole': { fr: 'Trou noir', en: 'Black hole' },
  nebula: { fr: 'Nébuleuse', en: 'Nebula' },
  galaxy: { fr: 'Galaxie', en: 'Galaxy' },
  'globular-cluster': { fr: 'Amas globulaire', en: 'Globular cluster' },
  'open-cluster': { fr: 'Amas ouvert', en: 'Open cluster' },
};

function formatNumber(value: number, locale: Locale, decimals = 0) {
  return new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
    maximumFractionDigits: decimals,
  }).format(value);
}

const integerFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

function buildDisplayObject(body: CelestialBody): ObjectDisplay {
  const radius = body.science.meanRadius.value;
  const gravity = body.science.surfaceGravity.value;
  const rotation = Math.abs(body.science.siderealRotation.value);
  const temperature = body.science.meanTemperature?.value;
  const orbit = body.science.orbit?.semiMajorAxis.value;
  const period = body.science.orbit?.siderealPeriod.value;
  const expertFr = [
    `Rayon moyen : ${integerFormatter.format(radius)} km.`,
    `Rotation sidérale : ${decimalFormatter.format(rotation)} h${body.science.rotationDirection === 'retrograde' ? ' (rétrograde)' : ''}.`,
    orbit ? `Demi-grand axe : ${integerFormatter.format(orbit)} km.` : null,
    period ? `Période orbitale : ${decimalFormatter.format(period)} jours.` : null,
  ].filter(Boolean).join(' ');
  const expertEn = [
    `Mean radius: ${formatNumber(radius, 'en')} km.`,
    `Sidereal rotation: ${formatNumber(rotation, 'en', 2)} h${body.science.rotationDirection === 'retrograde' ? ' (retrograde)' : ''}.`,
    orbit ? `Semi-major axis: ${formatNumber(orbit, 'en')} km.` : null,
    period ? `Orbital period: ${formatNumber(period, 'en', 2)} days.` : null,
  ].filter(Boolean).join(' ');

  return {
    id: body.id,
    name: body.name,
    kind: kindNames[body.kind],
    tagline: taglines[body.id],
    description: body.shortDescription,
    curious: {
      fr: `${body.funFact.fr} ${body.render.texture.caveat.fr}`,
      en: `${body.funFact.en} ${body.render.texture.caveat.en}`,
    },
    expert: { fr: expertFr, en: expertEn },
    color: body.render.baseColor,
    symbol: objectSymbols[body.id],
    sourceUrl: body.science.meanRadius.sourceUrl,
    sourceLabel: body.science.meanRadius.attribution,
    facts: [
      {
        label: { fr: 'Rayon moyen', en: 'Mean radius' },
        value: { fr: `${formatNumber(radius, 'fr')} km`, en: `${formatNumber(radius, 'en')} km` },
      },
      {
        label: { fr: 'Gravité', en: 'Gravity' },
        value: { fr: `${formatNumber(gravity, 'fr', 2)} m/s²`, en: `${formatNumber(gravity, 'en', 2)} m/s²` },
      },
      {
        label: { fr: 'Durée du jour', en: 'Day length' },
        value: rotation >= 48
          ? { fr: `${formatNumber(rotation / 24, 'fr', 1)} jours`, en: `${formatNumber(rotation / 24, 'en', 1)} days` }
          : { fr: `${formatNumber(rotation, 'fr', 1)} h`, en: `${formatNumber(rotation, 'en', 1)} h` },
      },
      {
        label: { fr: 'Température moy.', en: 'Mean temperature' },
        value: temperature === undefined
          ? { fr: '—', en: '—' }
          : { fr: `${formatNumber(temperature, 'fr')} °C`, en: `${formatNumber(temperature, 'en')} °C` },
      },
    ],
  };
}

function buildDeepSkyDisplay(obj: import('../data').DeepSkyObject): ObjectDisplay {
  const kindName = deepSkyKindNames[obj.kind] ?? { fr: obj.kind, en: obj.kind };
  return {
    id: obj.id,
    name: obj.name,
    kind: kindName,
    tagline: obj.shortDescription,
    description: obj.shortDescription,
    curious: obj.funFact,
    expert: {
      fr: obj.facts.map((f) => `${f.label.fr} : ${f.value.fr}.`).join(' '),
      en: obj.facts.map((f) => `${f.label.en}: ${f.value.en}.`).join(' '),
    },
    color: obj.color,
    symbol: obj.symbol,
    sourceUrl: obj.sourceUrl,
    sourceLabel: obj.sourceLabel,
    facts: obj.facts.map((f) => ({ label: f.label, value: f.value })),
  };
}

const SOLAR_DISPLAY_OBJECTS = SOLAR_SYSTEM_BODIES.map(buildDisplayObject);
const DEEP_SKY_DISPLAY_OBJECTS = DEEP_SKY_OBJECTS.map(buildDeepSkyDisplay);
const ALL_DISPLAY_OBJECTS = [...SOLAR_DISPLAY_OBJECTS, ...DEEP_SKY_DISPLAY_OBJECTS];

const DISPLAY_BY_ID = Object.fromEntries(ALL_DISPLAY_OBJECTS.map((object) => [object.id, object])) as Record<string, ObjectDisplay>;
const MISSION_IDS = ['earth', 'moon', 'mars', 'saturn'] as const;

/* ------------------------------------------------------------------ */
/*  Route helpers                                                     */
/* ------------------------------------------------------------------ */

function routeForDestination(id: CosmicObjectId | 'solar' | 'milkyway' | 'localgroup') {
  if (id === 'solar') return '/explore/solar-system';
  if (id === 'milkyway') return '/explore/milky-way';
  if (id === 'localgroup') return '/explore/local-group';
  if (id === 'earth') return '/explore/earth';
  if (isCelestialObjectId(id)) return `/explore/solar-system/${id}`;
  if (isDeepSkyObjectId(id)) return `/explore/deep-sky/${id}`;
  return '/explore/solar-system';
}

type RouteResult = { view: CosmosView; selected: CosmicObjectId | null; overlayCredits: boolean };

function routeState(pathname: string): RouteResult | null {
  if (pathname === '/') return { view: 'landing', selected: 'earth', overlayCredits: false };
  if (pathname === '/explore/earth') return { view: 'earth', selected: 'earth', overlayCredits: false };
  if (pathname === '/explore/solar-system') return { view: 'solar', selected: null, overlayCredits: false };
  if (pathname === '/explore/milky-way') return { view: 'milkyway', selected: null, overlayCredits: false };
  if (pathname === '/explore/local-group') return { view: 'localgroup', selected: null, overlayCredits: false };
  if (pathname === '/credits') return { view: 'solar', selected: 'earth', overlayCredits: true };

  // Solar system body detail
  const solarMatch = pathname.match(/^\/explore\/solar-system\/([^/]+)\/?$/);
  if (solarMatch?.[1] && isCelestialObjectId(solarMatch[1])) {
    return { view: 'planet', selected: solarMatch[1], overlayCredits: false };
  }

  // Deep-sky object detail
  const deepSkyMatch = pathname.match(/^\/explore\/deep-sky\/([^/]+)\/?$/);
  if (deepSkyMatch?.[1] && isDeepSkyObjectId(deepSkyMatch[1])) {
    return { view: 'deepsky', selected: deepSkyMatch[1], overlayCredits: false };
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  View → scene view mapping                                        */
/* ------------------------------------------------------------------ */

function toSceneView(view: CosmosView): import('../scene/sceneCatalog').UniverseView {
  switch (view) {
    case 'landing':
    case 'earth':
      return 'earth';
    case 'solar':
      return 'solar';
    case 'planet':
      return 'planet';
    case 'milkyway':
      return 'milkyway';
    case 'localgroup':
      return 'localgroup';
    case 'deepsky':
      return 'deepsky';
    default:
      return 'earth';
  }
}

/* ------------------------------------------------------------------ */
/*  App component                                                     */
/* ------------------------------------------------------------------ */

export function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [missionOpen, setMissionOpen] = useState(false);
  const returnPathRef = useRef('/explore/solar-system');
  const travelTargetRef = useRef<CosmicObjectId | 'solar' | 'milkyway' | 'localgroup'>('earth');
  const travelFrameRef = useRef<number | null>(null);
  const travelEndTimerRef = useRef<number | null>(null);

  const view = useCosmosStore((state) => state.view);
  const selectedObjectId = useCosmosStore((state) => state.selectedObjectId);
  const hoveredObjectId = useCosmosStore((state) => state.hoveredObjectId);
  const overlay = useCosmosStore((state) => state.overlay);
  const locale = useCosmosStore((state) => state.locale);
  const reducedMotion = useCosmosStore((state) => state.reducedMotion);
  const showOrbits = useCosmosStore((state) => state.showOrbits);
  const showLabels = useCosmosStore((state) => state.showLabels);
  const timeScale = useCosmosStore((state) => state.timeScale);
  const snapshotDate = useCosmosStore((state) => state.snapshotDate);
  const visitedObjectIds = useCosmosStore((state) => state.mission.visitedObjectIds);
  const travel = useCosmosStore((state) => state.travel);

  const phaseOverrides = useMemo(() => {
    if (!snapshotDate) return null;
    const target = new Date(snapshotDate);
    if (Number.isNaN(target.getTime())) return null;
    return computePhasesAtDate(target);
  }, [snapshotDate]);

  useEffect(() => {
    const next = routeState(location.pathname);
    if (!next) {
      navigate('/', { replace: true });
      return;
    }
    const state = useCosmosStore.getState();
    state.setView(next.view);
    state.selectObject(next.selected);
    if (next.overlayCredits) state.openOverlay('credits');
    else if (state.overlay === 'credits') state.closeOverlay();
    if (next.view === 'earth') state.markVisited('earth');
  }, [location.pathname, navigate]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        useCosmosStore.getState().openOverlay('search');
      } else if (event.key === 'Escape') {
        const state = useCosmosStore.getState();
        if (state.overlay === 'credits') navigate(returnPathRef.current);
        else state.closeOverlay();
        setMissionOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate]);

  useEffect(() => () => {
    if (travelFrameRef.current !== null) cancelAnimationFrame(travelFrameRef.current);
    if (travelEndTimerRef.current !== null) window.clearTimeout(travelEndTimerRef.current);
  }, []);

  const navigateDirectly = useCallback((destination: CosmicObjectId | 'solar' | 'milkyway' | 'localgroup') => {
    const state = useCosmosStore.getState();
    state.closeOverlay();
    if (destination === 'solar') {
      state.setView('solar');
      state.selectObject(null);
    } else if (destination === 'milkyway') {
      state.setView('milkyway');
      state.selectObject(null);
    } else if (destination === 'localgroup') {
      state.setView('localgroup');
      state.selectObject(null);
    } else if (destination === 'earth') {
      state.setView('earth');
      state.selectObject('earth');
      state.markVisited('earth');
    } else if (isCelestialObjectId(destination)) {
      state.setView('planet');
      state.selectObject(destination);
      state.markVisited(destination);
    } else if (isDeepSkyObjectId(destination)) {
      state.setView('deepsky');
      state.selectObject(destination);
    }
    navigate(routeForDestination(destination));
  }, [navigate]);

  const beginTravel = useCallback((destination: string) => {
    const target: CosmicObjectId | 'solar' | 'milkyway' | 'localgroup' =
      destination === 'solar' ? 'solar'
      : destination === 'milkyway' ? 'milkyway'
      : destination === 'localgroup' ? 'localgroup'
      : isCosmicObjectId(destination) ? destination
      : 'earth';

    const store = useCosmosStore.getState();
    if (store.view === 'landing' || store.reducedMotion) {
      navigateDirectly(target);
      return;
    }

    if (travelFrameRef.current !== null) cancelAnimationFrame(travelFrameRef.current);
    if (travelEndTimerRef.current !== null) window.clearTimeout(travelEndTimerRef.current);

    const travelObjectId: CosmicObjectId =
      target === 'solar' ? 'sun'
      : target === 'milkyway' ? 'sgr-a'
      : target === 'localgroup' ? 'andromeda'
      : target;

    travelTargetRef.current = target;
    store.startTravel(travelObjectId);
    const startedAt = performance.now();
    const duration = 2_250;
    let lastPhase: TravelPhase = 'preparing';

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const phase: TravelPhase = progress < .12 ? 'preparing' : progress < .3 ? 'departing' : progress < .72 ? 'cruising' : 'approaching';
      const current = useCosmosStore.getState();
      current.setTravelProgress(progress);
      if (phase !== lastPhase) {
        lastPhase = phase;
        current.setTravelPhase(phase);
      }
      if (progress < 1) {
        travelFrameRef.current = requestAnimationFrame(tick);
        return;
      }
      current.finishTravel();
      navigateDirectly(target);
      travelEndTimerRef.current = window.setTimeout(() => useCosmosStore.getState().cancelTravel(), 360);
    };
    travelFrameRef.current = requestAnimationFrame(tick);
  }, [navigateDirectly]);

  const openCredits = useCallback(() => {
    if (location.pathname !== '/credits') returnPathRef.current = location.pathname;
    navigate('/credits');
  }, [location.pathname, navigate]);

  const closeCredits = useCallback(() => {
    useCosmosStore.getState().closeOverlay();
    navigate(returnPathRef.current === '/credits' ? '/explore/solar-system' : returnPathRef.current);
  }, [navigate]);

  const selectInScene = useCallback((id: string) => {
    if (!isCosmicObjectId(id)) return;
    const state = useCosmosStore.getState();
    state.selectObject(id);
    if (isCelestialObjectId(id)) state.markVisited(id);
  }, []);

  const activateSceneObject = useCallback((id: string) => {
    if (!isCosmicObjectId(id)) return;
    const state = useCosmosStore.getState();
    const alreadyDisplayed =
      (state.view === 'earth' && id === 'earth') ||
      (state.view === 'planet' && state.selectedObjectId === id) ||
      (state.view === 'deepsky' && state.selectedObjectId === id);

    if (alreadyDisplayed) {
      selectInScene(id);
      return;
    }
    beginTravel(id);
  }, [beginTravel, selectInScene]);

  const currentObject = selectedObjectId ? DISPLAY_BY_ID[selectedObjectId] ?? null : null;
  const travelDestination = travel.destinationId ? DISPLAY_BY_ID[travel.destinationId] ?? null : null;
  const isLanding = view === 'landing';
  const sceneView = toSceneView(view);

  const missionComplete = MISSION_IDS.filter((id) => visitedObjectIds.includes(id)).length;
  const missionProgress = Math.round((missionComplete / MISSION_IDS.length) * 100);

  const activeScaleId =
    view === 'solar' ? 'solar'
    : view === 'milkyway' ? 'milkyway'
    : view === 'localgroup' ? 'localgroup'
    : view === 'deepsky' ? 'milkyway'
    : selectedObjectId ?? 'solar';

  const visibleObjects: ObjectDisplay[] = useMemo(() => {
    if (sceneView === 'earth') return SOLAR_DISPLAY_OBJECTS.filter((item) => item.id === 'earth' || item.id === 'moon');
    if (sceneView === 'planet' && selectedObjectId) { const o = DISPLAY_BY_ID[selectedObjectId]; return o ? [o] : []; }
    if (sceneView === 'milkyway') return DEEP_SKY_DISPLAY_OBJECTS;
    if (sceneView === 'localgroup') return DEEP_SKY_DISPLAY_OBJECTS.filter((o) => DEEP_SKY_BY_ID[o.id as DeepSkyObjectId]?.kind === 'galaxy');
    if (sceneView === 'deepsky' && selectedObjectId) { const o = DISPLAY_BY_ID[selectedObjectId]; return o ? [o] : []; }
    return SOLAR_DISPLAY_OBJECTS;
  }, [sceneView, selectedObjectId]);

  // Show solar scene controls only for earth/solar/planet views
  const showSolarControls = sceneView === 'earth' || sceneView === 'solar' || sceneView === 'planet';

  return (
    <div className={`app-shell ${isLanding ? 'app-shell--landing' : ''}`}>
      <a className="skip-link" href="#cosmos-content">{locale === 'fr' ? 'Aller au contenu' : 'Skip to content'}</a>
      <div className="scene-layer" aria-hidden="true">
        <Suspense fallback={<div className="scene-loading"><span className="scene-loading__orbit" /></div>}>
          <UniverseViewport
            view={sceneView}
            selectedId={isLanding ? 'earth' : selectedObjectId}
            hoveredId={hoveredObjectId}
            reducedMotion={reducedMotion}
            locale={locale}
            showOrbits={showOrbits}
            showLabels={!isLanding && showLabels}
            timeScale={timeScale}
            phaseOverrides={phaseOverrides}
            onSelect={activateSceneObject}
            onHover={(id) => useCosmosStore.getState().hoverObject(id && isCosmicObjectId(id) ? id : null)}
          />
        </Suspense>
      </div>
      <div className="scene-vignette" />

      <Header
        locale={locale}
        missionProgress={missionProgress}
        isLanding={isLanding}
        destinations={ALL_DISPLAY_OBJECTS}
        onHome={() => navigate('/')}
        onExplore={() => navigateDirectly('solar')}
        onSearch={() => useCosmosStore.getState().openOverlay('search')}
        onMission={() => setMissionOpen(true)}
        onLocale={(nextLocale) => useCosmosStore.getState().setLocale(nextLocale)}
        onTravel={beginTravel}
      />

      <div id="cosmos-content">
        {isLanding ? (
          <LandingHero locale={locale} onStart={() => navigateDirectly('earth')} onSolar={() => navigateDirectly('solar')} />
        ) : (
          <>
            <div className="breadcrumbs" aria-label={locale === 'fr' ? 'Fil d\u2019Ariane' : 'Breadcrumb'}>
              <button type="button" onClick={() => navigateDirectly('earth')}>{locale === 'fr' ? 'Terre' : 'Earth'}</button><span>›</span>
              <button type="button" onClick={() => navigateDirectly('solar')}>{locale === 'fr' ? 'Système solaire' : 'Solar System'}</button>
              {(view === 'milkyway' || view === 'localgroup' || view === 'deepsky') && (
                <><span>›</span><button type="button" onClick={() => navigateDirectly('milkyway')}>{locale === 'fr' ? 'Voie lactée' : 'Milky Way'}</button></>
              )}
              {view === 'localgroup' && (
                <><span>›</span><b>{locale === 'fr' ? 'Groupe local' : 'Local Group'}</b></>
              )}
              {currentObject && view === 'planet' && <><span>›</span><b>{currentObject.name[locale]}</b></>}
              {currentObject && view === 'deepsky' && <><span>›</span><b>{currentObject.name[locale]}</b></>}
            </div>
            <MissionPanel locale={locale} visited={visitedObjectIds} open={missionOpen} onClose={() => setMissionOpen(false)} onTravel={beginTravel} />
            {currentObject && <InfoPanel key={currentObject.id} locale={locale} object={currentObject} onCompare={() => useCosmosStore.getState().openOverlay('compare')} onClose={() => {
              if (view === 'planet') navigateDirectly('solar');
              else if (view === 'deepsky') navigateDirectly('milkyway');
              else useCosmosStore.getState().selectObject(null);
            }} />}
            <ScaleNavigator locale={locale} activeId={activeScaleId} onTravel={beginTravel} />
            {showSolarControls && (
              <SceneControls
                locale={locale}
                showLabels={showLabels}
                showOrbits={showOrbits}
                timeScale={timeScale}
                snapshotDate={snapshotDate}
                onLabels={() => useCosmosStore.getState().toggleLabels()}
                onOrbits={() => useCosmosStore.getState().toggleOrbits()}
                onTimeScale={(value) => useCosmosStore.getState().setTimeScale(value as SimulationTimeScale)}
                onSnapshotDate={(date) => useCosmosStore.getState().setSnapshotDate(date)}
              />
            )}
          </>
        )}
      </div>

      <button className="credits-trigger" type="button" onClick={openCredits}>
        {locale === 'fr' ? 'Sources & crédits' : 'Sources & credits'}
      </button>
      {!isLanding && <p className="scene-note">{locale === 'fr' ? 'Tailles et distances visuelles simplifiées' : 'Visual sizes and distances simplified'}</p>}

      <AccessibleObjectList locale={locale} objects={visibleObjects} onSelect={activateSceneObject} />
      {overlay === 'search' && <SearchDialog locale={locale} objects={ALL_DISPLAY_OBJECTS} onClose={() => useCosmosStore.getState().closeOverlay()} onSelect={(id) => { useCosmosStore.getState().closeOverlay(); beginTravel(id); }} />}
      {overlay === 'compare' && currentObject && <CompareDialog locale={locale} primary={currentObject} objects={ALL_DISPLAY_OBJECTS} onClose={() => useCosmosStore.getState().closeOverlay()} onTravel={(id) => { useCosmosStore.getState().closeOverlay(); beginTravel(id); }} />}
      {overlay === 'credits' && <CreditsDialog locale={locale} onClose={closeCredits} />}
      {travel.phase !== 'idle' && travelDestination && (
        <TravelOverlay locale={locale} destinationName={travelDestination.name[locale]} progress={travel.progress} phase={travel.phase} reducedMotion={reducedMotion} onSkip={() => { if (travel.destinationId) { useCosmosStore.getState().finishTravel(); navigateDirectly(travelTargetRef.current); useCosmosStore.getState().cancelTravel(); } }} />
      )}
    </div>
  );
}
