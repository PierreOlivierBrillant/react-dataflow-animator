import type { DataFlowSpec, ObjectContent, Packet } from '../types';
import { compile } from '../engine/compiler';
import {
  clamp,
  easeInOutCubic,
  evaluate,
  type ArrowClip,
  type CommentClip,
  type FlowClip,
  type MoveClip,
  type SetContentClip,
} from '../engine/timeline';
import { computeLayout, type LayoutMap } from '../engine/layout';
import {
  collectArrowConnections,
  computePortOffsets,
} from '../engine/portOffsets';
import {
  connection,
  pathTip,
  pointAtArc,
  type GeometryMap,
  type NodeGeom,
} from '../engine/geometry';
import { refNode } from '../engine/pins';
import { highlightCode } from '../highlight/highlight';
import { clipOpacity, contentCrossfade } from '../render/clipOpacity';
import { h, s, setStyle } from './el';
import { buildArrowElement } from './arrowElement';
import { appendCommentElement } from './commentElement';
import {
  applyCodeFontScale,
  measureCodeFit,
  type CodeFitTarget,
} from './contentElement';
import { buildPacketElement } from './packetElement';
import { netColorMap } from './netColors';
import { HOP_RADIUS, lerp } from './stageConstants';
import {
  buildZoneLabel,
  buildZoneRect,
  computeZoneBounds,
  zoneKey,
} from './zones';
import {
  buildFlowPath,
  connectionKey,
  createWireContext,
  labelSideMap,
  routeCircuit,
  routesByNodePair,
} from './wireModel';
import {
  createGeometryTracker,
  INITIAL_METRICS,
  sameMetrics,
  type StageMetrics,
} from './geometryTracker';
import { settle } from './settle';
import { buildStageModel, type StageModel } from './stageModel';
import { autoRotationMap, computeNodeStateAtT } from './nodeStateAtT';
import {
  applyContentLimit,
  applyNodePlacement,
  buildNodeElement,
} from './nodeElement';

/** Handle returned by {@link mountVanillaStage}. */
export interface VanillaStageHandle {
  /** Detaches the rendered content and releases any resources it holds. */
  destroy(): void;
  /**
   * Measurements the convergence loop performed, and whether it ended on the
   * equality bailout rather than on its budget. Diagnostic only — see
   * `settle.ts` for why the budget is a faithfulness parameter.
   */
  readonly passes: number;
  readonly converged: boolean;
}

/**
 * The measurement budget React spends on a diagram whose nodes never move on
 * their own: one synchronous pass plus three across `requestAnimationFrame`.
 * See `settle.ts`.
 */
const BASE_PASSES = 4;

/**
 * Extra measurements granted to a circuit. Each change of the resolved pin
 * nudge costs React one `forceRemeasure`, and the letterbox effect can add
 * another; the nudge is a pure function of the settled height, so it reaches a
 * fixed point rather than oscillating. No `RISK_DEMOS` entry is a circuit, so
 * this allowance is validated at step 2.5 — the `converged` flag is what says
 * whether it was enough.
 */
const CIRCUIT_EXTRA_PASSES = 12;

/**
 * Smallest change in a code block's fit ratio worth re-rendering for — the
 * tolerance `Stage`'s `handleCodeFit` applies before it stores a new ratio.
 *
 * It is what TERMINATES the font-fit fixed point: shrinking the font changes the
 * box, which changes the ratio by an ever smaller amount. Without the deadband
 * the two would chase each other indefinitely.
 */
const CODE_FIT_EPSILON = 0.005;

/**
 * The convergence state. Geometry is not the whole picture: a `code` panel also
 * negotiates a COMMON font scale across every code block on the stage, and that
 * scale changes the panels' size — so it belongs in the same fixed point rather
 * than in a loop of its own.
 */
interface FrameMetrics extends StageMetrics {
  codeFontScale: number;
}

/** What the last convergence pass produced, reused to build the wire layer. */
interface SettledFrame {
  metrics: StageMetrics;
  layout: LayoutMap;
  autoRotation: Map<string, number>;
  labelSides: Map<string, 'left' | 'right'>;
  model: StageModel;
}

