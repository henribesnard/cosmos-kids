export interface ScreenPoint {
  x: number;
  y: number;
}

export interface ScreenRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export type LabelPlacement =
  | 'top'
  | 'top-right'
  | 'right'
  | 'bottom-right'
  | 'bottom'
  | 'bottom-left'
  | 'left'
  | 'top-left';

export interface ScreenLabelRequest {
  id: string;
  anchor: ScreenPoint;
  width: number;
  height: number;
  priority: number;
  required?: boolean;
  preferredPlacement?: LabelPlacement;
}

export interface ScreenLabelLayout {
  id: string;
  anchor: ScreenPoint;
  center: ScreenPoint;
  rect: ScreenRect;
  visible: boolean;
  placement: LabelPlacement;
}

const PLACEMENTS: readonly LabelPlacement[] = [
  'top',
  'top-right',
  'right',
  'bottom-right',
  'bottom',
  'bottom-left',
  'left',
  'top-left',
];

function intersects(a: ScreenRect, b: ScreenRect, margin = 7): boolean {
  return !(
    a.right + margin <= b.left ||
    a.left >= b.right + margin ||
    a.bottom + margin <= b.top ||
    a.top >= b.bottom + margin
  );
}

function overlapArea(a: ScreenRect, b: ScreenRect): number {
  const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return width * height;
}

function placementOrder(preferred: LabelPlacement): readonly LabelPlacement[] {
  const start = PLACEMENTS.indexOf(preferred);
  if (start <= 0) return PLACEMENTS;
  return [...PLACEMENTS.slice(start), ...PLACEMENTS.slice(0, start)];
}

function candidateCenter(
  request: ScreenLabelRequest,
  placement: LabelPlacement,
  ring: number,
): ScreenPoint {
  const horizontal = request.width / 2 + 15 + ring * 18;
  const vertical = request.height / 2 + 15 + ring * 15;
  const diagonalX = request.width / 2 + 12 + ring * 16;
  const diagonalY = request.height / 2 + 11 + ring * 14;
  const { anchor } = request;

  switch (placement) {
    case 'top':
      return { x: anchor.x, y: anchor.y - vertical };
    case 'top-right':
      return { x: anchor.x + diagonalX, y: anchor.y - diagonalY };
    case 'right':
      return { x: anchor.x + horizontal, y: anchor.y };
    case 'bottom-right':
      return { x: anchor.x + diagonalX, y: anchor.y + diagonalY };
    case 'bottom':
      return { x: anchor.x, y: anchor.y + vertical };
    case 'bottom-left':
      return { x: anchor.x - diagonalX, y: anchor.y + diagonalY };
    case 'left':
      return { x: anchor.x - horizontal, y: anchor.y };
    case 'top-left':
      return { x: anchor.x - diagonalX, y: anchor.y - diagonalY };
  }
}

function makeRect(center: ScreenPoint, width: number, height: number): ScreenRect {
  return {
    left: center.x - width / 2,
    top: center.y - height / 2,
    right: center.x + width / 2,
    bottom: center.y + height / 2,
  };
}

function inside(rect: ScreenRect, bounds: ScreenRect): boolean {
  return (
    rect.left >= bounds.left &&
    rect.top >= bounds.top &&
    rect.right <= bounds.right &&
    rect.bottom <= bounds.bottom
  );
}

/**
 * Deterministic, priority-first screen-space label layout.
 *
 * High-priority labels claim space first. Required landmarks search farther
 * from their anchor than optional objects. A label is hidden when no free
 * position exists: the renderer never knowingly trades readability for an
 * overlap, even in a crowded or narrow viewport.
 */
export function layoutScreenLabels(
  requests: readonly ScreenLabelRequest[],
  bounds: ScreenRect,
  obstacles: readonly ScreenRect[] = [],
  maxVisible = Number.POSITIVE_INFINITY,
): ScreenLabelLayout[] {
  const occupied: ScreenRect[] = [...obstacles];
  const byId = new Map<string, ScreenLabelLayout>();
  let visibleCount = 0;

  const sorted = [...requests].sort(
    (a, b) => b.priority - a.priority || a.id.localeCompare(b.id),
  );

  for (const request of sorted) {
    const preferred = request.preferredPlacement ?? 'top';
    const candidates: Array<{
      center: ScreenPoint;
      placement: LabelPlacement;
      rect: ScreenRect;
      overlap: number;
    }> = [];

    const ringCount = request.required ? 9 : 5;
    for (let ring = 0; ring < ringCount; ring += 1) {
      for (const placement of placementOrder(preferred)) {
        const center = candidateCenter(request, placement, ring);
        const rect = makeRect(center, request.width, request.height);
        if (!inside(rect, bounds)) continue;
        const overlap = occupied.reduce((total, item) => total + overlapArea(rect, item), 0);
        candidates.push({ center, placement, rect, overlap });
      }
    }

    const free = candidates.find((candidate) =>
      occupied.every((rect) => !intersects(candidate.rect, rect)),
    );
    const selected = free;
    const visible = Boolean(selected) && visibleCount < maxVisible;

    if (!selected || !visible) {
      byId.set(request.id, {
        id: request.id,
        anchor: request.anchor,
        center: request.anchor,
        rect: makeRect(request.anchor, request.width, request.height),
        visible: false,
        placement: preferred,
      });
      continue;
    }

    occupied.push(selected.rect);
    visibleCount += 1;
    byId.set(request.id, {
      id: request.id,
      anchor: request.anchor,
      center: selected.center,
      rect: selected.rect,
      visible: true,
      placement: selected.placement,
    });
  }

  return requests.map((request) => byId.get(request.id)!);
}
