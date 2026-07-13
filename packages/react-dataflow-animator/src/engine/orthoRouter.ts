import type { Point } from './geometry';

/**
 * Global orthogonal wire router for schematic (`direction: 'circuit'`) diagrams.
 *
 * By default every wire is drawn as strictly HORIZONTAL and VERTICAL segments
 * that:
 *   • never cross a component body (hard obstacle avoidance, all obstacles);
 *   • leave/enter a terminal PERPENDICULAR to its face (the pin normal);
 *   • keep a straight lead ({@link PIN_LEAD} px) out of / into a hard connector
 *     before the first / last turn, so a wire never bends flush against a pin;
 *   • take as few corners as possible (a turn is penalised);
 *   • do NOT run on top of a parallel wire — two wires may only meet where they
 *     cross at a right angle (lane separation).
 *
 * It routes on a Hanan-style grid (lines through every pin and every obstacle
 * edge, plus intermediate lane tracks in the gaps) with an A* per wire. Wires
 * are routed in order; each marks the grid edges it used, and later wires pay a
 * penalty to reuse a segment in the SAME orientation — so parallels spread onto
 * neighbouring tracks while perpendicular crossings stay free.
 *
 * A wire may opt into `diagonal` (octilinear, only 45 / 135 / 225 / 315°). It is
 * routed in two tiers, each collision-checked so a diagonal is never a
 * regression:
 *   1. a direct {@link octilinearElbow} — one bold 45° diagonal centred between
 *      the two pin stubs, so a feedback pair reads as a single crossing (the
 *      SR-latch X) instead of a tight dogleg;
 *   2. failing that, the orthogonal A* route with its corners mitered into 45°
 *      segments by {@link diagonalize} (long L-shapes and staircases collapse
 *      into clean diagonal runs; a short perpendicular stub is kept at each pin).
 * Obstacle avoidance and lane separation are still decided on the orthogonal
 * skeleton, so neither tier re-introduces a crossing.
 */

/** A rectangular component body, CENTRE-anchored (like `NodeGeom`). The optional
 *  label (measured text next to the node) is treated as an obstacle too — a wire
 *  must never be hidden behind a label. */
export interface RouterObstacle {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  labelW?: number;
  labelH?: number;
  /** Where the label sits relative to the body. Default `'bottom'`; a component
   *  wired top/bottom (vertical) moves its label to a side so it does not sit on
   *  the outgoing vertical wire. Kept in sync with the rendered CSS side class. */
  labelSide?: 'bottom' | 'left' | 'right';
}

/** One end of a wire: the exact terminal point and its outward unit normal.
 *  `hardNormal` = the wire MUST leave/enter along that normal (a component pin);
 *  a point pad (junction/signal) sets it false — any direction is allowed. */
interface RouterEndpoint {
  node: string;
  point: Point;
  normal: Point;
  hardNormal: boolean;
}

export interface RouterWire {
  key: string;
  from: RouterEndpoint;
  to: RouterEndpoint;
  /** Draw this wire octilinearly: its corners are mitered into exact 45°
   *  segments (see {@link diagonalize}). Default: false (strict orthogonal). */
  diagonal?: boolean;
}

export interface RouteOptions {
  /** Keep-out margin around each body, in DESIGN px (see {@link scale}). */
  clearance?: number;
  /** Extra lane tracks inserted between adjacent grid lines. */
  laneTracks?: number;
  /**
   * Player-px per design-px (`height / DESIGN_H`). The router's leads and costs
   * are FIXED design-px constants, but it is handed geometry measured at the
   * player's CURRENT size — so routing in raw pixels would pick different corners
   * at a thumbnail vs full-screen. We normalize all coordinates to design space
   * (÷ scale), route there, then scale the polylines back, so a diagram routes
   * IDENTICALLY at any size. Default 1 (already design space, e.g. tests).
   */
  scale?: number;
}

const TURN_COST = 12;
const LANE_COST = 40;
const EPS = 0.5;
/** A miter shorter than this is pointless — keep the sharp corner instead. */
const DIAG_MIN = 3;
/** Target straight run a wire keeps out of — and into — a hard connector (a
 *  component pin / cardinal face) before it turns / bifurcates, so every terminal
 *  gets a clean perpendicular lead instead of a bend flush against the face.
 *  THE tunable lead. Governs BOTH render paths: on an ORTHOGONAL wire it is a
 *  strong preference (see {@link LEAD_COST}) — where a body leaves no room the
 *  wire bends as late as it can rather than fail; on a `diagonal` wire it is the
 *  straight stub kept before the 45° miter/elbow begins. A soft POINT endpoint
 *  (a junction/pad) is a branch point and has no lead. */
