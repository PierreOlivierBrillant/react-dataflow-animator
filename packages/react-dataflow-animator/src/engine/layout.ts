import type {
  Connection,
  DataFlowSpec,
  Direction,
  LineStyle,
  Node,
  PathShape,
  TreeSpec,
} from '../types';

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

// ─── Graph layout (auto-placement) ─────────────────────────────────────────
//
// `direction: 'graph'` places nodes AUTOMATICALLY, laying out an arbitrary
// node-link diagram so as to minimize edge crossings. A node MAY still declare
// `x`/`y` (a fraction of the Stage) — it then becomes a fixed anchor, and the
// auto-placement of the other (free) nodes routes around it. `lane`,
// `align_with` and `main` are ignored.
//
// The algorithm is a deterministic force-directed simulation (no DOM, no
// `Math.random`, so scrubbing stays reproducible): it runs several seeded
// layouts, keeps the one with the fewest crossings, then does a small local
// search to remove any remaining crossing. It is aspect-independent (runs in a
// fixed landscape reference frame), so resizing the player never reshuffles the
// graph.

/** Landscape reference frame the simulation runs in: distances read like pixels
 *  on the common wide Stage. `x` is converted back to a 0..1 ratio afterwards.
 *  Edge crossings are invariant under this affine map, so minimizing them here
 *  is equivalent to minimizing them on screen. */
const GRAPH_REF_ASPECT = 1.6;
/** Breathing room kept around the frame edges (ratio of the smaller side). */
const GRAPH_MARGIN = 0.1;
/** Deterministic seeds tried; the fewest-crossing result wins. */
const GRAPH_SEEDS = 10;
/** Force-simulation iterations per seed. */
const GRAPH_ITERS = 400;

type Vec2 = { x: number; y: number };

const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

/** mulberry32: tiny seeded PRNG → reproducible layout without `Math.random`. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** True iff segments a→b and c→d properly cross (interior intersection). Shared
 *  endpoints (adjacent edges) are handled by the caller and excluded. */
