import { lazy, Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  SOLAR_SYSTEM_BODIES,
  INTERNATIONAL_SPACE_STATION,
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
import { CONSTELLATIONS } from '../data/constellations';
import { isConstellationAbbr, type ConstellationAbbr } from '../data/constellationTypes';
import { JOURNEY_RULES, SIMULATED_JOURNEY_IDS } from '../data/journeyRules';
import { JOURNEY_UI_TEXT } from '../data/journeyUiText';
import {
  ALL_JOURNEY_IDS,
  type JourneyId,
  type MissionStepTarget,
  type ScaleLevelId,
} from '../data/journeyTypes';
import {
  useCosmosStore,
  type CosmosView,
  type SimulationTimeScale,
  type TravelDestinationId,
  type TravelPhase,
} from '../store';
import { overallJourneyProgress } from '../store/missionSelectors';
import { computePhasesAtDate } from '../scene/sceneCatalog';
import { AccessibleObjectList } from '../components/AccessibleObjectList';
import { CompareDialog } from '../components/CompareDialog';
import { CreditsDialog } from '../components/CreditsDialog';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { InfoPanel } from '../components/InfoPanel';
import { LandingHero } from '../components/LandingHero';
import { ScaleNavigator } from '../components/ScaleNavigator';
import { SceneControls } from '../components/SceneControls';
import { SearchDialog } from '../components/SearchDialog';
import { TravelOverlay } from '../components/TravelOverlay';
import { publish } from '../domain/events';
import { startMissionEngine } from '../domain/missionEngine';
import type { ObjectDisplay } from './uiTypes';
import { travelDestinationName } from './travelDestinations';

// Boot the mission engine once at module load
startMissionEngine();

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

const JourneyPanel = lazy(async () => {
  const module = await import('../components/JourneyPanel');
  return { default: module.JourneyPanel };
});

const DiscoveryLog = lazy(async () => {
  const module = await import('../components/DiscoveryLog');
  return { default: module.DiscoveryLog };
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

const seasonLabels: Record<string, { fr: string; en: string }> = {
  spring: { fr: 'Printemps', en: 'Spring' },
  summer: { fr: '\u00C9t\u00E9', en: 'Summer' },
  autumn: { fr: 'Automne', en: 'Autumn' },
  winter: { fr: 'Hiver', en: 'Winter' },
  circumpolar: { fr: 'Circumpolaire', en: 'Circumpolar' },
};

const hemisphereLabels: Record<string, { fr: string; en: string }> = {
  north: { fr: 'H\u00E9misph\u00E8re nord', en: 'Northern hemisphere' },
  south: { fr: 'H\u00E9misph\u00E8re sud', en: 'Southern hemisphere' },
  both: { fr: 'Les deux h\u00E9misph\u00E8res', en: 'Both hemispheres' },
};

function buildConstellationDisplay(def: import('../data/constellationTypes').ConstellationDef): ObjectDisplay {
  const season = seasonLabels[def.bestSeason] ?? { fr: def.bestSeason, en: def.bestSeason };
  const hemisphere = hemisphereLabels[def.hemisphere] ?? { fr: def.hemisphere, en: def.hemisphere };
  return {
    id: def.id,
    name: def.name,
    kind: { fr: 'Constellation', en: 'Constellation' },
    tagline: def.shortDescription,
    description: def.shortDescription,
    curious: def.mythology,
    expert: def.science,
    color: def.color,
    symbol: def.symbol,
    facts: [
      { label: { fr: '\u00C9toile principale', en: 'Brightest star' }, value: def.brightestStar },
      { label: { fr: 'Meilleure saison', en: 'Best season' }, value: season },
      { label: { fr: 'Visible depuis', en: 'Visible from' }, value: hemisphere },
      { label: { fr: 'Superficie', en: 'Area' }, value: { fr: `${formatNumber(def.areaSqDeg, 'fr')} deg\u00B2`, en: `${formatNumber(def.areaSqDeg, 'en')} deg\u00B2` } },
    ],
  };
}

const SOLAR_DISPLAY_OBJECTS = SOLAR_SYSTEM_BODIES.map(buildDisplayObject);
const DEEP_SKY_DISPLAY_OBJECTS = DEEP_SKY_OBJECTS.map(buildDeepSkyDisplay);
const CONSTELLATION_DISPLAY_OBJECTS = CONSTELLATIONS.map(buildConstellationDisplay);
const ISS_DISPLAY_OBJECT: ObjectDisplay = {
  id: 'iss',
  name: INTERNATIONAL_SPACE_STATION.name,
  kind: { fr: 'Station orbitale', en: 'Orbital station' },
  tagline: INTERNATIONAL_SPACE_STATION.shortDescription,
  description: INTERNATIONAL_SPACE_STATION.shortDescription,
  curious: INTERNATIONAL_SPACE_STATION.funFact,
  expert: {
    fr: `Altitude approximative : ${formatNumber(INTERNATIONAL_SPACE_STATION.altitude.value, 'fr')} km. Vitesse orbitale : ${formatNumber(INTERNATIONAL_SPACE_STATION.orbitalSpeed.value, 'fr', 1)} km/s.`,
    en: `Approximate altitude: ${formatNumber(INTERNATIONAL_SPACE_STATION.altitude.value, 'en')} km. Orbital speed: ${formatNumber(INTERNATIONAL_SPACE_STATION.orbitalSpeed.value, 'en', 1)} km/s.`,
  },
  color: '#d9f3ff',
  symbol: '🛰️',
  sourceUrl: INTERNATIONAL_SPACE_STATION.sourceUrl,
  sourceLabel: INTERNATIONAL_SPACE_STATION.attribution,
  facts: [
    { label: { fr: 'Altitude', en: 'Altitude above Earth' }, value: { fr: `≈ ${formatNumber(INTERNATIONAL_SPACE_STATION.altitude.value, 'fr')} km`, en: `≈ ${formatNumber(INTERNATIONAL_SPACE_STATION.altitude.value, 'en')} km` } },
    { label: { fr: 'Vitesse orbitale', en: 'Orbital speed' }, value: { fr: `≈ ${formatNumber(INTERNATIONAL_SPACE_STATION.orbitalSpeed.value, 'fr', 1)} km/s`, en: `≈ ${formatNumber(INTERNATIONAL_SPACE_STATION.orbitalSpeed.value, 'en', 1)} km/s` } },
    { label: { fr: 'Une orbite', en: 'One orbit' }, value: { fr: `≈ ${formatNumber(INTERNATIONAL_SPACE_STATION.orbitalPeriod.value, 'fr')} min`, en: `≈ ${formatNumber(INTERNATIONAL_SPACE_STATION.orbitalPeriod.value, 'en')} min` } },
  ],
};
const ALL_DISPLAY_OBJECTS = [...SOLAR_DISPLAY_OBJECTS, ISS_DISPLAY_OBJECT, ...DEEP_SKY_DISPLAY_OBJECTS, ...CONSTELLATION_DISPLAY_OBJECTS];

const DISPLAY_BY_ID = Object.fromEntries(ALL_DISPLAY_OBJECTS.map((object) => [object.id, object])) as Record<string, ObjectDisplay>;

/* ------------------------------------------------------------------ */
/*  Route helpers                                                     */
/* ------------------------------------------------------------------ */

type NavigationDestination = TravelDestinationId | ScaleLevelId;

function routeForDestination(id: NavigationDestination) {
  if (id === 'solar') return '/explore/solar-system';
  if (id === 'milkyway') return '/explore/milky-way';
  if (id === 'localgroup') return '/explore/local-group';
  if (id === 'constellations' || id === 'night-sky') return '/explore/constellations';
  if (id === 'iss') return '/explore/earth/iss';
  if (id === 'earth') return '/explore/earth';
  if (isCelestialObjectId(id)) return `/explore/solar-system/${id}`;
  if (isDeepSkyObjectId(id)) return `/explore/deep-sky/${id}`;
  if (isConstellationAbbr(id)) return `/explore/constellations/${id}`;
  return '/explore/solar-system';
}

type SceneRoute = {
  kind: 'scene';
  view: CosmosView;
  selected: CosmicObjectId | null;
  constellation: ConstellationAbbr | null;
  overlayCredits: boolean;
  discovery: MissionStepTarget | null;
  scale: ScaleLevelId;
};

type RouteResult = SceneRoute
  | { kind: 'journeys'; journeyId: JourneyId | null }
  | { kind: 'log' }
  | { kind: 'compare'; primaryId: MissionStepTarget; secondaryId: MissionStepTarget };

function isJourneyId(value: string): value is JourneyId {
  return (ALL_JOURNEY_IDS as readonly string[]).includes(value);
}

function isDisplayObjectId(value: string): value is MissionStepTarget {
  return Object.hasOwn(DISPLAY_BY_ID, value);
}

function routeState(pathname: string): RouteResult | null {
  if (pathname === '/') return { kind: 'scene', view: 'landing', selected: 'earth', constellation: null, overlayCredits: false, discovery: null, scale: 'earth' };
  if (pathname === '/trajets') return { kind: 'journeys', journeyId: null };
  if (pathname === '/carnet') return { kind: 'log' };
  const compareMatch = pathname.match(/^\/compare\/([^/]+)\/([^/]+)\/?$/);
  if (
    compareMatch?.[1]
    && compareMatch[2]
    && isDisplayObjectId(compareMatch[1])
    && isDisplayObjectId(compareMatch[2])
  ) {
    return { kind: 'compare', primaryId: compareMatch[1], secondaryId: compareMatch[2] };
  }
  const journeyMatch = pathname.match(/^\/trajets\/([^/]+)\/?$/);
  if (journeyMatch?.[1] && isJourneyId(journeyMatch[1])) {
    return { kind: 'journeys', journeyId: journeyMatch[1] };
  }
  if (pathname === '/explore/earth') return { kind: 'scene', view: 'earth', selected: 'earth', constellation: null, overlayCredits: false, discovery: 'earth', scale: 'earth' };
  if (pathname === '/explore/earth/iss') return { kind: 'scene', view: 'earth', selected: 'earth', constellation: null, overlayCredits: false, discovery: 'iss', scale: 'earth' };
  if (pathname === '/explore/constellations') return { kind: 'scene', view: 'constellations', selected: null, constellation: null, overlayCredits: false, discovery: 'night-sky', scale: 'constellations' };
  if (pathname === '/explore/solar-system') return { kind: 'scene', view: 'solar', selected: null, constellation: null, overlayCredits: false, discovery: null, scale: 'solar' };
  if (pathname === '/explore/milky-way') return { kind: 'scene', view: 'milkyway', selected: null, constellation: null, overlayCredits: false, discovery: null, scale: 'milkyway' };
  if (pathname === '/explore/local-group') return { kind: 'scene', view: 'localgroup', selected: null, constellation: null, overlayCredits: false, discovery: null, scale: 'localgroup' };
  if (pathname === '/credits') return { kind: 'scene', view: 'solar', selected: 'earth', constellation: null, overlayCredits: true, discovery: null, scale: 'solar' };

  // Constellation detail
  const constellationMatch = pathname.match(/^\/explore\/constellations\/([^/]+)\/?$/);
  if (constellationMatch?.[1] && isConstellationAbbr(constellationMatch[1])) {
    return { kind: 'scene', view: 'constellations', selected: null, constellation: constellationMatch[1], overlayCredits: false, discovery: constellationMatch[1], scale: 'constellations' };
  }

  // Solar system body detail
  const solarMatch = pathname.match(/^\/explore\/solar-system\/([^/]+)\/?$/);
  if (solarMatch?.[1] && isCelestialObjectId(solarMatch[1])) {
    return { kind: 'scene', view: 'planet', selected: solarMatch[1], constellation: null, overlayCredits: false, discovery: solarMatch[1], scale: 'solar' };
  }

  // Deep-sky object detail
  const deepSkyMatch = pathname.match(/^\/explore\/deep-sky\/([^/]+)\/?$/);
  if (deepSkyMatch?.[1] && isDeepSkyObjectId(deepSkyMatch[1])) {
    const scale: ScaleLevelId = DEEP_SKY_BY_ID[deepSkyMatch[1]].kind === 'galaxy' ? 'localgroup' : 'milkyway';
    return { kind: 'scene', view: 'deepsky', selected: deepSkyMatch[1], constellation: null, overlayCredits: false, discovery: deepSkyMatch[1], scale };
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
    case 'constellations':
      return 'constellations';
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
  const returnPathRef = useRef('/explore/solar-system');
  const travelTargetRef = useRef<TravelDestinationId>('earth');
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
  const missionState = useCosmosStore((state) => state.mission);

  const travel = useCosmosStore((state) => state.travel);
  const currentRoute = routeState(location.pathname);
  const journeyRouteId = currentRoute?.kind === 'journeys' ? currentRoute.journeyId : null;
  const journeyOpen = currentRoute?.kind === 'journeys';
  const logOpen = currentRoute?.kind === 'log';
  const compareRoute = currentRoute?.kind === 'compare' ? currentRoute : null;

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
    if (next.kind === 'compare') {
      const primaryRoute = routeState(routeForDestination(next.primaryId));
      if (!primaryRoute || primaryRoute.kind !== 'scene') {
        navigate('/', { replace: true });
        return;
      }
      state.setView(primaryRoute.view);
      state.selectObject(primaryRoute.selected);
      state.selectConstellation(primaryRoute.constellation);
      state.openOverlay('compare');
      publish({ type: 'SCALE_CHANGED', level: primaryRoute.scale });
      if (primaryRoute.discovery) publish({ type: 'OBJECT_VISITED', id: primaryRoute.discovery, at: Date.now() });
      return;
    }
    if (next.kind !== 'scene') {
      if (state.overlay) state.closeOverlay();
      return;
    }
    state.setView(next.view);
    state.selectObject(next.selected);
    state.selectConstellation(next.constellation);
    if (next.overlayCredits) state.openOverlay('credits');
    else if (state.overlay) state.closeOverlay();
    publish({ type: 'SCALE_CHANGED', level: next.scale });
    if (next.discovery) publish({ type: 'OBJECT_VISITED', id: next.discovery, at: Date.now() });
  }, [location.pathname, navigate]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        useCosmosStore.getState().openOverlay('search');
      } else if (event.key === 'Escape') {
        const state = useCosmosStore.getState();
        if (state.overlay === 'credits') navigate(returnPathRef.current);
        else if (state.overlay === 'compare') return;
        else if (state.overlay) state.closeOverlay();
        else if (journeyOpen || logOpen) navigate(returnPathRef.current);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [journeyOpen, logOpen, navigate]);

  useEffect(() => () => {
    if (travelFrameRef.current !== null) cancelAnimationFrame(travelFrameRef.current);
    if (travelEndTimerRef.current !== null) window.clearTimeout(travelEndTimerRef.current);
  }, []);

  const navigateDirectly = useCallback((destination: NavigationDestination) => {
    const state = useCosmosStore.getState();
    state.closeOverlay();
    if (destination === 'constellations' || destination === 'night-sky') {
      state.setView('constellations');
      state.selectObject(null);
      state.selectConstellation(null);
      publish({ type: 'SCALE_CHANGED', level: 'constellations' });
      if (destination === 'night-sky') publish({ type: 'OBJECT_VISITED', id: 'night-sky', at: Date.now() });
    } else if (destination === 'iss') {
      state.setView('earth');
      state.selectObject('earth');
      state.selectConstellation(null);
      publish({ type: 'SCALE_CHANGED', level: 'earth' });
      publish({ type: 'OBJECT_VISITED', id: 'iss', at: Date.now() });
    } else if (isConstellationAbbr(destination)) {
      state.setView('constellations');
      state.selectObject(null);
      state.selectConstellation(destination);
      publish({ type: 'SCALE_CHANGED', level: 'constellations' });
      publish({ type: 'OBJECT_VISITED', id: destination, at: Date.now() });
    } else if (destination === 'solar') {
      state.setView('solar');
      state.selectObject(null);
      publish({ type: 'SCALE_CHANGED', level: 'solar' });
    } else if (destination === 'milkyway') {
      state.setView('milkyway');
      state.selectObject(null);
      publish({ type: 'SCALE_CHANGED', level: 'milkyway' });
    } else if (destination === 'localgroup') {
      state.setView('localgroup');
      state.selectObject(null);
      publish({ type: 'SCALE_CHANGED', level: 'localgroup' });
    } else if (destination === 'earth') {
      state.setView('earth');
      state.selectObject('earth');
      publish({ type: 'SCALE_CHANGED', level: 'earth' });
      publish({ type: 'OBJECT_VISITED', id: 'earth', at: Date.now() });
    } else if (isCelestialObjectId(destination)) {
      state.setView('planet');
      state.selectObject(destination);
      publish({ type: 'SCALE_CHANGED', level: 'solar' });
      publish({ type: 'OBJECT_VISITED', id: destination, at: Date.now() });
    } else if (isDeepSkyObjectId(destination)) {
      state.setView('deepsky');
      state.selectObject(destination);
      const scale: ScaleLevelId = DEEP_SKY_BY_ID[destination].kind === 'galaxy' ? 'localgroup' : 'milkyway';
      publish({ type: 'SCALE_CHANGED', level: scale });
      publish({ type: 'OBJECT_VISITED', id: destination, at: Date.now() });
    }
    navigate(routeForDestination(destination));
  }, [navigate]);

  const beginTravel = useCallback((destination: NavigationDestination) => {
    // Constellation navigation — no travel animation, just navigate directly
    if (destination === 'constellations' || destination === 'night-sky' || isConstellationAbbr(destination)) {
      navigateDirectly(destination);
      return;
    }

    const target: TravelDestinationId =
      destination === 'solar' ? 'solar'
      : destination === 'milkyway' ? 'milkyway'
      : destination === 'localgroup' ? 'localgroup'
      : destination === 'iss' ? 'iss'
      : isCosmicObjectId(destination) ? destination
      : 'earth';

    const store = useCosmosStore.getState();
    if (store.view === 'landing' || store.reducedMotion) {
      navigateDirectly(target);
      return;
    }

    if (travelFrameRef.current !== null) cancelAnimationFrame(travelFrameRef.current);
    if (travelEndTimerRef.current !== null) window.clearTimeout(travelEndTimerRef.current);

    travelTargetRef.current = target;
    store.startTravel(target);
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

  const openJourneys = useCallback(() => {
    if (!journeyOpen && !logOpen) returnPathRef.current = location.pathname;
    navigate('/trajets');
  }, [journeyOpen, location.pathname, logOpen, navigate]);

  const openLog = useCallback(() => {
    if (!journeyOpen && !logOpen) returnPathRef.current = location.pathname;
    navigate('/carnet');
  }, [journeyOpen, location.pathname, logOpen, navigate]);

  const closeRoutePanel = useCallback(() => {
    const fallback = returnPathRef.current.startsWith('/trajets') || returnPathRef.current === '/carnet'
      ? '/explore/solar-system'
      : returnPathRef.current;
    navigate(fallback);
  }, [navigate]);

  const openComparison = useCallback((a: MissionStepTarget, b: MissionStepTarget) => {
    if (!DISPLAY_BY_ID[a] || !DISPLAY_BY_ID[b]) return;
    navigate(`/compare/${encodeURIComponent(a)}/${encodeURIComponent(b)}`);
  }, [navigate]);

  const closeComparison = useCallback(() => {
    useCosmosStore.getState().closeOverlay();
    if (compareRoute) navigate(routeForDestination(compareRoute.primaryId));
  }, [compareRoute, navigate]);

  const selectInScene = useCallback((id: string) => {
    // Constellation selection in constellation view
    if (isConstellationAbbr(id)) {
      const state = useCosmosStore.getState();
      state.selectConstellation(id);
      publish({ type: 'OBJECT_VISITED', id, at: Date.now() });
      navigate(`/explore/constellations/${id}`);
      return;
    }
    if (!isCosmicObjectId(id)) return;
    const state = useCosmosStore.getState();
    state.selectObject(id);
    publish({ type: 'OBJECT_VISITED', id, at: Date.now() });
  }, [navigate]);

  const activateSceneObject = useCallback((id: string) => {
    // The ISS has no Three.js mesh in this lot, but its accessible DOM entry
    // must provide the same working navigation as search and journey actions.
    if (id === 'iss') {
      beginTravel('iss');
      return;
    }
    // From the Milky Way view, clicking the Sun marker navigates to the solar system overview
    if (id === 'sun' && useCosmosStore.getState().view === 'milkyway') {
      beginTravel('solar');
      return;
    }
    // Constellation selection
    if (isConstellationAbbr(id)) {
      selectInScene(id);
      return;
    }
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

  const selectedConstellationId = useCosmosStore((state) => state.selectedConstellationId);
  const showConstellationLines = useCosmosStore((state) => state.showConstellationLines);

  const currentConstellation = selectedConstellationId ? DISPLAY_BY_ID[selectedConstellationId] ?? null : null;
  const currentObject = compareRoute
    ? DISPLAY_BY_ID[compareRoute.primaryId]
    : location.pathname === '/explore/earth/iss'
    ? ISS_DISPLAY_OBJECT
    : (view === 'constellations' ? currentConstellation : null) ?? (selectedObjectId ? DISPLAY_BY_ID[selectedObjectId] ?? null : null);
  const currentTravelDestinationName = travel.destinationId
    ? travelDestinationName(travel.destinationId, locale)
    : null;
  const isLanding = location.pathname === '/';
  const sceneView = toSceneView(view);

  const missionProgress = overallJourneyProgress(missionState);

  useEffect(() => {
    const activeJourneyId = missionState.activeJourneyId;
    if (!activeJourneyId) return;
    const steps = JOURNEY_RULES[activeJourneyId];
    const run = missionState.runs[activeJourneyId];
    if (!run?.startedAt || run.completedAt) return;
    const selectedTarget: MissionStepTarget | null = location.pathname === '/explore/earth/iss'
      ? 'iss'
      : selectedConstellationId ?? selectedObjectId;
    if (!selectedTarget) return;
    const step = steps.find((candidate) =>
      candidate.kind === 'observe'
      && candidate.target === selectedTarget
      && !run.completedStepIds.includes(candidate.id));
    if (!step || step.kind !== 'observe') return;
    const timer = window.setTimeout(() => {
      publish({ type: 'OBJECT_OBSERVED', id: step.target, durationMs: step.holdMs });
    }, step.holdMs);
    return () => window.clearTimeout(timer);
  }, [location.pathname, missionState.activeJourneyId, missionState.runs, selectedConstellationId, selectedObjectId]);

  const showSimulationBadge = missionState.activeJourneyId != null
    && SIMULATED_JOURNEY_IDS.has(missionState.activeJourneyId);

  const activeScaleId =
    view === 'constellations' ? 'constellations'
    : view === 'solar' ? 'solar'
    : view === 'milkyway' ? 'milkyway'
    : view === 'localgroup' ? 'localgroup'
    : view === 'deepsky' ? 'milkyway'
    : selectedObjectId ?? 'solar';

  const visibleObjects: ObjectDisplay[] = useMemo(() => {
    if (sceneView === 'earth') return [...SOLAR_DISPLAY_OBJECTS.filter((item) => item.id === 'earth' || item.id === 'moon'), ISS_DISPLAY_OBJECT];
    if (sceneView === 'planet' && selectedObjectId) { const o = DISPLAY_BY_ID[selectedObjectId]; return o ? [o] : []; }
    if (sceneView === 'constellations') return CONSTELLATION_DISPLAY_OBJECTS;
    if (sceneView === 'milkyway') return [
      ...DEEP_SKY_DISPLAY_OBJECTS.filter((object) => DEEP_SKY_BY_ID[object.id as DeepSkyObjectId]?.kind !== 'galaxy'),
      ...SOLAR_DISPLAY_OBJECTS.filter((object) => object.id === 'sun'),
    ];
    if (sceneView === 'localgroup') return DEEP_SKY_DISPLAY_OBJECTS.filter((o) => DEEP_SKY_BY_ID[o.id as DeepSkyObjectId]?.kind === 'galaxy');
    if (sceneView === 'deepsky' && selectedObjectId) { const o = DISPLAY_BY_ID[selectedObjectId]; return o ? [o] : []; }
    return SOLAR_DISPLAY_OBJECTS;
  }, [sceneView, selectedObjectId]);

  // Show solar scene controls only for earth/solar/planet views
  const showSolarControls = sceneView === 'earth' || sceneView === 'solar' || sceneView === 'planet';
  const showGalacticLabelControls = sceneView === 'milkyway' || sceneView === 'localgroup';
  const showConstellationControls = sceneView === 'constellations';
  const sceneNote = view === 'constellations'
    ? (locale === 'fr'
      ? 'Positions Hipparcos (ESA) \u00B7 figures d3-celestial (BSD-3)'
      : 'Hipparcos positions (ESA) \u00B7 d3-celestial figures (BSD-3)')
    : view === 'milkyway'
    ? (locale === 'fr'
      ? 'Vue d’artiste ESA/Gaia 2025 · reconstruction, pas une photographie'
      : 'ESA/Gaia 2025 artist’s view · reconstruction, not a photograph')
    : (locale === 'fr' ? 'Tailles et distances visuelles simplifiées' : 'Visual sizes and distances simplified');

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
        onMission={openJourneys}
        onLog={openLog}
        onLocale={(nextLocale) => useCosmosStore.getState().setLocale(nextLocale)}
        onTravel={beginTravel}
      />

      <div id="cosmos-content">
        {isLanding ? (
          <LandingHero locale={locale} onStart={() => navigateDirectly('earth')} onSolar={() => navigateDirectly('solar')} />
        ) : (
          <>
            <div className="breadcrumbs" data-scene-obstacle aria-label={locale === 'fr' ? 'Fil d\u2019Ariane' : 'Breadcrumb'}>
              <button type="button" onClick={() => navigateDirectly('earth')}>{locale === 'fr' ? 'Terre' : 'Earth'}</button>
              {view === 'constellations' ? (
                <>
                  <span aria-hidden="true">›</span>
                  {selectedConstellationId ? (
                    <button type="button" onClick={() => navigateDirectly('constellations')}>{locale === 'fr' ? 'Ciel nocturne' : 'Night Sky'}</button>
                  ) : (
                    <b>{locale === 'fr' ? 'Ciel nocturne' : 'Night Sky'}</b>
                  )}
                  {currentConstellation && <><span aria-hidden="true">›</span><b>{currentConstellation.name[locale]}</b></>}
                </>
              ) : (
                <>
                  <span aria-hidden="true">›</span>
                  <button type="button" onClick={() => navigateDirectly('solar')}>{locale === 'fr' ? 'Syst\u00E8me solaire' : 'Solar System'}</button>
                  {(view === 'milkyway' || view === 'localgroup' || view === 'deepsky') && (
                    <><span aria-hidden="true">›</span><button type="button" onClick={() => navigateDirectly('milkyway')}>{locale === 'fr' ? 'Voie lact\u00E9e' : 'Milky Way'}</button></>
                  )}
                  {view === 'localgroup' && (
                    <><span aria-hidden="true">›</span><b>{locale === 'fr' ? 'Groupe local de galaxies' : 'Local Group of galaxies'}</b></>
                  )}
                  {currentObject && view === 'planet' && <><span aria-hidden="true">›</span><b>{currentObject.name[locale]}</b></>}
                  {location.pathname === '/explore/earth/iss' && <><span aria-hidden="true">›</span><b>{ISS_DISPLAY_OBJECT.name[locale]}</b></>}
                  {currentObject && view === 'deepsky' && <><span aria-hidden="true">›</span><b>{currentObject.name[locale]}</b></>}
                </>
              )}
            </div>
            {journeyOpen && (
              <Suspense fallback={null}>
                <JourneyPanel
                  locale={locale}
                  missionState={missionState}
                  activeJourneyId={journeyRouteId}
                  open
                  onClose={closeRoutePanel}
                  onSelectJourney={(id: JourneyId | null) => navigate(id ? `/trajets/${id}` : '/trajets')}
                  onStartJourney={(id: JourneyId) => {
                    const state = useCosmosStore.getState();
                    state.startJourney(id);
                    const currentTarget: MissionStepTarget | null = location.pathname === '/explore/earth/iss'
                      ? 'iss'
                      : state.selectedConstellationId ?? state.selectedObjectId;
                    if (currentTarget) publish({ type: 'OBJECT_VISITED', id: currentTarget, at: Date.now() });
                  }}
                  onTravel={beginTravel}
                  onCompare={openComparison}
                />
              </Suspense>
            )}
            {logOpen && (
              <Suspense fallback={null}>
                <DiscoveryLog
                  locale={locale}
                  missionState={missionState}
                  onClose={closeRoutePanel}
                  onSelectJourney={(id) => navigate(`/trajets/${id}`)}
                />
              </Suspense>
            )}
            {currentObject && !journeyOpen && !logOpen && <InfoPanel key={currentObject.id} locale={locale} object={currentObject} onCompare={() => openComparison(currentObject.id, currentObject.id === 'jupiter' ? 'earth' : 'jupiter')} onClose={() => {
              if (location.pathname === '/explore/earth/iss') navigateDirectly('earth');
              else if (view === 'constellations') navigateDirectly('constellations');
              else if (view === 'planet') navigateDirectly('solar');
              else if (view === 'deepsky') navigateDirectly('milkyway');
              else useCosmosStore.getState().selectObject(null);
            }} />}
            {!logOpen && <ScaleNavigator locale={locale} activeId={activeScaleId} onTravel={beginTravel} />}
            {showConstellationControls && (
              <SceneControls
                locale={locale}
                showLabels={showLabels}
                showOrbits={showConstellationLines}
                labelsOnly={false}
                timeScale={0}
                snapshotDate={null}
                onLabels={() => useCosmosStore.getState().toggleLabels()}
                onOrbits={() => useCosmosStore.getState().toggleConstellationLines()}
                onTimeScale={() => {}}
                onSnapshotDate={() => {}}
              />
            )}
            {(showSolarControls || showGalacticLabelControls) && (
              <SceneControls
                locale={locale}
                showLabels={showLabels}
                showOrbits={showOrbits}
                labelsOnly={showGalacticLabelControls}
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
      {!isLanding && <p className="scene-note" data-scene-obstacle>{sceneNote}</p>}
      {showSimulationBadge && !journeyOpen && (
        <p className="simulated-visualization simulated-visualization--scene" data-scene-obstacle>
          {JOURNEY_UI_TEXT.sceneSimulationBadge[locale]}
        </p>
      )}

      <AccessibleObjectList
        locale={locale}
        objects={visibleObjects}
        onSelect={activateSceneObject}
        contextDescription={view === 'milkyway'
          ? (locale === 'fr'
            ? 'Structure affichée : barre centrale, bras Écu–Centaure, Persée, Sagittaire–Carène, Norma–Externe et bras local d’Orion.'
            : 'Displayed structure: central bar, Scutum–Centaurus, Perseus, Sagittarius–Carina, Norma–Outer, and the Local Orion Arm.')
          : undefined}
      />
      {overlay === 'search' && <SearchDialog locale={locale} objects={ALL_DISPLAY_OBJECTS} onClose={() => useCosmosStore.getState().closeOverlay()} onSelect={(id) => { useCosmosStore.getState().closeOverlay(); beginTravel(id); }} />}
      {overlay === 'compare' && currentObject && <CompareDialog key={`${currentObject.id}:${compareRoute?.secondaryId ?? 'jupiter'}`} locale={locale} primary={currentObject} objects={ALL_DISPLAY_OBJECTS} initialSecondaryId={compareRoute?.secondaryId} onSecondaryChange={(id) => openComparison(currentObject.id, id)} onClose={closeComparison} onTravel={(id) => { useCosmosStore.getState().closeOverlay(); beginTravel(id); }} />}
      {overlay === 'credits' && <CreditsDialog locale={locale} onClose={closeCredits} />}
      {travel.phase !== 'idle' && travel.destinationId && currentTravelDestinationName && (
        <TravelOverlay destinationId={travel.destinationId} locale={locale} destinationName={currentTravelDestinationName} progress={travel.progress} phase={travel.phase} reducedMotion={reducedMotion} onSkip={() => { if (travel.destinationId) { useCosmosStore.getState().finishTravel(); navigateDirectly(travelTargetRef.current); useCosmosStore.getState().cancelTravel(); } }} />
      )}
      <Footer />
    </div>
  );
}
