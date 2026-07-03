/**
 * Vector math: connection points between nodes, anti-collision offset
 * (path shifting) and drawing utilities. All coordinates are relative
 * to the "Stage" container.
 */

import type { PathShape } from '../types';
import type { ConnectionAxis } from './layout';
import { shapeWaypoints } from './pathShapes';

export interface Point {
  x: number;
  y: number;
}

/** Measured position and size of a static node, relative to Stage. */
export interface NodeGeom {
  id: string;
  /** Node center. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Height of text label located under visual (px). Undefined if no label. */
  labelH?: number;
  /** Text label width (px). */
  labelW?: number;
  /**
   * Outset (px) of the colored contour beyond the measured visual border: the badge
   * of a tinted pictogram (`background_color`) extends beyond the glyph. Arrows
   * anchor on this contour, so we add this outset to the node's half-extension.
   * 0/missing for shapes and panels (their colored border = measured box).
   */
  borderOutset?: number;
  /**
   * Stage scale (`--rdfa-scale`) at measurement. Scales routing margins
   * (anti-label detour, label anchor) to match nodes. Default: 1.
   */
  scale?: number;
}

export type GeometryMap = Record<string, NodeGeom>;

/**
 * Attachment policy for a node whose edges anchor on a continuous outline
 * (a round node) rather than on the four cardinal sides. `ports` mirrors the
 * spec field {@link Node.ports}: `'direct'` = the edge meets the outline exactly
 * where the line to the other centre crosses it (infinite points); a positive
 * integer `N` = the nearest of `N` evenly-spread points around the outline.
 */
export interface NodeContour {
  kind: 'ellipse';
  ports: 'direct' | number;
}

/**
 * Resolves a node's contour policy from its spec (`type` + `ports`). Only round
 * nodes (`circle`) get an elliptical contour today; every other type keeps the
 * cardinal-side anchoring, so `ports` is ignored there. Centralised here so the
 * renderer and any future caller derive the SAME contour.
 */
export function nodeContour(
  type: string,
  ports?: 'direct' | number
): NodeContour | undefined {
  if (type !== 'circle') return undefined;
  return { kind: 'ellipse', ports: ports ?? 'direct' };
}

/** Routing margin (px, at scale 1): detour around a third-party label and
 *  median label anchor shift. NOT the anchor (arrow touches border).
 *  Scaled by `NodeGeom.scale` in {@link connection}. */
const NODE_GAP = 14;

/** Spacing (px) between visual bottom and label top (CSS gap). */
const LABEL_GAP = 6;

export interface Connection {
  start: Point;
  end: Point;
  /**
   * Intermediate path points, traversed by arc length. Depending on
   * {@link PathShape}: anti-collision detours (straight), corners (step) or
   * curve samples (bezier/simplebezier/smoothstep). Undefined = direct
   * straight line.
   */
  waypoints?: Point[];
  /** Last segment angle in degrees (useful for orienting an arrowhead). */
  angleDeg: number;
  /**
   * Median label anchor. Undefined when path midpoint is clear (render
   * then falls back on this midpoint); defined and shifted perpendicularly
   * to the line when midpoint would fall on an interleaved node's visual.
   */
  labelAnchor?: Point;
}

/**
 * Bounding rect of a node's label (under visual), or null if no label.
 */
function labelBounds(
  node: NodeGeom
): { x: number; y: number; w: number; h: number } | null {
  if (!node.labelH || node.labelH <= 0) return null;
  const lw = node.labelW ?? Math.max(node.width * 1.5, 60);
  return {
    x: node.x - lw / 2,
    y: node.y + node.height / 2 + LABEL_GAP,
    w: lw,
    h: node.labelH,
  };
}

/**
 * Returns entry/exit t parameters of a p1→p2 segment in a rect,
 * or null if no intersection (slabs method).
 */
