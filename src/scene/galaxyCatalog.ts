/**
 * Scientific reconstruction parameters for the Milky Way and Local Group.
 *
 * A face-on image of the Milky Way cannot be a photograph: we observe the
 * Galaxy from inside its disk. The runtime therefore keeps two layers apart:
 *
 *  - appearance: ESA/Gaia/DPAC 2025 artist's impression;
 *  - geometry: a simplified, educational reconstruction informed by the
 *    maser spiral-arm model of Reid et al. (2019).
 *
 * The arm curves are deliberately smooth visual guides. They do not claim to
 * reproduce every kink or uncertain continuation in Reid et al. Table 2.
 */

import type { DeepSkyObjectId, LocalizedText } from '../data/types';

export const MILKY_WAY_SOURCES = {
  appearance: {
    label: 'ESA/Gaia/DPAC 2025 — artist’s impression',
    url: 'https://www.esa.int/ESA_Multimedia/Images/2025/01/The_best_Milky_Way_map_by_Gaia',
  },
  spiralGeometry: {
    label: 'Reid et al. 2019 — BeSSeL maser parallaxes, Table 2',
    url: 'https://doi.org/10.3847/1538-4357/ab4a11',
  },
  centralBar: {
    label: 'Wegg, Gerhard & Portail 2015',
    url: 'https://doi.org/10.1093/mnras/stv745',
  },
  objectDirections: {
    label: 'CDS/SIMBAD astronomical database',
    url: 'https://simbad.cds.unistra.fr/simbad/',
  },
} as const;

/* ------------------------------------------------------------------ */
/*  Milky Way reference frame                                         */
/* ------------------------------------------------------------------ */

export const LIGHT_YEARS_PER_KPC = 3_261.56;

/** Educational visible-disk radius (about 15.3 kpc / 50,000 ly). */
export const MW_DISK_RADIUS_LY = 50_000;
export const MW_DISK_RADIUS_KPC = MW_DISK_RADIUS_LY / LIGHT_YEARS_PER_KPC;

/** Reid et al. (2019): R0 = 8.15 ± 0.15 kpc. */
export const SUN_GALACTIC_DISTANCE_KPC = 8.15;
export const SUN_GALACTIC_R = SUN_GALACTIC_DISTANCE_KPC / MW_DISK_RADIUS_KPC;

/** Number of Three.js scene units used for the visible disk radius. */
export const MW_SCENE_RADIUS = 80;

/** Thin-disk visual thickness; intentionally enlarged enough to remain visible. */
export const MW_DISK_THICKNESS_RATIO = 0.012;

/* ------------------------------------------------------------------ */
/*  Spiral arm reconstruction                                         */
/* ------------------------------------------------------------------ */

export type SpiralArmRole = 'major-stellar' | 'star-forming' | 'local';

export interface SpiralArmDef {
  id: string;
  name: LocalizedText;
  role: SpiralArmRole;
  /** Representative pitch angle in degrees. */
  pitchDeg: number;
  /** Starting azimuth in radians; 0 points from the centre toward the Sun. */
  startAzimuth: number;
  /** Starting radius, normalised to the visible disk radius. */
  startRadius: number;
  /** Angular range of this smooth educational guide. */
  windRange: number;
  /** Observed 1-sigma arm width around the solar neighbourhood, in kpc. */
  widthKpc: number;
  color: string;
  nebulaColor: string;
  /** Stable anchor along the curve for the screen-space label. */
  labelT: number;
  labelPriority: number;
}

/**
 * The four long guides reach the outer disk instead of stopping inside the
 * solar circle. Their pitch angles remain close to Reid et al. (2019), while
 * their unobserved continuations are explicitly treated as visual inference.
 *
 * Scutum–Centaurus and Perseus are emphasised as the two strongest old-star
 * arms in the NASA/Spitzer interpretation. Sagittarius–Carina and
 * Norma–Outer remain visible as star-forming/gas-rich arms, consistent with
 * the four-arm maser reconstruction. The Local/Orion arm is a short segment.
 */
