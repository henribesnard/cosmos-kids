import {
  EPHEMERIS_SNAPSHOT,
  PLANET_IDS,
  SOLAR_SYSTEM_BODIES,
  getBodyById,
  getEphemerisVector,
  isCelestialObjectId,
} from './index';

describe('catalogue scientifique du Système solaire', () => {
  it('contient le Soleil, la Lune et les huit planètes sans doublon', () => {
    expect(SOLAR_SYSTEM_BODIES).toHaveLength(10);
    expect(new Set(SOLAR_SYSTEM_BODIES.map((body) => body.id)).size).toBe(10);
    expect(PLANET_IDS).toHaveLength(8);
    expect(getBodyById('earth').name.fr).toBe('Terre');
  });

  it('sépare les valeurs scientifiques des valeurs de rendu', () => {
    for (const body of SOLAR_SYSTEM_BODIES) {
      expect(body.science.meanRadius.value).toBeGreaterThan(0);
      expect(body.science.meanRadius.sourceUrl).toMatch(/^https:\/\//);
      expect(body.science.meanRadius.attribution).not.toBe('');
      expect(body.render.radiusSceneUnits).toBeGreaterThan(0);
      expect(body.render.texture.albedoUrl).toMatch(/^\/assets\//);
      expect(body.render.texture.sourceUrl).toMatch(/^https:\/\//);
      expect(body.render.texture.license).toBe('CC BY 4.0');
      expect(body.render.texture.caveat.fr.length).toBeGreaterThan(20);
    }
  });

  it('fournit un vecteur JPL local pour chaque planète', () => {
    expect(EPHEMERIS_SNAPSHOT.provider).toBe('NASA/JPL Horizons');
    expect(EPHEMERIS_SNAPSHOT.objects).toHaveLength(8);
    for (const id of PLANET_IDS) {
      const vector = getEphemerisVector(id);
      expect(vector.bodyId).toBe(id);
      expect(Number.isFinite(vector.positionKm.x)).toBe(true);
      expect(Number.isFinite(vector.velocityKmPerSecond.y)).toBe(true);
    }
  });

  it('valide uniquement les identifiants publiés', () => {
    expect(isCelestialObjectId('saturn')).toBe(true);
    expect(isCelestialObjectId('pluto')).toBe(false);
  });
});
