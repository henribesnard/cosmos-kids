import { Html, OrbitControls, Stars, useTexture } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ComponentRef,
  type ErrorInfo,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  ClampToEdgeWrapping,
  Color,
  DoubleSide,
  Group,
  LineBasicMaterial,
  LinearFilter,
  NoColorSpace,
  PerspectiveCamera,
  RepeatWrapping,
  RingGeometry,
  SRGBColorSpace,
  Texture,
  Vector3,
} from 'three';
import {
  sceneCameraPresets,
  sceneCatalog,
  sceneRenderConfig,
  solarBodyIds,
  type SceneBodyDefinition,
  type SceneBodyId,
  type SceneOrbit,
  type UniverseView,
} from './sceneCatalog';
import { ConstellationScene } from './ConstellationScene';
import { MilkyWayScene } from './MilkyWayScene';
import { LocalGroupScene } from './LocalGroupScene';
import { DeepSkyDetail } from './DeepSkyDetail';
import { isDeepSkyObjectId, type DeepSkyObjectId } from '../data/types';
import { useCosmosStore } from '../store/useCosmosStore';
import { getConstellationCentroidDirection } from './constellationCatalog';

/** Public, controlled contract for the production Three/R3F viewport. */
export interface UniverseViewportProps {
  /** Scene composition and camera preset to display. */
  view: UniverseView;
  /** Controlled selected object id; an unknown id safely falls back to Saturn in `planet` view. */
  selectedId: string | null;
  /** Controlled hovered object id, used for the visual focus treatment. */
  hoveredId: string | null;
  /** Stops automatic camera, orbital, spin and star motion when true. */
  reducedMotion: boolean;
  /** Shows physically shaped (but spatially compressed) orbital ellipses. */
  showOrbits: boolean;
  /** Shows non-interactive DOM labels anchored to the 3D bodies. */
  showLabels: boolean;
  /** Simulation multiplier. Use 0 to pause, then values such as 1, 100 or 10_000. */
  timeScale: number;
  /** Language used by 3D labels and fallback messages. */
  locale?: 'fr' | 'en';
  /** Per-body orbital phase overrides (radians). When set, bodies are positioned at these phases. */
  phaseOverrides?: Readonly<Partial<Record<SceneBodyId, number>>> | null;
  /** Called when a celestial mesh is clicked. */
  onSelect: (id: string) => void;
  /** Called on celestial pointer enter/leave; `null` clears hover. */
  onHover: (id: string | null) => void;
  /** Called once after WebGL is mounted and every texture for the active view has resolved. */
  onReady?: () => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  resetKey: string;
  locale: 'fr' | 'en';
}

interface ErrorBoundaryState {
  error: Error | null;
}

const fillStyle = {
  position: 'absolute',
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  padding: 24,
  color: '#cfe0ff',
  background: 'radial-gradient(90% 80% at 60% 20%, #0b1430 0%, #03060f 68%)',
  fontFamily: 'Outfit, system-ui, sans-serif',
  textAlign: 'center',
} as const;

class SceneErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Cosmos Kids] 3D engine failed to start.', error, info.componentStack);
  }

  componentDidUpdate(previousProps: ErrorBoundaryProps) {
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      const fr = this.props.locale === 'fr';
      return (
        <div role="alert" style={fillStyle}>
          <div>
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 18, fontWeight: 700 }}>
              {fr ? 'La vue 3D est momentanément indisponible' : 'The 3D view is temporarily unavailable'}
            </div>
            <div style={{ marginTop: 7, maxWidth: 420, color: '#93a6c9', fontSize: 14, lineHeight: 1.45 }}>
              {fr
                ? 'Les informations restent accessibles. Recharge la page ou choisis une autre vue pour réessayer.'
                : 'Information is still accessible. Reload the page or choose another view to try again.'}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function CanvasUnavailable({ locale }: { locale: 'fr' | 'en' }) {
  const fr = locale === 'fr';
  return (
    <div role="status" style={fillStyle}>
      <div>
        <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 18, fontWeight: 700 }}>
          {fr ? 'Ton navigateur ne peut pas afficher cette vue 3D' : 'Your browser cannot display this 3D view'}
        </div>
        <div style={{ marginTop: 7, color: '#93a6c9', fontSize: 14 }}>
          {fr ? 'WebGL est nécessaire pour voyager dans le système solaire.' : 'WebGL is required to travel through the Solar System.'}
        </div>
      </div>
    </div>
  );
}

