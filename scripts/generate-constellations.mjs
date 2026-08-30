#!/usr/bin/env node

/**
 * Fetch constellation line-figure and star data from the d3-celestial
 * project (BSD-3-Clause) and transform it into a compact JSON file
 * consumed by the runtime constellation renderer.
 *
 * Sources:
 *  - Constellation stick figures: Olaf Frohn / d3-celestial
 *  - Star positions: Hipparcos catalogue (ESA) via d3-celestial
 *
 * Usage:  node scripts/generate-constellations.mjs
 * Output: src/generated/constellations.json
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUTPUT_URL = new URL('../src/generated/constellations.json', import.meta.url);
const OUTPUT_PATH = fileURLToPath(OUTPUT_URL);

const D3_BASE = 'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data';
const STARS_URL = `${D3_BASE}/stars.6.json`;
const LINES_URL = `${D3_BASE}/constellations.lines.json`;

const TIMEOUT_MS = 30_000;

/* ------------------------------------------------------------------ */

async function fetchJSON(url) {
  console.log(`  Fetching ${url} ...`);
  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'User-Agent': 'cosmos-kids-data-generator/1.0' },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.json();
}

/**
 * D3-celestial stores RA as longitude in [-180, 180].
 * We convert back to standard RA [0, 360] degrees.
 */
function normRA(longitude) {
  const ra = longitude < 0 ? longitude + 360 : longitude;
  return Math.round(ra * 10000) / 10000;
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

/* ------------------------------------------------------------------ */

async function main() {
  console.log('Generating constellation data for Cosmos Kids...\n');

  // 1. Fetch star data
  const starsGeoJSON = await fetchJSON(STARS_URL);
  console.log(`  Got ${starsGeoJSON.features.length} stars\n`);

  // Process stars: extract only what we need
  const stars = [];
  for (const feature of starsGeoJSON.features) {
    const props = feature.properties;
    const [lon, lat] = feature.geometry.coordinates;

    // Only include stars to magnitude 5.5 (enough for visible sky)
    if (props.mag > 5.5) continue;

    stars.push({
      id: props.id,             // Hipparcos ID
      ra: normRA(lon),          // Right Ascension in degrees [0, 360]
      dec: round4(lat),         // Declination in degrees [-90, 90]
      mag: round4(props.mag),   // Visual magnitude
      bv: props.bv != null ? round4(props.bv) : null,  // B-V color index
      name: props.name || null, // Proper name (e.g. "Sirius")
      con: props.con || null,   // Constellation abbreviation (e.g. "CMa")
    });
  }

  // Sort by magnitude (brightest first)
  stars.sort((a, b) => a.mag - b.mag);

  console.log(`  Kept ${stars.length} stars (mag <= 5.5)\n`);

  // 2. Fetch constellation line data
  const linesGeoJSON = await fetchJSON(LINES_URL);
  console.log(`  Got ${linesGeoJSON.features.length} constellation line sets\n`);

  // Process constellation lines
  const constellationLines = {};
  for (const feature of linesGeoJSON.features) {
    const abbr = feature.id;
    const geometry = feature.geometry;

    if (geometry.type === 'MultiLineString') {
      constellationLines[abbr] = geometry.coordinates.map((lineString) =>
        lineString.map(([lon, lat]) => [normRA(lon), round4(lat)])
      );
    }
  }

  const constellationCount = Object.keys(constellationLines).length;
  const totalSegments = Object.values(constellationLines)
    .flat()
    .reduce((sum, line) => sum + Math.max(0, line.length - 1), 0);

  console.log(`  Processed ${constellationCount} constellations, ${totalSegments} line segments\n`);

  // 3. Build unique constellation abbreviation list
  const allAbbrs = new Set([
    ...Object.keys(constellationLines),
    ...stars.filter((s) => s.con).map((s) => s.con),
  ]);

  // 4. Write output
  const output = {
    _meta: {
      generator: 'scripts/generate-constellations.mjs',
      generatedAt: new Date().toISOString(),
      starSource: 'Hipparcos catalogue (ESA) via d3-celestial',
      lineSource: 'Olaf Frohn / d3-celestial (BSD-3-Clause)',
      starCount: stars.length,
      constellationCount,
      lineSegmentCount: totalSegments,
    },
    stars,
    constellationLines,
    abbreviations: [...allAbbrs].sort(),
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(output), 'utf-8');

  const sizeMB = (JSON.stringify(output).length / (1024 * 1024)).toFixed(2);
  console.log(`  Written to ${OUTPUT_PATH} (${sizeMB} MB)\n`);
  console.log('Done!');
}

main().catch((error) => {
  console.error('Failed:', error.message);
  process.exit(1);
});
