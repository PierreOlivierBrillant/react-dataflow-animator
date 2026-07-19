import type { DataFlowSpec, Packet } from '../types';
import { compile } from '../engine/compiler';
import {
  clamp,
  easeInOutCubic,
  evaluate,
  type ArrowClip,
  type FlowClip,
  type MoveClip,
} from '../engine/timeline';
import { computeLayout, type LayoutMap } from '../engine/layout';
import {
  collectArrowConnections,
  computePortOffsets,
} from '../engine/portOffsets';
import { connection, pathTip, pointAtArc } from '../engine/geometry';
import { refNode } from '../engine/pins';
import { highlightCode } from '../highlight/highlight';
import { clipOpacity } from '../render/clipOpacity';
import { h, s, setStyle } from './el';
import { buildArrowElement } from './arrowElement';
import { buildPacketElement } from './packetElement';
import { netColorMap } from './netColors';
import { HOP_RADIUS } from './stageConstants';
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
import { applyNodePlacement, buildNodeElement } from './nodeElement';

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
 * PHASE 2.3 SCOPE — the static substrate (zones, static nodes, baseline
 * connections; step 2.2) plus the DYNAMIC CLIPS at a frozen `t`: packets
 * (`move`), progressive arrows (`arrow`) and flow charges (`flow`). The two
 * remaining time-varying layers — `set_content` panels and comment bubbles —
 * arrive in step 2.4. Their absence is a real difference from the React
 * `Stage`, tracked cell by cell in the compare ratchet
 * (`compare-ratchet.json`) rather than hidden.
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

  // Shared by the port-offset computation and the `move`/`arrow` clip key
  // fallback below — one collection, as in `Stage`.
  const lineConnections = collectArrowConnections(spec);
  const packetById = new Map<string, Packet>(
    spec.packets.map((p) => [p.id, p])
  );

  const nodeEls = new Map<string, HTMLElement>();
  const zoneEls: HTMLElement[] = [];
  for (const node of spec.nodes) {
    const placement = initialModel.placements[node.id];
    if (!placement) continue;
    const opacity = state.visibility[node.id] ?? 1;
    // A fully-hidden node is removed from the DOM entirely, as in React.
    if (opacity <= 0) continue;

    const el = buildNodeElement(node, {
      placement,
      highlight,
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

  const applyMetrics = (metrics: StageMetrics): void => {
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
    settled = { metrics, layout, autoRotation, labelSides, model };
  };

  const maxPasses =
    BASE_PASSES + (initialModel.frameAspect ? CIRCUIT_EXTRA_PASSES : 0);

  const run = (): { passes: number; converged: boolean } =>
    settle<StageMetrics>({
      initial: INITIAL_METRICS,
      measure: (previous) => tracker.measure(previous),
      same: sameMetrics,
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
    const obstacles = Object.values(geometry);

    (spec.connections ?? []).forEach((link, i) => {
      const f = geometry[refNode(link.from)];
      const tg = geometry[refNode(link.to)];
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
      const f = geometry[refNode(clip.fromId)];
      const tg = geometry[refNode(clip.toId)];
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
        geometry,
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
      const f = geometry[refNode(clip.fromId)];
      const tg = geometry[refNode(clip.toId)];
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
