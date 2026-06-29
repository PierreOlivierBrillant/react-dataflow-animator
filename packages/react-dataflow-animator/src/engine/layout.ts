import type { DataFlowSpec, Direction, Node } from '../types';

/**
 * Spatial layout engine: calculates the position of each static node
 * WITHOUT (x, y) coordinates as input, based on `direction` and `lane`.
 *
 * Positions are returned as RATIOS (0..1) relative to the Stage: placement
 * is then done in pure CSS (`left: cx%`, `top: cy%`), so no DOM measurement
 * is necessary to POSITION the nodes (measurement is only used for drawing
 * connections).
 */

export interface NodePlacement {
  /** Horizontal center, ratio 0..1. */
  cx: number;
  /** Vertical center, ratio 0..1. */
  cy: number;
}

export type LayoutMap = Record<string, NodePlacement>;

export interface LayoutOptions {
  /** Stage width/height ratio, to keep a round circle in circular mode. */
  aspect?: number;
}

/**
 * Distributes `count` positions on the axis, spread between a margin `[m, 1-m]`.
 * We keep a default "breathing" margin around nodes (m capped at
 * 0.2); it is ONLY when they become numerous — thus packed — that `m`
 * goes down via `1/(count+1)` to spread them more and preserve a minimum
 * distance between them. Few nodes thus remain airy, not glued to the edges.
 */
function spread(index: number, count: number): number {
  if (count <= 1) return 0.5;
  const m = Math.min(0.2, 1 / (count + 1));
  return m + (1 - 2 * m) * (index / (count - 1));
}

function linearLayout(nodes: Node[], direction: Direction): LayoutMap {
  // Grouping by lane (default: 1), lanes sorted in ascending order.
  const byLane = new Map<number, Node[]>();
  for (const node of nodes) {
    const lane = node.lane ?? 1;
    const list = byLane.get(lane);
    if (list) list.push(node);
    else byLane.set(lane, [node]);
  }
  // NB: `Array.from` rather than `[...byLane.keys()]`. Some consumers
  // (e.g. Docusaurus Babel in "loose" mode) transpile the spread of an
  // iterable to `[].concat(iterable)`, which does NOT flatten a Map iterator
  // and silently breaks the layout. `Array.from` is immune.
  const lanes = Array.from(byLane.keys()).sort((a, b) => a - b);

  const map: LayoutMap = {};
  lanes.forEach((lane, laneOrder) => {
    const main = spread(laneOrder, lanes.length);
    const members = byLane.get(lane)!;
    // Nodes with align_with will have their transverse position overwritten by
    // applyAlignment: we exclude them from distribution to avoid collisions.
    const free = members.filter((n) => !n.align_with);
    let freeIdx = 0;
    members.forEach((node) => {
      const cross = node.align_with ? 0.5 : spread(freeIdx++, free.length);
      let cx: number;
      let cy: number;
      switch (direction) {
        case 'right-to-left':
          cx = 1 - main;
          cy = cross;
          break;
        case 'top-to-bottom':
          cx = cross;
          cy = main;
          break;
        case 'bottom-to-top':
          cx = cross;
          cy = 1 - main;
          break;
        case 'left-to-right':
        default:
          cx = main;
          cy = cross;
          break;
      }
      map[node.id] = { cx, cy };
    });
  });
  return map;
}

function circularLayout(nodes: Node[], aspect: number): LayoutMap {
  const map: LayoutMap = {};
  const mainNode = nodes.find((n) => n.main);
  const ring = nodes.filter((n) => n !== mainNode);

  if (mainNode) map[mainNode.id] = { cx: 0.5, cy: 0.5 };

  // Radius in px = 0.4 * smallest dimension; converted to ratios per axis to
  // remain circular regardless of Stage shape.
  const base = 0.4;
  const rx = aspect >= 1 ? base / aspect : base;
  const ry = aspect >= 1 ? base : base * aspect;

  const n = ring.length;
  ring.forEach((node, i) => {
    // We start at the top (-90°) and turn clockwise.
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(1, n);
    map[node.id] = {
      cx: 0.5 + rx * Math.cos(angle),
      cy: 0.5 + ry * Math.sin(angle),
    };
  });
  return map;
}

/**
 * Applies `align_with`: aligns a node on the TRANSVERSE axis of another
 * (vertical if the direction is horizontal, and vice versa).
 */
