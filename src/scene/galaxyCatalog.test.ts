import { describe, expect, it } from 'vitest';
import {
  GALAXY_OBJECT_POSITIONS,
  MW_DISK_RADIUS_LY,
  MW_SCENE_RADIUS,
  SPIRAL_ARMS,
  SUN_SCENE_POSITION,
  galaxyObjectScenePosition,
  generateSpiralPoints,
  spiralPointAt,
} from './galaxyCatalog';

describe('Milky Way reconstruction', () => {
  it('extends every long arm across most of the visible disk', () => {
    for (const arm of SPIRAL_ARMS.filter(({ role }) => role !== 'local')) {
      const [x, , z] = spiralPointAt(arm, 1);
      expect(Math.hypot(x, z) / MW_SCENE_RADIUS).toBeGreaterThan(0.9);
    }
  });

  it('places the Sun on the Local/Orion arm guide', () => {
    const localArm = SPIRAL_ARMS.find(({ role }) => role === 'local')!;
    // startAzimuth + t * windRange = 0, the Sun-centre azimuth.
    const tAtSun = -localArm.startAzimuth / localArm.windRange;
    const point = spiralPointAt(localArm, tAtSun);
    expect(Math.hypot(
      point[0] - SUN_SCENE_POSITION[0],
      point[2] - SUN_SCENE_POSITION[2],
    )).toBeLessThan(0.25);
  });

  it('keeps every marker distance consistent with its catalogue distance', () => {
    for (const object of GALAXY_OBJECT_POSITIONS) {
      const point = galaxyObjectScenePosition(object);
      const sceneDistance = Math.hypot(
        point[0] - SUN_SCENE_POSITION[0],
        point[1] - SUN_SCENE_POSITION[1],
        point[2] - SUN_SCENE_POSITION[2],
      );
      const lightYears = (sceneDistance / MW_SCENE_RADIUS) * MW_DISK_RADIUS_LY;
      expect(lightYears).toBeCloseTo(object.distanceLy, 6);
    }
  });

  it('generates reproducible arm particles', () => {
    const arm = SPIRAL_ARMS[0]!;
    expect(Array.from(generateSpiralPoints(arm, 80, 24))).toEqual(
      Array.from(generateSpiralPoints(arm, 80, 24)),
    );
  });
});
