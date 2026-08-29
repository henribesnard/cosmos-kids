import snapshotJson from '../generated/ephemeris.json';
import { PLANET_IDS } from './solarSystem';
import type { PlanetId } from './types';

export interface CartesianVector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface EphemerisVector {
  readonly bodyId: PlanetId;
  readonly jplId: number;
  readonly name: string;
  readonly epoch: string;
  readonly julianDate: number;
  readonly positionKm: CartesianVector3;
  readonly velocityKmPerSecond: CartesianVector3;
  readonly sourceUrl: string;
}

export interface EphemerisSnapshot {
  readonly schemaVersion: 1;
  readonly provider: 'NASA/JPL Horizons';
  readonly center: {
    readonly id: 10;
    readonly name: 'Sun';
    readonly query: '500@10';
  };
  readonly epoch: string;
  readonly generatedAt: string;
  readonly referenceFrame: 'ICRF';
  readonly referencePlane: 'ecliptic';
  readonly units: {
    readonly position: 'km';
    readonly velocity: 'km/s';
  };
  readonly sourceUrl: string;
  readonly objects: readonly EphemerisVector[];
}

function isFiniteVector(value: unknown): value is CartesianVector3 {
  if (!value || typeof value !== 'object') return false;
  const vector = value as Record<string, unknown>;
  return [vector.x, vector.y, vector.z].every(
    (component) => typeof component === 'number' && Number.isFinite(component),
  );
}

function assertEphemerisSnapshot(value: unknown): asserts value is EphemerisSnapshot {
  if (!value || typeof value !== 'object') {
    throw new Error('Snapshot Horizons absent ou invalide.');
  }

  const snapshot = value as Record<string, unknown>;
  if (
    snapshot.schemaVersion !== 1 ||
    snapshot.provider !== 'NASA/JPL Horizons' ||
    !Array.isArray(snapshot.objects)
  ) {
    throw new Error('Schéma du snapshot Horizons non reconnu.');
  }

  const expected = new Set<string>(PLANET_IDS);
  const seen = new Set<string>();

  for (const candidate of snapshot.objects) {
    if (!candidate || typeof candidate !== 'object') {
      throw new Error('Entrée Horizons invalide.');
    }
    const vector = candidate as Record<string, unknown>;
    if (
      typeof vector.bodyId !== 'string' ||
      !expected.has(vector.bodyId) ||
      typeof vector.jplId !== 'number' ||
      typeof vector.epoch !== 'string' ||
      typeof vector.julianDate !== 'number' ||
      !Number.isFinite(vector.julianDate) ||
      !isFiniteVector(vector.positionKm) ||
      !isFiniteVector(vector.velocityKmPerSecond) ||
      typeof vector.sourceUrl !== 'string'
    ) {
      throw new Error(`Vecteur Horizons invalide pour ${String(vector.bodyId)}.`);
    }
    seen.add(vector.bodyId);
  }

  if (seen.size !== PLANET_IDS.length || PLANET_IDS.some((id) => !seen.has(id))) {
    throw new Error('Le snapshot Horizons ne contient pas les huit planètes.');
  }
}

const parsedSnapshot: unknown = snapshotJson;
assertEphemerisSnapshot(parsedSnapshot);

export const EPHEMERIS_SNAPSHOT: EphemerisSnapshot = parsedSnapshot;

const vectorByBodyId = new Map(
  EPHEMERIS_SNAPSHOT.objects.map((vector) => [vector.bodyId, vector] as const),
);

export function getEphemerisVector(id: PlanetId): EphemerisVector {
  const vector = vectorByBodyId.get(id);
  if (!vector) throw new Error(`Aucune éphéméride disponible pour ${id}.`);
  return vector;
}