function segmentsCross(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  const o = (p: Vec2, q: Vec2, r: Vec2): number =>
    (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = o(c, d, a);
  const d2 = o(c, d, b);
  const d3 = o(a, b, c);
  const d4 = o(a, b, d);
  return (
    d1 > 0 !== d2 > 0 &&
    d3 > 0 !== d4 > 0 &&
    d1 !== 0 &&
    d2 !== 0 &&
    d3 !== 0 &&
    d4 !== 0
  );
}

/** Number of crossing pairs among `edges` for the given positions. Edges that
 *  share a node are skipped (they meet at the node, not a crossing). */
function countCrossings(
  pos: Map<string, Vec2>,
  edges: Array<[string, string]>
): number {
  let n = 0;
  for (let i = 0; i < edges.length; i++) {
    const [a1, a2] = edges[i];
    for (let j = i + 1; j < edges.length; j++) {
      const [b1, b2] = edges[j];
      if (a1 === b1 || a1 === b2 || a2 === b1 || a2 === b2) continue;
      if (segmentsCross(pos.get(a1)!, pos.get(a2)!, pos.get(b1)!, pos.get(b2)!))
        n++;
    }
  }
  return n;
}

/** Distance from point p to segment a→b. */
function pointSegDist(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2 : 0;
  const tc = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(p.x - (a.x + tc * dx), p.y - (a.y + tc * dy));
}

/** Tightest gap anywhere in the drawing: the smaller of the closest node↔node
 *  distance and the closest node↔(non-incident edge) distance. Maximizing it
 *  spreads nodes apart AND keeps a node off an edge it is not attached to — so
 *  a zero-crossing layout still reads clearly (no node sitting on an edge). Used
 *  to rank layouts / moves with equal crossing counts. */
function tightestGap(
  pos: Map<string, Vec2>,
  ids: string[],
  edges: Array<[string, string]>
): number {
  let best = Infinity;
  for (let i = 0; i < ids.length; i++) {
    const a = pos.get(ids[i])!;
    for (let j = i + 1; j < ids.length; j++) {
      const d = Math.hypot(a.x - pos.get(ids[j])!.x, a.y - pos.get(ids[j])!.y);
      if (d < best) best = d;
    }
  }
  for (const id of ids) {
    const p = pos.get(id)!;
    for (const [u, v] of edges) {
      if (id === u || id === v) continue;
      const d = pointSegDist(p, pos.get(u)!, pos.get(v)!);
      if (d < best) best = d;
    }
  }
  return best;
}

/** One seeded Fruchterman–Reingold pass. Pinned axes (anchors) are initialized
 *  from `initX`/`initY` and never integrated, so anchors stay put while free
 *  nodes settle around them. */
function forceLayout(
  ids: string[],
  edges: Array<[string, string]>,
  pinX: Set<string>,
  pinY: Set<string>,
  initX: Map<string, number>,
  initY: Map<string, number>,
  rnd: () => number
): Map<string, Vec2> {
  const n = ids.length;
  const W = GRAPH_REF_ASPECT;
  const H = 1;
  const k = 0.9 * Math.sqrt((W * H) / n); // ideal edge length
  const pos = new Map<string, Vec2>();
  const disp = new Map<string, Vec2>();
  for (const id of ids) {
    pos.set(id, {
      x: pinX.has(id)
        ? initX.get(id)!
        : GRAPH_MARGIN * W + rnd() * (W - 2 * GRAPH_MARGIN * W),
      y: pinY.has(id)
        ? initY.get(id)!
        : GRAPH_MARGIN + rnd() * (1 - 2 * GRAPH_MARGIN),
    });
    disp.set(id, { x: 0, y: 0 });
  }
  const t0 = W * 0.1;
  const cx = W / 2;
  const cy = H / 2;
  for (let it = 0; it < GRAPH_ITERS; it++) {
    const temp = t0 * (1 - it / GRAPH_ITERS);
    for (const id of ids) {
      const d = disp.get(id)!;
      d.x = 0;
      d.y = 0;
    }
    // Repulsion between every ordered pair.
    for (let i = 0; i < n; i++) {
      const a = pos.get(ids[i])!;
      const da = disp.get(ids[i])!;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const b = pos.get(ids[j])!;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy) || 1e-6;
        const f = (k * k) / dist;
        da.x += (dx / dist) * f;
        da.y += (dy / dist) * f;
      }
    }
    // Attraction along edges.
    for (const [u, v] of edges) {
      const a = pos.get(u)!;
      const b = pos.get(v)!;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.hypot(dx, dy) || 1e-6;
      const f = (dist * dist) / k;
      const du = disp.get(u)!;
      const dv = disp.get(v)!;
      du.x -= (dx / dist) * f;
      du.y -= (dy / dist) * f;
      dv.x += (dx / dist) * f;
      dv.y += (dy / dist) * f;
    }
    // Gravity toward center (keeps disconnected parts on stage), then integrate
    // each free axis under the cooling temperature cap.
    for (const id of ids) {
      const p = pos.get(id)!;
      const d = disp.get(id)!;
      d.x -= (p.x - cx) * 0.08;
      d.y -= (p.y - cy) * 0.08;
      const len = Math.hypot(d.x, d.y) || 1e-6;
      const lim = Math.min(len, temp);
      if (!pinX.has(id))
        p.x = clamp(
          p.x + (d.x / len) * lim,
          GRAPH_MARGIN * W,
          W - GRAPH_MARGIN * W
        );
      if (!pinY.has(id))
        p.y = clamp(p.y + (d.y / len) * lim, GRAPH_MARGIN, 1 - GRAPH_MARGIN);
    }
  }
  return pos;
}

/** Greedy local search: swap free-node positions and nudge them, keeping only
 *  moves that lower `(crossings, then −tightest-gap)`. Never shortens edges (that
 *  would collapse the graph), so it removes crossings and pushes nodes off the
 *  edges they sit on, without shrinking the drawing. */
function localImprove(
  pos: Map<string, Vec2>,
  ids: string[],
  edges: Array<[string, string]>,
  pinX: Set<string>,
  pinY: Set<string>
): void {
  const W = GRAPH_REF_ASPECT;
  const free = ids.filter((id) => !pinX.has(id) || !pinY.has(id));
  // Only fully-free nodes may swap positions (a partial anchor must keep its axis).
  const swappable = ids.filter((id) => !pinX.has(id) && !pinY.has(id));
  const score = (): [number, number] => [
    countCrossings(pos, edges),
    -tightestGap(pos, ids, edges),
  ];
  const better = (a: [number, number], b: [number, number]): boolean =>
    a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  for (let round = 0; round < 6; round++) {
    let improved = false;
    for (let i = 0; i < swappable.length; i++) {
      for (let j = i + 1; j < swappable.length; j++) {
        const u = swappable[i];
        const v = swappable[j];
        const before = score();
        const pu = pos.get(u)!;
        const pv = pos.get(v)!;
        pos.set(u, { x: pv.x, y: pv.y });
        pos.set(v, { x: pu.x, y: pu.y });
        if (better(score(), before)) improved = true;
        else {
          pos.set(u, pu);
          pos.set(v, pv);
        }
      }
    }
    for (const id of free) {
      for (const [dx, dy] of dirs) {
        for (const mag of [0.12, 0.06]) {
          const before = score();
          const old = pos.get(id)!;
          const np: Vec2 = { x: old.x, y: old.y };
          if (!pinX.has(id))
            np.x = clamp(
              old.x + dx * mag,
              GRAPH_MARGIN * W,
              W - GRAPH_MARGIN * W
            );
          if (!pinY.has(id))
            np.y = clamp(old.y + dy * mag, GRAPH_MARGIN, 1 - GRAPH_MARGIN);
          pos.set(id, np);
          if (better(score(), before)) improved = true;
          else pos.set(id, old);
        }
      }
    }
    if (!improved) break;
  }
}