function applyAlignment(
  map: LayoutMap,
  nodes: Node[],
  direction: Direction
): void {
  const horizontal =
    direction === 'left-to-right' || direction === 'right-to-left';
  for (const node of nodes) {
    if (!node.align_with) continue;
    const self = map[node.id];
    const target = map[node.align_with];
    if (!self || !target) continue;
    if (horizontal) self.cy = target.cy;
    else self.cx = target.cx;
  }
}

/**
 * After align_with, several nodes in the same lane can share the same
 * transverse position (e.g. two different targets that both have cy=0.5).
 * We redistribute the colliding nodes and synchronize their targets.
 */
function resolveCollisions(
  map: LayoutMap,
  nodes: Node[],
  direction: Direction
): void {
  const horizontal =
    direction === 'left-to-right' || direction === 'right-to-left';
  const getCross = (id: string): number =>
    horizontal ? map[id].cy : map[id].cx;
  const setCross = (id: string, v: number): void => {
    if (horizontal) map[id].cy = v;
    else map[id].cx = v;
  };

  const byLane = new Map<number, Node[]>();
  for (const node of nodes) {
    const lane = node.lane ?? 1;
    const list = byLane.get(lane);
    if (list) list.push(node);
    else byLane.set(lane, [node]);
  }

  for (const [, members] of byLane) {
    const byCross = new Map<number, Node[]>();
    for (const node of members) {
      const key = Math.round(getCross(node.id) * 1e9);
      const list = byCross.get(key);
      if (list) list.push(node);
      else byCross.set(key, [node]);
    }
    for (const [, colliders] of byCross) {
      if (colliders.length <= 1) continue;
      colliders.forEach((node, k) => {
        const newCross = spread(k, colliders.length);
        setCross(node.id, newCross);
        // Synchronize the target so align_with stays visually consistent.
        if (node.align_with && map[node.align_with]) {
          setCross(node.align_with, newCross);
        }
      });
    }
  }
}

export function computeLayout(
  spec: DataFlowSpec,
  options: LayoutOptions = {}
): LayoutMap {
  const direction = spec.direction ?? 'left-to-right';
  const nodes = spec.nodes;
  if (direction === 'circular') {
    return circularLayout(nodes, options.aspect ?? 1.6);
  }
  const map = linearLayout(nodes, direction);
  applyAlignment(map, nodes, direction);
  resolveCollisions(map, nodes, direction);
  return map;
}

/** Arrow anchor axis: horizontal → East/West faces, vertical → North/South. */
export type ConnectionAxis = 'horizontal' | 'vertical';

/** Below this ratio threshold, two nodes share the same FLOW coordinate:
 *  they are in the same lane (stacked), not separated by flow. */
const SAME_LANE_EPS = 1e-3;

/**
 * Axis on which an A→B connection anchors, derived from the **layout flow** and not
 * from the dominant pixel axis (which depends on the viewport: on a portrait Stage, two
 * nodes from neighboring lanes can be further apart vertically and mistakenly switch
 * to vertical).
 *
 * - Horizontal flow (`left-to-right` / `right-to-left`): an **inter-lane** connection
 *   starts/arrives horizontally (East/West faces); two nodes from the **same lane**
 *   (same `cx`, stacked) connect vertically.
 * - Vertical flow (`top-to-bottom` / `bottom-to-top`): symmetric.
 * - `circular`: no flow axis → dominant axis in **pixels** (ratios × aspect),
 *   which matches what the eye sees on the ring.
 *
 * SINGLE decision, shared by {@link computePortOffsets} (fan-out distribution) and
 * `connection` anchoring: so both cannot contradict each other.
 */
export function connectionAxis(
  from: NodePlacement,
  to: NodePlacement,
  direction: Direction,
  aspect = 1
): ConnectionAxis {
  const dCx = to.cx - from.cx;
  const dCy = to.cy - from.cy;
  switch (direction) {
    case 'left-to-right':
    case 'right-to-left':
      return Math.abs(dCx) > SAME_LANE_EPS ? 'horizontal' : 'vertical';
    case 'top-to-bottom':
    case 'bottom-to-top':
      return Math.abs(dCy) > SAME_LANE_EPS ? 'vertical' : 'horizontal';
    case 'circular':
    default:
      return Math.abs(dCx * aspect) >= Math.abs(dCy)
        ? 'horizontal'
        : 'vertical';
  }
}
