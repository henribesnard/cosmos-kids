/**
 * 3D celestial sphere scene showing stars and constellation stick figures.
 *
 * The observer sits at the origin (centre of the sphere) and looks outward.
 * Stars are rendered as point-particles on a sphere of radius CELESTIAL_SPHERE_RADIUS.
 * Constellation lines connect the stars using their equatorial coordinates.
 */

import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  LineBasicMaterial,
  ShaderMaterial,
  Vector3,
} from 'three';
import type { Locale } from '../data/types';
import { CONSTELLATION_CATALOG } from '../data/constellations';
import type { ConstellationAbbr } from '../data/constellationTypes';
import {
  CELESTIAL_SPHERE_RADIUS,
  bvToColor,
  constellationData,
  equatorialToCartesian,
  magnitudeToSize,
} from './constellationCatalog';

export interface ConstellationSceneProps {
  locale: Locale;
  showLabels: boolean;
  showLines: boolean;
  selectedConstellationId: ConstellationAbbr | null;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

/* ------------------------------------------------------------------ */
/*  Shaders                                                           */
/* ------------------------------------------------------------------ */

const starVertexShader = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = aColor;
    vAlpha = 1.0;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (320.0 / max(1.0, -mvPosition.z));
    gl_PointSize = clamp(gl_PointSize, 0.6, 8.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const starFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float alpha = 1.0 - smoothstep(0.08, 0.5, d);
    gl_FragColor = vec4(vColor, alpha * vAlpha);
  }
`;

/* ------------------------------------------------------------------ */
/*  Star field geometry builder                                       */
/* ------------------------------------------------------------------ */

function buildStarGeometry(): BufferGeometry {
  const { stars } = constellationData;
  const count = stars.length;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const star = stars[i]!;
    const [x, y, z] = equatorialToCartesian(star.ra, star.dec);
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    const [r, g, b] = bvToColor(star.bv);
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;

    sizes[i] = magnitudeToSize(star.mag);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new BufferAttribute(sizes, 1));
  return geometry;
}

/* ------------------------------------------------------------------ */
/*  Constellation line geometry builder                               */
/* ------------------------------------------------------------------ */

function buildConstellationLineGeometry(
  selectedId: ConstellationAbbr | null,
): { geometry: BufferGeometry; selectedGeometry: BufferGeometry | null } {
  const { constellationLines } = constellationData;
  const allPoints: number[] = [];
  const selectedPoints: number[] = [];

  for (const [abbr, lineGroups] of Object.entries(constellationLines)) {
    const isSelected = abbr === selectedId;
    for (const lineString of lineGroups) {
      for (let i = 0; i < lineString.length - 1; i++) {
        const [ra1, dec1] = lineString[i]!;
        const [ra2, dec2] = lineString[i + 1]!;
        const [x1, y1, z1] = equatorialToCartesian(ra1, dec1);
        const [x2, y2, z2] = equatorialToCartesian(ra2, dec2);

        if (isSelected) {
          selectedPoints.push(x1, y1, z1, x2, y2, z2);
        } else {
          allPoints.push(x1, y1, z1, x2, y2, z2);
        }
      }
    }
  }

  const geometry = new BufferGeometry();
  if (allPoints.length > 0) {
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(allPoints), 3));
  }

  let selectedGeometry: BufferGeometry | null = null;
  if (selectedPoints.length > 0) {
    selectedGeometry = new BufferGeometry();
    selectedGeometry.setAttribute('position', new BufferAttribute(new Float32Array(selectedPoints), 3));
  }

  return { geometry, selectedGeometry };
}

/* ------------------------------------------------------------------ */
/*  Constellation label positions (centre of each stick figure)       */
/* ------------------------------------------------------------------ */

interface ConstellationLabel {
  id: ConstellationAbbr;
  position: Vector3;
  name: { fr: string; en: string };
  color: string;
}

function buildConstellationLabels(): ConstellationLabel[] {
  const { constellationLines } = constellationData;
  const labels: ConstellationLabel[] = [];

  for (const [abbr, lineGroups] of Object.entries(constellationLines)) {
    // Compute centroid of all points in the stick figure
    let cx = 0, cy = 0, cz = 0, count = 0;
    for (const lineString of lineGroups) {
      for (const [ra, dec] of lineString) {
        const [x, y, z] = equatorialToCartesian(ra, dec);
        cx += x;
        cy += y;
        cz += z;
        count++;
      }
    }
    if (count === 0) continue;

    cx /= count;
    cy /= count;
    cz /= count;

    // Project centroid back onto the sphere
    const len = Math.sqrt(cx * cx + cy * cy + cz * cz);
    if (len < 0.01) continue;
    const scale = CELESTIAL_SPHERE_RADIUS / len;

    const def = CONSTELLATION_CATALOG[abbr as ConstellationAbbr];
    if (!def) continue;

    labels.push({
      id: abbr as ConstellationAbbr,
      position: new Vector3(cx * scale, cy * scale, cz * scale),
      name: { fr: def.name.fr, en: def.name.en },
      color: def.color,
    });
  }

  return labels;
}

/* ------------------------------------------------------------------ */
/*  Star particles component                                          */
/* ------------------------------------------------------------------ */

function CelestialSphereStars() {
  const geometry = useMemo(() => buildStarGeometry(), []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: starVertexShader,
        fragmentShader: starFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  );

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  return <points geometry={geometry} material={material} />;
}

/* ------------------------------------------------------------------ */
/*  Constellation lines component                                     */
/* ------------------------------------------------------------------ */

function ConstellationLines({
  selectedId,
  visible,
}: {
  selectedId: ConstellationAbbr | null;
  visible: boolean;
}) {
  const { geometry, selectedGeometry } = useMemo(
    () => buildConstellationLineGeometry(selectedId),
    [selectedId],
  );

  const lineMaterial = useMemo(
    () =>
      new LineBasicMaterial({
        color: selectedId ? '#3a5a8a' : '#5580b8',
        transparent: true,
        opacity: selectedId ? 0.25 : 0.42,
        depthWrite: false,
      }),
    [selectedId],
  );

  const selectedMaterial = useMemo(
    () => {
      const def = selectedId ? CONSTELLATION_CATALOG[selectedId] : null;
      return new LineBasicMaterial({
        color: def?.color ?? '#63e6ff',
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      });
    },
    [selectedId],
  );

  useEffect(() => () => {
    geometry.dispose();
    selectedGeometry?.dispose();
    lineMaterial.dispose();
    selectedMaterial.dispose();
  }, [geometry, selectedGeometry, lineMaterial, selectedMaterial]);

  if (!visible) return null;

  return (
    <>
      {geometry.getAttribute('position') && (
        <lineSegments geometry={geometry} material={lineMaterial} />
      )}
      {selectedGeometry && (
        <lineSegments geometry={selectedGeometry} material={selectedMaterial} />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Constellation labels component                                    */
/* ------------------------------------------------------------------ */

function ConstellationLabels({
  locale,
  selectedId,
  visible,
  onSelect,
  onHover,
}: {
  locale: Locale;
  selectedId: ConstellationAbbr | null;
  visible: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const labels = useMemo(() => buildConstellationLabels(), []);

  // Only show labels roughly facing the camera
  const visibleLabels = useMemo(() => {
    if (!visible) return [];
    return labels;
  }, [labels, visible]);

  if (!visible) return null;

  return (
    <>
      {visibleLabels.map((label) => {
        const isSelected = label.id === selectedId;
        return (
          <Html
            key={label.id}
            position={label.position}
            center
            zIndexRange={[12, 2]}
            occlude={false}
            style={{ pointerEvents: 'auto' }}
          >
            <button
              type="button"
              onClick={() => onSelect(label.id)}
              onPointerEnter={() => onHover(label.id)}
              onPointerLeave={() => onHover(null)}
              style={{
                padding: isSelected ? '5px 12px' : '3px 9px',
                border: `1px solid ${isSelected ? label.color : 'rgba(150,190,255,.2)'}`,
                borderRadius: 999,
                color: isSelected ? '#ffffff' : '#cfe0ff',
                background: isSelected ? `${label.color}33` : 'rgba(8,16,34,.48)',
                boxShadow: isSelected
                  ? `0 0 14px ${label.color}44`
                  : '0 2px 10px rgba(0,0,0,.4)',
                fontFamily: 'Outfit, system-ui, sans-serif',
                fontSize: isSelected ? 14 : 11,
                fontWeight: isSelected ? 700 : 500,
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                opacity: isSelected ? 1 : 0.72,
                cursor: 'pointer',
                transition: 'opacity .16s ease, border-color .16s ease, background .16s ease',
                backdropFilter: 'blur(4px)',
              }}
            >
              {label.name[locale]}
            </button>
          </Html>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Slow celestial rotation                                           */
/* ------------------------------------------------------------------ */

function CelestialRotation({
  children,
  reducedMotion,
}: {
  children: React.ReactNode;
  reducedMotion: boolean;
}) {
  const groupRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (reducedMotion || !groupRef.current) return;
    // Very slow rotation to give a sense of a living sky
    groupRef.current.rotation.y += delta * 0.008;
  });

  return <group ref={groupRef}>{children}</group>;
}

/* ------------------------------------------------------------------ */
/*  Main scene                                                        */
/* ------------------------------------------------------------------ */

export function ConstellationScene({
  locale,
  showLabels,
  showLines,
  selectedConstellationId,
  reducedMotion,
  onSelect,
  onHover,
}: ConstellationSceneProps) {
  return (
    <group>
      <ambientLight color="#1a2540" intensity={0.3} />
      <CelestialRotation reducedMotion={reducedMotion}>
        <CelestialSphereStars />
        <ConstellationLines selectedId={selectedConstellationId} visible={showLines} />
        <ConstellationLabels
          locale={locale}
          selectedId={selectedConstellationId}
          visible={showLabels}
          onSelect={onSelect}
          onHover={onHover}
        />
      </CelestialRotation>
    </group>
  );
}
