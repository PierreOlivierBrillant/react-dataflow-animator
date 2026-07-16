import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import type {
  Action,
  Connection as SpecConnection,
  DataFlowSpec,
  NodeType,
  Packet as PacketSpec,
  Highlighter,
  ObjectContent,
  Zone,
} from '../types';
import { richText } from '../tex/RichText';
import {
  evaluate,
  easeInOutCubic,
  type ArrowClip,
  type CommentClip,
  type FlowClip,
  type HighlightClip,
  type MoveClip,
  type ReflowClip,
  type RotateClip,
  type SetColorClip,
  type SetIconClip,
  type SetContentClip,
  type SetVisibleClip,
  type Timeline,
  type ToggleClip,
} from '../engine/timeline';
import {
  computeLayout,
  connectionAxis,
  treeEdges,
  treeEdgeStyle,
  type ConnectionAxis,
  type LayoutMap,
} from '../engine/layout';
import { computeScale, type Density } from '../engine/scale';
import { computePlacements, computeContentLimits } from '../engine/placements';
import {
  collectArrowConnections,
  computePortOffsets,
} from '../engine/portOffsets';
import {
  connection,
  facePort,
  nodeContour,
  pathTip,
  pointAtArc,
  wireEndpoints,
  type GeometryMap,
  type NodeContour,
  type NodeGeom,
  type Point,
} from '../engine/geometry';
import {
  routeWithPinSwaps,
  wireHops,
  type PinSwapGroup,
  type RouterObstacle,
  type RouterWire,
} from '../engine/orthoRouter';
import {
  commutativeInputPins,
  parseRef,
  refNode,
  resolvePin,
} from '../engine/pins';
import { useStageGeometry } from '../hooks/useStageGeometry';
import { buildStageSignature } from './stageSignature';
import { clipOpacity, contentCrossfade } from './clipOpacity';
import { StaticNode } from './nodes/StaticNode';
import type { ColorOverride } from './nodes/nodeColors';
import { ArrowLine } from './dynamic/ArrowLine';
import { Packet } from './dynamic/Packet';
import { CommentBubble } from './CommentBubble';
import { DebugOverlay } from './DebugOverlay';

// SSR-safe: useLayoutEffect on client side, useEffect on server side.
const useIsoLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Every endpoint reference (`node` / `node:pin`) that appears in the spec —
 *  connection ends, arrow/move ends, and `flow` route items — so their contour
 *  can be resolved once into an immutable lookup. */
function collectEndpointRefs(spec: DataFlowSpec): Set<string> {
  const refs = new Set<string>();
  for (const c of spec.connections ?? []) {
    refs.add(c.from);
    refs.add(c.to);
  }
  const walk = (actions: Action[]): void => {
    for (const a of actions) {
      if (a.type === 'arrow' || a.type === 'move') {
        if (a.from) refs.add(a.from);
        if (a.to) refs.add(a.to);
      } else if (a.type === 'flow') {
        for (const r of a.route ?? []) refs.add(r);
      } else if (a.type === 'parallel') {
        walk(a.actions ?? []);
      }
    }
  };
  walk(spec.timeline ?? []);
  return refs;
}

/** A node that drives a logic net — a `signal` input or any `*_gate` output. */
const isLogicType = (t: NodeType): boolean =>
  t === 'signal' || t.endsWith('_gate');

/** Muted mid-tones used to tint each logic net (see {@link netColorMap}). Chosen
 *  to stay legible on both themes and to differ only slightly from the neutral
 *  wire — enough to tell two crossing nets apart without shouting. */
const NET_PALETTE = [
  '#6b7bab',
  '#ab6b7b',
  '#6b9c78',
  '#8f6bab',
  '#ab946b',
  '#6ba7a1',
  '#9cab6b',
  '#ab7b6b',
];

/**
 * Assigns a stable colour to every logic net of a circuit schematic, so wires
 * belonging to different nets (which may cross or run parallel) read as
 * distinct and are visibly NOT joined. A net is identified by its driver — the
 * source node of a wire — when that source is a logic node ({@link isLogicType});
 * all wires sharing a driver share the colour. Non-logic sources (a battery, a
 * junction) are left neutral, so electrical circuits are unaffected. Drivers are
 * numbered in first-appearance order for determinism.
 */
function netColorMap(spec: DataFlowSpec): Map<string, string> {
  const colors = new Map<string, string>();
  if (spec.direction !== 'circuit') return colors;
  const nodeById = new Map(spec.nodes.map((n) => [n.id, n]));
  let i = 0;
  for (const link of spec.connections ?? []) {
    const src = refNode(link.from);
    if (colors.has(src)) continue;
    const n = nodeById.get(src);
    if (n && isLogicType(n.type))
      colors.set(src, NET_PALETTE[i++ % NET_PALETTE.length]);
  }
  return colors;
}

/**
 * Concatenates the wire segments of a `flow` route into a single polyline the
 * charge dots ride. Consecutive refs (`node` / `node:pin`) are joined by the
 * SAME `connection()` geometry the wires use (orthogonal `step`, terminal
 * anchoring), so the current follows the drawn path exactly. Segments whose
 * endpoints aren't measured yet are skipped.
 */
function buildFlowPath(
  route: string[],
  geometry: GeometryMap,
  contourFor: (ref: string) => NodeContour | undefined,
  axisFor: (a: string, b: string) => ConnectionAxis | undefined,
  obstacles: NodeGeom[],
  routeByNodePair: Map<string, Point[]>
): Point[] {
  const pts: Point[] = [];
  let prevEnd: Point | null = null;
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i];
    const b = route[i + 1];
    const gf = geometry[refNode(a)];
    const gt = geometry[refNode(b)];
    if (!gf || !gt) {
      prevEnd = null;
      continue;
    }
    // Prefer the SAME orthogonal route the wire is drawn with (circuit
    // schematics), so the charge rides the drawn wire exactly; else route the
    // segment on its own. A reversed pair reuses the wire route backwards.
    const fwd = routeByNodePair.get(`${refNode(a)}|${refNode(b)}`);
    const rev = routeByNodePair.get(`${refNode(b)}|${refNode(a)}`);
    let seg: Point[];
    if (fwd) seg = fwd;
    else if (rev) seg = [...rev].reverse();
    else {
      const conn = connection(
        gf,
        gt,
        obstacles,
        0,
        0,
        'step',
        axisFor(a, b),
        contourFor(a),
        contourFor(b)
      );
      seg = [conn.start, ...(conn.waypoints ?? []), conn.end];
    }
    if (prevEnd === null) {
      pts.push(...seg);
    } else if (Math.hypot(seg[0].x - prevEnd.x, seg[0].y - prevEnd.y) > 1) {
      // The previous segment ended on one face of node `a` and this one leaves
      // another (a corner junction): bridge through the node CENTRE so the
      // charge turns the corner along the wires instead of cutting across it. A
      // shared terminal (same pin) coincides, so no bridge is inserted there.
      pts.push({ x: gf.x, y: gf.y }, ...seg);
    } else {
      pts.push(...seg.slice(1));
    }
    prevEnd = seg[seg.length - 1];
  }
  return pts;
}

/**
 * Height (px) of the reference "design space". Visual scale is
 * `designScale × (actual_height / DESIGN_H)`: everything is thus strictly
 * proportional to the player size (see `scale` calculation in Stage).
 */
