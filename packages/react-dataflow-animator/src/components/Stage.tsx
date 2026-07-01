import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react';
import type {
  DataFlowSpec,
  Packet as PacketSpec,
  Highlighter,
  ObjectContent,
  Zone,
} from '../types';
import {
  evaluate,
  easeInOutCubic,
  type ArrowClip,
  type CommentClip,
  type HighlightClip,
  type MoveClip,
  type ReflowClip,
  type RotateClip,
  type SetColorClip,
  type SetIconClip,
  type SetContentClip,
  type SetVisibleClip,
  type Timeline,
} from '../engine/timeline';
import { computeLayout, connectionAxis, treeEdges } from '../engine/layout';
import { computeScale, type Density } from '../engine/scale';
import { computePlacements, computeContentLimits } from '../engine/placements';
import {
  collectArrowConnections,
  computePortOffsets,
} from '../engine/portOffsets';
import {
  connection,
  pathTip,
  type GeometryMap,
  type NodeGeom,
} from '../engine/geometry';
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

/**
 * Height (px) of the reference "design space". Visual scale is
 * `designScale × (actual_height / DESIGN_H)`: everything is thus strictly
 * proportional to the player size (see `scale` calculation in Stage).
 */
const DESIGN_H = 495;

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

  // EXACT proportionality: we reason in a "design space" of
  // fixed height (DESIGN_H), with the same aspect ratio as the player. Everything (scale, panel
  // sizes, font ratios) is computed once there — thus constant for a given
  // aspect ratio — then multiplied by k = actual_height / DESIGN_H. Sizes are
  // therefore base × designScale × k (∝ k, thus proportional to the player size), positions
  // remain in %, and reduction ratios are identical at any size: a
  // small player is a strictly homogeneous reduction of a large one.
  const k = height > 0 ? height / DESIGN_H : 1;
  const designW = width > 0 && k > 0 ? width / k : 700;
  const design = useMemo(
    () => computeScale(layout, designW, DESIGN_H, density),
    [layout, designW, density]
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
  const portOffsets = useMemo(
    () =>
      computePortOffsets(
        lineConnections,
        layout,
        aspect,
        direction,
        fanOutNodes
      ),
    [lineConnections, layout, aspect, direction, fanOutNodes]
  );

  // Connection attachment axis, derived from layout FLOW (see connectionAxis):
  // the same decision as computePortOffsets, passed to connection/ArrowLine so that
  // attachment and fan-out distribution match. undefined if a node is missing
  // from layout (connection then falls back to dominant pixel axis).
  const axisFor = (fromId: string, toId: string) => {
    const p1 = layout[fromId];
    const p2 = layout[toId];
    return p1 && p2 ? connectionAxis(p1, p2, direction, aspect) : undefined;
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
    if (typeof node.rotation === 'number')
      nodeRotation[node.id] = node.rotation;
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
  const basePlacements = useMemo(
    () => computePlacements(layout, geometry, width, height),
    [layout, geometry, width, height]
  );
  const placements = isTree
    ? computePlacements(liveLayout, geometry, width, height)
    : basePlacements;

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
            re-route as nodes glide during a rotation. Plain links, no head;
            anchored bottom-of-parent → top-of-child (vertical axis). */}
        {isTree &&
          treeEdgesNow.map(([from, to]) => {
            const f = effectiveGeometry[from];
            const tg = effectiveGeometry[to];
            if (!f || !tg) return null;
            const progress = treeEdgeProgress(to);
            if (progress <= 0) return null;
            return (
              <ArrowLine
                key={`tree|${from}|${to}`}
                from={f}
                to={tg}
                startPortOffset={0}
                endPortOffset={0}
                style="solid"
                arrow_head="none"
                progress={progress}
                obstacles={allEffectiveNodes}
                axis="vertical"
              />
            );
          })}
        {/* Baseline connections */}
        {spec.connections?.map((link, i) => {
          const f = effectiveGeometry[link.from];
          const tg = effectiveGeometry[link.to];
          if (!f || !tg) return null;
          const key = link.id ?? `${link.from}|${link.to}|${i}`;
          const ports = portOffsets[key] ?? { start: 0, end: 0 };
          return (
            <ArrowLine
              key={key}
              from={f}
              to={tg}
              startPortOffset={ports.start}
              endPortOffset={ports.end}
              style={link.style}
              path={link.path}
              arrow_head={link.arrow_head}
              text={link.text}
              progress={1}
              color={(link.id && connectionColor[link.id]) || link.color}
              highlighted={
                link.highlighted || (!!link.id && highlightedIds.has(link.id))
              }
              obstacles={allEffectiveNodes}
              axis={axisFor(link.from, link.to)}
            />
          );
        })}
        {active.map((a) => {
          if (a.clip.kind !== 'arrow') return null;
          const clip = a.clip as ArrowClip;
          const f = effectiveGeometry[clip.fromId];
          const tg = effectiveGeometry[clip.toId];
          if (!f || !tg) return null;

          let lineKey = clip.id;
          if (!portOffsets[lineKey]) {
            const matchingLine = lineConnections.find(
              (c) => c.from === clip.fromId && c.to === clip.toId
            );
            if (matchingLine) lineKey = matchingLine.key;
          }
          const ports = portOffsets[lineKey] ?? { start: 0, end: 0 };
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
            />
          );
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
            {zone.label}
          </span>
        );
      })}

      {/* Front layer: packets + comments */}
      <div className="rdfa-overlay">
        {active.map((a) => {
          if (a.clip.kind !== 'move') return null;
          const clip = a.clip as MoveClip;
          const f = effectiveGeometry[clip.fromId];
          const tg = effectiveGeometry[clip.toId];
          const obj = dynamicById[clip.objectId];
          if (!f || !tg || !obj) return null;
          let moveKey = clip.id;
          if (!portOffsets[moveKey]) {
            const matchingLine = lineConnections.find(
              (c) => c.from === clip.fromId && c.to === clip.toId
            );
            if (matchingLine) moveKey = matchingLine.key;
          }
          const movePorts = portOffsets[moveKey] ?? { start: 0, end: 0 };
          const conn = connection(
            f,
            tg,
            allEffectiveNodes,
            movePorts.start,
            movePorts.end,
            undefined,
            axisFor(clip.fromId, clip.toId)
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