/** No anchors: fit the node bounding box into the frame margins with ONE
 *  uniform scale (preserves the shape the simulation found) + centering. A
 *  degenerate axis (single node / collinear) is centered, not blown up. */
function normalizeToFrame(pos: Map<string, Vec2>, ids: string[]): void {
  const W = GRAPH_REF_ASPECT;
  const H = 1;
  let minx = Infinity;
  let maxx = -Infinity;
  let miny = Infinity;
  let maxy = -Infinity;
  for (const id of ids) {
    const p = pos.get(id)!;
    minx = Math.min(minx, p.x);
    maxx = Math.max(maxx, p.x);
    miny = Math.min(miny, p.y);
    maxy = Math.max(maxy, p.y);
  }
  const spanx = maxx - minx;
  const spany = maxy - miny;
  const availw = W - 2 * GRAPH_MARGIN * W;
  const availh = H - 2 * GRAPH_MARGIN;
  const cand: number[] = [];
  if (spanx > 1e-3) cand.push(availw / spanx);
  if (spany > 1e-3) cand.push(availh / spany);
  const s = cand.length ? Math.min(...cand) : 1;
  const offx = (W - spanx * s) / 2;
  const offy = (H - spany * s) / 2;
  for (const id of ids) {
    const p = pos.get(id)!;
    p.x = offx + (p.x - minx) * s;
    p.y = offy + (p.y - miny) * s;
  }
}