const DESIGN_H = 495;

/**
 * Radius (design px) of the bridge a circuit wire arches over another net's wire
 * — see `wireHops`. Scaled like the stroke it decorates, so the bump keeps its
 * proportions at any player size. Big enough to read as a deliberate arch next to
 * a 2 px stroke, and well under {@link PIN_LEAD}-scale spacing, so a bridge never
 * reaches the corner or the neighbouring track it sits between.
 */
const HOP_RADIUS = 5;

/**
 * Natural width:height aspect of a circuit layout, so it can be drawn in a
 * fixed-aspect frame (letterboxed) instead of stretched to the container — the
 * ONLY way routing stays identical at any size AND shape. It is simply the
 * aspect of the NODE CLOUD (`xspan / yspan`), so the frame matches the drawing
 * the layout already produced — a wide chain gets a wide frame, minimal margin.
 * Clamped to a sane range; 1.6 by default (too few nodes / a degenerate span).
 */
function circuitFrameAspect(layout: LayoutMap): number {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const id in layout) {
    xs.push(layout[id].cx);
    ys.push(layout[id].cy);
  }
  if (xs.length < 2) return 1.6;
  const xspan = Math.max(...xs) - Math.min(...xs);
  const yspan = Math.max(...ys) - Math.min(...ys);
  if (xspan < 1e-3 || yspan < 1e-3) return 1.6;
  return Math.min(3.2, Math.max(1, xspan / yspan));
}

/** Largest box of the given aspect that fits in `w × h`, centred (letterbox).
 *  `aspect <= 0` disables it (the content fills the container as before). */
function letterbox(
  w: number,
  h: number,
  aspect: number
): { w: number; h: number; offX: number; offY: number } {
  if (aspect <= 0 || w <= 0 || h <= 0) return { w, h, offX: 0, offY: 0 };
  const fw = Math.min(w, h * aspect);
  const fh = fw / aspect;
  return { w: fw, h: fh, offX: (w - fw) / 2, offY: (h - fh) / 2 };
}

/** Minimum padding (px) between a contained element and its zone border. */
const ZONE_PADDING = 20;
/** Extra pixels reserved at the top of a zone that has a label, to
 *  ensure the label text (positioned at top: 8px) never overlaps
 *  the background of the highest node — regardless of z-index. */
const ZONE_LABEL_EXTRA_TOP = 20;
/** Vertical space (px) between the bottom of a node's visual and the top of its label. */
const NODE_LABEL_GAP = 6;

interface ZoneBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Computes the bounds (px, relative to Stage) of each zone.
 * Inner zones are resolved before the zones that contain them.
 */
function computeZoneBounds(
  zones: Zone[] | undefined,
  geometry: GeometryMap
): Record<string, ZoneBounds> {
  if (!zones?.length) return {};

  const keys = zones.map((z, i) => z.id ?? `__zone_${i}`);
  const computed: Record<string, ZoneBounds> = {};

  const tryOne = (zone: Zone, key: string): boolean => {
    if (computed[key]) return false;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const id of zone.contains) {
      const g = geometry[id];
      if (g) {
        const lh = g.labelH ?? 0;
        const lw = lh > 0 ? (g.labelW ?? Math.max(g.width * 1.5, 60)) : 0;
        const halfW = Math.max(g.width / 2, lw / 2);
        minX = Math.min(minX, g.x - halfW);
        maxX = Math.max(maxX, g.x + halfW);
        minY = Math.min(minY, g.y - g.height / 2);
        maxY = Math.max(
          maxY,
          g.y + g.height / 2 + (lh > 0 ? NODE_LABEL_GAP + lh : 0)
        );
      } else if (computed[id]) {
        const b = computed[id];
        minX = Math.min(minX, b.x);
        maxX = Math.max(maxX, b.x + b.width);
        minY = Math.min(minY, b.y);
        maxY = Math.max(maxY, b.y + b.height);
      } else if (keys.includes(id)) {
        return false; // sub-zone not yet computed
      }
      // unknown ID → silently ignored
    }
    if (minX === Infinity) return false;
    const topExtra = zone.label ? ZONE_LABEL_EXTRA_TOP : 0;
    computed[key] = {
      x: minX - ZONE_PADDING,
      y: minY - ZONE_PADDING - topExtra,
      width: maxX - minX + 2 * ZONE_PADDING,
      height: maxY - minY + 2 * ZONE_PADDING + topExtra,
    };
    return true;
  };

  // Fixed point: continues as long as zones are resolved (handles nesting).
  let progress = true;
  while (progress) {
    progress = false;
    zones.forEach((zone, i) => {
      if (tryOne(zone, keys[i])) progress = true;
    });
  }

  return computed;
}

export interface StageProps {
  spec: DataFlowSpec;
  timeline: Timeline;
  t: number;
  highlight: Highlighter;
  density?: Density;
  debug?: boolean;
}