const PIN_LEAD = 15;
/** Cost (per pixel of missing lead) charged when an ORTHOGONAL wire turns INSIDE
 *  a lead zone. Graduated, so A* pushes an unavoidable bend as far from the pin as
 *  the layout allows and always prefers the full lead where routes are otherwise
 *  equal. (A `diagonal` wire keeps its {@link PIN_LEAD} stub geometrically and so
 *  ignores this.) */
const LEAD_COST = 6;

/** Does the open segment a→b cross the OPEN rectangle interior? Liang–Barsky
 *  parametric clip; used to keep a 45° miter clear of a body/label/clearance
 *  ring (the miter cuts the INNER corner, i.e. toward the obstacle side). */
function segHitsRect(
  a: Point,
  b: Point,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let t0 = 0;
  let t1 = 1;
  // Each edge is a constraint `p·t <= q`; clip [t0,t1] against it.
  const clip = (p: number, q: number): boolean => {
    if (Math.abs(p) < 1e-9) return q >= 0; // parallel to this slab: inside iff q≥0
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
    return true;
  };
  if (!clip(-dx, a.x - x0)) return false;
  if (!clip(dx, x1 - a.x)) return false;
  if (!clip(-dy, a.y - y0)) return false;
  if (!clip(dy, y1 - a.y)) return false;
  return t1 - t0 > 1e-6; // a positive-length overlap lies inside the rect
}

/** Sorted, de-duplicated coordinates (values within EPS are merged). */
function uniqSorted(values: number[]): number[] {
  const s = [...values].sort((a, b) => a - b);
  const out: number[] = [];
  for (const v of s)
    if (!out.length || v - out[out.length - 1] > EPS) out.push(v);
  return out;
}

/** Inserts up to `maxPerGap` evenly spaced tracks between each pair of adjacent
 *  lines, so a wire can side-step onto a parallel channel instead of overlapping.
 *  Tracks are kept at least `minGap` apart (and from the boundaries): a tight gap
 *  gets FEWER (or no) tracks, so two parallel wires never end up a couple of
 *  pixels apart — they fall back to the wider channel boundaries instead. */
function withLaneTracks(
  lines: number[],
  minGap: number,
  maxPerGap: number
): number[] {
  if (maxPerGap <= 0) return lines;
  const out: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    out.push(lines[i]);
    if (i < lines.length - 1) {
      const a = lines[i];
      const span = lines[i + 1] - a;
      const n = Math.max(0, Math.min(maxPerGap, Math.floor(span / minGap) - 1));
      for (let k = 1; k <= n; k++) out.push(a + (span * k) / (n + 1));
    }
  }
  return uniqSorted(out);
}

/** Index of the coordinate equal to `v` (within EPS) — pins/edges are grid
 *  lines by construction, so this always resolves. */
function indexOf(lines: number[], v: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  let best = 0;
  let bestD = Infinity;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const d = Math.abs(lines[mid] - v);
    if (d < bestD) {
      bestD = d;
      best = mid;
    }
    if (lines[mid] < v) lo = mid + 1;
    else hi = mid - 1;
  }
  return best;
}

