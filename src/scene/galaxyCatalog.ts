/**
 * Render catalogue for the Milky Way galaxy and Local Group views.
 *
 * All distances are in normalised galaxy units where 1.0 = galactic disk
 * radius (~50 000 ly). Spiral arms follow logarithmic spirals:
 *   r(θ) = r₀ · exp(θ · tan(pitch))
 *
 * Sources:
 *  - Reid et al. 2019 (BeSSeL) — spiral arm geometry
 *  - Bland-Hawthorn & Gerhard 2016 (ARA&A) — overall structure
 *  - GRAVITY Collaboration 2019 — Sun-center distance
 *  - Vallée 2015 — pitch angles
 */

import type { DeepSkyObjectId, LocalizedText } from '../data/types';

/* ------------------------------------------------------------------ */
/*  Milky Way structural constants                                    */
/* ------------------------------------------------------------------ */

/** Physical radius of the Milky Way disk in light-years. */
export const MW_DISK_RADIUS_LY = 50_000;

/** Sun's distance from galactic centre, normalised (26 700 / 50 000). */
export const SUN_GALACTIC_R = 0.534;

/** Number of scene units for the galaxy disk radius. */
export const MW_SCENE_RADIUS = 80;

/** Disk thickness relative to radius (thin disk visual). */
export const MW_DISK_THICKNESS_RATIO = 0.012;

/* ------------------------------------------------------------------ */
/*  Spiral arm definitions                                            */
/* ------------------------------------------------------------------ */

export interface SpiralArmDef {
  id: string;
  name: LocalizedText;
  /** Pitch angle in degrees. */
  pitchDeg: number;
  /** Starting azimuth in radians (0 = Sun–Centre line, CCW from North Galactic Pole). */
  startAzimuth: number;
  /** Galactocentric radius where the arm begins (normalised to disk). */
  startRadius: number;
  /** Winding range in radians (how far the arm extends). */
  windRange: number;
  /** Base colour for the arm's young stellar population. */
  color: string;
  /** HII / nebula tint overlaid on the arm ridge. */
  nebulaColor: string;
}

export const SPIRAL_ARMS: readonly SpiralArmDef[] = [
  {
    id: 'scutum-centaurus',
    name: { fr: 'Écu-Centaure', en: 'Scutum-Centaurus' },
    pitchDeg: 12.8,
    startAzimuth: 0.47,   // ~27°
    startRadius: 0.07,
    windRange: 5.6,
    color: '#a0c8ff',
    nebulaColor: '#ff6888',
  },
  {
    id: 'perseus',
    name: { fr: 'Persée', en: 'Perseus' },
    pitchDeg: 9.4,
    startAzimuth: 3.61,   // ~207°
    startRadius: 0.07,
    windRange: 5.6,
    color: '#90b8ff',
    nebulaColor: '#ff5070',
  },
  {
    id: 'sagittarius-carina',
    name: { fr: 'Sagittaire-Carène', en: 'Sagittarius-Carina' },
    pitchDeg: 11.1,
    startAzimuth: 1.36,   // ~78°
    startRadius: 0.07,
    windRange: 5.2,
    color: '#b0d0ff',
    nebulaColor: '#ff7090',
  },
  {
    id: 'norma',
    name: { fr: 'Norma', en: 'Norma' },
    pitchDeg: 11.0,
    startAzimuth: 4.50,   // ~258°
    startRadius: 0.07,
    windRange: 5.2,
    color: '#a0c0ff',
    nebulaColor: '#ff6080',
  },
  {
    id: 'orion-spur',
    name: { fr: 'Éperon d\u2019Orion', en: 'Orion Spur' },
    pitchDeg: 10.1,
    startAzimuth: 2.79,   // ~160° — between Sagittarius and Perseus
    startRadius: 0.38,
    windRange: 1.8,        // shorter spur
    color: '#c0d8ff',
    nebulaColor: '#ff90a0',
  },
];

/* ------------------------------------------------------------------ */
/*  Deep-sky object positions in the galaxy (normalised coordinates)   */
/* ------------------------------------------------------------------ */

export interface GalaxyObjectPosition {
  id: DeepSkyObjectId;
  /** Galactocentric radius, normalised (0 = centre, 1 = edge). */
  r: number;
  /** Galactic azimuth in radians from the Sun–Centre line. */
  theta: number;
  /** Vertical offset from the midplane (normalised). */
  z: number;
}

/**
 * Approximate positions of deep-sky objects within the Milky Way.
 * These are educational approximations, not precise astrometric values.
 */
