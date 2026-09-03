import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  ShaderMaterial,
} from 'three';
import type { DeepSkyObjectId, Locale } from '../data/types';
import { DEEP_SKY_BY_ID } from '../data/deepSkyObjects';
import { createSeededRandom } from './galaxyCatalog';

/* ------------------------------------------------------------------ */
/*  Props                                                             */
/* ------------------------------------------------------------------ */

export interface DeepSkyDetailProps {
  objectId: DeepSkyObjectId;
  locale: Locale;
  showLabels: boolean;
  reducedMotion: boolean;
}

/* ------------------------------------------------------------------ */
/*  Black hole accretion disk shader                                  */
/* ------------------------------------------------------------------ */

const accretionVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vPosition;
  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const accretionFragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    float dist = length(vPosition.xz);
    float innerEdge = 2.0;
    float outerEdge = 10.0;

    // Radial gradient: hot white-blue inner -> orange-red outer
    float t = clamp((dist - innerEdge) / (outerEdge - innerEdge), 0.0, 1.0);

    vec3 innerColor = vec3(0.7, 0.85, 1.0);   // blue-white
    vec3 midColor = vec3(1.0, 0.7, 0.2);       // orange
    vec3 outerColor = vec3(0.8, 0.15, 0.05);   // deep red

    vec3 color = mix(innerColor, midColor, smoothstep(0.0, 0.5, t));
    color = mix(color, outerColor, smoothstep(0.4, 1.0, t));

    // Rotation-based brightness variation
    float angle = atan(vPosition.z, vPosition.x);
    float swirl = sin(angle * 3.0 - uTime * 0.5 + dist * 1.2) * 0.2 + 0.8;

    // Fade at edges
    float innerFade = smoothstep(innerEdge - 0.5, innerEdge + 1.0, dist);
    float outerFade = 1.0 - smoothstep(outerEdge - 2.0, outerEdge, dist);
    float alpha = innerFade * outerFade * swirl * 0.9;

    gl_FragColor = vec4(color * (1.0 + (1.0 - t) * 0.5), alpha);
  }
