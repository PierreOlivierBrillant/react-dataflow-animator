/**
 * Transforms a control polyline (`[start, …detours, end]`) into intermediate
 * points according to the requested {@link PathShape}. The result is consumed
 * as is by `connection()` (field `waypoints`): `pathTip`/`visiblePath`
 * traverse the polyline by arc length, so that a curve sampled in N points
 * animates the arrowhead and packets exactly like a straight line.
 *
 * Returning `undefined` means "no intermediate point": the path is a straight
 * segment `start → end`. This is the most common case (aligned nodes), for
 * which all shapes merge — we thus avoid emitting useless points.
 */

import type { Point } from './geometry';
import type { ConnectionAxis } from './layout';
import type { PathShape } from '../types';

/** Samples per Bezier curve segment (strictly interior points). */
const BEZIER_SAMPLES = 18;
/** Samples to round a smoothstep corner (quarter turn). */
const CORNER_SAMPLES = 6;
/** Radius (px) of rounded smoothstep corners. */
const SMOOTH_RADIUS = 14;
/**
 * Below this transverse shift (px), a 2-control-point Bezier is straight:
 * we emit no intermediate point (the most common aligned case).
 */
const STRAIGHT_EPS = 0.5;

/** Outward unit normals of the two extremities, when they anchor on a round
 *  outline instead of a cardinal face. Bezier handles then leave/arrive along
 *  these radial directions (not an axis), so an edge meets a circle smoothly. */
export interface EndpointNormals {
  start: Point;
  end: Point;
}

export function shapeWaypoints(
  control: Point[],
  shape: PathShape,
  /**
   * Anchor axis of extremities (E/W face ⇒ `horizontal`, N/S ⇒ `vertical`).
   * Orients the curve handles / the first corner so that the path starts and
   * arrives PERPENDICULARLY to the face, independently of the chord's slope.
   */
  endpointAxis?: ConnectionAxis,
  /**
   * Outward normals when an extremity anchors on a round outline (radial). When
   * present they take precedence over `endpointAxis` for the bezier handles.
   * Only the smooth shapes read them; `straight`/`step` are unaffected.
   */
  normals?: EndpointNormals
): Point[] | undefined {
  // control = [start, …anti-collision detours, end] (length ≥ 2).
  switch (shape) {
    case 'straight':
      // The only intermediate points are the already calculated detours.
      return control.length > 2 ? control.slice(1, -1) : undefined;
    case 'step':
    case 'smoothstep':
      return stepWaypoints(control, shape === 'smoothstep', endpointAxis);
    case 'simplebezier':
      return curveWaypoints(control, true, endpointAxis, normals);
    case 'bezier':
    default:
      return curveWaypoints(control, false, endpointAxis, normals);
  }
}

// ─── Bezier ──────────────────────────────────────────────────────────────────

/**
 * Shift of control points along the dominant axis:
 * - bezier: half the gap → pronounced S-curve (like React Flow);
 * - simplebezier: quarter of the gap → more subtle curve.
 */
function ctrlOffset(primaryDelta: number, simple: boolean): number {
  return (simple ? 0.25 : 0.5) * primaryDelta;
}

function cubicAt(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  const w0 = u * u * u;
  const w1 = 3 * u * u * t;
  const w2 = 3 * u * t * t;
  const w3 = t * t * t;
  return {
    x: w0 * p0.x + w1 * p1.x + w2 * p2.x + w3 * p3.x,
    y: w0 * p0.y + w1 * p1.y + w2 * p2.y + w3 * p3.y,
  };
}

/** STRICTLY interior points (a and b excluded) of a cubic a→b whose
 *  handles follow the segment's dominant axis — or `forceHorizontal` when
 *  the extremity anchors to an imposed face (the curve then starts along the
 *  face normal, not the chord). A `startDir`/`endDir` outward normal, when given
 *  (round outline), overrides that endpoint's handle to leave/arrive radially. */
function bezierBetween(
  a: Point,
  b: Point,
  simple: boolean,
  forceHorizontal?: boolean,
  startDir?: Point,
  endDir?: Point
): Point[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const horizontal = forceHorizontal ?? Math.abs(dx) >= Math.abs(dy);
  let cp1: Point = horizontal
    ? { x: a.x + ctrlOffset(dx, simple), y: a.y }
    : { x: a.x, y: a.y + ctrlOffset(dy, simple) };
  let cp2: Point = horizontal
    ? { x: b.x - ctrlOffset(dx, simple), y: b.y }
    : { x: b.x, y: b.y - ctrlOffset(dy, simple) };
  if (startDir || endDir) {
    // Handle length scales with the chord so the curvature stays proportional.
    const reach = (simple ? 0.25 : 0.5) * Math.hypot(dx, dy);
    if (startDir)
      cp1 = { x: a.x + startDir.x * reach, y: a.y + startDir.y * reach };
    if (endDir) cp2 = { x: b.x + endDir.x * reach, y: b.y + endDir.y * reach };
  }
  const pts: Point[] = [];
  for (let i = 1; i < BEZIER_SAMPLES; i++) {
    pts.push(cubicAt(a, cp1, cp2, b, i / BEZIER_SAMPLES));
  }
  return pts;
}

