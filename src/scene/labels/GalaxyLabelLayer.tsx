import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { Vector3 } from 'three';
import {
  layoutScreenLabels,
  type LabelPlacement,
  type ScreenLabelRequest,
  type ScreenRect,
} from './layoutScreenLabels';

export type GalaxyLabelKind = 'arm' | 'landmark' | 'object';

export interface GalaxyLabelSpec {
  id: string;
  text: string;
  position: readonly [number, number, number];
  color: string;
  kind: GalaxyLabelKind;
  priority: number;
  required?: boolean;
  preferredPlacement?: LabelPlacement;
  onActivate?: () => void;
  onHover?: (hovered: boolean) => void;
}

interface GalaxyLabelLayerProps {
  labels: readonly GalaxyLabelSpec[];
  reducedMotion: boolean;
}

const projection = new Vector3();

function screenObstacles(canvasRect: DOMRect): ScreenRect[] {
  const obstacles: ScreenRect[] = [];
  document.querySelectorAll<HTMLElement>('[data-scene-obstacle]').forEach((element) => {
    const style = window.getComputedStyle(element);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      Number.parseFloat(style.opacity || '1') <= 0.01
    ) {
      return;
    }
    const rect = element.getBoundingClientRect();
    const clipped: ScreenRect = {
      left: Math.max(0, rect.left - canvasRect.left),
      top: Math.max(0, rect.top - canvasRect.top),
      right: Math.min(canvasRect.width, rect.right - canvasRect.left),
      bottom: Math.min(canvasRect.height, rect.bottom - canvasRect.top),
    };
    if (clipped.right > clipped.left && clipped.bottom > clipped.top) obstacles.push(clipped);
  });
  return obstacles;
}

/**
 * One DOM/SVG projection layer for every Milky Way label. It resolves real
 * screen rectangles globally, so labels remain separated while the camera is
 * moved or zoomed. React state is never updated from the render loop.
 */
export function GalaxyLabelLayer({ labels, reducedMotion }: GalaxyLabelLayerProps) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const gl = useThree((state) => state.gl);
  const elementRefs = useRef(new Map<string, HTMLElement>());
  const lineRefs = useRef(new Map<string, SVGLineElement>());
  const dotRefs = useRef(new Map<string, SVGCircleElement>());
  const lastLayoutAt = useRef(Number.NEGATIVE_INFINITY);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    if (elapsed - lastLayoutAt.current < 1 / 15) return;
    lastLayoutAt.current = elapsed;

    const requests: ScreenLabelRequest[] = [];
    const inView = new Set<string>();

    for (const label of labels) {
      projection.set(...label.position).project(camera);
      const visible =
        projection.z >= -1 &&
        projection.z <= 1 &&
        projection.x >= -1.08 &&
        projection.x <= 1.08 &&
        projection.y >= -1.08 &&
        projection.y <= 1.08;
      if (!visible) continue;

      const element = elementRefs.current.get(label.id);
      const fallbackWidth = Math.max(72, label.text.length * 6.3 + 24);
      const width = Math.max(element?.offsetWidth ?? 0, fallbackWidth);
      const height = Math.max(element?.offsetHeight ?? 0, label.kind === 'object' ? 24 : 28);
      const anchor = {
        x: (projection.x * 0.5 + 0.5) * size.width,
        y: (-projection.y * 0.5 + 0.5) * size.height,
      };

      inView.add(label.id);
      requests.push({
        id: label.id,
        anchor,
        width,
        height,
        priority: label.priority,
        required: label.required,
        preferredPlacement: label.preferredPlacement,
      });
    }

    const canvasRect = gl.domElement.getBoundingClientRect();
    const bounds: ScreenRect = {
      left: size.width < 620 ? 10 : 18,
      top: size.width < 620 ? 64 : 76,
      right: size.width - (size.width < 620 ? 10 : 18),
      bottom: size.height - (size.width < 620 ? 104 : 116),
    };
    const layouts = layoutScreenLabels(
      requests,
      bounds,
      screenObstacles(canvasRect),
      size.width < 620 ? 5 : Number.POSITIVE_INFINITY,
    );
    const layoutById = new Map(layouts.map((layout) => [layout.id, layout]));

    for (const label of labels) {
      const element = elementRefs.current.get(label.id);
      const line = lineRefs.current.get(label.id);
      const dot = dotRefs.current.get(label.id);
      const layout = layoutById.get(label.id);
      const visible = inView.has(label.id) && layout?.visible === true;

      if (element) {
        element.dataset.visible = visible ? 'true' : 'false';
        element.style.opacity = visible ? '1' : '0';
        element.style.visibility = visible ? 'visible' : 'hidden';
        if (layout) {
          element.style.transform = `translate3d(${layout.center.x}px, ${layout.center.y}px, 0) translate(-50%, -50%)`;
        }
      }

      if (line && dot) {
        line.style.opacity = visible ? '0.5' : '0';
        dot.style.opacity = visible ? '0.8' : '0';
        if (layout) {
          line.setAttribute('x1', layout.anchor.x.toFixed(2));
          line.setAttribute('y1', layout.anchor.y.toFixed(2));
          line.setAttribute('x2', layout.center.x.toFixed(2));
          line.setAttribute('y2', layout.center.y.toFixed(2));
          dot.setAttribute('cx', layout.anchor.x.toFixed(2));
          dot.setAttribute('cy', layout.anchor.y.toFixed(2));
        }
      }
    }
  });

  return (
    <Html fullscreen zIndexRange={[18, 3]} style={{ pointerEvents: 'none' }}>
      <div
        className={`galaxy-label-layer ${reducedMotion ? 'is-reduced-motion' : ''}`}
        aria-hidden="true"
      >
        <svg className="galaxy-label-layer__leaders" aria-hidden="true">
          {labels.map((label) => (
            <g key={label.id}>
              <line
                ref={(node) => {
                  if (node) lineRefs.current.set(label.id, node);
                  else lineRefs.current.delete(label.id);
                }}
                stroke={label.color}
                strokeWidth={label.kind === 'object' ? 0.8 : 1.1}
              />
              <circle
                ref={(node) => {
                  if (node) dotRefs.current.set(label.id, node);
                  else dotRefs.current.delete(label.id);
                }}
                r={label.kind === 'landmark' ? 2.5 : 1.7}
                fill={label.color}
              />
            </g>
          ))}
        </svg>
        {labels.map((label) => {
          const className = `galaxy-label galaxy-label--${label.kind}`;
          const common = {
            ref: (node: HTMLElement | null) => {
              if (node) elementRefs.current.set(label.id, node);
              else elementRefs.current.delete(label.id);
            },
            className,
            style: { color: label.color, borderColor: `${label.color}66` },
            'data-galaxy-label': label.id,
            'data-visible': 'false',
          };

          if (label.onActivate) {
            return (
              <button
                key={label.id}
                {...common}
                type="button"
                tabIndex={-1}
                onClick={label.onActivate}
                onMouseEnter={() => label.onHover?.(true)}
                onMouseLeave={() => label.onHover?.(false)}
              >
                {label.text}
              </button>
            );
          }

          return (
            <span key={label.id} {...common}>
              {label.text}
            </span>
          );
        })}
      </div>
    </Html>
  );
}