function segmentIntersectsRect(
  p1: Point,
  p2: Point,
  rect: { x: number; y: number; w: number; h: number }
): { tEntry: number; tExit: number } | null {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  let tMin = 0;
  let tMax = 1;

  if (Math.abs(dx) < 1e-10) {
    if (p1.x < rect.x || p1.x > rect.x + rect.w) return null;
  } else {
    const t1 = (rect.x - p1.x) / dx;
    const t2 = (rect.x + rect.w - p1.x) / dx;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  }

  if (Math.abs(dy) < 1e-10) {
    if (p1.y < rect.y || p1.y > rect.y + rect.h) return null;
  } else {
    const t1 = (rect.y - p1.y) / dy;
    const t2 = (rect.y + rect.h - p1.y) / dy;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  }

  if (tMin > tMax + 1e-10) return null;
  return { tEntry: tMin, tExit: tMax };
}

/** The 4 cardinal faces on which an arrow can anchor. */
type Face = 'east' | 'west' | 'north' | 'south';

/**
 * Cardinal anchor point for an arrow: placed EXACTLY on node contour
 * (visual border + `borderOutset`, i.e. colored border for a tinted node)
 * — arrow TOUCHES border, no margin added (per user request).
 *
 * - Lateral faces (east/west): transverse coordinate `y` goes down to center
 *   of gravity of *visual + label* block — label under node unbalances it
 *   downwards, so lateral anchor at center of visual alone would look too
 *   high — and receives `portOffset` (intra-pair spread / fan-out).
 * - South face: passes UNDER label (which is part of bottom footprint); thus
 *   does not touch colored border, label intervenes (only intended exception).
 * - Vertical faces (north/south): `portOffset` shifts `x` coordinate.
 */
function cardinalAttach(node: NodeGeom, face: Face, portOffset: number): Point {
  const halfW = node.width / 2;
  const halfH = node.height / 2;
  const outset = node.borderOutset ?? 0;
  const labelH = node.labelH ?? 0;
  // Vertical center of gravity of the block: descends by half the extension
  // added by the label under the visual (CSS gap + label height).
  const lateralY = node.y + (labelH > 0 ? (LABEL_GAP + labelH) / 2 : 0);
  switch (face) {
    case 'east':
      return { x: node.x + halfW + outset, y: lateralY + portOffset };
    case 'west':
      return { x: node.x - halfW - outset, y: lateralY + portOffset };
    case 'north':
      return { x: node.x + portOffset, y: node.y - halfH - outset };
    case 'south': {
      const bottom = labelH > 0 ? halfH + LABEL_GAP + labelH : halfH + outset;
      return { x: node.x + portOffset, y: node.y + bottom };
    }
  }
}

/** Anchor point on a node's outline plus the OUTWARD unit normal there — the
 *  direction the path leaves/arrives perpendicularly (curve handles read it). */
interface ContourAnchor {
  point: Point;
  normal: Point;
}

/** Outward unit normal of a cardinal face (used to orient curve handles the same
 *  way for cardinal and contour endpoints). */
function faceNormal(face: Face): Point {
  switch (face) {
    case 'east':
      return { x: 1, y: 0 };
    case 'west':
      return { x: -1, y: 0 };
    case 'north':
      return { x: 0, y: -1 };
    case 'south':
      return { x: 0, y: 1 };
  }
}

/**
 * Attaches an edge end on a node's ELLIPTICAL outline (a round node), aimed at
 * `toward` — the other node's centre.
 *
 * - `ports: 'direct'` → the anchor is the exact ray/outline intersection in the
 *   direction of `toward`: the edge meets the circle right where the straight
 *   line to the other centre crosses it (radial, infinite possible points).
 * - `ports: N` (positive integer) → the direction is snapped to the nearest of
 *   `N` evenly-spread angles before intersecting; edges that snap to the same
 *   angle merge on one point (like `merge_edges`). Phase is chosen so a slot
 *   sits at the top and bottom (natural for trees; `N = 4` gives N/E/S/W).
 *
 * `offset` (the intra-pair / fan-out spread in px, reused from the cardinal port
 * model) nudges the anchor along the tangent so bidirectional tracks stay apart.
 */