export function routeOrthogonal(
  obstacles: RouterObstacle[],
  wires: RouterWire[],
  opts: RouteOptions = {}
): Map<string, Point[]> {
  const clearance = opts.clearance ?? 6;
  const lanes = opts.laneTracks ?? 1;

  // Normalize the measured geometry to design space so every fixed-px lead/cost
  // below is scale-invariant; the routed polylines are scaled back before return
  // (see {@link RouteOptions.scale}). Normals are unit vectors — untouched.
  const scale = opts.scale && opts.scale > 0 ? opts.scale : 1;
  if (scale !== 1) {
    obstacles = obstacles.map((o) => ({
      ...o,
      x: o.x / scale,
      y: o.y / scale,
      w: o.w / scale,
      h: o.h / scale,
      ...(o.labelW != null ? { labelW: o.labelW / scale } : {}),
      ...(o.labelH != null ? { labelH: o.labelH / scale } : {}),
    }));
    const norm = (e: RouterEndpoint): RouterEndpoint => ({
      ...e,
      point: { x: e.point.x / scale, y: e.point.y / scale },
    });
    wires = wires.map((w) => ({ ...w, from: norm(w.from), to: norm(w.to) }));
  }

  // Net-aware fan-out. Wires that leave the SAME driver (`from.node`) belong to
  // one net (a signal pad or a gate output feeding several inputs). We give the
  // net a SINGLE source anchor — the mean of its members' anchors, all on the
  // driver's face — so it leaves from ONE point, and we route its wires
  // consecutively; combined with the per-net lane rule below (same-net edges are
  // free to reuse), later sinks ride the trunk the first one laid. The net thus
  // draws as one trunk that BRANCHES, not N parallel wires from N points.
  const byNet = new Map<string, RouterWire[]>();
  for (const w of wires) {
    const list = byNet.get(w.from.node);
    if (list) list.push(w);
    else byNet.set(w.from.node, [w]);
  }
  const ordered: RouterWire[] = [];
  for (const group of byNet.values()) {
    if (group.length < 2) {
      ordered.push(...group);
      continue;
    }
    const sx = group.reduce((s, w) => s + w.from.point.x, 0) / group.length;
    const sy = group.reduce((s, w) => s + w.from.point.y, 0) / group.length;
    for (const w of group)
      ordered.push({ ...w, from: { ...w.from, point: { x: sx, y: sy } } });
  }
  wires = ordered;

  // Rects per component. `hard` BODY = a real component: always an obstacle,
  // even for the wire it connects to (so a wire can't cut through a node to
  // reach a far-side pin); its clearance ring is skippable for own pins. A
  // node's LABEL (measured text below it) is a SOFT obstacle: it blocks OTHER
  // wires (a wire must not be hidden behind an unrelated label) but is skipped
  // for the node's OWN wires — a component's pin often sits right above its
  // label (a rotated resistor), so its own wire may pass; z-order keeps that
  // wire on top of the text.
  const LABEL_GAP = 6;
  const LABEL_CLEAR = 3;
  const rect = (
    id: string,
    hard: boolean,
    bx0: number,
    by0: number,
    bx1: number,
    by1: number,
    m: number
  ) => ({
    id,
    hard,
    bx0,
    by0,
    bx1,
    by1,
    x0: bx0 - m,
    y0: by0 - m,
    x1: bx1 + m,
    y1: by1 + m,
  });
  const rects = obstacles.flatMap((o) => {
    const body = rect(
      o.id,
      true,
      o.x - o.w / 2,
      o.y - o.h / 2,
      o.x + o.w / 2,
      o.y + o.h / 2,
      clearance
    );
    if (!o.labelH || o.labelH <= 0 || !o.labelW || o.labelW <= 0) return [body];
    // Label box, positioned on the SAME side the renderer draws it (single source
    // of truth: Stage decides the side, both this obstacle and the CSS follow).
    // `bottom` (default): centred under the body. `left`/`right`: vertically
    // centred just past the body face (a top/bottom-wired component).
    let lx0: number, ly0: number, lx1: number, ly1: number;
    if (o.labelSide === 'left') {
      lx1 = o.x - o.w / 2 - LABEL_GAP;
      lx0 = lx1 - o.labelW;
      ly0 = o.y - o.labelH / 2;
      ly1 = o.y + o.labelH / 2;
    } else if (o.labelSide === 'right') {
      lx0 = o.x + o.w / 2 + LABEL_GAP;
      lx1 = lx0 + o.labelW;
      ly0 = o.y - o.labelH / 2;
      ly1 = o.y + o.labelH / 2;
    } else {
      lx0 = o.x - o.labelW / 2;
      lx1 = o.x + o.labelW / 2;
      ly0 = o.y + o.h / 2 + LABEL_GAP;
      ly1 = ly0 + o.labelH;
    }
    return [
      body,
      // a label always blocks — wires contour AROUND it, never over it
      rect(o.id, true, lx0, ly0, lx1, ly1, LABEL_CLEAR),
    ];
  });

  // Grid lines: every pin coordinate and every keep-out edge, plus lane tracks.
  const xsBase: number[] = [];
  const ysBase: number[] = [];
  for (const r of rects) {
    xsBase.push(r.x0, r.x1);
    ysBase.push(r.y0, r.y1);
  }
  for (const w of wires) {
    xsBase.push(w.from.point.x, w.to.point.x);
    ysBase.push(w.from.point.y, w.to.point.y);
    // A grid line exactly at each hard connector's lead boundary, so a wire can
    // turn PRECISELY at PIN_LEAD instead of overshooting to the next Hanan line.
    for (const e of [w.from, w.to]) {
      if (!e.hardNormal) continue;
      const u = axisUnit(e.normal);
      if (u.x !== 0) xsBase.push(e.point.x + u.x * PIN_LEAD);
      else ysBase.push(e.point.y + u.y * PIN_LEAD);
    }
  }
  // Outer margin lines so a wire can detour AROUND the whole cluster, not only
  // between bodies (a long span past several components in a row).
  const MARGIN = 28;
  const spanX = uniqSorted(xsBase);
  const spanY = uniqSorted(ysBase);
  xsBase.push(spanX[0] - MARGIN, spanX[spanX.length - 1] + MARGIN);
  ysBase.push(spanY[0] - MARGIN, spanY[spanY.length - 1] + MARGIN);
  // Keep parallel wires visibly apart: lane tracks are spaced ≥ ~2× clearance.
  const laneGap = Math.max(11, clearance * 2);
  const xs = withLaneTracks(uniqSorted(xsBase), laneGap, lanes);
  const ys = withLaneTracks(uniqSorted(ysBase), laneGap, lanes);
  const nx = xs.length;
  const ny = ys.length;

  // An edge (tested at its midpoint) is blocked if it pierces a HARD body, or —
  // for rects that are NOT the wire's own endpoints — a soft label body or a
  // clearance ring. `bodySkip` lifts the HARD body of a node whose endpoint is a
  // POINT (a junction/pad that anchors at its CENTRE, so the wire must be able to
  // reach inside it) — a PIN endpoint anchors on the border, so its body still
  // blocks (a wire can't cut through to a far-side pin). STRICT interior, so
  // routing ON a boundary is allowed (a tight detour hugging a component).
  const inRect = (
    px: number,
    py: number,
    skip: Set<string>,
    bodySkip: Set<string>
  ): boolean => {
    for (const r of rects) {
      const inBody =
        px > r.bx0 + EPS &&
        px < r.bx1 - EPS &&
        py > r.by0 + EPS &&
        py < r.by1 - EPS;
      if (inBody && r.hard && !bodySkip.has(r.id)) return true;
      if (skip.has(r.id)) continue; // own node: its label / clearance don't block
      if (inBody) return true; // an unrelated label
      if (
        px > r.x0 + EPS &&
        px < r.x1 - EPS &&
        py > r.y0 + EPS &&
        py < r.y1 - EPS
      )
        return true;
    }
    return false;
  };

  // Segment version of `inRect`, for the diagonal miter pass: a straight a→b run
  // is clear iff it enters no HARD body (respecting `bodySkip`) and no unrelated
  // label / clearance ring (respecting `skip`). Same skip semantics as `inRect`.
  const segClear = (
    a: Point,
    b: Point,
    skip: Set<string>,
    bodySkip: Set<string>
  ): boolean => {
    for (const r of rects) {
      // STRICT interior (shrunk by EPS), like `inRect`: a run exactly on a
      // boundary is allowed (a tight detour hugging a component).
      const hitBody = segHitsRect(
        a,
        b,
        r.bx0 + EPS,
        r.by0 + EPS,
        r.bx1 - EPS,
        r.by1 - EPS
      );
      if (hitBody && r.hard && !bodySkip.has(r.id)) return false;
      if (skip.has(r.id)) continue; // own node: its label / clearance don't block
      if (hitBody) return false; // an unrelated label
      if (segHitsRect(a, b, r.x0 + EPS, r.y0 + EPS, r.x1 - EPS, r.y1 - EPS))
        return false;
    }
    return true;
  };

  // Shared lane usage across wires: for each segment (fixed line + span) the set
  // of NETS that run on it. Only a DIFFERENT net pays the lane penalty — wires of
  // the same net share their trunk for free (see the net-aware grouping above).
  const usage = new Map<string, Set<string>>();
  const edgeKey = (o: 'h' | 'v', fixed: number, a: number, b: number): string =>
    `${o}:${fixed}:${Math.min(a, b)}:${Math.max(a, b)}`;

  const results = new Map<string, Point[]>();

  for (const wire of wires) {
    const wireNet = wire.from.node;
    const skip = new Set<string>([wire.from.node, wire.to.node]);
    // A POINT endpoint anchors at the node CENTRE (inside its body), so that
    // body must not block THIS wire; a PIN endpoint is on the border, so its
    // body still blocks (no cutting through to a far-side pin).
    const bodySkip = new Set<string>();
    if (!wire.from.hardNormal) bodySkip.add(wire.from.node);
    if (!wire.to.hardNormal) bodySkip.add(wire.to.node);

    // Lead corridors: a hard connector's wire should run PIN_LEAD px straight
    // along its normal before the FIRST turn (and the last turn should stay
    // PIN_LEAD before the pin), so it leaves/enters a component face cleanly
    // instead of bending flush against it. Turning at a grid vertex lying ON such
    // a corridor, within PIN_LEAD of the pin, is charged {@link LEAD_COST} per
    // pixel of missing lead — a preference, not a ban, so a boxed-in pin still
    // routes (it just bends as late as it can). Soft POINT endpoints have none.
    const leadZones: { px: number; py: number; ux: number; uy: number }[] = [];
    for (const e of [wire.from, wire.to]) {
      if (!e.hardNormal) continue;
      const u = axisUnit(e.normal);
      leadZones.push({ px: e.point.x, py: e.point.y, ux: u.x, uy: u.y });
    }
    // Extra cost for turning AT (px, py): 0 outside every lead zone, else grows
    // linearly the closer the turn sits to the pin (max at the face).
    const leadPenalty = (px: number, py: number): number => {
      let worst = 0;
      for (const z of leadZones) {
        const along = (px - z.px) * z.ux + (py - z.py) * z.uy;
        const transverse = (px - z.px) * -z.uy + (py - z.py) * z.ux;
        if (Math.abs(transverse) < EPS && along > EPS && along < PIN_LEAD - EPS)
          worst = Math.max(worst, (PIN_LEAD - along) * LEAD_COST);
      }
      return worst;
    };

    // A diagonal wire first tries a direct octilinear elbow (a bold centred
    // diagonal). It only wins if collision-free; otherwise we fall through to the
    // orthogonal A* and miter its corners — so a diagonal is never a regression.
    if (wire.diagonal) {
      const elbow = octilinearElbow(
        wire.from,
        wire.to,
        (a, b) => segClear(a, b, skip, bodySkip),
        PIN_LEAD
      );
      if (elbow) {
        results.set(wire.key, elbow);
        continue;
      }
    }

    const si = indexOf(xs, wire.from.point.x);
    const sj = indexOf(ys, wire.from.point.y);
    const gi = indexOf(xs, wire.to.point.x);
    const gj = indexOf(ys, wire.to.point.y);

    // Direction the wire must leave the start / arrive at the goal (grid steps).
    const dir = (n: Point): [number, number] => {
      if (Math.abs(n.x) >= Math.abs(n.y)) return [n.x >= 0 ? 1 : -1, 0];
      return [0, n.y >= 0 ? 1 : -1];
    };
    // The wire LEAVES the source along its outward normal, and ARRIVES at the
    // target moving INTO it (i.e. against the target's outward normal).
    const startDir = wire.from.hardNormal ? dir(wire.from.normal) : null;
    const goalDir = wire.to.hardNormal
      ? dir({ x: -wire.to.normal.x, y: -wire.to.normal.y })
      : null;

    // A* over grid vertices. State = (i, j, incoming direction) so turns cost.
    const key = (i: number, j: number, di: number, dj: number): string =>
      `${i},${j},${di},${dj}`;
    const open: {
      i: number;
      j: number;
      di: number;
      dj: number;
      g: number;
      f: number;
    }[] = [];
    const gScore = new Map<string, number>();
    const came = new Map<string, string | null>();
    const h = (i: number, j: number): number =>
      Math.abs(xs[i] - xs[gi]) + Math.abs(ys[j] - ys[gj]);

    const startKey = key(si, sj, 0, 0);
    gScore.set(startKey, 0);
    came.set(startKey, null);
    open.push({ i: si, j: sj, di: 0, dj: 0, g: 0, f: h(si, sj) });

    const DIRS: [number, number][] = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    let goalState: string | null = null;

    while (open.length) {
      // Pop the lowest f (small grids → linear scan is fine).
      let bi = 0;
      for (let k = 1; k < open.length; k++) if (open[k].f < open[bi].f) bi = k;
      const cur = open.splice(bi, 1)[0];
      const ck = key(cur.i, cur.j, cur.di, cur.dj);
      if (cur.g > (gScore.get(ck) ?? Infinity)) continue;
      if (cur.i === gi && cur.j === gj) {
        if (!goalDir || (cur.di === goalDir[0] && cur.dj === goalDir[1])) {
          goalState = ck;
          break;
        }
      }
      for (const [ddi, ddj] of DIRS) {
        // First move must follow the pin normal.
        if (cur.di === 0 && cur.dj === 0 && startDir) {
          if (ddi !== startDir[0] || ddj !== startDir[1]) continue;
        }
        const ni = cur.i + ddi;
        const nj = cur.j + ddj;
        if (ni < 0 || ni >= nx || nj < 0 || nj >= ny) continue;
        // Reversing straight back is never useful.
        if (ddi === -cur.di && ddj === -cur.dj && (cur.di || cur.dj)) continue;
        // Edge blocked by an obstacle? Test its midpoint.
        const mx = (xs[cur.i] + xs[ni]) / 2;
        const my = (ys[cur.j] + ys[nj]) / 2;
        if (inRect(mx, my, skip, bodySkip)) continue;
        const len = Math.abs(xs[ni] - xs[cur.i]) + Math.abs(ys[nj] - ys[cur.j]);
        const turned = (cur.di || cur.dj) && (ddi !== cur.di || ddj !== cur.dj);
        // Keep a clean lead at each connector: turning inside a pin's lead zone
        // (the turn happens AT `cur`) is charged, so A* prefers the full lead and,
        // where boxed in, bends as late as it can.
        const leadCost = turned ? leadPenalty(xs[cur.i], ys[cur.j]) : 0;
        const orient: 'h' | 'v' = ddi !== 0 ? 'h' : 'v';
        const fixed = orient === 'h' ? nj : ni;
        const uk = edgeKey(
          orient,
          fixed,
          orient === 'h' ? cur.i : cur.j,
          orient === 'h' ? ni : nj
        );
        // Only wires of OTHER nets on this edge cost a lane; same-net trunk is free.
        const on = usage.get(uk);
        let lane = 0;
        if (on) for (const n of on) if (n !== wireNet) lane += LANE_COST;
        const ng = cur.g + len + (turned ? TURN_COST : 0) + lane + leadCost;
        const nk = key(ni, nj, ddi, ddj);
        if (ng < (gScore.get(nk) ?? Infinity)) {
          gScore.set(nk, ng);
          came.set(nk, ck);
          open.push({
            i: ni,
            j: nj,
            di: ddi,
            dj: ddj,
            g: ng,
            f: ng + h(ni, nj),
          });
        }
      }
    }

    // Reconstruct (fall back to a direct 2-corner L if unreachable).
    let poly: Point[];
    if (goalState) {
      const seq: [number, number][] = [];
      let k: string | null = goalState;
      while (k) {
        const [i, j] = k.split(',').map(Number);
        seq.push([i, j]);
        k = came.get(k) ?? null;
      }
      seq.reverse();
      poly = seq.map(([i, j]) => ({ x: xs[i], y: ys[j] }));
      // Mark used edges for lane separation of later wires.
      for (let m = 0; m < seq.length - 1; m++) {
        const [ai, aj] = seq[m];
        const [bi2, bj] = seq[m + 1];
        const orient: 'h' | 'v' = ai !== bi2 ? 'h' : 'v';
        const fixed = orient === 'h' ? aj : ai;
        const uk = edgeKey(
          orient,
          fixed,
          orient === 'h' ? ai : aj,
          orient === 'h' ? bi2 : bj
        );
        const set = usage.get(uk);
        if (set) set.add(wireNet);
        else usage.set(uk, new Set([wireNet]));
      }
    } else {
      // Unreachable on the grid: never draw a diagonal — fall back to a
      // 2-corner orthogonal L that leaves the source along its normal.
      const s = wire.from.point;
      const e = wire.to.point;
      const horizFirst =
        Math.abs(wire.from.normal.x) >= Math.abs(wire.from.normal.y);
      const corner = horizFirst ? { x: e.x, y: s.y } : { x: s.x, y: e.y };
      poly = [s, corner, e];
    }
    const simplified = simplify(poly);
    if (wire.diagonal) {
      // Keep a straight lead only at a hard pin (a POINT endpoint may turn at once).
      const stubStart = wire.from.hardNormal ? PIN_LEAD : 0;
      const stubEnd = wire.to.hardNormal ? PIN_LEAD : 0;
      results.set(
        wire.key,
        diagonalize(
          simplified,
          (a, b) => segClear(a, b, skip, bodySkip),
          stubStart,
          stubEnd
        )
      );
    } else {
      results.set(wire.key, simplified);
    }
  }

  // A routed wire must never cross itself: strip any loop the lead penalty may
  // have preferred over a flush turn in a tight pin-to-pin gap.
  for (const [k, pts] of results) results.set(k, deloop(pts));

  // Back to player space (the inverse of the design-space normalization above).
  if (scale !== 1)
    for (const [k, pts] of results)
      results.set(
        k,
        pts.map((p) => ({ x: p.x * scale, y: p.y * scale }))
      );

  return results;
}

