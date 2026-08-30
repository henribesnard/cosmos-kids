import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  ShaderMaterial,
} from 'three';
import type { Locale } from '../data/types';
import { LOCAL_GROUP_GALAXIES } from './galaxyCatalog';

/* ------------------------------------------------------------------ */
/*  Props                                                             */
/* ------------------------------------------------------------------ */

export interface LocalGroupSceneProps {
  locale: Locale;
  showLabels: boolean;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

/** Scene scale: 1 unit = 100 000 ly. */
const LG_SCALE = 10;

/* ------------------------------------------------------------------ */
/*  Individual galaxy sprite (mini particle system)                   */
/* ------------------------------------------------------------------ */

function GalaxySprite({
  id,
  name,
  position,
  scale,
  color,
  locale,
  showLabels,
  reducedMotion,
  onSelect,
  onHover,
}: {
  id: string;
  name: { fr: string; en: string };
  position: readonly [number, number, number];
  scale: number;
  color: string;
  locale: Locale;
  showLabels: boolean;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const groupRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (reducedMotion || !groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.04;
  });

  const { geometry, material } = useMemo(() => {
    const count = Math.max(500, Math.round(2000 * scale));
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const baseColor = new Color(color);
    const coreColor = new Color(color).lerp(new Color('#ffe8a0'), 0.5);
    const tmpC = new Color();

    for (let i = 0; i < count; i++) {
      const t = i / count;
      if (t < 0.35) {
        // Core
        const r = Math.pow(Math.random(), 0.6) * scale * 0.3;
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.cos(phi) * 0.3;
        positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
        tmpC.copy(coreColor);
        sizes[i] = 0.4 + Math.random() * 0.8;
      } else {
        // Disk
        const r = Math.sqrt(Math.random()) * scale;
        const theta = Math.random() * Math.PI * 2;
        positions[i * 3] = Math.cos(theta) * r;
        positions[i * 3 + 1] = (Math.random() - 0.5) * scale * 0.04;
        positions[i * 3 + 2] = Math.sin(theta) * r;
        tmpC.copy(baseColor).lerp(new Color('#a0c0ff'), Math.random() * 0.3);
        sizes[i] = 0.3 + Math.random() * 0.6;
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
          gl_PointSize = aSize * (180.0 / -mvPosition.z);
          gl_PointSize = clamp(gl_PointSize, 0.5, 6.0);
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
  }, [color, scale]);

  const scaledPos: [number, number, number] = [
    position[0] * LG_SCALE,
    position[1] * LG_SCALE,
    position[2] * LG_SCALE,
  ];

  return (
    <group position={scaledPos}>
      {/* Clickable hit area */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          if (id !== 'milkyway') onSelect(id);
        }}
        onPointerEnter={(e) => {
          e.stopPropagation();
          if (id !== 'milkyway') {
            onHover(id);
            document.body.style.cursor = 'pointer';
          }
        }}
        onPointerLeave={() => {
          onHover(null);
          document.body.style.cursor = '';
        }}
        visible={false}
      >
        <sphereGeometry args={[scale * 1.2, 8, 8]} />
        <meshBasicMaterial />
      </mesh>

      <group ref={groupRef} rotation={[0.4, 0, 0.15]}>
        <points geometry={geometry} material={material} />
        {/* Core glow */}
        <mesh>
          <sphereGeometry args={[scale * 0.12, 16, 16]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>
      </group>

      {showLabels && (
        <Html
          position={[0, scale * 0.7 + 0.5, 0]}
          center
          style={{
            color,
            fontSize: 11,
            fontFamily: 'Outfit, system-ui, sans-serif',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            textShadow: '0 0 8px rgba(0,0,0,0.8)',
            userSelect: 'none',
          }}
        >
          <div>{name[locale]}</div>
        </Html>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Local Group scene                                            */
/* ------------------------------------------------------------------ */

export function LocalGroupScene({
  locale,
  showLabels,
  reducedMotion,
  onSelect,
  onHover,
}: LocalGroupSceneProps) {
  return (
    <>
      <ambientLight intensity={0.1} />
      {LOCAL_GROUP_GALAXIES.map((galaxy) => (
        <GalaxySprite
          key={galaxy.id}
          id={galaxy.id}
          name={galaxy.name}
          position={galaxy.position}
          scale={galaxy.sceneScale}
          color={galaxy.color}
          locale={locale}
          showLabels={showLabels}
          reducedMotion={reducedMotion}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
    </>
  );
}