function ellipseAttach(
  node: NodeGeom,
  ports: 'direct' | number,
  toward: Point,
  offset: number
): ContourAnchor {
  const outset = node.borderOutset ?? 0;
  const rx = node.width / 2 + outset;
  const ry = node.height / 2 + outset;
  let ang = Math.atan2(toward.y - node.y, toward.x - node.x);
  if (typeof ports === 'number' && ports > 0) {
    const step = (2 * Math.PI) / ports;
    // Phase so that, for an even count, one slot is at the top (−π/2) and one at
    // the bottom: parent/child edges of a tree stay vertical, and N = 4 lands on
    // the four cardinal points of the round outline.
    const phase = -Math.PI / 2;
    ang = phase + Math.round((ang - phase) / step) * step;
  }
  // Tangential nudge: arc length (px) → angle, so two bidirectional edges on the
  // same direction do not collapse onto a single point.
  const rMean = (rx + ry) / 2;
  if (offset && rMean > 1e-6) ang += offset / rMean;
  const cos = Math.cos(ang);
  const sin = Math.sin(ang);
  // Ray/ellipse intersection along `ang`: the point of the outline in that exact
  // direction from the centre (t·(cos,sin) satisfies (x/rx)²+(y/ry)² = 1).
  const t = 1 / Math.hypot(cos / rx, sin / ry);
  const point = { x: node.x + t * cos, y: node.y + t * sin };
  // Outward normal ∝ gradient of (x/rx)²+(y/ry)² at the point ∝ (cos/rx², sin/ry²)
  // — exactly radial for a circle (rx = ry).
  let nx = cos / (rx * rx);
  let ny = sin / (ry * ry);
  const nLen = Math.hypot(nx, ny) || 1;
  nx /= nLen;
  ny /= nLen;
  return { point, normal: { x: nx, y: ny } };
}

/**
 * Connection points between two nodes.
 *
 * - Anchors extremities to one of the 4 cardinal points (N/S/E/W) of the node,
 *   EXACTLY on its colored contour (see {@link cardinalAttach}): arrow touches
 *   border. Axis is provided by `axis` (derived from layout flow, see
 *   `connectionAxis`) — SAME decision as `computePortOffsets`, so anchor
 *   and fan-out never contradict. If `axis` is missing (tests/isolated use),
 *   it falls back to dominant pixel axis.
 * - Path starts/arrives perpendicularly to face: `axis` is also passed to
 *   `shapeWaypoints` to orient curve handles (otherwise a curve between
 *   two E/W faces with high elevation difference would start vertically).
 * - `obstacles`: list of all nodes → inserts a waypoint if the segment
 *   crosses a third-party label.
 */
