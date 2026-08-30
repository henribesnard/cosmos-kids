import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Points,
  ShaderMaterial,
  Sprite,
  Vector3,
} from 'three';
import type { DeepSkyObjectId, Locale } from '../data/types';
import { DEEP_SKY_BY_ID } from '../data/deepSkyObjects';
import {
  GALACTIC_CORE,
  GALAXY_OBJECT_POSITIONS,
  MW_DISK_THICKNESS_RATIO,
  MW_SCENE_RADIUS,
  SPIRAL_ARMS,
  SUN_GALACTIC_R,
  generateSpiralPoints,
} from './galaxyCatalog';

/* ------------------------------------------------------------------ */
/*  Props                                                             */
/* ------------------------------------------------------------------ */

export interface MilkyWaySceneProps {
  locale: Locale;
  showLabels: boolean;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const STAR_COUNT_PER_ARM = 8_000;
const DISK_BG_STAR_COUNT = 20_000;
const BULGE_STAR_COUNT = 6_000;
const HALO_STAR_COUNT = 1_500;

const tmpColor = new Color();

/* ------------------------------------------------------------------ */
/*  Custom shader for coloured point particles                        */
/* ------------------------------------------------------------------ */

const galaxyVertexShader = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  varying vec3 vColor;
  void main() {
    vColor = aColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (280.0 / -mvPosition.z);
    gl_PointSize = clamp(gl_PointSize, 0.5, 8.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const galaxyFragmentShader = /* glsl */ `
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float alpha = 1.0 - smoothstep(0.2, 0.5, d);
    gl_FragColor = vec4(vColor, alpha * 0.85);
  }
`;

/* ------------------------------------------------------------------ */
/*  Spiral arm star particles                                         */
/* ------------------------------------------------------------------ */

function SpiralArms() {
  const geometry = useMemo(() => {
    const totalCount = SPIRAL_ARMS.length * STAR_COUNT_PER_ARM;
    const positions = new Float32Array(totalCount * 3);
    const colors = new Float32Array(totalCount * 3);
    const sizes = new Float32Array(totalCount);

    let offset = 0;
    for (const arm of SPIRAL_ARMS) {
      const armPositions = generateSpiralPoints(arm, MW_SCENE_RADIUS, STAR_COUNT_PER_ARM);
      const baseColor = new Color(arm.color);
      const nebulaColor = new Color(arm.nebulaColor);

      for (let i = 0; i < STAR_COUNT_PER_ARM; i++) {
        const idx = offset + i;
        positions[idx * 3] = armPositions[i * 3]!;
        positions[idx * 3 + 1] = armPositions[i * 3 + 1]!;
        positions[idx * 3 + 2] = armPositions[i * 3 + 2]!;

        // Mix between star colour and nebula colour randomly
        const nebulaChance = Math.random();
        if (nebulaChance > 0.92) {
          tmpColor.copy(nebulaColor);
          sizes[idx] = 1.5 + Math.random() * 2.5;
        } else {
          tmpColor.copy(baseColor).lerp(new Color('#fff8e0'), Math.random() * 0.6);
          sizes[idx] = 0.6 + Math.random() * 1.2;
        }
        colors[idx * 3] = tmpColor.r;
        colors[idx * 3 + 1] = tmpColor.g;
        colors[idx * 3 + 2] = tmpColor.b;
      }
      offset += STAR_COUNT_PER_ARM;
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    geo.setAttribute('aColor', new BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new BufferAttribute(sizes, 1));
    return geo;
  }, []);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: galaxyVertexShader,
        fragmentShader: galaxyFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  );

  return <points geometry={geometry} material={material} />;
}

/* ------------------------------------------------------------------ */
/*  Background disk stars (inter-arm population)                      */
/* ------------------------------------------------------------------ */

function DiskBackground() {
  const geometry = useMemo(() => {
    const positions = new Float32Array(DISK_BG_STAR_COUNT * 3);
    const colors = new Float32Array(DISK_BG_STAR_COUNT * 3);
    const sizes = new Float32Array(DISK_BG_STAR_COUNT);
    const diskColor = new Color('#ffe8c0');

    for (let i = 0; i < DISK_BG_STAR_COUNT; i++) {
      // Exponential disk distribution
      const r = Math.sqrt(Math.random()) * MW_SCENE_RADIUS * 1.05;
      const theta = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 2] = Math.sin(theta) * r;
      positions[i * 3 + 1] =
        (Math.random() - 0.5) * MW_DISK_THICKNESS_RATIO * MW_SCENE_RADIUS * 2;

      tmpColor
        .copy(diskColor)
        .lerp(new Color('#fffae0'), Math.random() * 0.4);
      colors[i * 3] = tmpColor.r;
      colors[i * 3 + 1] = tmpColor.g;
      colors[i * 3 + 2] = tmpColor.b;
      sizes[i] = 0.3 + Math.random() * 0.6;
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    geo.setAttribute('aColor', new BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new BufferAttribute(sizes, 1));
    return geo;
  }, []);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: galaxyVertexShader,
        fragmentShader: galaxyFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  );

  return <points geometry={geometry} material={material} />;
}

/* ------------------------------------------------------------------ */
/*  Galactic bulge                                                    */
/* ------------------------------------------------------------------ */

function GalacticBulge() {
  const geometry = useMemo(() => {
    const positions = new Float32Array(BULGE_STAR_COUNT * 3);
    const colors = new Float32Array(BULGE_STAR_COUNT * 3);
    const sizes = new Float32Array(BULGE_STAR_COUNT);
    const coreColor = new Color(GALACTIC_CORE.coreColor);
    const barColor = new Color(GALACTIC_CORE.barColor);
    const rMajor = GALACTIC_CORE.bulgeRadiusMajor * MW_SCENE_RADIUS;
    const rMinor = GALACTIC_CORE.bulgeRadiusMinor * MW_SCENE_RADIUS;
    const height = GALACTIC_CORE.bulgeHeight * MW_SCENE_RADIUS;
    const cosBar = Math.cos(GALACTIC_CORE.barAngle);
    const sinBar = Math.sin(GALACTIC_CORE.barAngle);

    for (let i = 0; i < BULGE_STAR_COUNT; i++) {
      // 3D Gaussian distribution in bar frame
      const bx = (Math.random() - 0.5 + Math.random() - 0.5) * rMajor;
      const bz = (Math.random() - 0.5 + Math.random() - 0.5) * rMinor;
      const by = (Math.random() - 0.5 + Math.random() - 0.5) * height;

      // Rotate by bar angle
      positions[i * 3] = bx * cosBar - bz * sinBar;
      positions[i * 3 + 2] = bx * sinBar + bz * cosBar;
      positions[i * 3 + 1] = by;

      const dist = Math.sqrt(bx * bx + bz * bz) / rMajor;
      tmpColor.copy(coreColor).lerp(barColor, dist * 0.7);
      colors[i * 3] = tmpColor.r;
      colors[i * 3 + 1] = tmpColor.g;
      colors[i * 3 + 2] = tmpColor.b;
      sizes[i] = 0.8 + Math.random() * 1.5 + (1 - dist) * 1.5;
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    geo.setAttribute('aColor', new BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new BufferAttribute(sizes, 1));
    return geo;
  }, []);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: galaxyVertexShader,
        fragmentShader: galaxyFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  );

  return <points geometry={geometry} material={material} />;
}

/* ------------------------------------------------------------------ */
/*  Halo stars (sparse, spherical distribution)                       */
/* ------------------------------------------------------------------ */

function HaloStars() {
  const geometry = useMemo(() => {
    const positions = new Float32Array(HALO_STAR_COUNT * 3);
    const colors = new Float32Array(HALO_STAR_COUNT * 3);
    const sizes = new Float32Array(HALO_STAR_COUNT);
    const haloColor = new Color('#d0d0f0');

    for (let i = 0; i < HALO_STAR_COUNT; i++) {
      // Spherical distribution, concentrated toward centre (power law)
      const rRaw = Math.pow(Math.random(), 0.4) * MW_SCENE_RADIUS * 1.8;
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      positions[i * 3] = rRaw * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = rRaw * Math.cos(phi);
      positions[i * 3 + 2] = rRaw * Math.sin(phi) * Math.sin(theta);

      tmpColor.copy(haloColor).lerp(new Color('#ffe0c0'), Math.random() * 0.3);
      colors[i * 3] = tmpColor.r;
      colors[i * 3 + 1] = tmpColor.g;
      colors[i * 3 + 2] = tmpColor.b;
      sizes[i] = 0.3 + Math.random() * 0.5;
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    geo.setAttribute('aColor', new BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new BufferAttribute(sizes, 1));
    return geo;
  }, []);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: galaxyVertexShader,
        fragmentShader: galaxyFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  );

  return <points geometry={geometry} material={material} />;
}

/* ------------------------------------------------------------------ */
/*  Galactic core glow (emissive sphere)                              */
/* ------------------------------------------------------------------ */

function CoreGlow() {
  return (
    <mesh>
      <sphereGeometry args={[MW_SCENE_RADIUS * 0.04, 32, 32]} />
      <meshBasicMaterial
        color={GALACTIC_CORE.coreColor}
        transparent
        opacity={0.5}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/*  Sun marker ("You are here")                                       */
/* ------------------------------------------------------------------ */

function SunMarker({ locale, showLabels }: { locale: Locale; showLabels: boolean }) {
  const groupRef = useRef<Group>(null);
  const sunPos = useMemo(() => {
    // Sun is on the inner edge of the Orion Spur.
    // In galactic coordinates: along the Sun-Centre line at r = SUN_GALACTIC_R.
    // Convention: Sun-Centre line is along +X, so Sun is at +X.
    return new Vector3(SUN_GALACTIC_R * MW_SCENE_RADIUS, 0, 0);
  }, []);

  // Pulsing animation
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const s = 1 + Math.sin(clock.getElapsedTime() * 2) * 0.15;
    groupRef.current.scale.setScalar(s);
  });

  return (
    <group position={sunPos}>
      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[0.8, 16, 16]} />
          <meshBasicMaterial color="#ffdd44" />
        </mesh>
        <mesh>
          <sphereGeometry args={[1.6, 16, 16]} />
          <meshBasicMaterial
            color="#ffdd44"
            transparent
            opacity={0.2}
            depthWrite={false}
          />
        </mesh>
      </group>
      {showLabels && (
        <Html
          position={[0, 2.5, 0]}
          center
          style={{
            color: '#ffdd44',
            fontSize: 12,
            fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            textShadow: '0 0 8px rgba(0,0,0,0.8)',
            userSelect: 'none',
          }}
        >
          <div>☉ {locale === 'fr' ? 'Vous êtes ici' : 'You are here'}</div>
        </Html>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Deep-sky object markers                                           */
/* ------------------------------------------------------------------ */

function DeepSkyMarkers({
  locale,
  showLabels,
  onSelect,
  onHover,
}: {
  locale: Locale;
  showLabels: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const markers = useMemo(() => {
    return GALAXY_OBJECT_POSITIONS.map((pos) => {
      const obj = DEEP_SKY_BY_ID[pos.id];
      const x = Math.cos(pos.theta) * pos.r * MW_SCENE_RADIUS;
      const z = Math.sin(pos.theta) * pos.r * MW_SCENE_RADIUS;
      const y = pos.z * MW_SCENE_RADIUS;
      return { ...pos, obj, position: [x, y, z] as [number, number, number] };
    });
  }, []);

  return (
    <>
      {markers.map(({ id, obj, position }) => (
        <group key={id} position={position}>
          <mesh
            onClick={(e) => {
              e.stopPropagation();
              onSelect(id);
            }}
            onPointerEnter={(e) => {
              e.stopPropagation();
              onHover(id);
              document.body.style.cursor = 'pointer';
            }}
            onPointerLeave={() => {
              onHover(null);
              document.body.style.cursor = '';
            }}
          >
            <sphereGeometry args={[1.2, 12, 12]} />
            <meshBasicMaterial
              color={obj.color}
              transparent
              opacity={0.7}
              depthWrite={false}
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[2.0, 12, 12]} />
            <meshBasicMaterial
              color={obj.color}
              transparent
              opacity={0.15}
              depthWrite={false}
            />
          </mesh>
          {showLabels && (
            <Html
              position={[0, 3, 0]}
              center
              style={{
                color: obj.color,
                fontSize: 10,
                fontFamily: 'Outfit, system-ui, sans-serif',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                textShadow: '0 0 6px rgba(0,0,0,0.8)',
                userSelect: 'none',
              }}
            >
              <div>{obj.symbol} {obj.name[locale]}</div>
            </Html>
          )}
        </group>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Slow galaxy rotation                                              */
/* ------------------------------------------------------------------ */

function GalaxyRotation({
  children,
  reducedMotion,
}: {
  children: React.ReactNode;
  reducedMotion: boolean;
}) {
  const groupRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (reducedMotion || !groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.008;
  });

  return <group ref={groupRef}>{children}</group>;
}

/* ------------------------------------------------------------------ */
/*  Main scene component                                              */
/* ------------------------------------------------------------------ */

export function MilkyWayScene({
  locale,
  showLabels,
  reducedMotion,
  onSelect,
  onHover,
}: MilkyWaySceneProps) {
  return (
    <>
      <ambientLight intensity={0.1} />
      <GalaxyRotation reducedMotion={reducedMotion}>
        <DiskBackground />
        <SpiralArms />
        <GalacticBulge />
        <HaloStars />
        <CoreGlow />
        <SunMarker locale={locale} showLabels={showLabels} />
        <DeepSkyMarkers
          locale={locale}
          showLabels={showLabels}
          onSelect={onSelect}
          onHover={onHover}
        />
      </GalaxyRotation>
    </>
  );
}