`;

/* ------------------------------------------------------------------ */
/*  Black hole detail view                                            */
/* ------------------------------------------------------------------ */

function BlackHoleDetail({ reducedMotion }: { reducedMotion: boolean }) {
  const diskRef = useRef<Group>(null);
  const materialRef = useRef<ShaderMaterial>(null);

  useFrame(({ clock }, delta) => {
    if (reducedMotion) return;
    if (diskRef.current) {
      diskRef.current.rotation.y += delta * 0.15;
    }
    if (materialRef.current) {
      materialRef.current.uniforms.uTime!.value = clock.getElapsedTime();
    }
  });

  const diskMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: accretionVertexShader,
        fragmentShader: accretionFragmentShader,
        uniforms: { uTime: { value: 0 } },
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        blending: AdditiveBlending,
      }),
    [],
  );

  // Photon ring particles
  const photonRingGeo = useMemo(() => {
    const count = 800;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const ringColor = new Color('#ffe8b0');
    const random = createSeededRandom(8_801);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (random() - 0.5) * 0.1;
      const r = 2.3 + (random() - 0.5) * 0.3;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = (random() - 0.5) * 0.15;
      positions[i * 3 + 2] = Math.sin(angle) * r;
      colors[i * 3] = ringColor.r;
      colors[i * 3 + 1] = ringColor.g;
      colors[i * 3 + 2] = ringColor.b;
      sizes[i] = 0.5 + random() * 0.8;
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    geo.setAttribute('aColor', new BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new BufferAttribute(sizes, 1));
    return geo;
  }, []);

  const pointsMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: /* glsl */ `
          attribute vec3 aColor;
          attribute float aSize;
          varying vec3 vColor;
          void main() {
            vColor = aColor;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = aSize * (200.0 / -mvPosition.z);
            gl_PointSize = clamp(gl_PointSize, 0.5, 6.0);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec3 vColor;
          void main() {
            float d = length(gl_PointCoord - vec2(0.5));
            if (d > 0.5) discard;
            float alpha = 1.0 - smoothstep(0.1, 0.5, d);
            gl_FragColor = vec4(vColor, alpha * 0.9);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  );

  return (
    <group rotation={[0.3, 0, 0]}>
      {/* Black sphere (event horizon shadow) */}
      <mesh>
        <sphereGeometry args={[1.8, 48, 48]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* Photon ring */}
      <group ref={diskRef}>
        <points geometry={photonRingGeo} material={pointsMaterial} />

        {/* Accretion disk */}
        <mesh rotation={[Math.PI / 2, 0, 0]} material={diskMaterial}>
          <ringGeometry args={[2.2, 10, 128, 1]} />
        </mesh>
      </group>

      {/* Gravitational lensing glow (back side) */}
      <mesh>
        <sphereGeometry args={[2.6, 32, 32]} />
        <meshBasicMaterial
          color="#ff8040"
          transparent
          opacity={0.08}
          side={BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Jets */}
      <mesh position={[0, 8, 0]}>
        <coneGeometry args={[0.6, 12, 16, 1, true]} />
        <meshBasicMaterial
          color="#80a0ff"
          transparent
          opacity={0.12}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      <mesh position={[0, -8, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.6, 12, 16, 1, true]} />
        <meshBasicMaterial
          color="#80a0ff"
          transparent
          opacity={0.12}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Nebula detail view (procedural particle cloud)                    */
/* ------------------------------------------------------------------ */

function NebulaDetail({
  color,
  reducedMotion,
}: {
  color: string;
  reducedMotion: boolean;
}) {
  const groupRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (reducedMotion || !groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.02;
  });

  const { geometry, material } = useMemo(() => {
    const count = 12_000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const baseColor = new Color(color);
    const brightColor = new Color(color).lerp(new Color('#ffffff'), 0.5);
    const darkColor = new Color(color).lerp(new Color('#200810'), 0.6);
    const tmpC = new Color();
    const seed = [...color].reduce((value, character) => value + character.charCodeAt(0), 12_001);
    const random = createSeededRandom(seed);

    for (let i = 0; i < count; i++) {
      // Irregular cloud shape using multiple overlapping Gaussians
      const cx = (random() - 0.5) * 2;
      const cy = (random() - 0.5) * 1.5;
      const cz = (random() - 0.5) * 2;
      const r = Math.sqrt(cx * cx + cy * cy + cz * cz);

      // Gaussian falloff with filamentary structure
      const filament = Math.sin(cx * 3 + cy * 2) * Math.cos(cz * 2.5 + cx) * 0.5 + 0.5;
      const density = Math.exp(-r * r * 1.5) * (0.5 + filament * 0.5);

      if (density < random() * 0.3) {
        // Redistribute to create wisps
        const angle = random() * Math.PI * 2;
        const spread = random() * 8;
        positions[i * 3] = Math.cos(angle) * spread + (random() - 0.5) * 3;
        positions[i * 3 + 1] = (random() - 0.5) * 5;
        positions[i * 3 + 2] = Math.sin(angle) * spread + (random() - 0.5) * 3;
      } else {
        positions[i * 3] = cx * 6;
        positions[i * 3 + 1] = cy * 5;
        positions[i * 3 + 2] = cz * 6;
      }

      // Colour variation
      const rnd = random();
      if (rnd > 0.85) tmpC.copy(brightColor);
      else if (rnd > 0.3) tmpC.copy(baseColor).lerp(brightColor, random() * 0.3);
      else tmpC.copy(darkColor).lerp(baseColor, random() * 0.5);

      colors[i * 3] = tmpC.r;
      colors[i * 3 + 1] = tmpC.g;
      colors[i * 3 + 2] = tmpC.b;
      sizes[i] = 1.0 + random() * 3.0 + density * 2.0;
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    geo.setAttribute('aColor', new BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new BufferAttribute(sizes, 1));

    const mat = new ShaderMaterial({
      vertexShader: /* glsl */ `
        attribute vec3 aColor;
        attribute float aSize;
        varying vec3 vColor;
        void main() {
          vColor = aColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (250.0 / -mvPosition.z);
          gl_PointSize = clamp(gl_PointSize, 0.5, 12.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.05, 0.5, d);
          gl_FragColor = vec4(vColor, alpha * 0.6);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    return { geometry: geo, material: mat };
  }, [color]);

  return (
    <group ref={groupRef}>
      <points geometry={geometry} material={material} />
      {/* Central glow */}
      <mesh>
        <sphereGeometry args={[1.5, 24, 24]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.15}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Galaxy detail view (spiral particle system)                       */
/* ------------------------------------------------------------------ */

/**
 * Galaxy rendering profiles.
 * armCount = 0 → irregular galaxy (LMC, SMC).
 * Spiral arms are distributed by radius using a logarithmic spiral equation
 * so that particles span the full disk from the inner bulge to maxRadius.
 */
interface GalaxyProfile {
  particleCount: number;
  /** Number of spiral arms; 0 for irregular galaxies. */
  armCount: number;
  coreFraction: number;
  coreSpread: [number, number, number];
  /** Spiral pitch angle in degrees (ignored when armCount === 0). */
  pitchDeg: number;
  /** Perpendicular spread of arm particles. */
  armSpread: number;
  maxRadius: number;
  diskHeight: number;
  tilt: [number, number, number];
  coreGlowRadius: number;
  coreGlowOpacity: number;
}

const GALAXY_PROFILES: { [key: string]: GalaxyProfile | undefined } = {
  andromeda: {
    particleCount: 22_000,
    armCount: 2,
    coreFraction: 0.25,
    coreSpread: [1.8, 0.5, 1.5],
    pitchDeg: 11,
    armSpread: 0.7,
    maxRadius: 9,
    diskHeight: 0.12,
    tilt: [1.2, 0, 0.15],
    coreGlowRadius: 1.0,
    coreGlowOpacity: 0.3,
  },
  triangulum: {
    particleCount: 8_000,
    armCount: 3,
    coreFraction: 0.12,
    coreSpread: [0.8, 0.25, 0.7],
    pitchDeg: 17,
    armSpread: 1.2,
    maxRadius: 6,
    diskHeight: 0.20,
    tilt: [0.4, 0, 0.5],
    coreGlowRadius: 0.4,
    coreGlowOpacity: 0.15,
  },
  lmc: {
    particleCount: 14_000,
    armCount: 0,
    coreFraction: 0.20,
    coreSpread: [2.0, 0.6, 1.5],
    pitchDeg: 0,
    armSpread: 0,
    maxRadius: 7,
    diskHeight: 0.35,
    tilt: [0.6, 0, 0.25],
    coreGlowRadius: 0.8,
    coreGlowOpacity: 0.2,
  },
  smc: {
    particleCount: 8_000,
    armCount: 0,
    coreFraction: 0.25,
    coreSpread: [1.5, 0.6, 1.2],
    pitchDeg: 0,
    armSpread: 0,
    maxRadius: 5,
    diskHeight: 0.5,
    tilt: [0.35, 0.15, 0.4],
    coreGlowRadius: 0.5,
    coreGlowOpacity: 0.15,
  },
};

const DEFAULT_GALAXY_PROFILE: GalaxyProfile = GALAXY_PROFILES.andromeda!;

function GalaxyMiniDetail({
  color,
  objectId,
  reducedMotion,
}: {
  color: string;
  objectId: DeepSkyObjectId;
  reducedMotion: boolean;
}) {
  const groupRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (reducedMotion || !groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.03;
  });

  const profile: GalaxyProfile = GALAXY_PROFILES[objectId] ?? DEFAULT_GALAXY_PROFILE;

  const { geometry, material } = useMemo(() => {
    const count = profile.particleCount;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const baseColor = new Color(color);
    const armColor = new Color(color).lerp(new Color('#a0c0ff'), 0.4);
    const coreColor = new Color(color).lerp(new Color('#ffe0a0'), 0.5);
    const tmpC = new Color();
    const seed = [...objectId].reduce((value, character) => value + character.charCodeAt(0), 22_003);
    const random = createSeededRandom(seed);

    const coreEnd = Math.floor(count * profile.coreFraction);
    const pitchTan = profile.pitchDeg > 0 ? Math.tan(profile.pitchDeg * Math.PI / 180) : 1;
    const rMin = 0.5;

    for (let i = 0; i < count; i++) {
      if (i < coreEnd) {
        // Core / bulge region — Gaussian distribution
        const bx = (random() - 0.5 + random() - 0.5) * profile.coreSpread[0];
        const by = (random() - 0.5 + random() - 0.5) * profile.coreSpread[1];
        const bz = (random() - 0.5 + random() - 0.5) * profile.coreSpread[2];
        positions[i * 3] = bx;
        positions[i * 3 + 1] = by;
        positions[i * 3 + 2] = bz;
        tmpC.copy(coreColor);
        sizes[i] = 0.6 + random() * 1.0;
      } else if (profile.armCount === 0) {
        // Irregular galaxy — lumpy disk distribution
        const rFrac = Math.pow(random(), 0.5);
        const r = 0.3 + rFrac * (profile.maxRadius - 0.3);
        const angle = random() * Math.PI * 2;
        const lump = Math.sin(angle * 3 + r * 0.5) * 0.3 + 0.7;
        const xOff = (random() - 0.5) * r * 0.3;
        const zOff = (random() - 0.5) * r * 0.3;
        positions[i * 3] = Math.cos(angle) * r * lump + xOff;
        positions[i * 3 + 1] = (random() - 0.5 + random() - 0.5) * 0.5 * profile.diskHeight * (1 + rFrac);
        positions[i * 3 + 2] = Math.sin(angle) * r * lump + zOff;
        tmpC.copy(armColor).lerp(baseColor, random() * 0.6);
        sizes[i] = 0.4 + random() * 0.9;
      } else {
        // Spiral arm particles — distribute by radius, compute spiral angle
        const rFrac = Math.pow(random(), 0.6);
        const r = rMin + rFrac * (profile.maxRadius - rMin);

        let px: number, pz: number;

        if (random() < 0.15) {
          // 15 % diffuse inter-arm disk particles
          const angle = random() * Math.PI * 2;
          px = Math.cos(angle) * r;
          pz = Math.sin(angle) * r;
        } else {
          const armIndex = Math.floor(random() * profile.armCount);
          const armOffset = (armIndex / profile.armCount) * Math.PI * 2;
          // Logarithmic spiral: angle = ln(r/r0) / tan(pitch)
          const spiralAngle = armOffset + Math.log(r / rMin) / pitchTan;
          const spreadAmount = profile.armSpread * (0.3 + 0.7 * rFrac);
          const spread = (random() - 0.5 + random() - 0.5) * 0.5 * spreadAmount;
          const perpAngle = spiralAngle + Math.PI / 2;
          px = Math.cos(spiralAngle) * r + Math.cos(perpAngle) * spread;
          pz = Math.sin(spiralAngle) * r + Math.sin(perpAngle) * spread;
        }

        positions[i * 3] = px;
        positions[i * 3 + 1] = (random() - 0.5) * profile.diskHeight;
        positions[i * 3 + 2] = pz;
        tmpC.copy(armColor).lerp(baseColor, random() * 0.5);
        sizes[i] = 0.3 + random() * 0.7 * (1 - rFrac * 0.3);
      }

      colors[i * 3] = tmpC.r;
      colors[i * 3 + 1] = tmpC.g;
      colors[i * 3 + 2] = tmpC.b;
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    geo.setAttribute('aColor', new BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new BufferAttribute(sizes, 1));

    const mat = new ShaderMaterial({
      vertexShader: /* glsl */ `
        attribute vec3 aColor;
        attribute float aSize;
        varying vec3 vColor;
        void main() {
          vColor = aColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (200.0 / -mvPosition.z);
          gl_PointSize = clamp(gl_PointSize, 0.5, 8.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.15, 0.5, d);
          gl_FragColor = vec4(vColor, alpha * 0.8);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    return { geometry: geo, material: mat };
  }, [color, objectId, profile]);

  return (
    <group ref={groupRef} rotation={profile.tilt}>
      <points geometry={geometry} material={material} />
      <mesh>
        <sphereGeometry args={[profile.coreGlowRadius, 24, 24]} />
        <meshBasicMaterial
          color={new Color(color).lerp(new Color('#ffe0a0'), 0.4)}
          transparent
          opacity={profile.coreGlowOpacity}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Star cluster detail view                                          */
/* ------------------------------------------------------------------ */

function ClusterDetail({
  color,
  kind,
  reducedMotion,
}: {
  color: string;
  kind: 'globular-cluster' | 'open-cluster';
  reducedMotion: boolean;
}) {
  const groupRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (reducedMotion || !groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.02;
  });

  const { geometry, material } = useMemo(() => {
    const count = kind === 'globular-cluster' ? 10_000 : 3_000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const baseColor = new Color(color);
    const tmpC = new Color();
    const seed = [...`${kind}:${color}`].reduce((value, character) => value + character.charCodeAt(0), 33_007);
    const random = createSeededRandom(seed);

    for (let i = 0; i < count; i++) {
      if (kind === 'globular-cluster') {
        // Dense spherical distribution (King model approximation)
        const rRaw = Math.pow(random(), 0.35) * 5;
        const phi = Math.acos(2 * random() - 1);
        const theta = random() * Math.PI * 2;
        positions[i * 3] = rRaw * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = rRaw * Math.cos(phi);
        positions[i * 3 + 2] = rRaw * Math.sin(phi) * Math.sin(theta);
      } else {
        // Loose open cluster
        const rRaw = Math.pow(random(), 0.5) * 6;
        const phi = Math.acos(2 * random() - 1);
        const theta = random() * Math.PI * 2;
        positions[i * 3] = rRaw * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = rRaw * Math.cos(phi) * 0.4;
        positions[i * 3 + 2] = rRaw * Math.sin(phi) * Math.sin(theta);
      }

      // Star colour variation
      const rnd = random();
      if (rnd > 0.9) tmpC.set('#a0c0ff');       // blue
      else if (rnd > 0.7) tmpC.set('#fff8e0');   // white-yellow
      else if (rnd > 0.4) tmpC.copy(baseColor);
      else tmpC.set('#ffc080');                   // orange/red giant

      colors[i * 3] = tmpC.r;
      colors[i * 3 + 1] = tmpC.g;
      colors[i * 3 + 2] = tmpC.b;
      sizes[i] = 0.4 + random() * 1.0;
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    geo.setAttribute('aColor', new BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new BufferAttribute(sizes, 1));

    const mat = new ShaderMaterial({
      vertexShader: /* glsl */ `
        attribute vec3 aColor;
        attribute float aSize;
        varying vec3 vColor;
        void main() {
          vColor = aColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (200.0 / -mvPosition.z);
          gl_PointSize = clamp(gl_PointSize, 0.5, 6.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.1, 0.5, d);
          gl_FragColor = vec4(vColor, alpha * 0.85);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    return { geometry: geo, material: mat };
  }, [color, kind]);

  return (
    <group ref={groupRef}>
      <points geometry={geometry} material={material} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Main deep-sky detail component (dispatches by kind)               */
/* ------------------------------------------------------------------ */

export function DeepSkyDetail({
  objectId,
  reducedMotion,
}: DeepSkyDetailProps) {
  const obj = DEEP_SKY_BY_ID[objectId];

  return (
    <>
      <ambientLight intensity={0.15} />
      {obj.kind === 'black-hole' && (
        <BlackHoleDetail reducedMotion={reducedMotion} />
      )}
      {obj.kind === 'nebula' && (
        <NebulaDetail color={obj.color} reducedMotion={reducedMotion} />
      )}
      {obj.kind === 'galaxy' && (
        <GalaxyMiniDetail color={obj.color} objectId={objectId} reducedMotion={reducedMotion} />
      )}
      {(obj.kind === 'globular-cluster' || obj.kind === 'open-cluster') && (
        <ClusterDetail
          color={obj.color}
          kind={obj.kind}
          reducedMotion={reducedMotion}
        />
      )}
    </>
  );
}