export function connection(
  from: NodeGeom,
  to: NodeGeom,
  obstacles?: NodeGeom[],
  startPortOffset = 0,
  endPortOffset = 0,
  shape: PathShape = 'bezier',
  axis?: ConnectionAxis,
  fromContour?: NodeContour,
  toContour?: NodeContour
): Connection {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const isHorizontal = axis
    ? axis === 'horizontal'
    : Math.abs(dx) >= Math.abs(dy);

  // Routing margin (anti-label detour, median label anchor), scaled to Stage.
  // NB: the anchor itself does NOT use it — the arrow touches the border.
  const gap = NODE_GAP * (from.scale ?? 1);

  // Opposite cardinal faces: source points to destination,
  // destination receives opposite face.
  const fromFace: Face = isHorizontal
    ? dx >= 0
      ? 'east'
      : 'west'
    : dy >= 0
      ? 'south'
      : 'north';
  const toFace: Face = isHorizontal
    ? dx >= 0
      ? 'west'
      : 'east'
    : dy >= 0
      ? 'north'
      : 'south';

  // Endpoints: a round node anchors on its outline aimed at the OTHER centre
  // (see {@link ellipseAttach}); otherwise on its cardinal face. Each endpoint
  // also yields the outward normal used to orient the curve handles below.
  const cf: Point = { x: from.x, y: from.y };
  const ct: Point = { x: to.x, y: to.y };
  const fromAnchor: ContourAnchor = fromContour
    ? ellipseAttach(from, fromContour.ports, ct, startPortOffset)
    : {
        point: cardinalAttach(from, fromFace, startPortOffset),
        normal: faceNormal(fromFace),
      };
  const toAnchor: ContourAnchor = toContour
    ? ellipseAttach(to, toContour.ports, cf, endPortOffset)
    : {
        point: cardinalAttach(to, toFace, endPortOffset),
        normal: faceNormal(toFace),
      };
  const start: Point = fromAnchor.point;
  const end: Point = toAnchor.point;
  const hasContour = fromContour !== undefined || toContour !== undefined;

  // Detects the first third-party label the segment crosses and inserts a detour
  // just above/beside to bypass it. This detour is shape-independent:
  // all shapes pass through it (see control below).
  let detour: Point[] | undefined;
  if (obstacles && obstacles.length > 0) {
    let firstT = Infinity;
    let bestWps: Point[] | null = null;
    for (const obs of obstacles) {
      if (obs.id === from.id || obs.id === to.id) continue;
      const lb = labelBounds(obs);
      if (!lb) continue;
      const isect = segmentIntersectsRect(start, end, lb);
      if (isect !== null && isect.tEntry < firstT && isect.tEntry > 1e-10) {
        firstT = isect.tEntry;
        if (isHorizontal) {
          const xAt = start.x + (end.x - start.x) * isect.tEntry;
          bestWps = [{ x: xAt, y: lb.y - gap }];
        } else {
          // Quasi-vertical segment: bypass laterally rather than
          // doubling back upwards, which produces an unnatural detour.
          const yAt = start.y + (end.y - start.y) * isect.tEntry;
          // start.x strictly left of obstacle → bypass left.
          // start.x at same x or right (e.g. same lane) → bypass right
          // to avoid crosses with arrows going left.
          bestWps = [
            {
              x: start.x < obs.x ? lb.x - gap : lb.x + lb.w + gap,
              y: yAt,
            },
          ];
        }
      }
    }
    if (bestWps) detour = bestWps;
  }

  // Control polyline = extremities + detours, then shape application.
  // `shapeWaypoints` returns actual intermediate points (curve samples,
  // corners...), traversed by arc length like a simple polyline.
  const control: Point[] = detour ? [start, ...detour, end] : [start, end];
  const waypoints = shapeWaypoints(
    control,
    shape,
    isHorizontal ? 'horizontal' : 'vertical',
    // A contour endpoint leaves along its outward normal (radial), not along a
    // cardinal axis — pass the normals so bezier handles bend accordingly.
    hasContour ? { start: fromAnchor.normal, end: toAnchor.normal } : undefined
  );

  // Last segment angle (for arrowhead).
  const lastPt =
    waypoints && waypoints.length > 0 ? waypoints[waypoints.length - 1] : start;
  const angleDeg =
    (Math.atan2(end.y - lastPt.y, end.x - lastPt.x) * 180) / Math.PI;

  // Median label anchor. Connection text is placed at path midpoint;
  // if this midpoint falls on VISUAL of an interleaved node (e.g. A→C connection
  // spanning a B node between them), we shift anchor perpendicularly to line
  // to clear text. Otherwise it overlaps node — and since label lives under
  // nodes layer, it hides behind it.
  let labelAnchor: Point | undefined;
  if (obstacles && obstacles.length > 0) {
    const mid = pathTip({ start, end, waypoints, angleDeg }, 0.5);
    for (const obs of obstacles) {
      if (obs.id === from.id || obs.id === to.id) continue;
      const halfW = obs.width / 2;
      const halfH = obs.height / 2;
      if (
        Math.abs(mid.x - obs.x) <= halfW + gap &&
        Math.abs(mid.y - obs.y) <= halfH + gap
      ) {
        labelAnchor = isHorizontal
          ? // Horizontal line: move label above node. Vertical margin
            // does not depend on (unknown) text width.
            { x: mid.x, y: obs.y - halfH - gap }
          : // Vertical line: clear laterally. Label remains anchored at
            // center (textAnchor=middle) and width is unknown, so we
            // guarantee at least its center leaves the node.
            {
              x: obs.x + (mid.x <= obs.x ? -1 : 1) * (halfW + gap),
              y: mid.y,
            };
        break;
      }
    }
  }

  return {
    start,
    end,
    waypoints,
    angleDeg,
    ...(labelAnchor ? { labelAnchor } : {}),
  };
}