export const SPIRAL_ARMS: readonly SpiralArmDef[] = [
  {
    id: 'scutum-centaurus',
    name: { fr: 'Écu–Centaure', en: 'Scutum–Centaurus' },
    role: 'major-stellar',
    pitchDeg: 12.8,
    startAzimuth: 0.52,
    startRadius: 0.31,
    windRange: 5.25,
    widthKpc: 0.23,
    color: '#86a9d7',
    nebulaColor: '#d26a7c',
    labelT: 0.62,
    labelPriority: 82,
  },
  {
    id: 'perseus',
    name: { fr: 'Persée', en: 'Perseus' },
    role: 'major-stellar',
    pitchDeg: 9.4,
    startAzimuth: 0.52 + Math.PI,
    startRadius: 0.3,
    windRange: 7.3,
    widthKpc: 0.35,
    color: '#7d9cca',
    nebulaColor: '#c85b75',
    labelT: 0.68,
    labelPriority: 83,
  },
  {
    id: 'sagittarius-carina',
    name: { fr: 'Sagittaire–Carène', en: 'Sagittarius–Carina' },
    role: 'star-forming',
    pitchDeg: 11.1,
    startAzimuth: 2.09,
    startRadius: 0.36,
    windRange: 5.25,
    widthKpc: 0.27,
    color: '#748db6',
    nebulaColor: '#c66b82',
    labelT: 0.66,
    labelPriority: 78,
  },
  {
    id: 'norma-outer',
    name: { fr: 'Norma–Externe', en: 'Norma–Outer' },
    role: 'star-forming',
    pitchDeg: 11,
    startAzimuth: 5.24,
    startRadius: 0.29,
    windRange: 6.5,
    widthKpc: 0.32,
    color: '#6f89ae',
    nebulaColor: '#bd6079',
    labelT: 0.72,
    labelPriority: 77,
  },
  {
    id: 'local-orion',
    name: { fr: 'Bras local (Orion)', en: 'Local (Orion) Arm' },
    role: 'local',
    pitchDeg: 11.4,
    // This curve crosses r ≈ R0 at azimuth 0, so the Sun sits on it.
    startAzimuth: -0.5,
    startRadius: 0.48,
    windRange: 1.25,
    widthKpc: 0.31,
    color: '#70c7d8',
    nebulaColor: '#d98c9d',
    labelT: 0.35,
    labelPriority: 88,
  },
];

/** Point on an arm centreline. The disk lies in the XZ plane. */
export function spiralPointAt(
  arm: SpiralArmDef,
  t: number,
  sceneRadius = MW_SCENE_RADIUS,
): readonly [number, number, number] {
  const clampedT = Math.min(1, Math.max(0, t));
  const pitch = (arm.pitchDeg * Math.PI) / 180;
  const theta = arm.startAzimuth + clampedT * arm.windRange;
  const radius = arm.startRadius * Math.exp(clampedT * arm.windRange * Math.tan(pitch));

  // theta = 0 is the Sun–centre line (+Z); increasing theta turns toward +X.
  return [
    Math.sin(theta) * radius * sceneRadius,
    0,
    Math.cos(theta) * radius * sceneRadius,
  ];
}