/** Removes duplicate and collinear interior points, so the polyline is the
 *  minimal set of corners (no invisible mid-vertices). Collinearity is the
 *  GENERAL case (perpendicular distance from the a–c line), so it also fuses two
 *  aligned DIAGONAL segments into one — axis-aligned runs are just the special
 *  case where that distance is zero. */
export function simplify(points: Point[]): Point[] {
  const dedup: Point[] = [];
  for (const p of points) {
    const last = dedup[dedup.length - 1];
    if (!last || Math.abs(p.x - last.x) > EPS || Math.abs(p.y - last.y) > EPS)
      dedup.push(p);
  }
  if (dedup.length <= 2) return dedup;
  const out: Point[] = [dedup[0]];
  for (let i = 1; i < dedup.length - 1; i++) {
    const a = out[out.length - 1];
    const b = dedup[i];
    const c = dedup[i + 1];
    const acx = c.x - a.x;
    const acy = c.y - a.y;
    const cross = (b.x - a.x) * acy - (b.y - a.y) * acx;
    const lenAC = Math.hypot(acx, acy) || 1;
    const collinear = Math.abs(cross) / lenAC < EPS; // b's distance to line a–c
    if (!collinear) out.push(b);
  }
  out.push(dedup[dedup.length - 1]);
  return out;
}

