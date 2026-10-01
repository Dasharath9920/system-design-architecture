import type { Rect, Viewport, XYPosition } from '@xyflow/react';
import { NODE_HEIGHT, NODE_WIDTH } from '../layout/architecture';

/** Include handle doglegs, arrowheads and semantic packets, not just card centers. */
export function flowStepBounds(ids: string[], positions: Record<string, XYPosition>): Rect | null {
  const points = [...new Set(ids)].map((id) => positions[id]).filter(Boolean);
  if (!points.length) return null;
  const left = Math.min(...points.map((p) => p.x)) - 40;
  const top = Math.min(...points.map((p) => p.y)) - 40;
  return {
    x: left,
    y: top,
    width: Math.max(...points.map((p) => p.x + NODE_WIDTH)) + 40 - left,
    height: Math.max(...points.map((p) => p.y + NODE_HEIGHT)) + 40 - top,
  };
}

export function focusFlowStep(
  bounds: Rect,
  size: { width: number; height: number },
  current: Viewport,
  deep = false,
): Viewport | null {
  if (size.width <= 0 || size.height <= 0) return null;
  const zoom = Math.max(
    0.08,
    Math.min(
      deep ? 1.4 : 1.25,
      (0.76 * size.width) / bounds.width,
      (0.76 * size.height) / bounds.height,
    ),
  );
  const left = bounds.x * current.zoom + current.x;
  const top = bounds.y * current.zoom + current.y;
  const width = bounds.width * current.zoom,
    height = bounds.height * current.zoom;
  const comfortable =
    left >= size.width * 0.08 &&
    top >= size.height * 0.08 &&
    left + width <= size.width * 0.92 &&
    top + height <= size.height * 0.92;
  // Keep the camera still when the interaction is already readable and framed.
  if (
    comfortable &&
    (current.zoom >= zoom * 0.9 || Math.max(width / size.width, height / size.height) >= 0.55)
  )
    return null;
  return {
    x: size.width / 2 - (bounds.x + bounds.width / 2) * zoom,
    y: size.height / 2 - (bounds.y + bounds.height / 2) * zoom,
    zoom,
  };
}