export const GALAXY_OBJECT_POSITIONS: readonly GalaxyObjectPosition[] = [
  // Sgr A* — at the galactic centre
  { id: 'sgr-a', r: 0, theta: 0, z: 0 },
  // Orion Nebula — in the Orion Spur, near the Sun
  { id: 'orion-nebula', r: 0.507, theta: 3.14, z: 0 },
  // Eagle Nebula — on the Sagittarius-Carina arm
  { id: 'eagle-nebula', r: 0.42, theta: 2.53, z: 0 },
  // Crab Nebula — in the Perseus arm region
  { id: 'crab-nebula', r: 0.60, theta: 3.49, z: 0 },
  // Carina Nebula — on the Sagittarius-Carina arm
  { id: 'carina-nebula', r: 0.39, theta: 1.92, z: 0 },
  // Ring Nebula — in the Orion Spur, near the Sun
  { id: 'ring-nebula', r: 0.51, theta: 3.05, z: 0 },
  // Horsehead Nebula — in the Orion Spur
  { id: 'horsehead-nebula', r: 0.507, theta: 3.16, z: 0 },
  // Omega Centauri — in the halo, below the disk
  { id: 'omega-centauri', r: 0.34, theta: 2.09, z: -0.02 },
  // Pleiades — very close to the Sun
  { id: 'pleiades', r: 0.525, theta: 3.05, z: 0.002 },
];

/* ------------------------------------------------------------------ */
/*  Local Group galaxy definitions                                    */
/* ------------------------------------------------------------------ */

export interface LocalGroupGalaxyDef {
  id: DeepSkyObjectId | 'milkyway';
  name: LocalizedText;
  /** Distance from the Milky Way centre in light-years. */
  distanceLy: number;
  /** Apparent diameter in light-years. */
  diameterLy: number;
  /** 3D position relative to the Milky Way, in normalised units
   *  (1 unit = 1 million light-years). */
  position: readonly [number, number, number];
  color: string;
  /** Visual scale factor for rendering. */
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
    sceneScale: 1.0,
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

/* ------------------------------------------------------------------ */
/*  Galactic bulge / core visual parameters                           */
/* ------------------------------------------------------------------ */

export const GALACTIC_CORE = {
  /** Bulge semi-major axis as fraction of disk radius (bar direction). */
  bulgeRadiusMajor: 0.20,
  /** Bulge semi-minor axis (perpendicular to bar in disk plane). */
  bulgeRadiusMinor: 0.09,
  /** Bulge height above/below the plane. */
  bulgeHeight: 0.08,
  /** Bar rotation relative to Sun-Centre line (radians, ~27°). */
  barAngle: 0.47,
  /** Core colours. */
  coreColor: '#ffcc60',
  barColor: '#ff9920',
} as const;

/* ------------------------------------------------------------------ */
/*  Utility: compute logarithmic spiral points                        */
/* ------------------------------------------------------------------ */

/**
 * Generate points along a logarithmic spiral arm.
 * Returns an array of [x, y, z] positions in scene units.
 */
export function generateSpiralPoints(
  arm: SpiralArmDef,
  sceneRadius: number,
  count: number,
): Float32Array {
  const pitchRad = (arm.pitchDeg * Math.PI) / 180;
  const tanPitch = Math.tan(pitchRad);
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const t = i / count;
    const theta = arm.startAzimuth + t * arm.windRange;
    const r = arm.startRadius * Math.exp((theta - arm.startAzimuth) * tanPitch);

    // Clamp to disk radius
    if (r > 1.05) {
      // Place remaining particles at the edge with random scatter
      const edgeTheta = arm.startAzimuth + arm.windRange * (0.8 + Math.random() * 0.2);
      const edgeR = 0.9 + Math.random() * 0.15;
      positions[i * 3] = Math.cos(edgeTheta) * edgeR * sceneRadius;
      positions[i * 3 + 2] = Math.sin(edgeTheta) * edgeR * sceneRadius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * MW_DISK_THICKNESS_RATIO * sceneRadius * 2;
      continue;
    }

    // Add scatter perpendicular to the arm (width ~0.02-0.04 of radius)
    const spreadFactor = 0.025 + r * 0.015;
    const perpAngle = theta + Math.PI / 2;
    const spread = (Math.random() - 0.5) * 2 * spreadFactor;

    const x = Math.cos(theta) * r + Math.cos(perpAngle) * spread;
    const z = Math.sin(theta) * r + Math.sin(perpAngle) * spread;
    const y = (Math.random() - 0.5) * MW_DISK_THICKNESS_RATIO * (1 + (1 - r) * 0.5);

    positions[i * 3] = x * sceneRadius;
    positions[i * 3 + 1] = y * sceneRadius;
    positions[i * 3 + 2] = z * sceneRadius;
  }

  return positions;
}