export function Stage({
  spec,
  timeline,
  t,
  highlight,
  density = 'comfortable',
  debug,
}: StageProps) {
  const signature = useMemo(() => buildStageSignature(spec), [spec]);

  const { stageRef, geometry, aspect, width, height, forceRemeasure } =
    useStageGeometry(signature);
  const layout = useMemo(() => computeLayout(spec, { aspect }), [spec, aspect]);

  // A `circuit` schematic is drawn in a FIXED-aspect frame centred in the stage
  // (letterbox), not stretched to fill it — so it routes IDENTICALLY at any
  // container size AND shape (only a uniform scale ever changes; the aspect that
  // used to re-route the wires is gone). Everything below reasons in this frame:
  // the scale, positions and the router all use `frame.{w,h}` instead of the raw
  // stage size. Non-circuit diagrams keep filling the stage (frameAspect 0).
  const isCircuitDir = (spec.direction ?? 'left-to-right') === 'circuit';
  const frameAspect = useMemo(
    () => (isCircuitDir ? circuitFrameAspect(layout) : 0),
    [isCircuitDir, layout]
  );
  const frame = useMemo(
    () => letterbox(width, height, frameAspect),
    [width, height, frameAspect]
  );
  // Attachment-axis decisions (connectionAxis) must use the FRAME's aspect, not
  // the container's — otherwise a signal pad would pick a different face at a
  // different window shape and the wire would re-route. Fixed per demo.
  const routeAspect = isCircuitDir ? frameAspect : aspect;

  // The letterbox MOVES nodes (their POSITION, not their size) when the container
  // reshapes: the frame's px size can be unchanged while the compression ratio
  // (frame.w / stage-width) changes, so nodes slide. A ResizeObserver only catches
  // SIZE changes, so without this the geometry would stay on the pre-letterbox
  // positions and the router would route the wires there (detached from the framed
  // nodes). Re-measure after the stage size (hence the placements) changes.
  // Bounded by width/height/frameAspect → forceRemeasure can't re-trigger it.
  useIsoLayoutEffect(() => {
    if (frameAspect) forceRemeasure();
  }, [width, height, frameAspect, forceRemeasure]);

  // EXACT proportionality: we reason in a "design space" of
  // fixed height (DESIGN_H), with the same aspect ratio as the frame. Everything (scale, panel
  // sizes, font ratios) is computed once there — thus constant for a given
  // aspect ratio — then multiplied by k = frame_height / DESIGN_H. Sizes are
  // therefore base × designScale × k (∝ k, thus proportional to the player size), positions
  // remain in %, and reduction ratios are identical at any size: a
  // small player is a strictly homogeneous reduction of a large one.
  const k = frame.h > 0 ? frame.h / DESIGN_H : 1;
  const designW = frame.w > 0 && k > 0 ? frame.w / k : 700;
  // Junction dots claim no room: exclude them from the scale spacing so a corner
  // junction next to a component doesn't shrink the whole schematic.
  const compactNodeIds = useMemo(
    () =>
      new Set(spec.nodes.filter((n) => n.type === 'junction').map((n) => n.id)),
    [spec]
  );
  // Circuit schematics pack their components tighter (the router keeps the wires
  // between them clean), so their symbols and value labels render bigger.
  const design = useMemo(
    () =>
      computeScale(
        layout,
        designW,
        DESIGN_H,
        density,
        compactNodeIds,
        spec.direction === 'circuit' ? 0.68 : 1
      ),
    [layout, designW, density, compactNodeIds, spec.direction]
  );
  const scale = design.scale * k;
  const maxW = design.maxW * k;
  const contentMaxW = design.contentMaxW * k;
  const contentMaxH = design.contentMaxH * k;
  // Content perfectly follows icon scale.
  const contentScale = scale;
  const allNodes = useMemo(() => Object.values(geometry), [geometry]);
  // Pre-ContentPanel (icon) geometry by nodeId: captured in useLayoutEffect
  // as soon as a set_content clip becomes active, before ResizeObserver triggers.
  const [iconGeomByNode, setIconGeomByNode] = useState<
    Record<string, NodeGeom>
  >({});
  const dynamicById = useMemo(() => {
    const map: Record<string, PacketSpec> = {};
    for (const obj of spec.packets) map[obj.id] = obj;
    return map;
  }, [spec]);

  const active = evaluate(timeline, t);

  const direction = spec.direction ?? 'left-to-right';

  // ─── Tree mode: time-dependent layout & edges ──────────────────────────────
  // In `direction: 'tree'` node positions are NOT fixed: each active reflow clip
  // (a rotate_subtree) interpolates placements from the pre- to the
  // post-rotation layout and carries the post-rotation parent/child edges. The
  // most recent active reflow wins (clips are start-ordered, and each one's
  // fromLayout is the previous one's toLayout, so it captures the cumulative
  // state); before any rotation we fall back to the base layout and the initial
  // tree edges. Pure in `t` → scrubbable both ways.
  const isTree = direction === 'tree';
  const { liveLayout, treeEdgesNow } = useMemo((): {
    liveLayout: typeof layout;
    treeEdgesNow: Array<[string, string]>;
  } => {
    if (!isTree) return { liveLayout: layout, treeEdgesNow: [] };
    let lastReflow: ReflowClip | undefined;
    let lastProgress = 1;
    for (const a of active) {
      if (a.clip.kind === 'reflow') {
        lastReflow = a.clip as ReflowClip;
        lastProgress = a.progress;
      }
    }
    if (!lastReflow) {
      return {
        liveLayout: layout,
        treeEdgesNow: spec.tree ? treeEdges(spec.tree) : [],
      };
    }
    const f = easeInOutCubic(lastProgress);
    const next: typeof layout = {};
    for (const id of Object.keys(layout)) {
      const from = lastReflow.fromLayout[id] ?? layout[id];
      const to = lastReflow.toLayout[id] ?? layout[id];
      next[id] = { cx: lerp(from.cx, to.cx, f), cy: lerp(from.cy, to.cy, f) };
    }
    return { liveLayout: next, treeEdgesNow: lastReflow.edges };
  }, [isTree, layout, active, spec.tree]);

  const lineConnections = useMemo(() => collectArrowConnections(spec), [spec]);
  // Nodes opting out of edge convergence (`merge_edges: false`): their faces
  // fan out instead of collapsing all attachments to a single anchor point.
  const fanOutNodes = useMemo(
    () =>
      new Set(
        spec.nodes.filter((n) => n.merge_edges === false).map((n) => n.id)
      ),
    [spec]
  );
  // Circuit schematics: `connections` are orthogonal wires (no head) by default,
  // and edges anchor on the components' named terminals.
  const isCircuit = direction === 'circuit';

  // Auto-rotation assigned by the circuit auto-layout (a component on a vertical
  // edge of the loop). An explicit `Node.rotation` still wins. Aspect-independent,
  // so this is stable across resizes.
  const autoRotationById = useMemo(() => {
    const m = new Map<string, number>();
    for (const [id, p] of Object.entries(layout))
      if (p.rotation != null) m.set(id, p.rotation);
    return m;
  }, [layout]);

  // Circuit label placement (single source of truth). A component wired top and
  // bottom — its terminals point up/down, i.e. its effective STATIC rotation is
  // vertical (≈90°/270°) — would have its default below-label sit on the outgoing
  // bottom wire. Its label moves to the OUTER side (left near the left edge, right
  // otherwise). Read by StaticNode (CSS side class), the wire router (obstacle on
  // the same side) and the placement clamp (reserves the horizontal room instead
  // of the bottom room). Based on the static rotation only — like the routes,
  // it stays stable across resizes and animation frames.
  const labelSideById = useMemo(() => {
    const m = new Map<string, 'left' | 'right'>();
    if (!isCircuit) return m;
    for (const node of spec.nodes) {
      const rot = node.rotation ?? autoRotationById.get(node.id);
      if (rot == null) continue;
      const r = ((rot % 180) + 180) % 180;
      if (r <= 45 || r >= 135) continue; // horizontal terminals → label stays below
      const cx = layout[node.id]?.cx ?? 0.5;
      m.set(node.id, cx <= 0.5 ? 'left' : 'right');
    }
    return m;
  }, [isCircuit, spec.nodes, autoRotationById, layout]);

  // Anchoring policy for an endpoint REFERENCE (`node` or `node:pin`). A round
  // node attaches radially on its outline; a `node:pin` on a component attaches
  // on that terminal (rotated by the node's static — or auto-layout — rotation).
  // Precomputed into an immutable map (every node id + every endpoint ref in the
  // spec) so a STABLE object is returned per ref — otherwise ArrowLine
  // memoization would break. The returned reader only reads; a ref outside the
  // map (e.g. a tree edge) resolves purely. Undefined = the cardinal-face model.
  const contourFor = useMemo(() => {
    const nodeById = new Map(spec.nodes.map((n) => [n.id, n]));
    const resolve = (ref: string): NodeContour | undefined => {
      const { node, pin } = parseRef(ref);
      const n = nodeById.get(node);
      if (!n) return undefined;
      const pinDef = resolvePin(n.type, pin);
      const rotationDeg = n.rotation ?? autoRotationById.get(n.id) ?? 0;
      return pinDef
        ? { kind: 'pin', pin: pinDef, rotationDeg }
        : nodeContour(n.type, n.ports);
    };
    const map = new Map<string, NodeContour | undefined>();
    for (const n of spec.nodes) map.set(n.id, resolve(n.id));
    for (const ref of collectEndpointRefs(spec))
      if (!map.has(ref)) map.set(ref, resolve(ref));
    return (ref: string): NodeContour | undefined =>
      map.has(ref) ? map.get(ref) : resolve(ref);
  }, [spec, autoRotationById]);
  // Per-net wire tint (logic schematics only); a stable colour per driver node.
  const netColorById = useMemo(() => netColorMap(spec), [spec]);
  const portOffsets = useMemo(
    () =>
      computePortOffsets(
        lineConnections,
        layout,
        routeAspect,
        direction,
        fanOutNodes
      ),
    [lineConnections, layout, routeAspect, direction, fanOutNodes]
  );

  // Connection attachment axis, derived from layout FLOW (see connectionAxis):
  // the same decision as computePortOffsets, passed to connection/ArrowLine so that
  // attachment and fan-out distribution match. undefined if a node is missing
  // from layout (connection then falls back to dominant pixel axis).
  const axisFor = (fromRef: string, toRef: string) => {
    const p1 = layout[refNode(fromRef)];
    const p2 = layout[refNode(toRef)];
    return p1 && p2
      ? connectionAxis(p1, p2, direction, routeAspect)
      : undefined;
  };
  // Port offsets do not apply to an endpoint that is already a precise point (a
  // component terminal, or a junction dot): zero the spread there.
  const isPrecise = (ref: string): boolean => {
    const k = contourFor(ref)?.kind;
    return k === 'pin' || k === 'point';
  };
  const portsFor = (
    key: string,
    fromRef: string,
    toRef: string
  ): { start: number; end: number } => {
    const base = portOffsets[key] ?? { start: 0, end: 0 };
    return {
      start: isPrecise(fromRef) ? 0 : base.start,
      end: isPrecise(toRef) ? 0 : base.end,
    };
  };

  // Captures "icon" geometry of nodes that just entered
  // set_content mode. Runs after DOM commit, before ResizeObserver
  // has time to update geometry with ContentPanel dimensions.
  //
  // When a new set_content node appears (hasNew), we call forceRemeasure()
  // in the same layout effect. React 18 batches setIconGeomByNode + setGeometry into
  // a single re-render, eliminating the intermediate flash ("2-frame effect").
  useIsoLayoutEffect(() => {
    const activeContentNodeIds = new Set<string>();
    for (const a of active) {
      if (a.clip.kind === 'set_content') {
        activeContentNodeIds.add((a.clip as SetContentClip).objectId);
      }
    }
    const hasNew = [...activeContentNodeIds].some(
      (nodeId) => !iconGeomByNode[nodeId] && geometry[nodeId]
    );
    // A node EXITING set_content mode shrinks from panel back to its icon:
    // a displacement (anti-overflow clamp releasing) that ResizeObserver
    // might miss. Without re-measuring, geometry stays at the panel position
    // and the arrow doesn't perfectly return to its initial spot.
    const hasGone = Object.keys(iconGeomByNode).some(
      (nodeId) => !activeContentNodeIds.has(nodeId)
    );
    setIconGeomByNode((prev) => {
      let next = prev;
      for (const nodeId of activeContentNodeIds) {
        if (!prev[nodeId] && geometry[nodeId]) {
          if (next === prev) next = { ...prev };
          next[nodeId] = geometry[nodeId];
        }
      }
      for (const nodeId of Object.keys(prev)) {
        if (!activeContentNodeIds.has(nodeId)) {
          if (next === prev) next = { ...prev };
          delete next[nodeId];
        }
      }
      return next;
    });
    if (hasNew || hasGone) forceRemeasure();
  }, [active, geometry, iconGeomByNode, forceRemeasure]);

  // Effective content by node: initial content (opacity 1), then active
  // set_content (with fade in/out).
  const contentByNode: Record<
    string,
    { content: ObjectContent; opacity: number }
  > = {};
  for (const obj of spec.nodes) {
    if (obj.content)
      contentByNode[obj.id] = { content: obj.content, opacity: 1 };
  }
  for (const a of active) {
    if (a.clip.kind !== 'set_content') continue;
    const clip = a.clip as SetContentClip;
    contentByNode[clip.objectId] = {
      content: clip.content,
      // Eased: drives content opacity AND geometry lerp (l. 299).
      opacity: contentCrossfade(clip, t),
    };
  }

  // SYNCHRONIZED code font: each CodeBlock reports (handleCodeFit) the reduction
  // ratio it would need alone to fit in its box; we apply to
  // ALL the minimum across ALL code panels seen so far (not just
  // active ones: they don't all appear at once), so that all code
  // has exactly the same font size at all times — and none overflow.
  // The factor grows when the player grows (more space → less reduction).
  const [codeRatios, setCodeRatios] = useState<Record<string, number>>({});
  useIsoLayoutEffect(() => setCodeRatios({}), [signature]);
  const handleCodeFit = useCallback((id: string, ratio: number) => {
    setCodeRatios((prev) =>
      Math.abs((prev[id] ?? 1) - ratio) < 0.005
        ? prev
        : { ...prev, [id]: ratio }
    );
  }, []);
  const codeFontScale = Math.min(1, ...Object.values(codeRatios));

  // Interpolated geometry: during a set_content transition, lerp between
  // pre-content geometry (icon, in iconGeomByNode) and current geometry
  // (measured ContentPanel). Factor = contentCrossfade (eased) → morph follows
  // exactly the visual fade, eased start and end.
  let effectiveGeometry: GeometryMap = geometry;
  let geometryOverridden = false;
  for (const a of active) {
    if (a.clip.kind !== 'set_content') continue;
    const clip = a.clip as SetContentClip;
    const nodeId = clip.objectId;
    const iconGeom = iconGeomByNode[nodeId];
    const currGeom = geometry[nodeId];
    if (!iconGeom || !currGeom) continue;
    const p = contentByNode[nodeId]?.opacity ?? 0;
    if (p >= 1) continue;
    if (!geometryOverridden) {
      effectiveGeometry = { ...geometry };
      geometryOverridden = true;
    }
    const lH = lerp(iconGeom.labelH ?? 0, currGeom.labelH ?? 0, p);
    const lW = lerp(iconGeom.labelW ?? 0, currGeom.labelW ?? 0, p);
    // Tinted badge outset: resolves toward 0 as the set_content
    // panel (untinted) takes over, avoiding an attachment jump.
    const bo = lerp(iconGeom.borderOutset ?? 0, currGeom.borderOutset ?? 0, p);
    effectiveGeometry[nodeId] = {
      id: currGeom.id,
      x: lerp(iconGeom.x, currGeom.x, p),
      y: lerp(iconGeom.y, currGeom.y, p),
      width: lerp(iconGeom.width, currGeom.width, p),
      height: lerp(iconGeom.height, currGeom.height, p),
      ...(lH > 0 ? { labelH: lH } : {}),
      ...(lW > 0 ? { labelW: lW } : {}),
      ...(bo > 0 ? { borderOutset: bo } : {}),
      // Same Stage scale as icon (arrow↔node gap at scale).
      ...(currGeom.scale != null ? { scale: currGeom.scale } : {}),
    };
  }
  // Tree nodes glide with the live layout: synthesize their geometry x/y from the
  // interpolated placement (keeping the measured size), so the auto-drawn
  // parent/child edges follow the moving nodes — the same trick as set_content,
  // applied to position instead of size. No DOM re-measure needed (sizes are
  // stable during a rotation).
  if (isTree && width && height) {
    if (!geometryOverridden) {
      effectiveGeometry = { ...geometry };
      geometryOverridden = true;
    }
    for (const id of Object.keys(liveLayout)) {
      const g = geometry[id];
      if (!g) continue;
      effectiveGeometry[id] = {
        ...g,
        x: liveLayout[id].cx * width,
        y: liveLayout[id].cy * height,
      };
    }
  }
  const allEffectiveNodes = geometryOverridden
    ? Object.values(effectiveGeometry)
    : allNodes;

  // Circuit schematics: route ALL baseline wires TOGETHER on a global orthogonal
  // router (strictly H/V, never through a component, parallels on separate
  // lanes). Keyed exactly like the render below. Circuit nodes don't move, so
  // this recomputes only on remeasure / spec change, not per animation frame.
  // Hops (the bridges over another net's wire) come out of the same memo because
  // only here are the wires — hence the electrical nets — known.
  const { routes: circuitRoutes, hops: circuitHops } = useMemo(() => {
    const routes = new Map<string, Point[]>();
    const empty = { routes, hops: new Map<string, Point[]>() };
    if (!isCircuit) return empty;
    const obstacles: RouterObstacle[] = Object.entries(geometry).map(
      ([id, g]) => ({
        id,
        x: g.x,
        y: g.y,
        w: g.width,
        h: g.height,
        labelW: g.labelW,
        labelH: g.labelH,
        labelSide: labelSideById.get(id),
      })
    );
    const typeById = new Map(spec.nodes.map((n) => [n.id, n.type]));
    // Per target node, the wire reaching each named pin and where it comes from —
    // used below to spot a commutative gate whose two inputs could swap pins.
    const inByNode = new Map<
      string,
      Map<string, { key: string; src: string }>
    >();
    // A face-anchored endpoint (a plain box: a signal I/O pad, no pin/point/round
    // contour) is a SYSTEM terminal: its wires all leave its RIGHT face (driver)
    // or enter its LEFT face (sink), never a top/bottom face that would dive
    // behind a neighbour. Below, those endpoints are re-anchored on the pad's one
    // centred PORT (see {@link facePort}); here we only compute the raw endpoints
    // and remember which ends are face-anchored.
    const isFace = (c: NodeContour | undefined): boolean => c === undefined;
    const raw: {
      link: SpecConnection;
      key: string;
      fromNode: string;
      toNode: string;
      ends: ReturnType<typeof wireEndpoints>;
      fromFace: boolean;
      toFace: boolean;
    }[] = [];
    (spec.connections ?? []).forEach((link, i) => {
      const fromNode = refNode(link.from);
      const toNode = refNode(link.to);
      const f = geometry[fromNode];
      const tg = geometry[toNode];
      if (!f || !tg) return;
      const key = link.id ?? `${link.from}|${link.to}|${i}`;
      const toRef = parseRef(link.to);
      if (toRef.pin) {
        const pins = inByNode.get(toRef.node) ?? new Map();
        pins.set(toRef.pin, { key, src: fromNode });
        inByNode.set(toRef.node, pins);
      }
      const fromC = contourFor(link.from);
      const toC = contourFor(link.to);
      const p1 = layout[fromNode];
      const p2 = layout[toNode];
      const axis =
        p1 && p2 ? connectionAxis(p1, p2, direction, routeAspect) : undefined;
      const base = portOffsets[key] ?? { start: 0, end: 0 };
      const precise = (k?: string) => k === 'pin' || k === 'point';
      const ends = wireEndpoints(
        f,
        tg,
        precise(fromC?.kind) ? 0 : base.start,
        precise(toC?.kind) ? 0 : base.end,
        axis,
        fromC,
        toC
      );
      raw.push({
        link,
        key,
        fromNode,
        toNode,
        ends,
        fromFace: isFace(fromC),
        toFace: isFace(toC),
      });
    });
    if (!raw.length) return empty;

    const wires: RouterWire[] = raw.map(
      ({ link, key, fromNode, toNode, ends, fromFace, toFace }) => {
        // Every wire of a pad shares its ONE centred port, and forks downstream.
        const fromPort = fromFace
          ? facePort(geometry[fromNode], 'east')
          : undefined;
        const toPort = toFace ? facePort(geometry[toNode], 'west') : undefined;
        // hardNormal = the endpoint anchors on a BORDER with an enforced normal (a
        // pin, a face port, or a plain cardinal face). Only a POINT contour (a
        // junction dot, centre-anchored) is soft: the wire may reach its centre, so
        // its body must not block that wire.
        // A per-connection `diagonal` overrides the circuit-wide `diagonal_wires`.
        return {
          key,
          from: {
            node: fromNode,
            point: fromPort ?? ends.from.point,
            normal: fromPort ? { x: 1, y: 0 } : ends.from.normal,
            hardNormal: contourFor(link.from)?.kind !== 'point',
            fanPort: fromFace,
          },
          to: {
            node: toNode,
            point: toPort ?? ends.to.point,
            normal: toPort ? { x: -1, y: 0 } : ends.to.normal,
            hardNormal: contourFor(link.to)?.kind !== 'point',
          },
          diagonal: link.diagonal ?? spec.diagonal_wires ?? false,
        };
      }
    );
    // A commutative gate (`a AND b === b AND a`, likewise NAND/OR/…) whose two
    // input wires come from different nets may swap which wire takes the upper vs
    // lower pin, to let the router remove a crossing at the gate — see
    // {@link routeWithPinSwaps}. Order-sensitive terminals (op-amp `+`/`-`) are
    // excluded by {@link commutativeInputPins}.
    const swapGroups: PinSwapGroup[] = [];
    for (const [node, pins] of inByNode) {
      const type = typeById.get(node);
      const pair = type && commutativeInputPins(type);
      if (!pair) continue;
      const a = pins.get(pair[0]);
      const b = pins.get(pair[1]);
      if (a && b && a.src !== b.src) swapGroups.push([a.key, b.key]);
    }
    // `scale: k` normalizes the measured geometry to design space so the routes
    // (fixed-px leads/costs) are identical at any player size — a thumbnail and a
    // full-screen render draw the SAME corners. See RouteOptions.scale.
    const routed = routeWithPinSwaps(obstacles, wires, swapGroups, {
      clearance: 6,
      laneTracks: 3,
      scale: k,
    });
    return { routes: routed, hops: wireHops(routed, wires) };
  }, [
    isCircuit,
    geometry,
    spec.nodes,
    spec.connections,
    spec.diagonal_wires,
    contourFor,
    portOffsets,
    layout,
    direction,
    routeAspect,
    labelSideById,
    k,
  ]);
  // Wire routes keyed by node pair, so a `flow` charge can ride the very route
  // its wire is drawn with (see buildFlowPath).
  const routeByNodePair = useMemo(() => {
    const m = new Map<string, Point[]>();
    (spec.connections ?? []).forEach((link, i) => {
      const r = circuitRoutes.get(link.id ?? `${link.from}|${link.to}|${i}`);
      if (r) m.set(`${refNode(link.from)}|${refNode(link.to)}`, r);
    });
    return m;
  }, [spec.connections, circuitRoutes]);

  // Revealed fraction (0..1) by node: drives top-down clip-path of StaticNode.
  // = eased opacity of crossfade (contentCrossfade). Decoupled from geometry
  // (no dependency on measurement / iconGeom) → robust, works even frozen.
  const revealByNode: Record<string, number> = {};
  for (const nodeId of Object.keys(contentByNode)) {
    const op = contentByNode[nodeId].opacity;
    if (op < 1) revealByNode[nodeId] = op;
  }

  // Visibility opacity by node: 0 = hidden, 1 = visible, intermediate = fading.
  // Initialized from `node.visible` then updated by active set_visible clips.
  // set_visible clips have keepEnd=true: they remain in `active` after their
  // animation ends, which allows remembering the last state without mutable state.
  const nodeVisibility: Record<string, number> = {};
  for (const node of spec.nodes) {
    if (node.visible === false) nodeVisibility[node.id] = 0;
  }
  // End instant of the set_visible that revealed each node, used in tree mode to
  // draw its incoming edge AFTER the node has appeared (place the node, then
  // connect it — see treeEdgeProgress), instead of popping the edge in with it.
  const nodeRevealEnd: Record<string, number> = {};
  for (const a of active) {
    if (a.clip.kind === 'set_visible') {
      const clip = a.clip as SetVisibleClip;
      nodeVisibility[clip.objectId] = clip.visible
        ? a.progress
        : 1 - a.progress;
      if (clip.visible) nodeRevealEnd[clip.objectId] = clip.endMs;
      else delete nodeRevealEnd[clip.objectId];
    }
  }
  // Draw-in fraction [0..1] of a tree edge: 1 (fully drawn) for nodes present
  // from the start; for a node just revealed by set_visible, the edge stays at 0
  // while the node fades in, then grows from the parent toward the child over
  // EDGE_DRAW_MS once the reveal is done. Pure in t → scrubbable.
  const EDGE_DRAW_MS = 450;
  const treeEdgeProgress = (childId: string): number => {
    const re = nodeRevealEnd[childId];
    if (re == null) return 1;
    return easeInOutCubic(Math.max(0, Math.min(1, (t - re) / EDGE_DRAW_MS)));
  };

  // Rotation angle (deg) by node: initialized from `node.rotation`, then
  // updated by active rotate clips. Like set_visible, rotate clips have
  // keepEnd=true so they persist in `active`; iterating in startMs order means
  // the most recent rotate on a node wins (the one whose animation covers t).
  const nodeRotation: Record<string, number> = {};
  for (const node of spec.nodes) {
    // Explicit rotation wins; otherwise the circuit auto-layout may rotate a
    // component that sits on a vertical edge of the loop.
    const base = node.rotation ?? autoRotationById.get(node.id);
    if (typeof base === 'number') nodeRotation[node.id] = base;
  }
  for (const a of active) {
    if (a.clip.kind === 'rotate') {
      const clip = a.clip as RotateClip;
      // A continuous spin turns at constant speed (linear); a target rotation
      // eases in/out.
      const f = clip.spin ? a.progress : easeInOutCubic(a.progress);
      nodeRotation[clip.objectId] = lerp(clip.fromDeg, clip.toDeg, f);
    }
  }

  // Contact state (0..1) per switch / push_button: the static `closed`, then
  // eased by active toggle clips (a full swing from the opposite state). Like
  // rotate/set_visible, toggle clips have keepEnd=true so a finished toggle
  // stays in `active` and the reached state persists.
  const nodeClosed: Record<string, number> = {};
  for (const node of spec.nodes) if (node.closed) nodeClosed[node.id] = 1;
  for (const a of active) {
    if (a.clip.kind === 'toggle') {
      const clip = a.clip as ToggleClip;
      const f = easeInOutCubic(a.progress);
      nodeClosed[clip.objectId] = clip.closed ? f : 1 - f;
    }
  }

  // Color override by node: accumulates active set_color clips in startMs order.
  // Each clip overrides only the channels it sets, cross-fading (eased) from the
  // accumulated value to its target via CSS `color-mix` — deterministic in t, so
  // it scrubs both ways (unlike a wall-clock CSS transition). Like set_visible,
  // set_color clips have keepEnd=true, so a finished recolor stays applied
  // (progress 1 → 100% of the target). The map is seeded with the static colors
  // so the very first recolor cross-fades FROM the node's initial color; only
  // nodes actually touched by an active clip receive an override (see render).
  const nodeColor: Record<string, ColorOverride> = {};
  for (const node of spec.nodes) {
    if (node.background_color || node.border_color || node.text_color)
      nodeColor[node.id] = {
        background_color: node.background_color,
        border_color: node.border_color,
        text_color: node.text_color,
      };
  }
  // Connection line color, keyed by id. Seeded with the static `Connection.color`
  // (the value a set_color cross-fades FROM), exactly like the node seeding above.
  // `connectionIds` also lets the set_color loop tell a connection target from a
  // node target — the same id space, resolved here rather than in the compiler.
  const connectionColor: Record<string, string> = {};
  const connectionIds = new Set<string>();
  for (const link of spec.connections ?? []) {
    if (link.id) {
      connectionIds.add(link.id);
      if (link.color) connectionColor[link.id] = link.color;
    }
  }
  const recoloredNodes = new Set<string>();
  for (const a of active) {
    if (a.clip.kind !== 'set_color') continue;
    const clip = a.clip as SetColorClip;
    const p = easeInOutCubic(a.progress);
    // No faithful "from" when the channel was never colored: adopt the target
    // directly rather than inventing an origin and flashing a wrong color.
    const mix = (from: string | undefined, to: string): string =>
      from ? `color-mix(in srgb, ${from}, ${to} ${(p * 100).toFixed(2)}%)` : to;
    // A connection target recolors its single line color; a node target its
    // background / border / text channels.
    if (connectionIds.has(clip.objectId)) {
      if (clip.color != null)
        connectionColor[clip.objectId] = mix(
          connectionColor[clip.objectId],
          clip.color
        );
      continue;
    }
    recoloredNodes.add(clip.objectId);
    const prev = nodeColor[clip.objectId] ?? {};
    const next: ColorOverride = { ...prev };
    if (clip.backgroundColor != null)
      next.background_color = mix(prev.background_color, clip.backgroundColor);
    if (clip.borderColor != null)
      next.border_color = mix(prev.border_color, clip.borderColor);
    if (clip.textColor != null)
      next.text_color = mix(prev.text_color, clip.textColor);
    nodeColor[clip.objectId] = next;
  }

  // Icon badge override by node: active set_icon clips in startMs order, latest
  // wins. Like set_color, set_icon clips have keepEnd=true so a swapped badge
  // stays applied. Empty string is a real value (clears the badge) and is kept
  // distinct from "no override" (undefined → fall back to the static icon).
  const nodeIcon: Record<string, string> = {};
  for (const a of active) {
    if (a.clip.kind === 'set_icon') {
      const clip = a.clip as SetIconClip;
      nodeIcon[clip.objectId] = clip.icon;
    }
  }

  const loadingNodes = useMemo(() => {
    const set = new Set<string>();
    for (const a of active)
      if (a.clip.kind === 'loading') set.add(a.clip.objectId);
    return set;
  }, [active]);

  // Highlighted targets (static nodes or connections) by highlight action.
  const highlightedIds = useMemo(() => {
    const set = new Set<string>();
    for (const a of active) {
      if (a.clip.kind === 'highlight')
        set.add((a.clip as HighlightClip).targetId);
    }
    return set;
  }, [active]);

  const nodes = spec.nodes;

  // Outside tree mode, nodes never MOVE: we just bound them so they don't go
  // outside the canvas (the shrinking of panels via contentLimits avoids
  // overlaps, not spreading them out). In tree mode positions are
  // time-dependent (rotations), so placements follow the live layout.
  // Resolve the layout's `pinNudge` — a fraction of a node's height, the only unit it
  // could express (see `assignPinNudges`) — now that the symbols are measured. It
  // shifts a node so its TERMINAL, not its centre, lands on its neighbour's rail,
  // which is what makes the wire straight. The height it is a fraction of is the
  // node's own, EXCEPT for a signal pad (`pinNudgeRef`), which cancels an offset
  // declared by the gate it faces and is not that gate's size (see
  // `assignPadNudges`). Applied
  // to `cy` in FRAME units (that is what the nudged wire is drawn in) and BEFORE
  // computePlacements, so its clamp still keeps the node on canvas. Deliberately not
  // fed back into `frameAspect` / `computeScale`: both read the raw layout, and a
  // sub-body nudge must not be able to resize the frame that defines it.
  const nudgedLayout = useMemo(() => {
    const fh = frame.h > 0 ? frame.h : height;
    if (!fh) return layout;
    let any = false;
    const out: LayoutMap = {};
    for (const id in layout) {
      const p = layout[id];
      const h = geometry[p.pinNudgeRef ?? id]?.height;
      if (!p.pinNudge || !h) {
        out[id] = p;
        continue;
      }
      any = true;
      out[id] = { ...p, cy: p.cy + (p.pinNudge * h) / fh };
    }
    return any ? out : layout;
  }, [layout, geometry, frame.h, height]);
  // A nudge MOVES nodes (their POSITION, not their size), and the height it resolves
  // against only settles once the scale has converged — so the first measure feeds a
  // TRANSIENT height into a position, and nothing would ever re-measure the corrected
  // one: a ResizeObserver sees sizes, not displacements (the trap the letterbox hits
  // above). The router would then anchor the wires on the pre-nudge rails. Re-measure
  // whenever a resolved nudge changes; it is a pure function of the settled height,
  // so this reaches a fixed point instead of oscillating.
  const nudgeKey = useMemo(() => {
    const parts: string[] = [];
    for (const id in nudgedLayout)
      if (layout[id]?.pinNudge) parts.push(`${id}:${nudgedLayout[id].cy}`);
    return parts.join('|');
  }, [nudgedLayout, layout]);
  useIsoLayoutEffect(() => {
    if (nudgeKey) forceRemeasure();
  }, [nudgeKey, forceRemeasure]);
  const basePlacements = useMemo(
    () =>
      computePlacements(
        nudgedLayout,
        geometry,
        width,
        height,
        undefined,
        labelSideById
      ),
    [nudgedLayout, geometry, width, height, labelSideById]
  );
  const basePlaced = isTree
    ? computePlacements(liveLayout, geometry, width, height)
    : basePlacements;
  // Compress the (0..1) placements into the centred circuit frame: a node lands
  // inside the letterboxed box, so nodes + wires scale uniformly and never
  // stretch with the container. Identity when there is no frame (frameAspect 0).
  const placements = useMemo(() => {
    if (!frameAspect || frame.w <= 0 || width <= 0 || height <= 0)
      return basePlaced;
    const sx = frame.w / width;
    const sy = frame.h / height;
    const ox = frame.offX / width;
    const oy = frame.offY / height;
    const out: Record<string, { cx: number; cy: number }> = {};
    for (const id in basePlaced)
      out[id] = {
        cx: ox + basePlaced[id].cx * sx,
        cy: oy + basePlaced[id].cy * sy,
      };
    return out;
  }, [basePlaced, frameAspect, frame, width, height]);

  // Max panel size per node so a set_content never overlaps
  // a neighbor (FIXED positions known in advance): beyond this, content shrinks.
  // Computed in DESIGN space (constant) — rendering then applies ×k.
  const contentLimits = useMemo(
    () =>
      computeContentLimits(
        layout,
        designW,
        DESIGN_H,
        design.scale,
        design.contentMaxW,
        design.contentMaxH
      ),
    [layout, designW, design]
  );

  const zoneBounds = useMemo(
    () => computeZoneBounds(spec.zones, geometry),
    [spec.zones, geometry]
  );

  return (
    <div
      className="rdfa-stage"
      ref={stageRef}
      style={
        {
          '--rdfa-scale': scale,
          '--rdfa-content-scale': contentScale,
          '--rdfa-maxw': `${maxW}px`,
          '--rdfa-content-maxw': `${contentMaxW}px`,
          '--rdfa-content-maxh': `${contentMaxH}px`,
          visibility: width === 0 || height === 0 ? 'hidden' : 'visible',
        } as CSSProperties
      }
    >
      {/* Zones layer: behind arrows and nodes */}
      {spec.zones?.map((zone, i) => {
        const key = zone.id ?? `__zone_${i}`;
        const b = zoneBounds[key];
        if (!b) return null;
        return (
          <div
            key={zone.id ?? i}
            className="rdfa-zone"
            style={
              {
                left: b.x,
                top: b.y,
                width: b.width,
                height: b.height,
                ...(zone.color ? { '--rdfa-zone-color': zone.color } : {}),
              } as CSSProperties
            }
          />
        );
      })}

      {/* Back layer: arrows */}
      <svg className="rdfa-arrow-svg">
        {/* Tree edges (parent→child), drawn from the live topology so they
            re-route as nodes glide during a rotation. Styling (line style, path,
            color, head, label) is resolved per edge from the `tree` block —
            keyed by child id, so it follows the node through rotations; tree
            edges default to a plain `straight` link with no head. Anchored
            bottom-of-parent → top-of-child (vertical axis). */}
        {isTree &&
          treeEdgesNow.map(([from, to]) => {
            const f = effectiveGeometry[from];
            const tg = effectiveGeometry[to];
            if (!f || !tg || !spec.tree) return null;
            const progress = treeEdgeProgress(to);
            if (progress <= 0) return null;
            const edge = treeEdgeStyle(spec.tree, to);
            return (
              <ArrowLine
                key={`tree|${from}|${to}`}
                from={f}
                to={tg}
                startPortOffset={0}
                endPortOffset={0}
                style={edge.style}
                path={edge.path}
                arrow_head={edge.arrow_head}
                text={edge.text}
                color={edge.color}
                highlighted={edge.highlighted}
                progress={progress}
                obstacles={allEffectiveNodes}
                axis="vertical"
                fromContour={contourFor(from)}
                toContour={contourFor(to)}
              />
            );
          })}
        {/* Baseline connections (in a circuit: orthogonal wires with no head) */}
        {spec.connections?.map((link, i) => {
          const f = effectiveGeometry[refNode(link.from)];
          const tg = effectiveGeometry[refNode(link.to)];
          if (!f || !tg) return null;
          const key = link.id ?? `${link.from}|${link.to}|${i}`;
          const ports = portsFor(key, link.from, link.to);
          return (
            <ArrowLine
              key={key}
              from={f}
              to={tg}
              startPortOffset={ports.start}
              endPortOffset={ports.end}
              style={link.style}
              path={link.path ?? (isCircuit ? 'step' : undefined)}
              arrow_head={link.arrow_head ?? (isCircuit ? 'none' : undefined)}
              text={link.text}
              progress={1}
              color={
                (link.id && connectionColor[link.id]) ||
                link.color ||
                netColorById.get(refNode(link.from))
              }
              highlighted={
                link.highlighted || (!!link.id && highlightedIds.has(link.id))
              }
              obstacles={allEffectiveNodes}
              axis={axisFor(link.from, link.to)}
              fromContour={contourFor(link.from)}
              toContour={contourFor(link.to)}
              route={circuitRoutes.get(key)}
              hops={circuitHops.get(key)}
              hopRadius={HOP_RADIUS * scale}
            />
          );
        })}
        {active.map((a) => {
          if (a.clip.kind !== 'arrow') return null;
          const clip = a.clip as ArrowClip;
          const f = effectiveGeometry[refNode(clip.fromId)];
          const tg = effectiveGeometry[refNode(clip.toId)];
          if (!f || !tg) return null;

          let lineKey = clip.id;
          if (!portOffsets[lineKey]) {
            const matchingLine = lineConnections.find(
              (c) =>
                c.from === refNode(clip.fromId) && c.to === refNode(clip.toId)
            );
            if (matchingLine) lineKey = matchingLine.key;
          }
          const ports = portsFor(lineKey, clip.fromId, clip.toId);
          return (
            <ArrowLine
              key={clip.id}
              from={f}
              to={tg}
              startPortOffset={ports.start}
              endPortOffset={ports.end}
              style={clip.style}
              path={clip.path}
              arrow_head={clip.arrow_head}
              text={clip.text}
              progress={a.progress}
              obstacles={allEffectiveNodes}
              axis={axisFor(clip.fromId, clip.toId)}
              fromContour={contourFor(clip.fromId)}
              toContour={contourFor(clip.toId)}
            />
          );
        })}
        {/* Electric current: charge dots riding the wire route(s) */}
        {active.map((a) => {
          if (a.clip.kind !== 'flow') return null;
          const clip = a.clip as FlowClip;
          const pathPts = buildFlowPath(
            clip.route,
            effectiveGeometry,
            contourFor,
            axisFor,
            allEffectiveNodes,
            routeByNodePair
          );
          if (pathPts.length < 2) return null;
          const lapMs = Math.max(1, clip.endMs - clip.animStartMs);
          const raw = (t - clip.animStartMs) / lapMs;
          const phase = clip.reverse ? -raw : raw;
          const r = 3.4 * scale;
          const dots: ReactNode[] = [];
          for (let j = 0; j < clip.count; j++) {
            let u = phase + j / clip.count;
            u = clip.loop ? ((u % 1) + 1) % 1 : clamp01(u);
            const p = pointAtArc(pathPts, u);
            dots.push(
              <circle
                key={`${clip.id}|${j}`}
                className="rdfa-flow-charge"
                cx={p.x}
                cy={p.y}
                r={r}
                style={
                  clip.color
                    ? ({ '--rdfa-flow': clip.color } as CSSProperties)
                    : undefined
                }
              />
            );
          }
          return <g key={clip.id}>{dots}</g>;
        })}
      </svg>

      {/* Static nodes */}
      {nodes.map((o) => {
        const placement = placements[o.id];
        if (!placement) return null;
        const nodeOpacity = nodeVisibility[o.id] ?? 1;
        if (nodeOpacity <= 0) return null;
        return (
          <StaticNode
            key={o.id}
            object={o}
            placement={placement}
            content={contentByNode[o.id]?.content ?? null}
            contentOpacity={contentByNode[o.id]?.opacity ?? 1}
            loading={loadingNodes.has(o.id)}
            highlighted={highlightedIds.has(o.id)}
            highlight={highlight}
            opacity={nodeOpacity < 1 ? nodeOpacity : undefined}
            rotation={nodeRotation[o.id]}
            labelSide={labelSideById.get(o.id)}
            closed={nodeClosed[o.id]}
            colorOverride={
              recoloredNodes.has(o.id) ? nodeColor[o.id] : undefined
            }
            iconOverride={nodeIcon[o.id]}
            reveal={revealByNode[o.id]}
            contentLimit={
              contentLimits[o.id]
                ? {
                    maxW: contentLimits[o.id].maxW * k,
                    maxH: contentLimits[o.id].maxH * k,
                  }
                : undefined
            }
            codeFontScale={codeFontScale}
            onCodeFit={handleCodeFit}
          />
        );
      })}

      {/* Zone labels: above nodes, below animated packets */}
      {spec.zones?.map((zone, i) => {
        if (!zone.label) return null;
        const key = zone.id ?? `__zone_${i}`;
        const b = zoneBounds[key];
        if (!b) return null;
        return (
          <span
            key={`zonelabel-${zone.id ?? i}`}
            className="rdfa-zone-label"
            style={
              {
                left: b.x + 12,
                top: b.y + 8,
                ...(zone.color ? { '--rdfa-zone-color': zone.color } : {}),
              } as CSSProperties
            }
          >
            {richText(zone.label)}
          </span>
        );
      })}

      {/* Front layer: packets + comments */}
      <div className="rdfa-overlay">
        {active.map((a) => {
          if (a.clip.kind !== 'move') return null;
          const clip = a.clip as MoveClip;
          const f = effectiveGeometry[refNode(clip.fromId)];
          const tg = effectiveGeometry[refNode(clip.toId)];
          const obj = dynamicById[clip.objectId];
          if (!f || !tg || !obj) return null;
          let moveKey = clip.id;
          if (!portOffsets[moveKey]) {
            const matchingLine = lineConnections.find(
              (c) =>
                c.from === refNode(clip.fromId) && c.to === refNode(clip.toId)
            );
            if (matchingLine) moveKey = matchingLine.key;
          }
          const movePorts = portsFor(moveKey, clip.fromId, clip.toId);
          const conn = connection(
            f,
            tg,
            allEffectiveNodes,
            movePorts.start,
            movePorts.end,
            undefined,
            axisFor(clip.fromId, clip.toId),
            contourFor(clip.fromId),
            contourFor(clip.toId)
          );
          const pt = pathTip(conn, easeInOutCubic(a.progress));
          const opacity = clipOpacity(clip, t);
          return (
            <Packet
              key={clip.id}
              object={obj}
              x={pt.x}
              y={pt.y}
              opacity={opacity}
              scale={0.8 + 0.2 * opacity}
              highlight={highlight}
            />
          );
        })}
        {active.map((a) => {
          if (a.clip.kind !== 'comment') return null;
          const clip = a.clip as CommentClip;
          const n = clip.nextToId
            ? effectiveGeometry[clip.nextToId]
            : undefined;
          // nextToId provided but node not found (bad ID) → ignored
          if (clip.nextToId && !n) return null;
          return (
            <CommentBubble
              key={clip.id}
              node={n}
              text={clip.text}
              opacity={a.progress}
              stageW={width}
              stageH={height}
            />
          );
        })}
      </div>

      {debug ? (
        <DebugOverlay timeline={timeline} t={t} activeCount={active.length} />
      ) : null}
    </div>
  );
}
