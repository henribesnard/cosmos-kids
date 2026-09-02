/**
 * Scene-level utilities for rendering the celestial sphere with constellations.
 *
 * Coordinates use the standard equatorial system (J2000):
 *   RA  = Right Ascension in degrees [0, 360]
 *   Dec = Declination in degrees [-90, +90]
 *
 * Three.js mapping:
 *   The celestial sphere is a sphere of radius CELESTIAL_SPHERE_RADIUS.
 *   RA = 0 maps to +Z, RA increases toward +X (eastward).
 *   Dec = 0 maps to the equatorial plane (XZ), +90 to +Y (north celestial pole).
 *
 * Sources:
 *   - Star positions: Hipparcos catalogue (ESA) via d3-celestial
 *   - Constellation stick figures: Olaf Frohn / d3-celestial (BSD-3-Clause)
 */

import type { GeneratedConstellationData } from '../data/constellationTypes';
import generatedData from '../generated/constellations.json';

export const CONSTELLATION_SOURCES = {
  starPositions: {
    label: 'Hipparcos catalogue (ESA) via d3-celestial',
    url: 'https://github.com/ofrohn/d3-celestial',
  },
  stickFigures: {
    label: 'Olaf Frohn / d3-celestial (BSD-3-Clause)',
    url: 'https://github.com/ofrohn/d3-celestial',
  },
  boundaries: {
    label: 'IAU / Davenhall & Leggett 1989',
    url: 'https://cdsarc.cds.unistra.fr/viz-bin/ReadMe/VI/49',
  },
} as const;

/** Scene-unit radius for the celestial sphere. */
export const CELESTIAL_SPHERE_RADIUS = 200;

const DEG_TO_RAD = Math.PI / 180;

/**
 * Convert equatorial (RA, Dec) to Three.js Cartesian on a sphere.
 * Y is up (north celestial pole), XZ is the equatorial plane.
 */
export function equatorialToCartesian(
  raDeg: number,
  decDeg: number,
  radius: number = CELESTIAL_SPHERE_RADIUS,
): readonly [number, number, number] {
  const ra = raDeg * DEG_TO_RAD;
  const dec = decDeg * DEG_TO_RAD;
  const cosDec = Math.cos(dec);
  return [
    Math.sin(ra) * cosDec * radius,    // X: east
    Math.sin(dec) * radius,             // Y: north
    Math.cos(ra) * cosDec * radius,     // Z: toward RA=0
  ];
}

/**
 * Map B-V colour index to a compact educational colour palette.
 */
export function bvToColor(bv: number | null): readonly [number, number, number] {
  if (bv == null) return [1, 1, 1];
  const clamped = Math.max(-0.4, Math.min(2.0, bv));

  // Hot stars appear blue-white; cool stars orange-red.
  if (clamped < -0.1) return [0.65, 0.75, 1.0];    // O/B: blue
  if (clamped < 0.15) return [0.8, 0.87, 1.0];      // A: blue-white
  if (clamped < 0.4) return [1.0, 0.97, 0.9];       // F: white-yellow
  if (clamped < 0.7) return [1.0, 0.93, 0.75];      // G: yellow
  if (clamped < 1.0) return [1.0, 0.82, 0.55];      // K: orange
  return [1.0, 0.7, 0.4];                            // M: red-orange
}

/**
 * Map visual magnitude to a point size (in scene units).
 * Brighter stars (lower mag) get larger points.
 */
export function magnitudeToSize(mag: number): number {
  // Magnitude 0 → size 3.5, magnitude 5.5 → size 0.3
  const t = Math.max(0, Math.min(1, (5.5 - mag) / 5.5));
  return 0.3 + t * t * 3.2;
}

/** Type-assert the generated JSON import. */
export const constellationData = generatedData as unknown as GeneratedConstellationData;

/**
 * Return the normalised centroid direction of a constellation's stick figure,
 * or `null` if the constellation has no line data.
 * The result is a unit vector on a sphere of radius 1.
 */
export function getConstellationCentroidDirection(
  id: string,
): readonly [number, number, number] | null {
  const lineGroups = constellationData.constellationLines[id];
  if (!lineGroups) return null;

  let cx = 0, cy = 0, cz = 0, count = 0;
  for (const lineString of lineGroups) {
    for (const [ra, dec] of lineString) {
      const [x, y, z] = equatorialToCartesian(ra, dec, 1);
      cx += x;
      cy += y;
      cz += z;
      count++;
    }
  }

  if (count === 0) return null;
  cx /= count;
  cy /= count;
  cz /= count;
  const len = Math.sqrt(cx * cx + cy * cy + cz * cz);
  if (len < 0.001) return null;
  return [cx / len, cy / len, cz / len];
}