/** Rewrites an orthogonal polyline into an OCTILINEAR one by mitering every
 *  interior corner into an exact 45° segment. The miter is symmetric (equal
 *  retreat on both legs → |Δx| = |Δy|), so the diagonal is always one of
 *  45 / 135 / 225 / 315°. Its length is MAXIMISED — up to half of a segment
 *  shared by two corners, or the whole segment minus a stub next to a terminal —
 *  so a run of corners (a staircase, or an L with equal legs) collapses into a
 *  single long diagonal, while already-straight wires are untouched. `clear(a, b)`
 *  guards each miter against the bodies/labels (the cut is on the obstacle side
 *  of a detour): on a collision the miter is halved a few times (still 45°) and,
 *  failing that, the sharp corner is kept. `stubStart` / `stubEnd` keep a
 *  perpendicular run next to a hard pin so the wire still leaves the face along
 *  its normal. */
function diagonalize(
  poly: Point[],
  clear: (a: Point, b: Point) => boolean,
  stubStart: number,
  stubEnd: number
): Point[] {
  if (poly.length < 3) return poly; // no interior corner to miter
  const n = poly.length - 1;
  const segLen = (i: number): number =>
    Math.hypot(poly[i + 1].x - poly[i].x, poly[i + 1].y - poly[i].y);
  const unit = (i: number, j: number): Point => {
    const dx = poly[j].x - poly[i].x;
    const dy = poly[j].y - poly[i].y;
    const d = Math.hypot(dx, dy) || 1;
    return { x: dx / d, y: dy / d };
  };
  const out: Point[] = [poly[0]];
  for (let k = 1; k < n; k++) {
    // A segment touching a terminal lends its whole length minus a stub; a
    // segment shared with the neighbouring corner is split down the middle, so
    // two adjacent miters never overlap.
    const inBudget =
      k - 1 === 0 ? Math.max(0, segLen(k - 1) - stubStart) : segLen(k - 1) / 2;
    const outBudget =
      k + 1 === n ? Math.max(0, segLen(k) - stubEnd) : segLen(k) / 2;
    const dirIn = unit(k - 1, k);
    const dirOut = unit(k, k + 1);
    let m = Math.min(inBudget, outBudget);
    let placed = false;
    while (m > DIAG_MIN) {
      const a = { x: poly[k].x - m * dirIn.x, y: poly[k].y - m * dirIn.y };
      const b = { x: poly[k].x + m * dirOut.x, y: poly[k].y + m * dirOut.y };
      if (clear(a, b)) {
        out.push(a, b);
        placed = true;
        break;
      }
      m /= 2;
    }
    if (!placed) out.push(poly[k]); // no room for a miter: keep the right angle
  }
  out.push(poly[n]);
  return simplify(out);
}

