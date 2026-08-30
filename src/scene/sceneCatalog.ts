import { EPHEMERIS_SNAPSHOT, getEphemerisVector, type PlanetId } from '../data';

/**
 * Render-only catalogue for the V1 universe viewport.
 *
 * Distances and radii are deliberately compressed scene units: physical values
 * remain available as metadata, while the renderer keeps every planet legible.
 * The scene is self-contained and never requests a remote API at runtime.
 */

export type UniverseView = 'earth' | 'solar' | 'planet' | 'milkyway' | 'localgroup' | 'deepsky';

export type SceneBodyId =
  | 'sun'
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'moon'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune';

export interface SceneTextureSet {
  /** Equirectangular sRGB surface map. */
  albedo: string;
  /** Optional equirectangular city-light/emissive map. */
  night?: string;
  /** Optional luminance map used as a transparent cloud layer. */
  clouds?: string;
  /** Optional tangent-space normal map. */
  normal?: string;
  /** Optional monochrome water/specular response map. */
  specular?: string;
  /** Optional opaque atmospheric/cloud cover (currently Venus). */
  atmosphere?: string;
  /** Optional radial RGBA strip used by a separate ring mesh. */
  rings?: string;
}

export interface SceneOrbit {
  /** Semi-major axis in compressed scene units. */
  semiMajorAxis: number;
  eccentricity: number;
  inclinationDeg: number;
  orbitalPeriodDays: number;
  /** Stable initial phase, in radians, to give the solar view a useful spread. */
  phase: number;
}

export interface SceneRing {
  innerRadiusRatio: number;
  outerRadiusRatio: number;
  opacity: number;
}

export interface SceneBodyDefinition {
  id: SceneBodyId;
  name: string;
  nameEn: string;
  kind: 'star' | 'planet' | 'moon';
  color: string;
  /** Mean physical radius, useful to consuming educational UI. */
  meanRadiusKm: number;
  /** Radius used in the compressed whole-system view. */
  solarRadius: number;
  /** Radius used when this object is the focus of a detail view. */
  detailRadius: number;
  /** IAU north-pole/rotation-axis tilt used by the render group. */
  axialTiltDeg: number;
  /** Sidereal rotation period; sign is not used because tilt defines orientation. */
  rotationHours: number;
  /** Equatorial flattening, applied as a Y scale of `1 - flattening`. */
  flattening: number;
  texture: SceneTextureSet;
  orbit?: SceneOrbit;
  ring?: SceneRing;
  atmosphereColor?: string;
  atmosphereOpacity?: number;
}

export interface SceneCameraPreset {
  position: readonly [number, number, number];
  target: readonly [number, number, number];
  fov: number;
  minDistance: number;
  maxDistance: number;
}

export const SOLAR_TEXTURE_BASE = '/assets/textures/solar-system/sss-2k';

const texture = (file: string) => `${SOLAR_TEXTURE_BASE}/${file}`;

const phaseAtSnapshot = (id: PlanetId) => {
  const { positionKm } = getEphemerisVector(id);
  return Math.atan2(positionKm.y, positionKm.x);
};

