import type { Point } from './geometry';

/**
 * Global orthogonal wire router for schematic (`direction: 'circuit'`) diagrams.
 *
 * Every wire is drawn as strictly HORIZONTAL and VERTICAL segments — never a
 * diagonal — that:
 *   • never cross a component body (hard obstacle avoidance, all obstacles);
 *   • leave/enter a terminal PERPENDICULAR to its face (the pin normal);
 *   • take as few corners as possible (a turn is penalised);
 *   • do NOT run on top of a parallel wire — two wires may only meet where they
 *     cross at a right angle (lane separation).
 *
 * It routes on a Hanan-style grid (lines through every pin and every obstacle
 * edge, plus intermediate lane tracks in the gaps) with an A* per wire. Wires
 * are routed in order; each marks the grid edges it used, and later wires pay a
 * penalty to reuse a segment in the SAME orientation — so parallels spread onto
 * neighbouring tracks while perpendicular crossings stay free.
 */

/** A rectangular component body, CENTRE-anchored (like `NodeGeom`). The optional
 *  label (measured text under the node) is treated as an obstacle too — a wire
 *  must never be hidden behind a label. */
export interface RouterObstacle {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  labelW?: number;
  labelH?: number;
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
}

export interface RouteOptions {
  /** Keep-out margin around each body (px). */
  clearance?: number;
  /** Extra lane tracks inserted between adjacent grid lines. */
  laneTracks?: number;
}

const TURN_COST = 12;
const LANE_COST = 40;
const EPS = 0.5;

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
    const top = o.y + o.h / 2 + LABEL_GAP;
    return [
      body,
      rect(
        o.id,
        true, // a label always blocks — wires contour AROUND it, never over it
        o.x - o.labelW / 2,
        top,
        o.x + o.labelW / 2,
        top + o.labelH,
        LABEL_CLEAR
      ),
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

  // Shared lane usage across wires: keyed by a segment's fixed line + span.
  const usage = new Map<string, number>();
  const edgeKey = (o: 'h' | 'v', fixed: number, a: number, b: number): string =>
    `${o}:${fixed}:${Math.min(a, b)}:${Math.max(a, b)}`;

  const results = new Map<string, Point[]>();

  for (const wire of wires) {
    const skip = new Set<string>([wire.from.node, wire.to.node]);
    // A POINT endpoint anchors at the node CENTRE (inside its body), so that
    // body must not block THIS wire; a PIN endpoint is on the border, so its
    // body still blocks (no cutting through to a far-side pin).
    const bodySkip = new Set<string>();
    if (!wire.from.hardNormal) bodySkip.add(wire.from.node);
    if (!wire.to.hardNormal) bodySkip.add(wire.to.node);
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
        const orient: 'h' | 'v' = ddi !== 0 ? 'h' : 'v';
        const fixed = orient === 'h' ? nj : ni;
        const uk = edgeKey(
          orient,
          fixed,
          orient === 'h' ? cur.i : cur.j,
          orient === 'h' ? ni : nj
        );
        const lane = (usage.get(uk) ?? 0) * LANE_COST;
        const ng = cur.g + len + (turned ? TURN_COST : 0) + lane;
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
        usage.set(uk, (usage.get(uk) ?? 0) + 1);
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
    results.set(wire.key, simplify(poly));
  }

  return results;
}

/** Removes duplicate and collinear interior points, so the polyline is the
 *  minimal set of corners (no invisible mid-vertices). */
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
    const collinear =
      (Math.abs(a.x - b.x) < EPS && Math.abs(b.x - c.x) < EPS) ||
      (Math.abs(a.y - b.y) < EPS && Math.abs(b.y - c.y) < EPS);
    if (!collinear) out.push(b);
  }
  out.push(dedup[dedup.length - 1]);
  return out;
}