/** Proper interior intersection of segments a→b and c→d, or null. Endpoints and
 *  collinear overlaps are excluded (t/u strictly inside), so only a genuine
 *  crossing is reported. General (works for orthogonal AND 45° segments). */
function segCross(a: Point, b: Point, c: Point, d: Point): Point | null {
  const rx = b.x - a.x;
  const ry = b.y - a.y;
  const sx = d.x - c.x;
  const sy = d.y - c.y;
  const denom = rx * sy - ry * sx;
  if (Math.abs(denom) < 1e-9) return null; // parallel or collinear
  const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / denom;
  const u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / denom;
  const E = 1e-6;
  if (t > E && t < 1 - E && u > E && u < 1 - E)
    return { x: a.x + t * rx, y: a.y + t * ry };
  return null;
}

/** Removes self-crossings (loops) from a routed polyline: where two segments of
 *  the SAME wire cross, the sub-path between them is spliced out at the crossing
 *  point. Both retained sub-segments lie on originally clear segments, so this
 *  NEVER introduces a collision — it can only shorten the path. A routed wire
 *  must not cross itself; where two opposing pins sit closer than twice
 *  {@link PIN_LEAD}, the soft lead penalty can otherwise make a looping detour
 *  cheaper than a flush turn, and A* emits a knot. This enforces the invariant. */