function SceneLoading({ locale }: { locale: 'fr' | 'en' }) {
  return (
    <Html center zIndexRange={[30, 20]}>
      <div
        role="status"
        aria-live="polite"
        style={{
          width: 190,
          padding: '11px 16px',
          border: '1px solid rgba(99,230,255,.28)',
          borderRadius: 999,
          color: '#cfe0ff',
          background: 'rgba(10,18,38,.78)',
          boxShadow: '0 18px 50px rgba(0,0,0,.4)',
          fontFamily: 'Outfit, system-ui, sans-serif',
          fontSize: 13,
          fontWeight: 600,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          backdropFilter: 'blur(12px)',
        }}
      >
        {locale === 'fr' ? 'Préparation du voyage…' : 'Preparing the journey…'}
      </div>
    </Html>
  );
}

function isSceneBodyId(id: string | null): id is SceneBodyId {
  return id !== null && Object.prototype.hasOwnProperty.call(sceneCatalog, id);
}

function useSceneTexture(url: string, colorTexture: boolean, radialStrip = false) {
  const loaded = useTexture(url);
  const maxAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy());

  useEffect(() => {
    loaded.colorSpace = colorTexture ? SRGBColorSpace : NoColorSpace;
    loaded.anisotropy = Math.min(8, maxAnisotropy);
    loaded.wrapS = radialStrip ? ClampToEdgeWrapping : RepeatWrapping;
    loaded.wrapT = ClampToEdgeWrapping;
    if (radialStrip) {
      loaded.magFilter = LinearFilter;
    }
    loaded.needsUpdate = true;
  }, [colorTexture, loaded, maxAnisotropy, radialStrip]);

  // `useTexture` owns a shared loader cache. Disposing it here would invalidate
  // another mounted body/view; R3F still disposes all local geometry/materials.
  return loaded;
}

function useBodySpin(
  ref: RefObject<Group | null>,
  body: SceneBodyDefinition,
  reducedMotion: boolean,
  timeScale: number,
  multiplier = 1,
) {
  useFrame((_, delta) => {
    if (reducedMotion || timeScale === 0 || !ref.current) return;
    const periodSeconds = Math.max(
      0.8,
      (Math.abs(body.rotationHours) / 23.934) * sceneRenderConfig.earthDaySeconds,
    );
    const step = (delta * timeScale * multiplier * Math.PI * 2) / periodSeconds;
    ref.current.rotation.y = (ref.current.rotation.y + step) % (Math.PI * 2);
  });
}

interface BodyVisualProps {
  body: SceneBodyDefinition;
  radius: number;
  reducedMotion: boolean;
  timeScale: number;
  detail: boolean;
}

function AtmosphereShell({ radius, color, opacity }: { radius: number; color: string; opacity: number }) {
  return (
    <mesh scale={[1.045, 1.045, 1.045]} renderOrder={4}>
      <sphereGeometry args={[radius, 64, 40]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        side={BackSide}
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </mesh>
  );
}

function EarthVisual({ body, radius, reducedMotion, timeScale, detail }: BodyVisualProps) {
  const day = useSceneTexture(body.texture.albedo, true);
  const night = useSceneTexture(body.texture.night!, true);
  const clouds = useSceneTexture(body.texture.clouds!, false);
  const normal = useSceneTexture(body.texture.normal!, false);
  const specular = useSceneTexture(body.texture.specular!, false);
  const surfaceRef = useRef<Group>(null);
  const cloudRef = useRef<Group>(null);
  useBodySpin(surfaceRef, body, reducedMotion, timeScale);
  useBodySpin(cloudRef, body, reducedMotion, timeScale, 1.045);
  const widthSegments = detail ? 96 : 48;
  const heightSegments = detail ? 64 : 32;

  return (
    <>
      <group ref={surfaceRef}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[radius, widthSegments, heightSegments]} />
          <meshPhongMaterial
            map={day}
            normalMap={normal}
            normalScale={[0.48, 0.48]}
            specularMap={specular}
            specular={new Color('#7d91a7')}
            shininess={24}
          />
        </mesh>
        <NightLights map={night} radius={radius} detail={detail} />
      </group>
      <group ref={cloudRef}>
        <mesh scale={[1.012, 1.012, 1.012]} renderOrder={3}>
          <sphereGeometry args={[radius, widthSegments, heightSegments]} />
          <meshPhongMaterial
            color="#ffffff"
            alphaMap={clouds}
            transparent
            opacity={0.72}
            alphaTest={0.025}
            depthWrite={false}
          />
        </mesh>
      </group>
      {!detail && (
        <AtmosphereShell
          radius={radius}
          color={body.atmosphereColor ?? '#62b6ff'}
          opacity={body.atmosphereOpacity ?? 0.18}
        />
      )}
    </>
  );
}