function curveWaypoints(
  control: Point[],
  simple: boolean,
  endpointAxis?: ConnectionAxis,
  normals?: EndpointNormals
): Point[] | undefined {
  if (control.length === 2) {
    const [a, b] = control;
    // Radial endpoints: handles follow the outward normals. A near-straight
    // radial edge (normals aligned with the chord) samples to a straight line.
    if (normals) {
      return bezierBetween(a, b, simple, undefined, normals.start, normals.end);
    }
    // Axis imposed by face (see shapeWaypoints); otherwise dominant axis of chord.
    const horizontal = endpointAxis
      ? endpointAxis === 'horizontal'
      : Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
    const crossDelta = horizontal ? b.y - a.y : b.x - a.x;
    // No transverse shift → the cubic merges with the straight segment.
    if (Math.abs(crossDelta) < STRAIGHT_EPS) return undefined;
    return bezierBetween(a, b, simple, horizontal);
  }
  // Detour(s) present: we chain one cubic per control segment, reinserting each
  // junction point so the curve passes through it. The first/last handle follows
  // its radial normal when the matching endpoint anchors on a round outline.
  const out: Point[] = [];
  for (let i = 0; i < control.length - 1; i++) {
    const startDir = normals && i === 0 ? normals.start : undefined;
    const endDir =
      normals && i === control.length - 2 ? normals.end : undefined;
    out.push(
      ...bezierBetween(
        control[i],
        control[i + 1],
        simple,
        undefined,
        startDir,
        endDir
      )
    );
    if (i < control.length - 2) out.push(control[i + 1]);
  }
  return out;
}

// ─── Step / SmoothStep ───────────────────────────────────────────────────────

/** Two orthogonal corners linking a→b (midway on dominant axis, or
 *  `forceHorizontal` when extremity anchors to an imposed face). */
function stepCorners(a: Point, b: Point, forceHorizontal?: boolean): Point[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const horizontal = forceHorizontal ?? Math.abs(dx) >= Math.abs(dy);
  if (horizontal) {
    const mx = (a.x + b.x) / 2;
    return [
      { x: mx, y: a.y },
      { x: mx, y: b.y },
    ];
  }
  const my = (a.y + b.y) / 2;
  return [
    { x: a.x, y: my },
    { x: b.x, y: my },
  ];
}

function dedupe(pts: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 1e-6) out.push(p);
  }
  return out;
}

function stepWaypoints(
  control: Point[],
  smooth: boolean,
  endpointAxis?: ConnectionAxis
): Point[] | undefined {
  // Without detour (single segment), the first corner starts along the imposed face.
  const forceH =
    control.length === 2 && endpointAxis
      ? endpointAxis === 'horizontal'
      : undefined;
  // Complete orthogonal polyline (extremities included).
  const ortho: Point[] = [control[0]];
  for (let i = 0; i < control.length - 1; i++) {
    ortho.push(...stepCorners(control[i], control[i + 1], forceH));
    ortho.push(control[i + 1]);
  }
  const poly = dedupe(ortho);
  // Everything is aligned → degenerate corners removed → straight line.
  if (poly.length <= 2) return undefined;
  if (!smooth) return poly.slice(1, -1);
  return roundCorners(poly);
}

function quadAt(p0: Point, c: Point, p1: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x,
    y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y,
  };
}

/** Replaces each interior vertex of an orthogonal polyline with an arc
 *  (quadratic, control point = the vertex). Returns interior points. */
function roundCorners(poly: Point[]): Point[] {
  const out: Point[] = [];
  for (let i = 1; i < poly.length - 1; i++) {
    const v = poly[i];
    const p = poly[i - 1];
    const n = poly[i + 1];
    const lenP = Math.hypot(p.x - v.x, p.y - v.y);
    const lenN = Math.hypot(n.x - v.x, n.y - v.y);
    const r = Math.min(SMOOTH_RADIUS, lenP / 2, lenN / 2);
    if (r < 0.5) {
      out.push(v);
      continue;
    }
    const entry = {
      x: v.x + ((p.x - v.x) / lenP) * r,
      y: v.y + ((p.y - v.y) / lenP) * r,
    };
    const exit = {
      x: v.x + ((n.x - v.x) / lenN) * r,
      y: v.y + ((n.y - v.y) / lenN) * r,
    };
    out.push(entry);
    for (let k = 1; k < CORNER_SAMPLES; k++) {
      out.push(quadAt(entry, v, exit, k / CORNER_SAMPLES));
    }
    out.push(exit);
  }
  return out;
}