/**
 * Framework-agnostic DOM renderer: the vanilla-DOM equivalent of `Stage.tsx`,
 * producing the same `.rdfa-*` markup, styled by the same `dataflow.css`,
 * without any framework runtime.
 *
 * PHASE 2.4 SCOPE — every rendering layer at a frozen `t`: the static substrate
 * (zones, nodes, baseline connections), the dynamic clips (packets, progressive
 * arrows, flow charges) and now `set_content` panels and comment bubbles. The
 * compare ratchet is consequently EMPTY: the A/B grid agrees with the React
 * `Stage` to the pixel, so any non-zero cell is a regression.
 *
 * The layers split in two, and the split is structural rather than a matter of
 * taste. Overlays (arrows, packets, comments, zones) are absolutely positioned:
 * they read the settled geometry and cannot perturb it, so they are built ONCE
 * after the loop. A `set_content` panel is not an overlay — it lives inside its
 * node and makes it GROW — so it is built up front and the loop converges with
 * it in place.
 *
 * Playback (a moving `t`) arrives in step 2.5.
 */
export function mountVanillaStage(
  container: HTMLElement,
  spec: DataFlowSpec,
  t: number
): VanillaStageHandle {
  const { timeline } = compile(spec);
  const active = evaluate(timeline, t);

  const root = h('div', { class: 'rdfa-stage' });

  // The two overlay layers are created EMPTY, up front, at their React document
  // positions. `.rdfa-zone` elements all share z-index 0 and `.rdfa-node`
  // elements all share 3, so ties break on source order — the geometry-
  // dependent rebuild below fills them in without re-deciding the z-order.
  const arrowSvg = s('svg', { class: 'rdfa-arrow-svg' });
  const overlay = h('div', { class: 'rdfa-overlay' });
  root.appendChild(arrowSvg);
  root.appendChild(overlay);

  // `mountVanillaStage` receives neither a timeline nor a highlighter, so both
  // are derived here exactly as the React caller derives them. Both are
  // deterministic, so the two panels agree.
  const highlight = highlightCode;
  // `Stage`'s own default, and what the A/B harness passes explicitly.
  const density = 'comfortable' as const;

  // ─── Build the node layer once ────────────────────────────────────────────
  // The node SET is fixed: visibility comes from clips, not from measurement,
  // and `computePlacements` already returns the base layout while the geometry
  // is still empty. So only `left`/`top` are rewritten per pass, which also
  // keeps the ResizeObserver registrations stable.
  const initialLayout = computeLayout(spec, { aspect: INITIAL_METRICS.aspect });
  const initialAutoRotation = autoRotationMap(initialLayout);
  const initialLabelSides = labelSideMap(
    spec,
    initialLayout,
    initialAutoRotation
  );
  const initialModel = buildStageModel({
    spec,
    layout: initialLayout,
    metrics: INITIAL_METRICS,
    density,
    labelSides: initialLabelSides,
  });

  const state = computeNodeStateAtT(spec, active, initialAutoRotation);

  // ─── Effective content per node ───────────────────────────────────────────
  // A node's own `content` shows at full opacity; an active `set_content`
  // overrides it and crossfades. `contentCrossfade` is EASED and drives both the
  // opacity and the icon→panel geometry lerp below — easing them together is
  // what removes the mechanical feel of a linear morph, so they must stay the
  // same number.
  const contentByNode: Record<
    string,
    { content: ObjectContent; opacity: number }
  > = {};
  for (const node of spec.nodes) {
    if (node.content)
      contentByNode[node.id] = { content: node.content, opacity: 1 };
  }
  for (const a of active) {
    if (a.clip.kind !== 'set_content') continue;
    const clip = a.clip as SetContentClip;
    contentByNode[clip.objectId] = {
      content: clip.content,
      opacity: contentCrossfade(clip, t),
    };
  }
  // Revealed fraction: the top-down `clip-path` wipe. Deliberately DECOUPLED
  // from measurement (no geometry input), so it is correct even at a frozen `t`.
  const revealByNode: Record<string, number> = {};
  for (const nodeId in contentByNode) {
    const op = contentByNode[nodeId].opacity;
    if (op < 1) revealByNode[nodeId] = op;
  }

  // Shared by the port-offset computation and the `move`/`arrow` clip key
  // fallback below — one collection, as in `Stage`.
  const lineConnections = collectArrowConnections(spec);
  const packetById = new Map<string, Packet>(
    spec.packets.map((p) => [p.id, p])
  );

  const nodeEls = new Map<string, HTMLElement>();
  const contentNodeIds: string[] = [];
  const codeFits = new Map<string, CodeFitTarget>();
  const zoneEls: HTMLElement[] = [];
  for (const node of spec.nodes) {
    const placement = initialModel.placements[node.id];
    if (!placement) continue;
    const opacity = state.visibility[node.id] ?? 1;
    // A fully-hidden node is removed from the DOM entirely, as in React.
    if (opacity <= 0) continue;

    const content = contentByNode[node.id];
    const { el, codeFit } = buildNodeElement(node, {
      placement,
      highlight,
      content: content?.content,
      contentOpacity: content?.opacity,
      reveal: revealByNode[node.id],
      contentLimit: content ? initialModel.contentLimits[node.id] : undefined,
      iconOverride: state.icon[node.id],
      closed: state.closed[node.id],
      loading: state.loading.has(node.id),
      highlighted: state.highlighted.has(node.id),
      opacity: opacity < 1 ? opacity : undefined,
      rotation: state.rotation[node.id],
      colorOverride: state.recolored.has(node.id)
        ? state.color[node.id]
        : undefined,
    });
    nodeEls.set(node.id, el);
    if (content) contentNodeIds.push(node.id);
    if (codeFit) codeFits.set(node.id, codeFit);
    // BEFORE the overlay: React's order is zones → arrows → nodes → zone
    // labels → overlay, and `appendChild` here would put every node behind the
    // front layer instead.
    root.insertBefore(el, overlay);
  }

  setStyle(root, initialModel.stageVars);
  container.appendChild(root);

  // ─── Converge ─────────────────────────────────────────────────────────────
  const tracker = createGeometryTracker(root);

  // Seeded with render#1's state, so the wire layer is buildable even if the
  // very first measurement matches the seeds and `apply` never runs.
  let settled: SettledFrame = {
    metrics: INITIAL_METRICS,
    layout: initialLayout,
    autoRotation: initialAutoRotation,
    labelSides: initialLabelSides,
    model: initialModel,
  };

  // Pre-panel ("icon") geometry of nodes driven by an active `set_content`,
  // captured on the FIRST pass that produced a geometry for them and never
  // overwritten afterwards — including across ResizeObserver-driven re-runs,
  // where React keeps its own captured state too. It anchors the icon→panel
  // morph below.
  const iconGeomByNode: Record<string, NodeGeom> = {};
  const activeContentNodeIds = new Set<string>();
  for (const a of active) {
    if (a.clip.kind === 'set_content')
      activeContentNodeIds.add((a.clip as SetContentClip).objectId);
  }

  // Per-block fit ratios, gated by the same deadband `handleCodeFit` applies.
  const codeRatios: Record<string, number> = {};

  /**
   * Re-measures every code block and returns the COMMON scale: the minimum
   * across all of them, so no block overflows and — more visibly — every block
   * on the stage renders at exactly the same size.
   *
   * `Math.min(1, ...[])` is 1, which is also React's value before any block has
   * reported, so an all-text stage costs nothing.
   */
  const measureCodeFontScale = (): number => {
    for (const [id, target] of codeFits) {
      const ratio = measureCodeFit(target);
      if (Math.abs((codeRatios[id] ?? 1) - ratio) >= CODE_FIT_EPSILON)
        codeRatios[id] = ratio;
    }
    return Math.min(1, ...Object.values(codeRatios));
  };

  const applyMetrics = (metrics: FrameMetrics): void => {
    // `computeLayout` depends on the measured aspect, so the layout is part of
    // what each pass recomputes — not just the placements derived from it.
    const layout = computeLayout(spec, { aspect: metrics.aspect });
    const autoRotation = autoRotationMap(layout);
    const labelSides = labelSideMap(spec, layout, autoRotation);
    const model = buildStageModel({
      spec,
      layout,
      metrics,
      density,
      labelSides,
    });
    setStyle(root, model.stageVars);
    for (const [id, el] of nodeEls) {
      const placement = model.placements[id];
      if (placement) applyNodePlacement(el, placement);
    }
    // Ceilings scale with the player, so they are rewritten every pass.
    for (const id of contentNodeIds) {
      const el = nodeEls.get(id);
      const limit = model.contentLimits[id];
      if (el && limit) applyContentLimit(el, limit);
    }
    for (const target of codeFits.values())
      applyCodeFontScale(target, metrics.codeFontScale);
    // Captured from the geometry this pass MEASURED, i.e. the first one in which
    // the node existed — matching the render at which React's layout effect
    // first sees a non-empty `geometry`.
    for (const id of activeContentNodeIds) {
      if (!iconGeomByNode[id] && metrics.geometry[id])
        iconGeomByNode[id] = metrics.geometry[id];
    }
    settled = { metrics, layout, autoRotation, labelSides, model };
  };

  const maxPasses =
    BASE_PASSES + (initialModel.frameAspect ? CIRCUIT_EXTRA_PASSES : 0);

  const initialFrame: FrameMetrics = { ...INITIAL_METRICS, codeFontScale: 1 };

  const run = (): { passes: number; converged: boolean } =>
    settle<FrameMetrics>({
      initial: initialFrame,
      measure: (previous) => {
        // Order is free: `measureCodeFit` restores the inline font before
        // returning, so the geometry read sees exactly the DOM the pass
        // started with either way.
        const codeFontScale = measureCodeFontScale();
        return { ...tracker.measure(previous), codeFontScale };
      },
      same: (a, b) => a.codeFontScale === b.codeFontScale && sameMetrics(a, b),
      apply: applyMetrics,
      maxPasses,
    });

  /**
   * Builds the layers that DEPEND on settled geometry but cannot influence it.
   *
   * All of them live in absolutely-positioned layers (`.rdfa-arrow-svg` and
   * `.rdfa-overlay` are `inset: 0`, `.rdfa-zone` is positioned), so they cannot
   * change what `measure()` reads about the nodes. Building them once, after
   * the loop, is therefore equivalent to rebuilding them every pass — and React
   * itself renders `null` for the zones on its first pass, before any geometry
   * exists.
   */
  const buildGeometryDependentLayers = (): void => {
    arrowSvg.replaceChildren();
    overlay.replaceChildren();
    for (const el of zoneEls) el.remove();
    zoneEls.length = 0;

    const { metrics, layout, autoRotation, labelSides, model } = settled;
    const { geometry } = metrics;

    // ─── Icon → panel morph ─────────────────────────────────────────────────
    // Mid-crossfade, a node is neither its icon nor its full panel. Everything
    // that ATTACHES to a node — wires, arrows, packets, comment tails — reads
    // this interpolated geometry so it tracks the box actually on screen. The
    // factor is `contentCrossfade`, the same eased number driving the opacity.
    //
    // Zones and node PLACEMENTS keep reading the raw geometry, as in `Stage`.
    let effectiveGeometry: GeometryMap = geometry;
    let geometryOverridden = false;
    for (const a of active) {
      if (a.clip.kind !== 'set_content') continue;
      const nodeId = (a.clip as SetContentClip).objectId;
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
      // Tinted badge outset: resolves toward 0 as the (untinted) panel takes
      // over, so the attachment point never jumps.
      const bo = lerp(
        iconGeom.borderOutset ?? 0,
        currGeom.borderOutset ?? 0,
        p
      );
      effectiveGeometry[nodeId] = {
        id: currGeom.id,
        x: lerp(iconGeom.x, currGeom.x, p),
        y: lerp(iconGeom.y, currGeom.y, p),
        width: lerp(iconGeom.width, currGeom.width, p),
        height: lerp(iconGeom.height, currGeom.height, p),
        ...(lH > 0 ? { labelH: lH } : {}),
        ...(lW > 0 ? { labelW: lW } : {}),
        ...(bo > 0 ? { borderOutset: bo } : {}),
        // Same stage scale as the icon (arrow↔node gap at scale).
        ...(currGeom.scale != null ? { scale: currGeom.scale } : {}),
      };
    }

    // ─── Zones ──────────────────────────────────────────────────────────────
    const bounds = computeZoneBounds(spec.zones, geometry);
    (spec.zones ?? []).forEach((zone, i) => {
      const b = bounds[zoneKey(zone, i)];
      if (!b) return;
      const rect = buildZoneRect(zone, b);
      zoneEls.push(rect);
      // Behind the arrows and the nodes.
      root.insertBefore(rect, arrowSvg);
      if (zone.label) {
        const label = buildZoneLabel(zone, b);
        zoneEls.push(label);
        // Above the nodes, below the animated packets.
        root.insertBefore(label, overlay);
      }
    });

    // ─── Connections ────────────────────────────────────────────────────────
    const portOffsets = computePortOffsets(
      lineConnections,
      layout,
      model.routeAspect,
      spec.direction ?? 'left-to-right',
      new Set(
        spec.nodes.filter((n) => n.merge_edges === false).map((n) => n.id)
      )
    );
    const ctx = createWireContext(
      spec,
      layout,
      model.routeAspect,
      portOffsets,
      autoRotation
    );
    const circuit = routeCircuit(spec, geometry, ctx, labelSides, model.k);
    const isCircuit = (spec.direction ?? 'left-to-right') === 'circuit';
    const netColorById = netColorMap(spec);
    // Identity when nothing is mid-crossfade — `effectiveGeometry` is then the
    // same object as `geometry`.
    const obstacles = Object.values(effectiveGeometry);

    (spec.connections ?? []).forEach((link, i) => {
      const f = effectiveGeometry[refNode(link.from)];
      const tg = effectiveGeometry[refNode(link.to)];
      if (!f || !tg) return;
      const key = connectionKey(link, i);
      const ports = ctx.portsFor(key, link.from, link.to);
      arrowSvg.appendChild(
        buildArrowElement({
          from: f,
          to: tg,
          startPortOffset: ports.start,
          endPortOffset: ports.end,
          style: link.style,
          // In a circuit, connections are orthogonal wires with no head.
          path: link.path ?? (isCircuit ? 'step' : undefined),
          arrow_head: link.arrow_head ?? (isCircuit ? 'none' : undefined),
          text: link.text,
          progress: 1,
          color:
            (link.id && state.connectionColor[link.id]) ||
            link.color ||
            netColorById.get(refNode(link.from)),
          highlighted:
            link.highlighted || (!!link.id && state.highlighted.has(link.id)),
          obstacles,
          axis: ctx.axisFor(link.from, link.to),
          fromContour: ctx.contourFor(link.from),
          toContour: ctx.contourFor(link.to),
          route: circuit.routes.get(key),
          hops: circuit.hops.get(key),
          hopRadius: HOP_RADIUS * model.scale,
        })
      );
    });

    // ─── Arrow clips ────────────────────────────────────────────────────────
    // Progressive arrows drawn by an `arrow` action — after the baseline
    // connections, matching React's document order inside the SVG.
    for (const a of active) {
      if (a.clip.kind !== 'arrow') continue;
      const clip = a.clip as ArrowClip;
      const f = effectiveGeometry[refNode(clip.fromId)];
      const tg = effectiveGeometry[refNode(clip.toId)];
      if (!f || !tg) continue;
      // An arrow between two connected nodes shares the connection's port
      // spread, so the animated line lands exactly on the static one.
      let lineKey = clip.id;
      if (!portOffsets[lineKey]) {
        const matchingLine = lineConnections.find(
          (c) => c.from === refNode(clip.fromId) && c.to === refNode(clip.toId)
        );
        if (matchingLine) lineKey = matchingLine.key;
      }
      const ports = ctx.portsFor(lineKey, clip.fromId, clip.toId);
      arrowSvg.appendChild(
        buildArrowElement({
          from: f,
          to: tg,
          startPortOffset: ports.start,
          endPortOffset: ports.end,
          style: clip.style,
          path: clip.path,
          arrow_head: clip.arrow_head,
          text: clip.text,
          progress: a.progress,
          obstacles,
          axis: ctx.axisFor(clip.fromId, clip.toId),
          fromContour: ctx.contourFor(clip.fromId),
          toContour: ctx.contourFor(clip.toId),
        })
      );
    }

    // ─── Flow charges ───────────────────────────────────────────────────────
    // Electric current: charge dots riding the wire route(s).
    const routeByNodePair = routesByNodePair(spec, circuit.routes);
    for (const a of active) {
      if (a.clip.kind !== 'flow') continue;
      const clip = a.clip as FlowClip;
      const pathPts = buildFlowPath(
        clip.route,
        effectiveGeometry,
        ctx.contourFor,
        ctx.axisFor,
        obstacles,
        routeByNodePair
      );
      if (pathPts.length < 2) continue;
      const lapMs = Math.max(1, clip.endMs - clip.animStartMs);
      const raw = (t - clip.animStartMs) / lapMs;
      const phase = clip.reverse ? -raw : raw;
      const r = 3.4 * model.scale;
      const g = s('g');
      for (let j = 0; j < clip.count; j++) {
        let u = phase + j / clip.count;
        u = clip.loop ? ((u % 1) + 1) % 1 : clamp(u, 0, 1);
        const p = pointAtArc(pathPts, u);
        const dot = s('circle', {
          class: 'rdfa-flow-charge',
          cx: String(p.x),
          cy: String(p.y),
          r: String(r),
        });
        if (clip.color) setStyle(dot, { '--rdfa-flow': clip.color });
        g.appendChild(dot);
      }
      arrowSvg.appendChild(g);
    }

    // ─── Packets (move clips) ───────────────────────────────────────────────
    // Front layer: a packet rides the SAME `connection()` path an arrow
    // between the two nodes would draw, at the eased progress of its clip —
    // the engine's `evaluate` already resolved which clips are live at `t`.
    for (const a of active) {
      if (a.clip.kind !== 'move') continue;
      const clip = a.clip as MoveClip;
      const f = effectiveGeometry[refNode(clip.fromId)];
      const tg = effectiveGeometry[refNode(clip.toId)];
      const obj = packetById.get(clip.objectId);
      if (!f || !tg || !obj) continue;
      // Same key fallback as the arrow clips: a move along an existing
      // connection adopts its port spread.
      let moveKey = clip.id;
      if (!portOffsets[moveKey]) {
        const matchingLine = lineConnections.find(
          (c) => c.from === refNode(clip.fromId) && c.to === refNode(clip.toId)
        );
        if (matchingLine) moveKey = matchingLine.key;
      }
      const movePorts = ctx.portsFor(moveKey, clip.fromId, clip.toId);
      const conn = connection(
        f,
        tg,
        obstacles,
        movePorts.start,
        movePorts.end,
        undefined,
        ctx.axisFor(clip.fromId, clip.toId),
        ctx.contourFor(clip.fromId),
        ctx.contourFor(clip.toId)
      );
      const pt = pathTip(conn, easeInOutCubic(a.progress));
      const opacity = clipOpacity(clip, t);
      overlay.appendChild(
        buildPacketElement(obj, {
          x: pt.x,
          y: pt.y,
          opacity,
          scale: 0.8 + 0.2 * opacity,
          highlight,
        })
      );
    }

    // ─── Comment bubbles ────────────────────────────────────────────────────
    // Same front layer as the packets, AFTER them — `Stage` emits the two lists
    // in this order and `.rdfa-comment` (z-index 6) has no z-index of its own to
    // fall back on, so document order is what decides overlap.
    for (const a of active) {
      if (a.clip.kind !== 'comment') continue;
      const clip = a.clip as CommentClip;
      const anchor = clip.nextToId
        ? effectiveGeometry[clip.nextToId]
        : undefined;
      // `nextToId` given but unknown (bad ID) → the bubble is dropped, rather
      // than silently promoted to an omniscient one.
      if (clip.nextToId && !anchor) continue;
      appendCommentElement(overlay, {
        node: anchor,
        text: clip.text,
        // Bubbles fade on the clip's own PROGRESS, not `clipOpacity`.
        opacity: a.progress,
        stageW: metrics.width,
        stageH: metrics.height,
      });
    }
  };

  let outcome = run();
  buildGeometryDependentLayers();

  // Fonts settle AFTER mount: when the webfont lands, every label reflows, the
  // node boxes resize, and React's own ResizeObserver re-converges panel A. A
  // panel B without one would stay frozen on the fallback-font geometry and
  // diff against a settled panel A — so this is required for agreement, not an
  // optimisation.
  tracker.observe(() => {
    outcome = run();
    buildGeometryDependentLayers();
  });

  return {
    destroy() {
      tracker.disconnect();
      root.remove();
    },
    get passes() {
      return outcome.passes;
    },
    get converged() {
      return outcome.converged;
    },
  };
}
