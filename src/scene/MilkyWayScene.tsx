import { Line, useTexture } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  ShaderMaterial,
  SRGBColorSpace,
} from 'three';
import type { Locale } from '../data/types';
import { DEEP_SKY_BY_ID } from '../data/deepSkyObjects';
import {
  GALACTIC_CORE,
  GALAXY_OBJECT_POSITIONS,
  MW_DISK_THICKNESS_RATIO,
  MW_SCENE_RADIUS,
  SPIRAL_ARMS,
  SUN_SCENE_POSITION,
  createSeededRandom,
  galaxyObjectScenePosition,
  generateSpiralPoints,
  spiralPointAt,
} from './galaxyCatalog';
import {
  GalaxyLabelLayer,
  type GalaxyLabelSpec,
} from './labels/GalaxyLabelLayer';

export interface MilkyWaySceneProps {
  locale: Locale;
  showLabels: boolean;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

const GALAXY_TEXTURE =
  '/assets/textures/milky-way/esa-gaia-2025/gaia-milky-way-face-on.jpg';
const STAR_COUNT_PER_ARM = 4_500;
const DISK_BG_STAR_COUNT = 7_000;
const BULGE_STAR_COUNT = 2_400;
const HALO_STAR_COUNT = 700;

const galaxyVertexShader = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  varying vec3 vColor;
  void main() {
    vColor = aColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (260.0 / max(1.0, -mvPosition.z));
    gl_PointSize = clamp(gl_PointSize, 0.35, 5.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const galaxyFragmentShader = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float alpha = 1.0 - smoothstep(0.12, 0.5, d);
    gl_FragColor = vec4(vColor, alpha * uOpacity);
  }
`;

function galaxyMaterial(opacity: number): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: galaxyVertexShader,
    fragmentShader: galaxyFragmentShader,
    uniforms: { uOpacity: { value: opacity } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}

function gaussian(random: () => number): number {
  const u = Math.max(1e-7, random());
  const v = Math.max(1e-7, random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Latest ESA/Gaia face-on reconstruction, explicitly not a photograph. */
function GaiaReferenceDisc() {
  const texture = useTexture(GALAXY_TEXTURE);
  const maxAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy());

  useEffect(() => {
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = Math.min(8, maxAnisotropy);
    texture.needsUpdate = true;
  }, [maxAnisotropy, texture]);

  return (
    <mesh
      position={[0, -0.85, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={-2}
    >
      <planeGeometry args={[MW_SCENE_RADIUS * 2.24, MW_SCENE_RADIUS * 2.24]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.92}
        depthWrite={false}
        side={DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

/** Wide, reproducible density bands instead of saturated white ribbons. */
function SpiralArmParticles() {
  const geometry = useMemo(() => {
    const totalCount = SPIRAL_ARMS.length * STAR_COUNT_PER_ARM;
    const positions = new Float32Array(totalCount * 3);
    const colors = new Float32Array(totalCount * 3);
    const sizes = new Float32Array(totalCount);
    let offset = 0;

    SPIRAL_ARMS.forEach((arm, armIndex) => {
      const armPositions = generateSpiralPoints(arm, MW_SCENE_RADIUS, STAR_COUNT_PER_ARM);
      const base = new Color(arm.color);
      const nebula = new Color(arm.nebulaColor);
      const warm = new Color('#ece3d6');
      const color = new Color();
      const random = createSeededRandom(5_901 + armIndex * 7_919);

      for (let index = 0; index < STAR_COUNT_PER_ARM; index += 1) {
        const target = offset + index;
        positions[target * 3] = armPositions[index * 3]!;
        positions[target * 3 + 1] = armPositions[index * 3 + 1]!;
        positions[target * 3 + 2] = armPositions[index * 3 + 2]!;

        if (random() > 0.965) {
          color.copy(nebula).lerp(warm, random() * 0.12);
          sizes[target] = 0.65 + random() * 0.85;
        } else {
          color.copy(base).lerp(warm, 0.12 + random() * 0.28);
          sizes[target] = 0.24 + random() * 0.52;
        }
        colors[target * 3] = color.r;
        colors[target * 3 + 1] = color.g;
        colors[target * 3 + 2] = color.b;
      }
      offset += STAR_COUNT_PER_ARM;
    });

    const next = new BufferGeometry();
    next.setAttribute('position', new BufferAttribute(positions, 3));
    next.setAttribute('aColor', new BufferAttribute(colors, 3));
    next.setAttribute('aSize', new BufferAttribute(sizes, 1));
    return next;
  }, []);
  const material = useMemo(() => galaxyMaterial(0.34), []);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  return <points geometry={geometry} material={material} renderOrder={1} />;
}

/**
 * Thin centre lines make the named structure legible without pretending that
 * an arm has a sharp border. They follow the same Reid-informed guide curves
 * as the particle density bands and remain deliberately subtler than the Gaia
 * artist impression below them.
 */
function StructuralGuides() {
  const armGuides = useMemo(
    () =>
      SPIRAL_ARMS.map((arm) => ({
        arm,
        points: Array.from({ length: 181 }, (_, index) => {
          const point = spiralPointAt(arm, index / 180);
          return [point[0], 0.25, point[2]] as [number, number, number];
        }),
      })),
    [],
  );
  const barHalfLength = GALACTIC_CORE.barHalfLength * MW_SCENE_RADIUS;
  const barX = Math.sin(GALACTIC_CORE.barAngle) * barHalfLength;
  const barZ = Math.cos(GALACTIC_CORE.barAngle) * barHalfLength;

  return (
    <group renderOrder={3}>
      {armGuides.map(({ arm, points }) => (
        <group key={arm.id}>
          <Line
            points={points}
            color={arm.color}
            lineWidth={arm.role === 'local' ? 4 : 3}
            transparent
            opacity={arm.role === 'local' ? 0.13 : 0.08}
            depthWrite={false}
          />
          <Line
            points={points}
            color={arm.role === 'local' ? '#9beaf1' : '#c2d0e3'}
            lineWidth={arm.role === 'local' ? 1.45 : 0.9}
            transparent
            opacity={arm.role === 'local' ? 0.62 : 0.42}
            depthWrite={false}
          />
        </group>
      ))}
      <Line
        points={[
          [-barX, 0.35, -barZ],
          [barX, 0.35, barZ],
        ]}
        color={GALACTIC_CORE.barColor}
        lineWidth={1.2}
        transparent
        opacity={0.38}
        depthWrite={false}
      />
    </group>
  );
}

function DiskBackground() {
  const geometry = useMemo(() => {
    const positions = new Float32Array(DISK_BG_STAR_COUNT * 3);
    const colors = new Float32Array(DISK_BG_STAR_COUNT * 3);
    const sizes = new Float32Array(DISK_BG_STAR_COUNT);
    const random = createSeededRandom(12_019);
    const disk = new Color('#b7a99e');
    const cool = new Color('#9aaec5');
    const color = new Color();

    for (let index = 0; index < DISK_BG_STAR_COUNT; index += 1) {
      // Gamma(k=2) gives a genuine exponential disk surface-density profile.
      let radius = 2;
      while (radius > 1.05) {
        radius = -0.28 * Math.log(Math.max(1e-8, random() * random()));
      }
      const theta = random() * Math.PI * 2;
      positions[index * 3] = Math.sin(theta) * radius * MW_SCENE_RADIUS;
      positions[index * 3 + 1] =
        gaussian(random) * MW_DISK_THICKNESS_RATIO * MW_SCENE_RADIUS;
      positions[index * 3 + 2] = Math.cos(theta) * radius * MW_SCENE_RADIUS;

      color.copy(disk).lerp(cool, random() * 0.45);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
      sizes[index] = 0.18 + random() * 0.35;
    }

    const next = new BufferGeometry();
    next.setAttribute('position', new BufferAttribute(positions, 3));
    next.setAttribute('aColor', new BufferAttribute(colors, 3));
    next.setAttribute('aSize', new BufferAttribute(sizes, 1));
    return next;
  }, []);
  const material = useMemo(() => galaxyMaterial(0.18), []);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  return <points geometry={geometry} material={material} />;
}

function GalacticBulge() {
  const geometry = useMemo(() => {
    const positions = new Float32Array(BULGE_STAR_COUNT * 3);
    const colors = new Float32Array(BULGE_STAR_COUNT * 3);
    const sizes = new Float32Array(BULGE_STAR_COUNT);
    const random = createSeededRandom(41_771);
    const core = new Color(GALACTIC_CORE.coreColor);
    const bar = new Color(GALACTIC_CORE.barColor);
    const color = new Color();
    const major = GALACTIC_CORE.bulgeRadiusMajor * MW_SCENE_RADIUS;
    const minor = GALACTIC_CORE.bulgeRadiusMinor * MW_SCENE_RADIUS;
    const height = GALACTIC_CORE.bulgeHeight * MW_SCENE_RADIUS;
    const sinBar = Math.sin(GALACTIC_CORE.barAngle);
    const cosBar = Math.cos(GALACTIC_CORE.barAngle);

    for (let index = 0; index < BULGE_STAR_COUNT; index += 1) {
      const along = gaussian(random) * major * 0.46;
      const across = gaussian(random) * minor * 0.46;
      const vertical = gaussian(random) * height * 0.35;
      positions[index * 3] = along * sinBar + across * cosBar;
      positions[index * 3 + 1] = vertical;
      positions[index * 3 + 2] = along * cosBar - across * sinBar;

      const normalised = Math.min(1, Math.hypot(along / major, across / minor));
      color.copy(core).lerp(bar, normalised * 0.72);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
      sizes[index] = 0.35 + random() * 0.72;
    }

    const next = new BufferGeometry();
    next.setAttribute('position', new BufferAttribute(positions, 3));
    next.setAttribute('aColor', new BufferAttribute(colors, 3));
    next.setAttribute('aSize', new BufferAttribute(sizes, 1));
    return next;
  }, []);
  const material = useMemo(() => galaxyMaterial(0.3), []);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  return <points geometry={geometry} material={material} renderOrder={2} />;
}

function HaloStars() {
  const geometry = useMemo(() => {
    const positions = new Float32Array(HALO_STAR_COUNT * 3);
    const colors = new Float32Array(HALO_STAR_COUNT * 3);
    const sizes = new Float32Array(HALO_STAR_COUNT);
    const random = createSeededRandom(76_331);
    const halo = new Color('#a9afc3');

    for (let index = 0; index < HALO_STAR_COUNT; index += 1) {
      const radius = Math.pow(random(), 0.48) * MW_SCENE_RADIUS * 1.45;
      const phi = Math.acos(2 * random() - 1);
      const theta = random() * Math.PI * 2;
      positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[index * 3 + 1] = radius * Math.cos(phi) * 0.42;
      positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      colors[index * 3] = halo.r;
      colors[index * 3 + 1] = halo.g;
      colors[index * 3 + 2] = halo.b;
      sizes[index] = 0.18 + random() * 0.34;
    }

    const next = new BufferGeometry();
    next.setAttribute('position', new BufferAttribute(positions, 3));
    next.setAttribute('aColor', new BufferAttribute(colors, 3));
    next.setAttribute('aSize', new BufferAttribute(sizes, 1));
    return next;
  }, []);
  const material = useMemo(() => galaxyMaterial(0.2), []);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  return <points geometry={geometry} material={material} />;
}

function SunMarker({
  reducedMotion,
  onSelect,
  onHover,
}: {
  reducedMotion: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const pulseRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (reducedMotion || !pulseRef.current) return;
    pulseRef.current.scale.setScalar(1 + Math.sin(clock.getElapsedTime() * 2) * 0.11);
  });

  return (
    <group position={SUN_SCENE_POSITION}>
      <group ref={pulseRef}>
        <mesh
          onClick={(event) => {
            event.stopPropagation();
            onSelect('sun');
          }}
          onPointerEnter={(event) => {
            event.stopPropagation();
            onHover('sun');
            document.body.style.cursor = 'pointer';
          }}
          onPointerLeave={() => {
            onHover(null);
            document.body.style.cursor = '';
          }}
        >
          <sphereGeometry args={[0.72, 18, 18]} />
          <meshBasicMaterial color="#ffe06a" toneMapped={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[1.65, 18, 18]} />
          <meshBasicMaterial
            color="#ffe06a"
            transparent
            opacity={0.18}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      </group>
    </group>
  );
}

function DeepSkyMarkers({
  onSelect,
  onHover,
}: {
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const markers = useMemo(
    () =>
      GALAXY_OBJECT_POSITIONS.map((position) => ({
        ...position,
        object: DEEP_SKY_BY_ID[position.id],
        scenePosition: galaxyObjectScenePosition(position),
      })),
    [],
  );

  return (
    <>
      {markers.map(({ id, object, scenePosition }) => (
        <group key={id} position={scenePosition}>
          <mesh
            onClick={(event) => {
              event.stopPropagation();
              onSelect(id);
            }}
            onPointerEnter={(event) => {
              event.stopPropagation();
              onHover(id);
              document.body.style.cursor = 'pointer';
            }}
            onPointerLeave={() => {
              onHover(null);
              document.body.style.cursor = '';
            }}
          >
            <sphereGeometry args={[id === 'sgr-a' ? 1.15 : 0.85, 14, 14]} />
            <meshBasicMaterial
              color={object.color}
              transparent
              opacity={0.82}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[id === 'sgr-a' ? 2.4 : 1.65, 14, 14]} />
            <meshBasicMaterial
              color={object.color}
              transparent
              opacity={0.13}
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

const ARM_PLACEMENTS = [
  'top-right',
  'bottom-left',
  'top-left',
  'right',
  'bottom',
] as const;

function armLabel(armId: string, armName: string, locale: Locale): string {
  if (locale === 'fr') {
    const frenchLabels: Readonly<Record<string, string>> = {
      'scutum-centaurus': 'Bras de l’Écu–Centaure',
      perseus: 'Bras de Persée',
      'sagittarius-carina': 'Bras Sagittaire–Carène',
      'norma-outer': 'Bras Norma–Externe',
      'local-orion': 'Bras local (Orion)',
    };
    return frenchLabels[armId] ?? `Bras ${armName}`;
  }
  return armName.endsWith('Arm') ? armName : `${armName} Arm`;
}

function useGalaxyLabels(
  locale: Locale,
  onSelect: (id: string) => void,
  onHover: (id: string | null) => void,
): readonly GalaxyLabelSpec[] {
  return useMemo(() => {
    const armLabels: GalaxyLabelSpec[] = SPIRAL_ARMS.map((arm, index) => {
      const position = spiralPointAt(arm, arm.labelT);
      return {
        id: `arm:${arm.id}`,
        text: armLabel(arm.id, arm.name[locale], locale),
        position: [position[0], 1.2, position[2]],
        color: arm.role === 'local' ? '#8ee8ef' : '#b8c9df',
        kind: 'arm',
        priority: arm.labelPriority,
        required: true,
        preferredPlacement: ARM_PLACEMENTS[index] ?? 'top',
      };
    });

    const barDistance = MW_SCENE_RADIUS * GALACTIC_CORE.barHalfLength * 0.55;
    const barPosition: readonly [number, number, number] = [
      Math.sin(GALACTIC_CORE.barAngle) * barDistance,
      1.5,
      Math.cos(GALACTIC_CORE.barAngle) * barDistance,
    ];

    const landmarks: GalaxyLabelSpec[] = [
      {
        id: 'landmark:sun',
        text:
          locale === 'fr'
            ? '☉ Système solaire · nous sommes ici'
            : '☉ Solar System · you are here',
        position: [SUN_SCENE_POSITION[0], 1.6, SUN_SCENE_POSITION[2]],
        color: '#ffe36e',
        kind: 'landmark',
        priority: 110,
        required: true,
        preferredPlacement: 'bottom-right',
        onActivate: () => onSelect('sun'),
        onHover: (hovered) => onHover(hovered ? 'sun' : null),
      },
      {
        id: 'landmark:centre',
        text:
          locale === 'fr'
            ? '✦ Centre galactique · Sagittarius A*'
            : '✦ Galactic centre · Sagittarius A*',
        position: [0, 1.8, 0],
        color: '#f3a56d',
        kind: 'landmark',
        priority: 105,
        required: true,
        preferredPlacement: 'bottom-left',
        onActivate: () => onSelect('sgr-a'),
        onHover: (hovered) => onHover(hovered ? 'sgr-a' : null),
      },
      {
        id: 'landmark:bar',
        text: locale === 'fr' ? 'Barre centrale' : 'Central bar',
        position: barPosition,
        color: '#efc69f',
        kind: 'landmark',
        priority: 96,
        required: true,
        preferredPlacement: 'top-right',
      },
    ];

    const objectLabels: GalaxyLabelSpec[] = GALAXY_OBJECT_POSITIONS
      .filter(({ id }) => id !== 'sgr-a')
      .map((position, index) => {
        const object = DEEP_SKY_BY_ID[position.id];
        return {
          id: `object:${position.id}`,
          text: `${object.symbol} ${object.name[locale]}`,
          position: galaxyObjectScenePosition(position),
          color: object.color,
          kind: 'object',
          priority: 42 - index,
          preferredPlacement: ARM_PLACEMENTS[index % ARM_PLACEMENTS.length],
          onActivate: () => onSelect(position.id),
          onHover: (hovered) => onHover(hovered ? position.id : null),
        } satisfies GalaxyLabelSpec;
      });

    return [...landmarks, ...armLabels, ...objectLabels];
  }, [locale, onHover, onSelect]);
}

export function MilkyWayScene({
  locale,
  showLabels,
  reducedMotion,
  onSelect,
  onHover,
}: MilkyWaySceneProps) {
  const labels = useGalaxyLabels(locale, onSelect, onHover);

  return (
    <>
      <GaiaReferenceDisc />
      <DiskBackground />
      <SpiralArmParticles />
      <StructuralGuides />
      <GalacticBulge />
      <HaloStars />
      <SunMarker reducedMotion={reducedMotion} onSelect={onSelect} onHover={onHover} />
      <DeepSkyMarkers onSelect={onSelect} onHover={onHover} />
      {showLabels ? <GalaxyLabelLayer labels={labels} reducedMotion={reducedMotion} /> : null}
    </>
  );
}