function hashString(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

/** Small deterministic PRNG used to keep procedural renders reproducible. */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function gaussian(random: () => number): number {
  const u = Math.max(1e-7, random());
  const v = Math.max(1e-7, random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Deterministic density band around a logarithmic arm centreline. */
export function generateSpiralPoints(
  arm: SpiralArmDef,
  sceneRadius: number,
  count: number,
): Float32Array {
  const positions = new Float32Array(count * 3);
  const random = createSeededRandom(hashString(`cosmos-kids:${arm.id}`));
  const widthNormalised = arm.widthKpc / MW_DISK_RADIUS_KPC;

  for (let index = 0; index < count; index += 1) {
    const t = Math.min(1, (index + random() * 0.8) / count);
    const pitch = (arm.pitchDeg * Math.PI) / 180;
    const theta = arm.startAzimuth + t * arm.windRange;
    const radius = arm.startRadius * Math.exp(t * arm.windRange * Math.tan(pitch));
    const scatter = gaussian(random) * widthNormalised * (0.7 + radius * 0.65);
    const vertical = gaussian(random) * MW_DISK_THICKNESS_RATIO * (1.15 - radius * 0.35);
    const perpendicular = theta + Math.PI / 2;

    positions[index * 3] =
      (Math.sin(theta) * radius + Math.sin(perpendicular) * scatter) * sceneRadius;
    positions[index * 3 + 1] = vertical * sceneRadius;
    positions[index * 3 + 2] =
      (Math.cos(theta) * radius + Math.cos(perpendicular) * scatter) * sceneRadius;
  }

  return positions;
}

/* ------------------------------------------------------------------ */
/*  Deep-sky positions                                                */
/* ------------------------------------------------------------------ */

export interface GalaxyObjectPosition {
  id: DeepSkyObjectId;
  /** IAU Galactic longitude and latitude, in degrees. */
  galacticLongitudeDeg: number;
  galacticLatitudeDeg: number;
  /** Heliocentric distance used by the rendered marker. */
  distanceLy: number;
  coordinateSourceUrl: string;
}

const SIMBAD = 'https://simbad.cds.unistra.fr/simbad/sim-id?Ident=';

/**
 * Directions are from SIMBAD and distances match the educational catalogue.
 * This keeps each marker's rendered distance from the Sun internally
 * consistent. Arm membership remains an approximation because distances and
 * Milky Way arm boundaries have significant uncertainties.
 */
export const GALAXY_OBJECT_POSITIONS: readonly GalaxyObjectPosition[] = [
  {
    id: 'sgr-a',
    galacticLongitudeDeg: 0,
    galacticLatitudeDeg: 0,
    distanceLy: SUN_GALACTIC_DISTANCE_KPC * LIGHT_YEARS_PER_KPC,
    coordinateSourceUrl: `${SIMBAD}Sgr+A*`,
  },
  {
    id: 'orion-nebula',
    galacticLongitudeDeg: 209.01,
    galacticLatitudeDeg: -19.38,
    distanceLy: 1_344,
    coordinateSourceUrl: `${SIMBAD}M+42`,
  },
  {
    id: 'eagle-nebula',
    galacticLongitudeDeg: 16.95,
    galacticLatitudeDeg: 0.79,
    distanceLy: 5_700,
    coordinateSourceUrl: `${SIMBAD}M+16`,
  },
  {
    id: 'crab-nebula',
    galacticLongitudeDeg: 184.56,
    galacticLatitudeDeg: -5.78,
    distanceLy: 6_500,
    coordinateSourceUrl: `${SIMBAD}M+1`,
  },
  {
    id: 'carina-nebula',
    galacticLongitudeDeg: 287.6,
    galacticLatitudeDeg: -0.63,
    distanceLy: 7_500,
    coordinateSourceUrl: `${SIMBAD}NGC+3372`,
  },
  {
    id: 'ring-nebula',
    galacticLongitudeDeg: 63.17,
    galacticLatitudeDeg: 13.98,
    distanceLy: 2_300,
    coordinateSourceUrl: `${SIMBAD}M+57`,
  },
  {
    id: 'horsehead-nebula',
    galacticLongitudeDeg: 206.85,
    galacticLatitudeDeg: -16.96,
    distanceLy: 1_350,
    coordinateSourceUrl: `${SIMBAD}Barnard+33`,
  },
  {
    id: 'omega-centauri',
    galacticLongitudeDeg: 309.1,
    galacticLatitudeDeg: 14.97,
    distanceLy: 17_000,
    coordinateSourceUrl: `${SIMBAD}NGC+5139`,
  },
  {
    id: 'pleiades',
    galacticLongitudeDeg: 166.57,
    galacticLatitudeDeg: -23.52,
    distanceLy: 444,
    coordinateSourceUrl: `${SIMBAD}M+45`,
  },
];

/** Convert heliocentric Galactic coordinates into the scene's X/Y/Z frame. */
export function galaxyObjectScenePosition(
  object: GalaxyObjectPosition,
  sceneRadius = MW_SCENE_RADIUS,
): readonly [number, number, number] {
  const longitude = (object.galacticLongitudeDeg * Math.PI) / 180;
  const latitude = (object.galacticLatitudeDeg * Math.PI) / 180;
  const distance = object.distanceLy / MW_DISK_RADIUS_LY;
  const planarDistance = distance * Math.cos(latitude);

  return [
    Math.sin(longitude) * planarDistance * sceneRadius,
    Math.sin(latitude) * distance * sceneRadius,
    (SUN_GALACTIC_R - Math.cos(longitude) * planarDistance) * sceneRadius,
  ];
}

export const SUN_SCENE_POSITION = [
  0,
  0,
  SUN_GALACTIC_R * MW_SCENE_RADIUS,
] as const;

/* ------------------------------------------------------------------ */
/*  Local Group                                                      */
/* ------------------------------------------------------------------ */

export interface LocalGroupGalaxyDef {
  id: DeepSkyObjectId | 'milkyway';
  name: LocalizedText;
  distanceLy: number;
  diameterLy: number;
  /** 1 scene unit = 1 million light-years. */
  position: readonly [number, number, number];
  color: string;
  sceneScale: number;
}

export const LOCAL_GROUP_GALAXIES: readonly LocalGroupGalaxyDef[] = [
  {
    id: 'milkyway',
    name: { fr: 'Voie lactée', en: 'Milky Way' },
    distanceLy: 0,
    diameterLy: 100_000,
    position: [0, 0, 0],
    color: '#ffe8a0',
    sceneScale: 1,
  },
  {
    id: 'andromeda',
    name: { fr: 'Andromède (M31)', en: 'Andromeda (M31)' },
    distanceLy: 2_537_000,
    diameterLy: 220_000,
    position: [2.2, 0.4, -1.1],
    color: '#a0a0d0',
    sceneScale: 2.2,
  },
  {
    id: 'triangulum',
    name: { fr: 'Triangle (M33)', en: 'Triangulum (M33)' },
    distanceLy: 2_730_000,
    diameterLy: 60_000,
    position: [2.4, 0.6, -0.5],
    color: '#8090c0',
    sceneScale: 0.6,
  },
  {
    id: 'lmc',
    name: { fr: 'Grand Nuage de Magellan', en: 'Large Magellanic Cloud' },
    distanceLy: 163_000,
    diameterLy: 14_000,
    position: [-0.1, -0.05, 0.14],
    color: '#c0b890',
    sceneScale: 0.25,
  },
  {
    id: 'smc',
    name: { fr: 'Petit Nuage de Magellan', en: 'Small Magellanic Cloud' },
    distanceLy: 200_000,
    diameterLy: 7_000,
    position: [-0.05, -0.08, 0.18],
    color: '#b0a880',
    sceneScale: 0.14,
  },
];

export const GALACTIC_CORE = {
  bulgeRadiusMajor: 0.23,
  bulgeRadiusMinor: 0.1,
  bulgeHeight: 0.06,
  /** Wegg et al. (2015): long-bar half length 5.0 ± 0.2 kpc. */
  barHalfLength: 5 / MW_DISK_RADIUS_KPC,
  /** Representative 30° angle inside the published 28–33° interval. */
  barAngle: Math.PI / 6,
  coreColor: '#f2c58d',
  barColor: '#b77b55',
} as const;