export const sceneCatalog: Readonly<Record<SceneBodyId, SceneBodyDefinition>> = {
  sun: {
    id: 'sun',
    name: 'Soleil',
    nameEn: 'Sun',
    kind: 'star',
    color: '#ffcf6b',
    meanRadiusKm: 696_340,
    solarRadius: 4.8,
    detailRadius: 4.8,
    axialTiltDeg: 7.25,
    rotationHours: 609.12,
    flattening: 0.000_009,
    texture: { albedo: texture('sun-color.jpg') },
  },
  mercury: {
    id: 'mercury',
    name: 'Mercure',
    nameEn: 'Mercury',
    kind: 'planet',
    color: '#9a8f86',
    meanRadiusKm: 2_439.7,
    solarRadius: 0.56,
    detailRadius: 4,
    axialTiltDeg: 0.034,
    rotationHours: 1_407.6,
    flattening: 0,
    texture: { albedo: texture('mercury-color.jpg') },
    orbit: { semiMajorAxis: 9, eccentricity: 0.2056, inclinationDeg: 7.005, orbitalPeriodDays: 87.969, phase: phaseAtSnapshot('mercury') },
  },
  venus: {
    id: 'venus',
    name: 'Vénus',
    nameEn: 'Venus',
    kind: 'planet',
    color: '#e8c98d',
    meanRadiusKm: 6_051.8,
    solarRadius: 0.92,
    detailRadius: 4,
    axialTiltDeg: 177.36,
    rotationHours: 5_832.5,
    flattening: 0,
    texture: {
      albedo: texture('venus-surface-color.jpg'),
      atmosphere: texture('venus-atmosphere-color.jpg'),
    },
    atmosphereColor: '#f7d79a',
    atmosphereOpacity: 0.16,
    orbit: { semiMajorAxis: 13, eccentricity: 0.0068, inclinationDeg: 3.395, orbitalPeriodDays: 224.701, phase: phaseAtSnapshot('venus') },
  },
  earth: {
    id: 'earth',
    name: 'Terre',
    nameEn: 'Earth',
    kind: 'planet',
    color: '#3f8fd6',
    meanRadiusKm: 6_371,
    solarRadius: 1,
    detailRadius: 5,
    axialTiltDeg: 23.44,
    rotationHours: 23.934,
    flattening: 0.003_353,
    texture: {
      albedo: texture('earth-day-color.jpg'),
      night: texture('earth-night-emissive.jpg'),
      clouds: texture('earth-clouds-luminance.jpg'),
      normal: texture('earth-normal.png'),
      specular: texture('earth-specular.png'),
    },
    atmosphereColor: '#62b6ff',
    atmosphereOpacity: 0.18,
    orbit: { semiMajorAxis: 17.5, eccentricity: 0.0167, inclinationDeg: 0, orbitalPeriodDays: 365.256, phase: phaseAtSnapshot('earth') },
  },
  moon: {
    id: 'moon',
    name: 'Lune',
    nameEn: 'Moon',
    kind: 'moon',
    color: '#b9b6ae',
    meanRadiusKm: 1_737.4,
    solarRadius: 0.27,
    detailRadius: 1.35,
    axialTiltDeg: 6.68,
    rotationHours: 655.72,
    flattening: 0.0012,
    texture: { albedo: texture('moon-color.jpg') },
    orbit: { semiMajorAxis: 12, eccentricity: 0.0549, inclinationDeg: 5.145, orbitalPeriodDays: 27.322, phase: 0.9 },
  },
  mars: {
    id: 'mars',
    name: 'Mars',
    nameEn: 'Mars',
    kind: 'planet',
    color: '#c1543a',
    meanRadiusKm: 3_389.5,
    solarRadius: 0.72,
    detailRadius: 4,
    axialTiltDeg: 25.19,
    rotationHours: 24.623,
    flattening: 0.005_89,
    texture: { albedo: texture('mars-color.jpg') },
    orbit: { semiMajorAxis: 22, eccentricity: 0.0934, inclinationDeg: 1.85, orbitalPeriodDays: 686.98, phase: phaseAtSnapshot('mars') },
  },
  jupiter: {
    id: 'jupiter',
    name: 'Jupiter',
    nameEn: 'Jupiter',
    kind: 'planet',
    color: '#d9a06a',
    meanRadiusKm: 69_911,
    solarRadius: 2.45,
    detailRadius: 4.7,
    axialTiltDeg: 3.13,
    rotationHours: 9.925,
    flattening: 0.064_87,
    texture: { albedo: texture('jupiter-color.jpg') },
    orbit: { semiMajorAxis: 30, eccentricity: 0.0489, inclinationDeg: 1.303, orbitalPeriodDays: 4_332.59, phase: phaseAtSnapshot('jupiter') },
  },
  saturn: {
    id: 'saturn',
    name: 'Saturne',
    nameEn: 'Saturn',
    kind: 'planet',
    color: '#e3c88f',
    meanRadiusKm: 58_232,
    solarRadius: 2.08,
    detailRadius: 4.35,
    axialTiltDeg: 26.73,
    rotationHours: 10.656,
    flattening: 0.097_96,
    texture: {
      albedo: texture('saturn-color.jpg'),
      rings: texture('saturn-rings-rgba.png'),
    },
    ring: { innerRadiusRatio: 1.25, outerRadiusRatio: 2.25, opacity: 0.92 },
    orbit: { semiMajorAxis: 39, eccentricity: 0.0565, inclinationDeg: 2.485, orbitalPeriodDays: 10_759.22, phase: phaseAtSnapshot('saturn') },
  },
  uranus: {
    id: 'uranus',
    name: 'Uranus',
    nameEn: 'Uranus',
    kind: 'planet',
    color: '#9fd8e0',
    meanRadiusKm: 25_362,
    solarRadius: 1.45,
    detailRadius: 4.1,
    axialTiltDeg: 97.77,
    rotationHours: 17.24,
    flattening: 0.022_93,
    texture: { albedo: texture('uranus-color.jpg') },
    orbit: { semiMajorAxis: 47.5, eccentricity: 0.0463, inclinationDeg: 0.773, orbitalPeriodDays: 30_688.5, phase: phaseAtSnapshot('uranus') },
  },
  neptune: {
    id: 'neptune',
    name: 'Neptune',
    nameEn: 'Neptune',
    kind: 'planet',
    color: '#4a72c8',
    meanRadiusKm: 24_622,
    solarRadius: 1.4,
    detailRadius: 4.1,
    axialTiltDeg: 28.32,
    rotationHours: 16.11,
    flattening: 0.017_08,
    texture: { albedo: texture('neptune-color.jpg') },
    orbit: { semiMajorAxis: 56, eccentricity: 0.0095, inclinationDeg: 1.77, orbitalPeriodDays: 60_182, phase: phaseAtSnapshot('neptune') },
  },
};