export function deloop(pts: Point[]): Point[] {
  let path = pts;
  // Each splice removes ≥1 vertex, so the outer count is a safe termination bound.
  for (let guard = path.length; guard > 0; guard--) {
    let spliced = false;
    for (let i = 0; i < path.length - 1 && !spliced; i++) {
      // Prefer the FARTHEST crossing segment: it collapses the largest loop first.
      for (let j = path.length - 2; j > i + 1; j--) {
        const p = segCross(path[i], path[i + 1], path[j], path[j + 1]);
        if (p) {
          path = [...path.slice(0, i + 1), p, ...path.slice(j + 1)];
          spliced = true;
          break;
        }
      }
    }
    if (!spliced) break;
  }
  return simplify(path);
}

/** The dominant cardinal unit of a normal (snaps a pin normal to ±x / ±y). */
function axisUnit(n: Point): Point {
  return Math.abs(n.x) >= Math.abs(n.y)
    ? { x: n.x >= 0 ? 1 : -1, y: 0 }
    : { x: 0, y: n.y >= 0 ? 1 : -1 };
}

/** A direct OCTILINEAR connector between two terminals, used first for a
 *  `diagonal` wire so a feedback pair reads as one bold diagonal crossing the
 *  centre (the SR-latch X) rather than a tight orthogonal dogleg. Each pin is
 *  left/entered along its normal (a straight stub), then the two stub ends are
 *  joined by ONE 45° diagonal CENTRED on the dominant axis, flanked by two equal
 *  straight rails (`rail — diagonal — rail`). Returns `null` if any segment
 *  crosses a body/label, so the caller falls back to the orthogonal A* route —
 *  the diagonal is a bonus, never a regression. */