function NightLights({ map, radius, detail }: { map: Texture; radius: number; detail: boolean }) {
  const uniforms = useMemo(() => ({ nightMap: { value: map } }), [map]);
  return (
    <mesh scale={1.0015} renderOrder={2}>
      <sphereGeometry args={[radius, detail ? 96 : 48, detail ? 64 : 32]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          varying vec3 vWorldNormal;
          void main() {
            vUv = uv;
            vWorldNormal = normalize(mat3(modelMatrix) * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform sampler2D nightMap;
          varying vec2 vUv;
          varying vec3 vWorldNormal;
          void main() {
            vec3 lights = texture2D(nightMap, vUv).rgb;
            float luminance = dot(lights, vec3(0.2126, 0.7152, 0.0722));
            vec3 lightDirection = normalize(vec3(16.0, 7.0, 13.0));
            float nightSide = smoothstep(0.16, -0.22, dot(normalize(vWorldNormal), lightDirection));
            float alpha = smoothstep(0.025, 0.72, luminance) * nightSide * 0.92;
            gl_FragColor = vec4(lights * 1.65, alpha);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </mesh>
  );
}

function createRadialRingGeometry(innerRadius: number, outerRadius: number) {
  const geometry = new RingGeometry(innerRadius, outerRadius, 256, 1);
  const positions = geometry.getAttribute('position') as BufferAttribute;
  const uvs = geometry.getAttribute('uv') as BufferAttribute;
  const span = outerRadius - innerRadius;

  for (let index = 0; index < positions.count; index += 1) {
    const radialDistance = Math.hypot(positions.getX(index), positions.getY(index));
    const radialU = Math.min(1, Math.max(0, (radialDistance - innerRadius) / span));
    // Solar System Scope supplies a 2048×125 radial strip, not a top-down disc.
    uvs.setXY(index, radialU, 0.5);
  }
  uvs.needsUpdate = true;
  return geometry;
}

function SaturnRings({ body, radius }: { body: SceneBodyDefinition; radius: number }) {
  const ring = body.ring!;
  const ringTexture = useSceneTexture(body.texture.rings!, true, true);
  const geometry = useMemo(
    () => createRadialRingGeometry(radius * ring.innerRadiusRatio, radius * ring.outerRadiusRatio),
    [radius, ring.innerRadiusRatio, ring.outerRadiusRatio],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} rotation={[Math.PI / 2, 0, 0]} receiveShadow renderOrder={2}>
      <meshStandardMaterial
        map={ringTexture}
        transparent
        opacity={ring.opacity}
        alphaTest={0.018}
        roughness={0.92}
        metalness={0}
        side={DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function SunVisual({ body, radius, reducedMotion, timeScale, detail }: BodyVisualProps) {
  const albedo = useSceneTexture(body.texture.albedo, true);
  const spinRef = useRef<Group>(null);
  useBodySpin(spinRef, body, reducedMotion, timeScale, 0.35);

  return (
    <>
      <group ref={spinRef}>
        <mesh>
          <sphereGeometry args={[radius, detail ? 96 : 64, detail ? 64 : 40]} />
          <meshBasicMaterial map={albedo} color="#fff4d2" />
        </mesh>
      </group>
      {!detail && (
        <mesh scale={1.16} renderOrder={1}>
          <sphereGeometry args={[radius, 48, 30]} />
          <meshBasicMaterial
            color="#ffb24e"
            transparent
            opacity={0.18}
            side={BackSide}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}
      <pointLight color="#fff0d0" intensity={1_850} decay={2} />
    </>
  );
}

function StandardBodyVisual({ body, radius, reducedMotion, timeScale, detail }: BodyVisualProps) {
  const albedo = useSceneTexture(body.texture.albedo, true);
  const spinRef = useRef<Group>(null);
  useBodySpin(spinRef, body, reducedMotion, timeScale);

  return (
    <>
      <group ref={spinRef}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[radius, detail ? 80 : 48, detail ? 54 : 32]} />
          <meshStandardMaterial map={albedo} color="#ffffff" roughness={0.86} metalness={0.01} />
        </mesh>
      </group>
      {body.texture.atmosphere ? (
        <MappedAtmosphere url={body.texture.atmosphere} radius={radius} detail={detail} />
      ) : null}
      {body.atmosphereColor && !detail ? (
        <AtmosphereShell
          radius={radius}
          color={body.atmosphereColor}
          opacity={body.atmosphereOpacity ?? 0.12}
        />
      ) : null}
      {body.id === 'saturn' ? <SaturnRings body={body} radius={radius} /> : null}
    </>
  );
}

function MappedAtmosphere({ url, radius, detail }: { url: string; radius: number; detail: boolean }) {
  const atmosphere = useSceneTexture(url, true);
  return (
    <mesh scale={1.012} renderOrder={3}>
      <sphereGeometry args={[radius, detail ? 72 : 40, detail ? 48 : 28]} />
      <meshStandardMaterial
        map={atmosphere}
        color="#ffffff"
        transparent
        opacity={0.94}
        roughness={1}
        depthWrite={false}
      />
    </mesh>
  );
}

function BodyVisual(props: BodyVisualProps) {
  if (props.body.id === 'earth') return <EarthVisual {...props} />;
  if (props.body.id === 'sun') return <SunVisual {...props} />;
  return <StandardBodyVisual {...props} />;
}

function FocusHalo({ radius, selected, hovered }: { radius: number; selected: boolean; hovered: boolean }) {
  return (
    <mesh scale={hovered ? 1.075 : 1.045} renderOrder={7}>
      <sphereGeometry args={[radius, 48, 32]} />
      <meshBasicMaterial
        color={hovered ? sceneRenderConfig.hoverColor : sceneRenderConfig.selectionColor}
        side={BackSide}
        transparent
        opacity={hovered ? 0.28 : selected ? 0.12 : 0}
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

function BodyLabel({ body, emphasized, locale }: { body: SceneBodyDefinition; emphasized: boolean; locale: 'fr' | 'en' }) {
  const camera = useThree((s) => s.camera);
  const groupRef = useRef<Group>(null);
  const offsetRef = useRef(new Vector3());

  // Re-compute label offset each frame so it always faces the camera
  useFrame(() => {
    if (!groupRef.current) return;
    // Direction from body center toward camera, in parent-local space
    const parent = groupRef.current.parent;
    if (!parent) return;
    const worldPos = parent.getWorldPosition(new Vector3());
    offsetRef.current.copy(camera.position).sub(worldPos).normalize();
    // Convert to parent-local direction
    parent.worldToLocal(offsetRef.current.add(worldPos));
  });

  return (
    <group ref={groupRef}>
      <Html position={[0, 0, 0]} center zIndexRange={[12, 2]} style={{ pointerEvents: 'none' }}>
        <div
          style={{
            transform: 'translateY(-42px)',
            padding: emphasized ? '5px 11px' : '4px 9px',
            border: `1px solid ${emphasized ? 'rgba(99,230,255,.55)' : 'rgba(150,190,255,.2)'}`,
            borderRadius: 999,
            color: sceneRenderConfig.labelColor,
            background: 'rgba(8,16,34,.56)',
            boxShadow: '0 2px 12px rgba(0,0,0,.5)',
            fontFamily: 'Outfit, system-ui, sans-serif',
            fontSize: emphasized ? 14 : 12,
            fontWeight: 600,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            opacity: emphasized ? 1 : 0.78,
            backdropFilter: 'blur(5px)',
            transition: 'opacity .16s ease, border-color .16s ease',
          }}
        >
          {locale === 'fr' ? body.name : body.nameEn}
        </div>
      </Html>
    </group>
  );
}

interface CelestialBodyProps {
  body: SceneBodyDefinition;
  radius: number;
  detail: boolean;
  selectedId: string | null;
  hoveredId: string | null;
  showLabels: boolean;
  reducedMotion: boolean;
  timeScale: number;
  locale: 'fr' | 'en';
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

function CelestialBody({
  body,
  radius,
  detail,
  selectedId,
  hoveredId,
  showLabels,
  reducedMotion,
  timeScale,
  locale,
  onSelect,
  onHover,
}: CelestialBodyProps) {
  const selected = selectedId === body.id;
  const hovered = hoveredId === body.id;
  const emphasized = selected || hovered;
  const handlePointer = (event: { stopPropagation: () => void }) => event.stopPropagation();

  return (
    <group
      name={`body-${body.id}`}
      onPointerOver={(event) => {
        handlePointer(event);
        onHover(body.id);
      }}
      onPointerOut={(event) => {
        handlePointer(event);
        onHover(null);
      }}
      onClick={(event) => {
        handlePointer(event);
        onSelect(body.id);
      }}
    >
      <group rotation={[0, 0, (body.axialTiltDeg * Math.PI) / 180]}>
        <group scale={[1, 1 - body.flattening, 1]}>
          <BodyVisual
            body={body}
            radius={radius}
            reducedMotion={reducedMotion}
            timeScale={timeScale}
            detail={detail}
          />
          {emphasized && !detail ? <FocusHalo radius={radius} selected={selected} hovered={hovered} /> : null}
        </group>
      </group>
      {showLabels ? <BodyLabel body={body} emphasized={emphasized} locale={locale} /> : null}
    </group>
  );
}

function ellipsePosition(orbit: SceneOrbit, angle: number) {
  const semiMinorAxis = orbit.semiMajorAxis * Math.sqrt(1 - orbit.eccentricity * orbit.eccentricity);
  return new Vector3(
    orbit.semiMajorAxis * (Math.cos(angle) - orbit.eccentricity),
    0,
    semiMinorAxis * Math.sin(angle),
  );
}

function OrbitTrack({ orbit, visible }: { orbit: SceneOrbit; visible: boolean }) {
  const geometry = useMemo(() => {
    const points: Vector3[] = [];
    for (let index = 0; index < 192; index += 1) {
      points.push(ellipsePosition(orbit, (index / 192) * Math.PI * 2));
    }
    return new BufferGeometry().setFromPoints(points);
  }, [orbit]);
  const material = useMemo(
    () => new LineBasicMaterial({ color: '#5579b4', transparent: true, opacity: 0.34, depthWrite: false }),
    [],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return <lineLoop geometry={geometry} material={material} visible={visible} />;
}

interface OrbitingBodyProps extends CelestialBodyProps {
  orbit: SceneOrbit;
  showOrbit: boolean;
  children?: ReactNode;
}

function OrbitingBody({ orbit, showOrbit, reducedMotion, timeScale, children, ...bodyProps }: OrbitingBodyProps) {
  const movingRef = useRef<Group>(null);
  const angle = useRef(orbit.phase);
  const setPosition = useCallback(() => {
    if (movingRef.current) movingRef.current.position.copy(ellipsePosition(orbit, angle.current));
  }, [orbit]);

  useLayoutEffect(setPosition, [setPosition]);
  useFrame((_, delta) => {
    if (reducedMotion || timeScale === 0) return;
    const periodSeconds = Math.max(
      1,
      (orbit.orbitalPeriodDays / 365.256) * sceneRenderConfig.earthYearSeconds,
    );
    angle.current = (angle.current + (delta * timeScale * Math.PI * 2) / periodSeconds) % (Math.PI * 2);
    setPosition();
  });

  return (
    <group rotation={[(orbit.inclinationDeg * Math.PI) / 180, 0, 0]}>
      <OrbitTrack orbit={orbit} visible={showOrbit} />
      <group ref={movingRef}>
        <CelestialBody {...bodyProps} reducedMotion={reducedMotion} timeScale={timeScale} />
        {children}
      </group>
    </group>
  );
}

const solarMoonOrbit: SceneOrbit = {
  ...sceneCatalog.moon.orbit!,
  // The real Earth–Moon spacing cannot be legible beside the compressed
  // planetary system. This remains a render-only value, disclosed in the UI.
  semiMajorAxis: 2.15,
};

type SharedSceneProps = Pick<
  UniverseViewportProps,
  | 'selectedId'
  | 'hoveredId'
  | 'reducedMotion'
  | 'showOrbits'
  | 'showLabels'
  | 'timeScale'
  | 'onSelect'
  | 'onHover'
> & {
  locale: 'fr' | 'en';
  phaseOverrides?: Readonly<Partial<Record<SceneBodyId, number>>> | null;
};

function applyPhaseOverride(orbit: SceneOrbit, bodyId: string, overrides?: Readonly<Partial<Record<string, number>>> | null): SceneOrbit {
  const override = overrides?.[bodyId];
  if (override === undefined) return orbit;
  return { ...orbit, phase: override };
}

function EarthSystem(props: SharedSceneProps) {
  const earth = sceneCatalog.earth;
  const moon = sceneCatalog.moon;

  return (
    <group>
      <ambientLight color="#42628f" intensity={0.5} />
      <directionalLight color="#fff3da" position={[16, 7, 13]} intensity={2.25} castShadow={false} />
      <directionalLight color="#6b9dff" position={[-10, -4, -9]} intensity={0.28} />
      <CelestialBody {...props} body={earth} radius={earth.detailRadius} detail />
      <OrbitingBody
        {...props}
        body={moon}
        orbit={applyPhaseOverride(moon.orbit!, 'moon', props.phaseOverrides)}
        radius={moon.detailRadius}
        detail
        showOrbit={props.showOrbits}
      />
    </group>
  );
}

function SolarSystem(props: SharedSceneProps) {
  const sun = sceneCatalog.sun;
  const moon = sceneCatalog.moon;
  return (
    <group>
      <ambientLight color="#314464" intensity={0.34} />
      <CelestialBody {...props} body={sun} radius={sun.solarRadius} detail={false} />
      {solarBodyIds.map((id) => {
        const body = sceneCatalog[id];
        const orbit = applyPhaseOverride(body.orbit!, id, props.phaseOverrides);
        if (id === 'earth') {
          return (
            <OrbitingBody
              {...props}
              key={id}
              body={body}
              orbit={orbit}
              radius={body.solarRadius}
              detail={false}
              showOrbit={props.showOrbits}
            >
              <OrbitingBody
                {...props}
                body={moon}
                orbit={applyPhaseOverride(solarMoonOrbit, 'moon', props.phaseOverrides)}
                radius={0.38}
                detail={false}
                showOrbit={props.showOrbits}
              />
            </OrbitingBody>
          );
        }
        return (
          <OrbitingBody
            {...props}
            key={id}
            body={body}
            orbit={orbit}
            radius={body.solarRadius}
            detail={false}
            showOrbit={props.showOrbits}
          />
        );
      })}
    </group>
  );
}

function PlanetDetail({ bodyId, ...props }: SharedSceneProps & { bodyId: SceneBodyId }) {
  const body = sceneCatalog[bodyId];
  return (
    <group>
      <ambientLight color="#395276" intensity={body.id === 'sun' ? 0.1 : 0.46} />
      {body.id !== 'sun' ? (
        <>
          <directionalLight color="#fff2d8" position={[11, 7, 10]} intensity={2.35} />
          <directionalLight color="#6c91e8" position={[-8, -3, -7]} intensity={0.32} />
        </>
      ) : null}
      <CelestialBody {...props} body={body} radius={body.detailRadius} detail />
    </group>
  );
}

function CameraRig({ view, reducedMotion }: { view: UniverseView; reducedMotion: boolean }) {
  const camera = useThree((state) => state.camera as PerspectiveCamera);
  const invalidate = useThree((state) => state.invalidate);
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const transition = useRef(false);
  const destination = useRef(new Vector3());
  const target = useRef(new Vector3());
  const snapFrames = useRef(0);
  const preset = sceneCameraPresets[view];
  const selectedConstellationId = useCosmosStore((s) => s.selectedConstellationId);

  /**
   * Snap camera and flush OrbitControls internal damping state.
   * Temporarily disabling damping causes `update()` to zero
   * `sphericalDelta` and `panOffset` (instead of decaying them),
   * preventing residual rotation from the previous view.
   */
  const snapCamera = useCallback(() => {
    camera.position.copy(destination.current);
    if (controlsRef.current) {
      controlsRef.current.target.copy(target.current);
      const hadDamping = controlsRef.current.enableDamping;
      controlsRef.current.enableDamping = false;
      controlsRef.current.update();
      controlsRef.current.enableDamping = hadDamping;
    } else {
      camera.lookAt(target.current.x, target.current.y, target.current.z);
    }
  }, [camera]);

  useEffect(() => {
    destination.current.set(...preset.position);
    target.current.set(...preset.target);
    camera.fov = preset.fov;
    camera.updateProjectionMatrix();

    // Constellation view requires an immediate snap: the camera teleports from
    // a distant orbit to near-origin (inside the celestial sphere). A smooth
    // lerp fights OrbitControls' tight maxDistance constraint and leaves the
    // camera pointing at an arbitrary (often empty) sky region.
    // We also repeat the snap for a few frames to override drei's own
    // OrbitControls useFrame that may re-apply stale internal state.
    if (reducedMotion || view === 'constellations') {
      snapCamera();
      transition.current = false;
      snapFrames.current = 4;
    } else {
      transition.current = true;
      snapFrames.current = 0;
    }
    invalidate();
  }, [camera, invalidate, preset, reducedMotion, view, snapCamera]);

  // Snap camera toward the selected constellation's centroid
  useEffect(() => {
    if (view !== 'constellations' || !selectedConstellationId) return;
    const dir = getConstellationCentroidDirection(selectedConstellationId);
    if (!dir) return;
    const [dx, dy, dz] = dir;
    // Place camera opposite to centroid direction, looking through origin
    destination.current.set(-dx * 0.01, -dy * 0.01, -dz * 0.01);
    target.current.set(0, 0, 0);
    snapCamera();
    transition.current = false;
    snapFrames.current = 4;
    invalidate();
  }, [view, selectedConstellationId, snapCamera, invalidate]);

  useFrame((_, delta) => {
    // Constellation / reduced-motion snap: force position for a few frames
    // so that drei's own OrbitControls.update() cannot re-apply stale deltas.
    if (snapFrames.current > 0) {
      snapFrames.current--;
      if (controlsRef.current) snapCamera();
      return;
    }

    if (!transition.current || !controlsRef.current) return;
    const factor = 1 - Math.exp(-delta * 3.8);
    camera.position.lerp(destination.current, factor);
    controlsRef.current.target.lerp(target.current, factor);
    controlsRef.current.update();
    if (camera.position.distanceTo(destination.current) < 0.025) {
      camera.position.copy(destination.current);
      controlsRef.current.target.copy(target.current);
      transition.current = false;
    }
  });

  const isConstellationView = view === 'constellations';

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      keyEvents={false}
      enableDamping={!reducedMotion}
      dampingFactor={0.075}
      rotateSpeed={isConstellationView ? 0.35 : 0.46}
      zoomSpeed={isConstellationView ? 0 : 0.68}
      panSpeed={isConstellationView ? 0 : 0.55}
      enableZoom={!isConstellationView}
      enablePan={!isConstellationView}
      screenSpacePanning
      minDistance={preset.minDistance}
      maxDistance={preset.maxDistance}
      minPolarAngle={0.03}
      maxPolarAngle={Math.PI - 0.06}
      onStart={() => {
        transition.current = false;
      }}
    />
  );
}

function ReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
  }, [onReady]);
  return null;
}

function UniverseScene(props: UniverseViewportProps & { onSceneReady: () => void }) {
  const focusedBodyId: SceneBodyId = isSceneBodyId(props.selectedId) ? props.selectedId : 'saturn';
  const locale = props.locale ?? 'fr';
  const sharedProps: SharedSceneProps = {
    selectedId: props.selectedId,
    hoveredId: props.hoveredId,
    reducedMotion: props.reducedMotion,
    showOrbits: props.showOrbits,
    showLabels: props.showLabels,
    timeScale: Number.isFinite(props.timeScale) ? Math.max(0, props.timeScale) : 0,
    locale,
    onSelect: props.onSelect,
    onHover: props.onHover,
    phaseOverrides: props.phaseOverrides,
  };

  // Use a key that includes the serialised phase overrides so that OrbitingBody
  // refs re-initialise when the snapshot date changes.
  const phaseKey = props.phaseOverrides ? JSON.stringify(props.phaseOverrides) : 'live';

  return (
    <>
      <color attach="background" args={[sceneRenderConfig.background]} />
      {(props.view === 'earth' || props.view === 'solar' || props.view === 'planet' || props.view === 'deepsky') && (
        <Stars
          radius={125}
          depth={65}
          count={2_600}
          factor={3.2}
          saturation={0.12}
          fade
          speed={props.reducedMotion ? 0 : 0.12}
        />
      )}
      {props.view === 'earth' ? <EarthSystem key={`earth-${phaseKey}`} {...sharedProps} /> : null}
      {props.view === 'constellations' ? (
        <ConstellationScene
          locale={locale}
          showLabels={props.showLabels}
          showLines={useCosmosStore.getState().showConstellationLines}
          selectedConstellationId={useCosmosStore.getState().selectedConstellationId}
          reducedMotion={props.reducedMotion}
          onSelect={props.onSelect}
          onHover={props.onHover}
        />
      ) : null}
      {props.view === 'solar' ? <SolarSystem key={`solar-${phaseKey}`} {...sharedProps} /> : null}
      {props.view === 'planet' ? <PlanetDetail {...sharedProps} bodyId={focusedBodyId} /> : null}
      {props.view === 'milkyway' ? (
        <MilkyWayScene
          locale={locale}
          showLabels={props.showLabels}
          reducedMotion={props.reducedMotion}
          onSelect={props.onSelect}
          onHover={props.onHover}
        />
      ) : null}
      {props.view === 'localgroup' ? (
        <LocalGroupScene
          locale={locale}
          showLabels={props.showLabels}
          reducedMotion={props.reducedMotion}
          onSelect={props.onSelect}
          onHover={props.onHover}
        />
      ) : null}
      {props.view === 'deepsky' && isDeepSkyObjectId(props.selectedId ?? '') ? (
        <DeepSkyDetail
          objectId={props.selectedId as DeepSkyObjectId}
          locale={locale}
          showLabels={props.showLabels}
          reducedMotion={props.reducedMotion}
        />
      ) : null}
      <CameraRig view={props.view} reducedMotion={props.reducedMotion} />
      <ReadySignal onReady={props.onSceneReady} />
    </>
  );
}

/**
 * Full-bleed, controlled V1 viewport for the Earth, Solar System and focused
 * planet scenes. Its only runtime I/O is the versioned local texture bundle.
 */
export function UniverseViewport(props: UniverseViewportProps) {
  const didSignalReady = useRef(false);
  const onReady = props.onReady;
  const locale = props.locale ?? 'fr';
  const signalReady = useCallback(() => {
    if (didSignalReady.current) return;
    didSignalReady.current = true;
    onReady?.();
  }, [onReady]);
  const resetKey = `${props.view}:${props.selectedId ?? ''}`;

  return (
    <div
      data-universe-viewport={props.view}
      aria-label={locale === 'en' ? '3D view of the Universe' : 'Vue 3D de l\u2019Univers'}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minWidth: 0,
        minHeight: 240,
        overflow: 'hidden',
        background: sceneRenderConfig.background,
        cursor: props.hoveredId ? 'pointer' : 'grab',
        touchAction: 'none',
      }}
    >
      <SceneErrorBoundary resetKey={resetKey} locale={locale}>
        <Canvas
          dpr={[1, 1.75]}
          frameloop={props.reducedMotion ? 'demand' : 'always'}
          camera={{
            position: [...sceneCameraPresets[props.view].position],
            fov: sceneCameraPresets[props.view].fov,
            near: 0.05,
            far: 2000,
          }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
          }}
          performance={{ min: 0.55, max: 1, debounce: 220 }}
          fallback={<CanvasUnavailable locale={locale} />}
          onPointerMissed={() => props.onHover(null)}
          onCreated={({ gl }) => {
            gl.outputColorSpace = SRGBColorSpace;
            gl.setClearColor(sceneRenderConfig.background, 1);
          }}
        >
          <Suspense fallback={<SceneLoading locale={locale} />}>
            <UniverseScene {...props} onSceneReady={signalReady} />
          </Suspense>
        </Canvas>
      </SceneErrorBoundary>
    </div>
  );
}
