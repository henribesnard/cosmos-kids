#!/usr/bin/env node

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const HORIZONS_ENDPOINT = 'https://ssd.jpl.nasa.gov/api/horizons.api';
const OUTPUT_URL = new URL('../src/generated/ephemeris.json', import.meta.url);
const OUTPUT_PATH = fileURLToPath(OUTPUT_URL);
const TEMP_PATH = `${OUTPUT_PATH}.tmp`;
const DEFAULT_TIMEOUT_MS = 30_000;

const BODIES = [
  { bodyId: 'mercury', jplId: 199, name: 'Mercury' },
  { bodyId: 'venus', jplId: 299, name: 'Venus' },
  { bodyId: 'earth', jplId: 399, name: 'Earth' },
  { bodyId: 'mars', jplId: 499, name: 'Mars' },
  { bodyId: 'jupiter', jplId: 599, name: 'Jupiter' },
  { bodyId: 'saturn', jplId: 699, name: 'Saturn' },
  { bodyId: 'uranus', jplId: 799, name: 'Uranus' },
  { bodyId: 'neptune', jplId: 899, name: 'Neptune' },
];

function readArgument(name) {
  const inline = process.argv.find((argument) => argument.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);

  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function normaliseEpoch(value) {
  const epoch = new Date(value);
  if (Number.isNaN(epoch.getTime())) {
    throw new Error(`Époque ISO invalide : ${value}`);
  }
  return epoch.toISOString();
}

function defaultEpoch() {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return now.toISOString();
}

function horizonsCalendarDate(date) {
  return date.toISOString().replace(/\.\d{3}Z$/, '');
}

function createQuery(body, epoch) {
  const start = new Date(epoch);
  const stop = new Date(start.getTime() + 2 * 60_000);
  const parameters = new URLSearchParams({
    format: 'json',
    COMMAND: `'${body.jplId}'`,
    OBJ_DATA: 'NO',
    MAKE_EPHEM: 'YES',
    EPHEM_TYPE: 'VECTORS',
    CENTER: "'500@10'",
    START_TIME: `'${horizonsCalendarDate(start)}'`,
    STOP_TIME: `'${horizonsCalendarDate(stop)}'`,
    STEP_SIZE: "'1 m'",
    OUT_UNITS: 'KM-S',
    VEC_TABLE: '2',
    REF_SYSTEM: 'ICRF',
    REF_PLANE: 'ECLIPTIC',
    CSV_FORMAT: 'YES',
  });

  return `${HORIZONS_ENDPOINT}?${parameters.toString()}`;
}

function parseVector(result, body, sourceUrl, epoch) {
  const startMarker = result.indexOf('$$SOE');
  const endMarker = result.indexOf('$$EOE');
  if (startMarker < 0 || endMarker <= startMarker) {
    throw new Error(`Réponse Horizons sans bloc de vecteurs pour ${body.name}.`);
  }

  const firstLine = result
    .slice(startMarker + '$$SOE'.length, endMarker)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    throw new Error(`Réponse Horizons vide pour ${body.name}.`);
  }

  const columns = firstLine.split(',').map((column) => column.trim());
  const julianDate = Number(columns[0]);
  const [x, y, z, vx, vy, vz] = columns.slice(2, 8).map(Number);

  if (![julianDate, x, y, z, vx, vy, vz].every(Number.isFinite)) {
    throw new Error(`Vecteur Horizons illisible pour ${body.name}.`);
  }

  return {
    bodyId: body.bodyId,
    jplId: body.jplId,
    name: body.name,
    epoch,
    julianDate,
    positionKm: { x, y, z },
    velocityKmPerSecond: { x: vx, y: vy, z: vz },
    sourceUrl,
  };
}

async function fetchVector(body, epoch) {
  const sourceUrl = createQuery(body, epoch);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(sourceUrl, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} pour ${body.name}.`);
    }

    const payload = await response.json();
    if (typeof payload?.error === 'string') {
      throw new Error(`Horizons (${body.name}) : ${payload.error}`);
    }
    if (typeof payload?.result !== 'string') {
      throw new Error(`Réponse JSON Horizons invalide pour ${body.name}.`);
    }

    return parseVector(payload.result, body, sourceUrl, epoch);
  } finally {
    clearTimeout(timeout);
  }
}

function isCompleteSnapshot(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.objects)) return false;
  const ids = new Set(value.objects.map((object) => object?.jplId));
  return BODIES.every((body) => ids.has(body.jplId));
}

async function readSnapshot() {
  try {
    const content = await readFile(OUTPUT_PATH, 'utf8');
    const snapshot = JSON.parse(content);
    return isCompleteSnapshot(snapshot) ? snapshot : null;
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function writeSnapshot(snapshot) {
  await mkdir(fileURLToPath(new URL('../src/generated/', import.meta.url)), { recursive: true });
  await writeFile(TEMP_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  await rename(TEMP_PATH, OUTPUT_PATH);
}

async function main() {
  const existing = await readSnapshot();
  const requested =
    readArgument('epoch') ?? process.env.COSMOS_EPOCH ?? existing?.epoch ?? defaultEpoch();
  const epoch = normaliseEpoch(requested);
  const force = process.argv.includes('--force');

  if (!force && existing?.epoch === epoch) {
    console.log(`Éphémérides déjà en cache pour ${epoch}. Utilisez --force pour les rafraîchir.`);
    return;
  }

  try {
    const objects = [];

    // JPL requests sequential access. Keep this loop strictly serial: do not
    // replace it with Promise.all or start a request before the previous ends.
    for (const body of BODIES) {
      console.log(`Horizons ${body.jplId} — ${body.name}`);
      objects.push(await fetchVector(body, epoch));
    }

    await writeSnapshot({
      schemaVersion: 1,
      provider: 'NASA/JPL Horizons',
      center: { id: 10, name: 'Sun', query: '500@10' },
      epoch,
      generatedAt: new Date().toISOString(),
      referenceFrame: 'ICRF',
      referencePlane: 'ecliptic',
      units: { position: 'km', velocity: 'km/s' },
      sourceUrl: HORIZONS_ENDPOINT,
      objects,
    });
    console.log(`Snapshot écrit : ${OUTPUT_PATH}`);
  } catch (error) {
    if (existing) {
      console.warn(
        `Synchronisation Horizons indisponible (${error.message}). Snapshot existant conservé sans modification.`,
      );
      return;
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