function octilinearElbow(
  from: RouterEndpoint,
  to: RouterEndpoint,
  clear: (a: Point, b: Point) => boolean,
  stub: number
): Point[] | null {
  const sDir = from.hardNormal ? axisUnit(from.normal) : null;
  const tDir = to.hardNormal ? axisUnit(to.normal) : null;
  const s0 = from.point;
  const t0 = to.point;
  // A hard pin gets a straight stub; a soft POINT endpoint is joined directly.
  const s = sDir ? { x: s0.x + sDir.x * stub, y: s0.y + sDir.y * stub } : s0;
  const t = tDir ? { x: t0.x + tDir.x * stub, y: t0.y + tDir.y * stub } : t0;
  const dx = t.x - s.x;
  const dy = t.y - s.y;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  const mid: Point[] = [];
  if (adx > 0.6 && ady > 0.6) {
    const d = Math.min(adx, ady); // the 45° diagonal covers `d` on both axes
    if (ady >= adx) {
      const half = (ady - d) / 2; // split the vertical remainder either side
      const y1 = s.y + sy * half;
      mid.push({ x: s.x, y: y1 }, { x: s.x + sx * d, y: y1 + sy * d });
    } else {
      const half = (adx - d) / 2; // split the horizontal remainder either side
      const x1 = s.x + sx * half;
      mid.push({ x: x1, y: s.y }, { x: x1 + sx * d, y: s.y + sy * d });
    }
  }
  const path = simplify([
    s0,
    ...(sDir ? [s] : []),
    ...mid,
    ...(tDir ? [t] : []),
    t0,
  ]);
  for (let i = 0; i < path.length - 1; i++)
    if (!clear(path[i], path[i + 1])) return null;
  return path;
}