/** Automatic placement for `direction: 'graph'` — see the section header. */
function graphAutoLayout(nodes: Node[], connections: Connection[]): LayoutMap {
  const W = GRAPH_REF_ASPECT;
  const ids = nodes.map((n) => n.id);
  const idSet = new Set(ids);

  // De-duplicated undirected edges between known nodes (self-loops dropped).
  const seen = new Set<string>();
  const edges: Array<[string, string]> = [];
  for (const c of connections) {
    if (c.from === c.to || !idSet.has(c.from) || !idSet.has(c.to)) continue;
    const key = c.from < c.to ? `${c.from} ${c.to}` : `${c.to} ${c.from}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push([c.from, c.to]);
  }

  const pinX = new Set<string>();
  const pinY = new Set<string>();
  const initX = new Map<string, number>();
  const initY = new Map<string, number>();
  for (const n of nodes) {
    if (n.x !== undefined) {
      pinX.add(n.id);
      initX.set(n.id, n.x * W); // ratio → reference frame
    }
    if (n.y !== undefined) {
      pinY.add(n.id);
      initY.set(n.id, n.y);
    }
  }
  const hasAnchor = pinX.size > 0 || pinY.size > 0;

  let best: Map<string, Vec2> | null = null;
  let bestKey: [number, number] | null = null;
  for (let s = 0; s < GRAPH_SEEDS; s++) {
    const rnd = mulberry32((s + 1) * 0x9e3779b9);
    const pos = forceLayout(ids, edges, pinX, pinY, initX, initY, rnd);
    localImprove(pos, ids, edges, pinX, pinY);
    const key: [number, number] = [
      countCrossings(pos, edges),
      -tightestGap(pos, ids, edges),
    ];
    if (
      bestKey === null ||
      key[0] < bestKey[0] ||
      (key[0] === bestKey[0] && key[1] < bestKey[1])
    ) {
      best = pos;
      bestKey = key;
    }
  }

  const pos = best!;
  // With anchors, the author defines the frame; without, fill the stage.
  if (!hasAnchor) normalizeToFrame(pos, ids);

  const map: LayoutMap = {};
  for (const node of nodes) {
    const p = pos.get(node.id)!;
    // Pinned axes echo the author's exact ratio (no *W//W round-trip error);
    // free axes come from the simulation frame, converted back to a 0..1 ratio.
    map[node.id] = {
      cx: node.x !== undefined ? node.x : p.x / W,
      cy: node.y !== undefined ? node.y : p.y,
    };
  }
  return map;
}

/**
 * Free 2D layout for `direction: 'graph'`. Nodes are placed AUTOMATICALLY to
 * minimize edge crossings; a node that declares `x`/`y` is a fixed anchor the
 * auto-placement routes around. When every node is fully anchored (legacy
 * hand-authored graphs), this is an exact passthrough of the coordinates.
 */
function graphLayout(nodes: Node[], connections: Connection[]): LayoutMap {
  const allAnchored = nodes.every(
    (n) => n.x !== undefined && n.y !== undefined
  );
  if (allAnchored) {
    const map: LayoutMap = {};
    for (const node of nodes) map[node.id] = { cx: node.x!, cy: node.y! };
    return map;
  }
  return graphAutoLayout(nodes, connections);
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

/**
 * Binary-tree layout: each node is placed by its **in-order rank** on the
 * horizontal axis and by its **depth** on the vertical axis (root at the top).
 *
 * Pure and aspect-independent, so the compiler can compute one layout per
 * topology state (before/after each rotation) without any DOM. A tree rotation
 * preserves the in-order traversal, hence the horizontal slots are stable across
 * a rotation — only depths change — which makes the animated re-layout read as a
 * clean vertical glide of the pivot and the moved subtree.
 *
 * Robust to a malformed tree (cycle / dangling child): a `visited` guard stops
 * infinite recursion; nodes unreachable from the root fall back to the center.
 */
export function treeLayout(nodeIds: string[], tree: TreeSpec): LayoutMap {
  const rank = new Map<string, number>();
  const depth = new Map<string, number>();
  const visited = new Set<string>();
  let counter = 0;
  let maxDepth = 0;
  const walk = (id: string | undefined, d: number): void => {
    if (!id || visited.has(id)) return;
    visited.add(id);
    const ch = tree.children[id];
    walk(ch?.left, d + 1);
    rank.set(id, counter++);
    depth.set(id, d);
    if (d > maxDepth) maxDepth = d;
    walk(ch?.right, d + 1);
  };
  walk(tree.root, 0);

  const n = counter;
  const levels = maxDepth + 1;
  const map: LayoutMap = {};
  for (const id of nodeIds) {
    const r = rank.get(id);
    map[id] =
      r === undefined
        ? { cx: 0.5, cy: 0.5 }
        : { cx: spread(r, n), cy: spread(depth.get(id)!, levels) };
  }
  return map;
}

/** Parent→child pairs (left then right) of the current tree topology. */
export function treeEdges(tree: TreeSpec): Array<[string, string]> {
  const edges: Array<[string, string]> = [];
  for (const [parent, ch] of Object.entries(tree.children)) {
    if (ch?.left) edges.push([parent, ch.left]);
    if (ch?.right) edges.push([parent, ch.right]);
  }
  return edges;
}

/** Fully-resolved styling of one tree edge (tree defaults applied). */
interface ResolvedTreeEdgeStyle {
  style: LineStyle;
  path: PathShape;
  arrow_head: 'forward' | 'backward' | 'both' | 'none';
  text?: string;
  color?: string;
  highlighted: boolean;
}

/**
 * Effective styling of a tree edge, identified by its CHILD id. Merges the
 * tree-wide `edge_style` default under the per-edge `edges[childId]` override,
 * then applies the tree edge defaults: a `straight` path and no arrow head
 * (parent→child links are plain hierarchy links, not directed arrows).
 */
export function treeEdgeStyle(
  tree: TreeSpec,
  childId: string
): ResolvedTreeEdgeStyle {
  const merged = { ...tree.edge_style, ...tree.edges?.[childId] };
  return {
    style: merged.style ?? 'solid',
    path: merged.path ?? 'straight',
    arrow_head: merged.arrow_head ?? 'none',
    text: merged.text,
    color: merged.color,
    highlighted: merged.highlighted ?? false,
  };
}

export function computeLayout(
  spec: DataFlowSpec,
  options: LayoutOptions = {}
): LayoutMap {
  const direction = spec.direction ?? 'left-to-right';
  const nodes = spec.nodes;
  if (direction === 'tree' && spec.tree) {
    return treeLayout(
      nodes.map((n) => n.id),
      spec.tree
    );
  }
  if (direction === 'graph') {
    // Aspect-independent on purpose: the auto-layout runs in a fixed reference
    // frame, so resizing the player never reshuffles the graph.
    return graphLayout(nodes, spec.connections ?? []);
  }
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
 * - `circular` / `graph`: no flow axis → dominant axis in **pixels** (ratios ×
 *   aspect), which matches what the eye sees between two freely placed nodes.
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
    case 'tree':
      // Parent sits above its child: edges always leave the bottom face and
      // enter the top face, regardless of the horizontal gap between them.
      return 'vertical';
    case 'graph':
    case 'circular':
    default:
      return Math.abs(dCx * aspect) >= Math.abs(dCy)
        ? 'horizontal'
        : 'vertical';
  }
}