/** Intermediate point on a segment, for positioning a moving packet. */
export function pointOnSegment(start: Point, end: Point, t: number): Point {
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
  };
}

/**
 * Position and angle at parameter t ∈ [0,1] along the full path
 * (start → waypoints → end). Used to animate arrowhead
 * and moving packets.
 */
export function pathTip(
  conn: Connection,
  t: number
): { x: number; y: number; angleDeg: number } {
  if (!conn.waypoints?.length) {
    return {
      x: conn.start.x + (conn.end.x - conn.start.x) * t,
      y: conn.start.y + (conn.end.y - conn.start.y) * t,
      angleDeg: conn.angleDeg,
    };
  }
  const pts = [conn.start, ...conn.waypoints, conn.end];
  let totalLen = 0;
  const segLens: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    segLens.push(l);
    totalLen += l;
  }
  if (totalLen < 1e-10)
    return { x: conn.end.x, y: conn.end.y, angleDeg: conn.angleDeg };
  let dist = t * totalLen;
  for (let i = 0; i < segLens.length; i++) {
    if (dist <= segLens[i] || i === segLens.length - 1) {
      const segT = segLens[i] > 1e-10 ? Math.min(dist / segLens[i], 1) : 1;
      return {
        x: pts[i].x + (pts[i + 1].x - pts[i].x) * segT,
        y: pts[i].y + (pts[i + 1].y - pts[i].y) * segT,
        angleDeg:
          (Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x) * 180) /
          Math.PI,
      };
    }
    dist -= segLens[i];
  }
  return { x: conn.end.x, y: conn.end.y, angleDeg: conn.angleDeg };
}

/**
 * Points of visible path from start up to position t.
 * Returns start + any waypoints already passed + current tip.
 * Used by ArrowLine to draw the progressive stroke.
 */
export function visiblePath(conn: Connection, t: number): Point[] {
  if (!conn.waypoints?.length) {
    return [
      conn.start,
      {
        x: conn.start.x + (conn.end.x - conn.start.x) * t,
        y: conn.start.y + (conn.end.y - conn.start.y) * t,
      },
    ];
  }
  const pts = [conn.start, ...conn.waypoints, conn.end];
  let totalLen = 0;
  const segLens: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    segLens.push(l);
    totalLen += l;
  }
  const result: Point[] = [pts[0]];
  let dist = t * totalLen;
  for (let i = 0; i < segLens.length; i++) {
    if (dist <= segLens[i] || i === segLens.length - 1) {
      const segT = segLens[i] > 1e-10 ? Math.min(dist / segLens[i], 1) : 1;
      result.push({
        x: pts[i].x + (pts[i + 1].x - pts[i].x) * segT,
        y: pts[i].y + (pts[i + 1].y - pts[i].y) * segT,
      });
      return result;
    }
    result.push(pts[i + 1]);
    dist -= segLens[i];
  }
  return result;
}
