import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import {
  GALACTIC_CORE,
  GALAXY_OBJECT_POSITIONS,
  MW_SCENE_RADIUS,
  SPIRAL_ARMS,
  SUN_SCENE_POSITION,
  galaxyObjectScenePosition,
  spiralPointAt,
} from '../galaxyCatalog';
import { layoutScreenLabels, type ScreenRect } from './layoutScreenLabels';

const bounds: ScreenRect = { left: 0, top: 0, right: 900, bottom: 600 };

function overlaps(a: ScreenRect, b: ScreenRect): boolean {
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}

describe('layoutScreenLabels', () => {
  it('places crowded labels without overlapping when room exists', () => {
    const labels = Array.from({ length: 8 }, (_, index) => ({
      id: `label-${index}`,
      anchor: { x: 450 + (index % 2) * 2, y: 300 + (index % 3) * 2 },
      width: 92,
      height: 24,
      priority: 100 - index,
      required: true,
    }));

    const visible = layoutScreenLabels(labels, bounds).filter((label) => label.visible);
    expect(visible).toHaveLength(labels.length);
    for (let first = 0; first < visible.length; first += 1) {
      for (let second = first + 1; second < visible.length; second += 1) {
        expect(overlaps(visible[first]!.rect, visible[second]!.rect)).toBe(false);
      }
    }
  });

  it('keeps the high-priority landmark when only one label may be shown', () => {
    const result = layoutScreenLabels(
      [
        {
          id: 'sun',
          anchor: { x: 390, y: 250 },
          width: 120,
          height: 28,
          priority: 100,
          required: true,
        },
        {
          id: 'nebula',
          anchor: { x: 390, y: 250 },
          width: 130,
          height: 28,
          priority: 10,
        },
      ],
      { left: 0, top: 0, right: 420, bottom: 280 },
      [],
      1,
    );

    expect(result.find((label) => label.id === 'sun')?.visible).toBe(true);
    expect(result.find((label) => label.id === 'nebula')?.visible).toBe(false);
  });

  it('honours a mobile visibility budget for optional labels', () => {
    const result = layoutScreenLabels(
      Array.from({ length: 7 }, (_, index) => ({
        id: `object-${index}`,
        anchor: { x: 80 + index * 100, y: 300 },
        width: 60,
        height: 20,
        priority: 50 - index,
      })),
      bounds,
      [],
      3,
    );

    expect(result.filter((label) => label.visible)).toHaveLength(3);
  });

  it('never overlaps a required label when the viewport has no free position', () => {
    const result = layoutScreenLabels(
      [
        {
          id: 'required-landmark',
          anchor: { x: 120, y: 80 },
          width: 100,
          height: 28,
          priority: 100,
          required: true,
        },
      ],
      { left: 0, top: 0, right: 240, bottom: 160 },
      [{ left: 0, top: 0, right: 240, bottom: 160 }],
    );

    expect(result[0]?.visible).toBe(false);
  });

  it('keeps Milky Way labels separated across representative camera orbits', () => {
    const width = 1511;
    const height = 621;
    const sceneBounds: ScreenRect = { left: 18, top: 76, right: width - 18, bottom: height - 116 };
    const obstacles: ScreenRect[] = [
      { left: 26, top: 103, right: 302, bottom: 475 },
      { left: 620, top: 82, right: 891, bottom: 108 },
    ];
    const barDistance = MW_SCENE_RADIUS * GALACTIC_CORE.barHalfLength * 0.55;
    const specs = [
      ...SPIRAL_ARMS.map((arm) => {
        const point = spiralPointAt(arm, arm.labelT);
        const text = arm.role === 'local' ? 'Bras local (Orion)' : `Bras ${arm.name.fr}`;
        return {
          id: `arm:${arm.id}`,
          position: new Vector3(point[0], 1.2, point[2]),
          text,
          priority: arm.labelPriority,
          required: true,
        };
      }),
      {
        id: 'landmark:sun',
        position: new Vector3(SUN_SCENE_POSITION[0], 1.6, SUN_SCENE_POSITION[2]),
        text: '☉ Système solaire · nous sommes ici',
        priority: 110,
        required: true,
      },
      {
        id: 'landmark:centre',
        position: new Vector3(0, 1.8, 0),
        text: '✦ Centre galactique · Sagittarius A*',
        priority: 105,
        required: true,
      },
      {
        id: 'landmark:bar',
        position: new Vector3(
          Math.sin(GALACTIC_CORE.barAngle) * barDistance,
          1.5,
          Math.cos(GALACTIC_CORE.barAngle) * barDistance,
        ),
        text: 'Barre centrale',
        priority: 96,
        required: true,
      },
      ...GALAXY_OBJECT_POSITIONS.filter(({ id }) => id !== 'sgr-a').map((object, index) => ({
        id: `object:${object.id}`,
        position: new Vector3(...galaxyObjectScenePosition(object)),
        text: object.id,
        priority: 42 - index,
        required: false,
      })),
    ];

    for (let step = 0; step < 12; step += 1) {
      const azimuth = (step / 12) * Math.PI * 2;
      const camera = new PerspectiveCamera(50, width / height, 0.05, 2_000);
      camera.position.set(Math.sin(azimuth) * 120, 90, Math.cos(azimuth) * 120);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();

      const requests = specs.flatMap((spec) => {
        const projected = spec.position.clone().project(camera);
        if (
          projected.z < -1 ||
          projected.z > 1 ||
          projected.x < -1.08 ||
          projected.x > 1.08 ||
          projected.y < -1.08 ||
          projected.y > 1.08
        ) {
          return [];
        }
        return [{
          id: spec.id,
          anchor: {
            x: (projected.x * 0.5 + 0.5) * width,
            y: (-projected.y * 0.5 + 0.5) * height,
          },
          width: Math.max(72, spec.text.length * 6.3 + 24),
          height: spec.required ? 28 : 24,
          priority: spec.priority,
          required: spec.required,
        }];
      });
      const visible = layoutScreenLabels(requests, sceneBounds, obstacles).filter(
        (label) => label.visible,
      );

      expect(visible.length).toBeGreaterThanOrEqual(5);
      for (let first = 0; first < visible.length; first += 1) {
        expect(obstacles.some((obstacle) => overlaps(visible[first]!.rect, obstacle))).toBe(false);
        for (let second = first + 1; second < visible.length; second += 1) {
          expect(overlaps(visible[first]!.rect, visible[second]!.rect)).toBe(false);
        }
      }
    }
  });
});