export const solarBodyIds = [
  'mercury',
  'venus',
  'earth',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
] as const satisfies readonly SceneBodyId[];

export const sceneCameraPresets: Readonly<Record<UniverseView, SceneCameraPreset>> = {
  earth: {
    position: [0, 4.2, 18],
    target: [0, 0, 0],
    fov: 46,
    minDistance: 8,
    maxDistance: 42,
  },
  solar: {
    position: [0, 43, 72],
    target: [0, 0, 0],
    fov: 48,
    minDistance: 28,
    maxDistance: 145,
  },
  planet: {
    position: [0, 2.2, 14],
    target: [0, 0, 0],
    fov: 43,
    minDistance: 7,
    maxDistance: 34,
  },
  milkyway: {
    position: [0, 90, 120],
    target: [0, 0, 0],
    fov: 50,
    minDistance: 40,
    maxDistance: 350,
  },
  localgroup: {
    position: [0, 20, 45],
    target: [0, 0, 0],
    fov: 52,
    minDistance: 12,
    maxDistance: 120,
  },
  deepsky: {
    position: [0, 3, 18],
    target: [0, 0, 0],
    fov: 45,
    minDistance: 6,
    maxDistance: 50,
  },
};

export const sceneRenderConfig = {
  /** At ×1, one Earth orbit lasts this many real seconds. */
  earthYearSeconds: 90,
  /** At ×1, one Earth spin lasts this many real seconds. */
  earthDaySeconds: 12,
  background: '#03060f',
  labelColor: '#eaf6ff',
  selectionColor: '#63e6ff',
  hoverColor: '#9df0ff',
} as const;

/** Upper-case alias for consumers that prefer constant-style imports. */
export const SCENE_CATALOG = sceneCatalog;

const referenceEpochMs = new Date(EPHEMERIS_SNAPSHOT.epoch).getTime();
const MS_PER_DAY = 86_400_000;

/**
 * Compute orbital phases for all bodies at a given date using mean-motion
 * propagation from the ephemeris reference epoch. This is a first-order
 * Keplerian approximation sufficient for educational visualisation.
 */
export function computePhasesAtDate(targetDate: Date): Partial<Record<SceneBodyId, number>> {
  const elapsedDays = (targetDate.getTime() - referenceEpochMs) / MS_PER_DAY;
  const phases: Partial<Record<SceneBodyId, number>> = {};

  for (const id of solarBodyIds) {
    const body = sceneCatalog[id];
    if (body.orbit) {
      phases[id] = body.orbit.phase + (2 * Math.PI / body.orbit.orbitalPeriodDays) * elapsedDays;
    }
  }

  const moon = sceneCatalog.moon;
  if (moon.orbit) {
    phases.moon = moon.orbit.phase + (2 * Math.PI / moon.orbit.orbitalPeriodDays) * elapsedDays;
  }

  return phases;
}
