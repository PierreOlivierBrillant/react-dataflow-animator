import { describe, expect, it } from 'vitest';
import {
  deloop,
  routeOrthogonal,
  routeWithPinSwaps,
  simplify,
  type RouterObstacle,
  type RouterWire,
} from './orthoRouter';

const body = (id: string, x: number, y: number): RouterObstacle => ({
  id,
  x,
  y,
  w: 40,
  h: 40,
});

const pin = (
  node: string,
  x: number,
  y: number,
  nx: number,
  ny: number
): RouterWire['from'] => ({
  node,
  point: { x, y },
  normal: { x: nx, y: ny },
  hardNormal: true,
});

/** Every segment is strictly horizontal or vertical (never diagonal). */
const allOrthogonal = (pts: { x: number; y: number }[]): boolean => {
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = Math.abs(pts[i + 1].x - pts[i].x);
    const dy = Math.abs(pts[i + 1].y - pts[i].y);
    if (dx > 0.5 && dy > 0.5) return false;
  }
  return true;
};

/** Every segment is horizontal, vertical, or an EXACT 45° diagonal (|Δx|=|Δy|). */
const allOctilinear = (pts: { x: number; y: number }[]): boolean => {
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = Math.abs(pts[i + 1].x - pts[i].x);
    const dy = Math.abs(pts[i + 1].y - pts[i].y);
    if (dx < 0.6 || dy < 0.6) continue; // H, V, or a coincident point
    if (Math.abs(dx - dy) > 0.6) return false; // slanted but not 45°
  }
  return true;
};

/** At least one segment is a genuine diagonal (both deltas non-negligible). */
const hasDiagonal = (pts: { x: number; y: number }[]): boolean =>
  pts.some(
    (_, i) =>
      i < pts.length - 1 &&
      Math.abs(pts[i + 1].x - pts[i].x) > 0.6 &&
      Math.abs(pts[i + 1].y - pts[i].y) > 0.6
  );

/** True if any two non-adjacent segments of the polyline properly cross — i.e.
 *  the wire ties a loop / knot. */
const selfCrosses = (pts: { x: number; y: number }[]): boolean => {
  const o = (
    p: { x: number; y: number },
    q: { x: number; y: number },
    r: { x: number; y: number }
  ) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  for (let i = 0; i < pts.length - 1; i++)
    for (let j = i + 2; j < pts.length - 1; j++) {
      if (i === 0 && j === pts.length - 2) continue; // shared endpoints of a closed ring
      const a = pts[i],
        b = pts[i + 1],
        c = pts[j],
        d = pts[j + 1];
      if (
        o(a, b, c) !== o(a, b, d) &&
        o(c, d, a) !== o(c, d, b) &&
        o(a, b, c) !== 0 &&
        o(a, b, d) !== 0
      )
        return true;
    }
  return false;
};

/** Manhattan length of a polyline (every segment is axis-aligned). */
const pathLength = (pts: { x: number; y: number }[]): number => {
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++)
    total +=
      Math.abs(pts[i + 1].x - pts[i].x) + Math.abs(pts[i + 1].y - pts[i].y);
  return total;
};

/** Number of PROPER interior crossings between the segments of two polylines
 *  (shared endpoints / collinear touches excluded). */
const crossCount = (
  a: { x: number; y: number }[],
  b: { x: number; y: number }[]
): number => {
  const o = (
    p: { x: number; y: number },
    q: { x: number; y: number },
    r: { x: number; y: number }
  ) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  let n = 0;
  for (let i = 0; i < a.length - 1; i++)
    for (let j = 0; j < b.length - 1; j++) {
      const p1 = a[i],
        p2 = a[i + 1],
        p3 = b[j],
        p4 = b[j + 1];
      const o1 = o(p1, p2, p3),
        o2 = o(p1, p2, p4),
        o3 = o(p3, p4, p1),
        o4 = o(p3, p4, p2);
      if (
        o1 !== o2 &&
        o3 !== o4 &&
        o1 !== 0 &&
        o2 !== 0 &&
        o3 !== 0 &&
        o4 !== 0
      )
        n++;
    }
  return n;
};

const hitsBody = (
  pts: { x: number; y: number }[],
  o: RouterObstacle
): boolean => {
  const x0 = o.x - o.w / 2 + 1;
  const x1 = o.x + o.w / 2 - 1;
  const y0 = o.y - o.h / 2 + 1;
  const y1 = o.y + o.h / 2 - 1;
  for (let i = 0; i < pts.length - 1; i++) {
    for (let t = 0; t <= 1; t += 0.01) {
      const x = pts[i].x + (pts[i + 1].x - pts[i].x) * t;
      const y = pts[i].y + (pts[i + 1].y - pts[i].y) * t;
      if (x > x0 && x < x1 && y > y0 && y < y1) return true;
    }
  }
  return false;
};

describe('orthoRouter', () => {
  it('routes aligned terminals as a straight, corner-free wire', () => {
    const wires: RouterWire[] = [
      {
        key: 'w',
        from: pin('a', 120, 100, 1, 0),
        to: pin('b', 280, 100, -1, 0),
      },
    ];
    const routes = routeOrthogonal(
      [body('a', 100, 100), body('b', 300, 100)],
      wires
    );
    const p = routes.get('w')!;
    expect(allOrthogonal(p)).toBe(true);
    expect(p).toHaveLength(2); // no corners
    expect(p[0].y).toBeCloseTo(p[1].y, 5);
  });

  it('never emits a diagonal, even between offset terminals', () => {
    const wires: RouterWire[] = [
      {
        key: 'w',
        from: pin('a', 120, 100, 1, 0),
        to: pin('b', 280, 140, -1, 0),
      },
    ];
    const routes = routeOrthogonal(
      [body('a', 100, 100), body('b', 300, 140)],
      wires
    );
    const p = routes.get('w')!;
    expect(allOrthogonal(p)).toBe(true);
    expect(p.length).toBeGreaterThan(2); // an orthogonal step, not a slanted line
  });

  it('keeps a straight lead before the first/last turn at hard connectors', () => {
    // Opposite faces offset on the transverse axis ⇒ the wire MUST bend. It may
    // not bend flush against a pin: each end runs straight along its normal for
    // at least the minimum lead (PIN_LEAD = 14) before turning.
    const wires: RouterWire[] = [
      {
        key: 'w',
        from: pin('a', 120, 100, 1, 0),
        to: pin('b', 280, 160, -1, 0),
      },
    ];
    const routes = routeOrthogonal(
      [body('a', 100, 100), body('b', 300, 160)],
      wires
    );
    const p = routes.get('w')!;
    expect(allOrthogonal(p)).toBe(true);
    expect(p.length).toBeGreaterThan(2); // it does bend
    const seg = (i: number) =>
      Math.hypot(p[i + 1].x - p[i].x, p[i + 1].y - p[i].y);
    // First run leaves along the +x normal (horizontal); last run enters b along
    // -x (horizontal). Each is at least the lead, minus a sub-pixel tolerance.
    expect(Math.abs(p[1].y - p[0].y)).toBeLessThan(0.6);
    expect(seg(0)).toBeGreaterThanOrEqual(13.5);
    expect(Math.abs(p[p.length - 1].y - p[p.length - 2].y)).toBeLessThan(0.6);
    expect(seg(p.length - 2)).toBeGreaterThanOrEqual(13.5);
  });

  it('deloop unties a self-crossing polyline into a clean jog', () => {
    // The real knot A* tied between two close NAND gates (out east → next gate's
    // lower input): out-right, down, back-LEFT, up, right — s1 (x=119.3) crosses
    // s4 (y=64.2) at (119.3,64.2). deloop must splice it to a 3-corner jog.
    const knot = [
      { x: 102.4, y: 61.2 },
      { x: 119.3, y: 61.2 },
      { x: 119.3, y: 67.1 },
      { x: 108, y: 67.1 },
      { x: 108, y: 64.2 },
      { x: 124.8, y: 64.2 },
    ];
    expect(selfCrosses(knot)).toBe(true); // the input really is a loop
    const clean = deloop(knot);
    expect(selfCrosses(clean)).toBe(false); // …and the output is not
    expect(allOrthogonal(clean)).toBe(true);
    expect(clean).toEqual([
      { x: 102.4, y: 61.2 },
      { x: 119.3, y: 61.2 },
      { x: 119.3, y: 64.2 },
      { x: 124.8, y: 64.2 },
    ]);
    // Endpoints are preserved exactly (the wire still meets both pins).
    expect(clean[0]).toEqual(knot[0]);
    expect(clean[clean.length - 1]).toEqual(knot[knot.length - 1]);
  });

  it('leaves a loop-free path untouched (deloop is idempotent there)', () => {
    const jog = [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 10 },
      { x: 40, y: 10 },
    ];
    expect(deloop(jog)).toEqual(jog);
  });

  it('routes a tight pin-to-pin gap loop-free end to end', () => {
    // The router's own output must never self-cross (deloop runs inside it).
    const wires: RouterWire[] = [
      {
        key: 'w',
        from: pin('a', 112, 100, 1, 0),
        to: pin('b', 128, 104.32, -1, 0),
      },
    ];
    const p = routeOrthogonal(
      [
        { id: 'a', x: 100, y: 100, w: 24, h: 24 },
        { id: 'b', x: 140, y: 100, w: 24, h: 24 },
      ],
      wires
    ).get('w')!;
    expect(allOrthogonal(p)).toBe(true);
    expect(selfCrosses(p)).toBe(false);
  });

  it('fans a net out from ONE source point (shared trunk, not N wires)', () => {
    // A driver feeding two sinks at different heights: per-target straightening
    // gives the two wires DIFFERENT source anchors (y=80 and y=120). Net-aware
    // routing must unify them to one point (the mean, y=100) so the net leaves
    // the driver once and branches — not two wires from two points.
    const wires: RouterWire[] = [
      {
        key: 'w1',
        from: pin('src', 120, 80, 1, 0),
        to: pin('g1', 280, 80, -1, 0),
      },
      {
        key: 'w2',
        from: pin('src', 120, 120, 1, 0),
        to: pin('g2', 280, 120, -1, 0),
      },
    ];
    const routes = routeOrthogonal(
      [body('src', 100, 100), body('g1', 300, 80), body('g2', 300, 120)],
      wires
    );
    const p1 = routes.get('w1')!;
    const p2 = routes.get('w2')!;
    expect(p1[0]).toEqual(p2[0]); // same starting point ⇒ one trunk
    expect(p1[0].y).toBeCloseTo(100, 5); // the unified anchor (mean of 80 & 120)
  });

  it('co-locates a fan-out’s branch points into ONE shared T-junction', () => {
    // A driver feeding a NEAR sink (up) and a FAR sink (down). Both branches ride
    // the shared trunk (y=100) then peel off in opposite directions. Their turn
    // points are free to differ at equal cost — the near branch turns at its own
    // pin lead, the far branch could turn anywhere further along. Without the
    // `fork` tiebreak A* picks those turns arbitrarily, leaving two offset risers;
    // the tiebreak must snap the far branch's turn onto the near branch's, so the
    // net splits at ONE junction (trunk in, one branch up, one down) — a clean T.
    const wires: RouterWire[] = [
      {
        key: 'up',
        from: pin('src', 120, 80, 1, 0),
        to: pin('g1', 260, 60, -1, 0),
      },
      {
        key: 'down',
        from: pin('src', 120, 120, 1, 0),
        to: pin('g2', 460, 140, -1, 0),
      },
    ];
    const routes = routeOrthogonal(
      [body('src', 100, 100), body('g1', 280, 60), body('g2', 480, 140)],
      wires
    );
    const up = routes.get('up')!;
    const down = routes.get('down')!;
    // The branch vertex (first corner off the trunk) is the SAME point for both…
    expect(up[1]).toEqual(down[1]);
    expect(up[1].y).toBeCloseTo(100, 5); // …and sits ON the shared trunk…
    // …then they diverge: one rises, one drops.
    expect(up[2].y).toBeLessThan(100);
    expect(down[2].y).toBeGreaterThan(100);
  });

  it('swaps a commutative gate’s inputs to remove a crossing', () => {
    // Two sources feed a gate's stacked inputs in the CROSSED order: s1 (below)
    // drives the TOP pin, s2 (above) the BOTTOM pin, so the two wires cross right
    // at the gate. The gate is commutative, so routeWithPinSwaps may trade which
    // wire lands on which pin; here the flip removes the crossing at no cost.
    const gate: RouterObstacle = { id: 'g', x: 300, y: 100, w: 40, h: 60 };
    const wires: RouterWire[] = [
      {
        key: 'wA',
        from: pin('s1', 120, 130, 1, 0),
        to: pin('g', 280, 90, -1, 0),
      },
      {
        key: 'wB',
        from: pin('s2', 120, 70, 1, 0),
        to: pin('g', 280, 110, -1, 0),
      },
    ];
    const obstacles = [body('s1', 100, 130), body('s2', 100, 70), gate];
    const before = routeOrthogonal(obstacles, wires);
    expect(crossCount(before.get('wA')!, before.get('wB')!)).toBe(1);
    const after = routeWithPinSwaps(obstacles, wires, [['wA', 'wB']]);
    expect(crossCount(after.get('wA')!, after.get('wB')!)).toBe(0);
    // The keys are unchanged; only the target pins traded — wA now lands on the
    // LOWER pin (y=110), wB on the UPPER (y=90).
    expect(after.get('wA')!.at(-1)!.y).toBeCloseTo(110, 5);
    expect(after.get('wB')!.at(-1)!.y).toBeCloseTo(90, 5);
  });

  // A wire routed EARLY dodges one laid LATER (rip-up & reroute). `src` sits level
  // with `dst` and `mid` is exactly between them, so going over or under `mid` is
  // the same length and the same 4 corners — a coin flip the router settles by
  // taking the low road (asserted first, as the baseline the rip-up must overturn).
  // Now give `mid` an output that drops away below: `src` is a whole net earlier in
  // the routing order, so at the time it is laid that wire does not exist yet and
  // the greedy pass has it thread straight through where the wire will land. Only
  // a rip-up can see that — the low road is now the crossing one, so `src` must
  // come back and take the high road. This is the full adder's B net in miniature.
  const midDrops = (): {
    obstacles: RouterObstacle[];
    wires: RouterWire[];
  } => ({
    obstacles: [
      body('src', 100, 140),
      body('mid', 200, 140),
      body('dst', 320, 140),
      body('down', 320, 240),
    ],
    wires: [
      {
        key: 'w1',
        from: pin('src', 120, 140, 1, 0),
        to: pin('dst', 300, 140, -1, 0),
      },
      {
        key: 'w2',
        from: pin('mid', 220, 140, 1, 0),
        to: pin('down', 300, 240, -1, 0),
      },
    ],
  });

  it('routes under the obstacle when nothing else is in the way', () => {
    const { obstacles, wires } = midDrops();
    const w1 = routeOrthogonal(obstacles, [wires[0]]).get('w1')!;
    expect(w1.some((p) => p.y > 140)).toBe(true); // the low road
    expect(w1.length - 2).toBe(4);
  });

  it('reroutes a wire laid EARLY to dodge one laid LATER, for free', () => {
    const { obstacles, wires } = midDrops();
    const routes = routeOrthogonal(obstacles, wires);
    const w1 = routes.get('w1')!;
    expect(crossCount(w1, routes.get('w2')!)).toBe(0);
    // It flipped to the high road — above `mid`, clear of w2's descent…
    expect(w1.every((p) => p.y <= 140)).toBe(true);
    // …and the flip is FREE: the symmetric detour keeps both the corner count and
    // the length of the baseline above. The crossing bought no length here.
    expect(w1.length - 2).toBe(4);
    expect(pathLength(w1)).toBeCloseTo(
      pathLength(routeOrthogonal(obstacles, [wires[0]]).get('w1')!),
      5
    );
  });

  it('refuses a detour that costs more than the crossing budget', () => {
    // Same geometry, except `mid` is a tall body: going over it is now a long climb
    // (far beyond CROSS_DETOUR) while going under stays short. The wire must NOT
    // buy the dodge at that price — a crossing is worth a few px, never a hike.
    const obstacles: RouterObstacle[] = [
      body('src', 100, 140),
      { id: 'mid', x: 200, y: 60, w: 40, h: 200 },
      body('dst', 320, 140),
      body('down', 320, 240),
    ];
    const wires: RouterWire[] = [
      {
        key: 'w1',
        from: pin('src', 120, 140, 1, 0),
        to: pin('dst', 300, 140, -1, 0),
      },
      {
        key: 'w2',
        from: pin('mid', 220, 140, 1, 0),
        to: pin('down', 300, 240, -1, 0),
      },
    ];
    const routes = routeOrthogonal(obstacles, wires);
    const w1 = routes.get('w1')!;
    expect(w1.some((p) => p.y > 140)).toBe(true); // stayed on the short low road…
    expect(crossCount(w1, routes.get('w2')!)).toBe(1); // …and ate the crossing
  });

  it('leaves pins alone when no swap reduces crossings', () => {
    // Same gate, but sources already in the natural order (s1 above → top pin, s2
    // below → bottom pin): the wires don't cross. A swap could only ADD one, so
    // the optimiser must keep the author's assignment untouched.
    const gate: RouterObstacle = { id: 'g', x: 300, y: 100, w: 40, h: 60 };
    const wires: RouterWire[] = [
      {
        key: 'wA',
        from: pin('s1', 120, 70, 1, 0),
        to: pin('g', 280, 90, -1, 0),
      },
      {
        key: 'wB',
        from: pin('s2', 120, 130, 1, 0),
        to: pin('g', 280, 110, -1, 0),
      },
    ];
    const obstacles = [body('s1', 100, 70), body('s2', 100, 130), gate];
    const plain = routeOrthogonal(obstacles, wires);
    const opt = routeWithPinSwaps(obstacles, wires, [['wA', 'wB']]);
    expect(opt.get('wA')).toEqual(plain.get('wA')); // untouched
    expect(opt.get('wB')).toEqual(plain.get('wB'));
  });

  it('routes around a component that sits between the terminals', () => {
    const mid = body('m', 200, 100);
    const wires: RouterWire[] = [
      {
        key: 'w',
        from: pin('a', 120, 100, 1, 0),
        to: pin('c', 280, 100, -1, 0),
      },
    ];
    const routes = routeOrthogonal(
      [body('a', 100, 100), mid, body('c', 300, 100)],
      wires
    );
    const p = routes.get('w')!;
    expect(allOrthogonal(p)).toBe(true);
    expect(hitsBody(p, mid)).toBe(false);
  });

  it('routes around SEVERAL bodies in a row (long span)', () => {
    const b1 = body('m1', 180, 100);
    const b2 = body('m2', 240, 100);
    const wires: RouterWire[] = [
      {
        key: 'w',
        from: pin('a', 120, 100, 1, 0),
        to: pin('c', 320, 100, -1, 0),
      },
    ];
    const routes = routeOrthogonal(
      [body('a', 100, 100), b1, b2, body('c', 340, 100)],
      wires
    );
    const p = routes.get('w')!;
    expect(allOrthogonal(p)).toBe(true);
    expect(hitsBody(p, b1)).toBe(false);
    expect(hitsBody(p, b2)).toBe(false);
  });

  it('separates two parallel wires onto different tracks (no overlap)', () => {
    // Two wires that would both like the same horizontal line between columns.
    const wires: RouterWire[] = [
      {
        key: 'w1',
        from: pin('a', 120, 90, 1, 0),
        to: pin('c', 280, 110, -1, 0),
      },
      {
        key: 'w2',
        from: pin('b', 120, 110, 1, 0),
        to: pin('d', 280, 90, -1, 0),
      },
    ];
    const routes = routeOrthogonal(
      [
        body('a', 100, 90),
        body('b', 100, 110),
        body('c', 300, 110),
        body('d', 300, 90),
      ],
      wires
    );
    const p1 = routes.get('w1')!;
    const p2 = routes.get('w2')!;
    expect(allOrthogonal(p1)).toBe(true);
    expect(allOrthogonal(p2)).toBe(true);
    // No shared horizontal segment on the same y over an overlapping x-range.
    const hseg = (p: { x: number; y: number }[]) => {
      const out: { y: number; x0: number; x1: number }[] = [];
      for (let i = 0; i < p.length - 1; i++)
        if (Math.abs(p[i].y - p[i + 1].y) < 0.5)
          out.push({
            y: p[i].y,
            x0: Math.min(p[i].x, p[i + 1].x),
            x1: Math.max(p[i].x, p[i + 1].x),
          });
      return out;
    };
    let overlap = false;
    for (const s of hseg(p1))
      for (const t of hseg(p2))
        if (
          Math.abs(s.y - t.y) < 3 &&
          Math.min(s.x1, t.x1) - Math.max(s.x0, t.x0) > 3
        )
          overlap = true;
    expect(overlap).toBe(false);
  });

  it('breaks an equal-length elbow tie toward FEWER crossings', () => {
    // A fixed vertical wire F sits in the bottom-left corner region of an L that
    // must join (0,0)→(60,60). The two elbows tie EXACTLY on length (120) and on
    // turns (one): the horizontal-first flip (corner bottom-right) threads
    // straight through F, the vertical-first flip (corner top-left) does not.
    // With perpendicular crossings free the router picked arbitrarily — this is
    // the generic form of the 2-crossing NAND elbow. The tiebreak must now pick
    // the crossing-free flip: same wire, same length, one fewer crossing.
    const soft = (node: string, x: number, y: number): RouterWire['from'] => ({
      node,
      point: { x, y },
      normal: { x: 0, y: 0 },
      hardNormal: false,
    });
    const wires: RouterWire[] = [
      // F is laid first, so E (routed second) pays to cross it.
      { key: 'f', from: soft('fSrc', 30, -20), to: soft('fDst', 30, 20) },
      { key: 'e', from: soft('eSrc', 0, 0), to: soft('eDst', 60, 60) },
    ];
    const routes = routeOrthogonal([], wires);
    const e = routes.get('e')!;
    const f = routes.get('f')!;
    expect(allOrthogonal(e)).toBe(true);
    expect(crossCount(e, f)).toBe(0); // the flip that dodges F was chosen
    expect(e[1].x).toBeCloseTo(0, 1); // its corner is top-left (vertical-first)
  });

  it('never crosses the TARGET body to reach a far-side pin', () => {
    // `a` (right) wires to `b`'s pin on b's FAR (left) side: a straight run would
    // cut through b. The router must go around it (the SR-latch feedback case).
    const to = body('b', 150, 100);
    const wires: RouterWire[] = [
      {
        key: 'w',
        from: pin('a', 280, 100, -1, 0),
        to: pin('b', 130, 100, -1, 0),
      },
    ];
    const routes = routeOrthogonal([body('a', 300, 100), to], wires);
    const p = routes.get('w')!;
    expect(allOrthogonal(p)).toBe(true);
    expect(hitsBody(p, to)).toBe(false);
  });

  it("routes around another node's LABEL, not only its body", () => {
    // `m` sits above the a→c line; its label (below m) lies on the line.
    const m: RouterObstacle = {
      id: 'm',
      x: 200,
      y: 60,
      w: 40,
      h: 40,
      labelW: 44,
      labelH: 14,
    };
    const wires: RouterWire[] = [
      {
        key: 'w',
        from: pin('a', 120, 96, 1, 0),
        to: pin('c', 280, 96, -1, 0),
      },
    ];
    const routes = routeOrthogonal(
      [body('a', 100, 96), m, body('c', 300, 96)],
      wires
    );
    const p = routes.get('w')!;
    expect(allOrthogonal(p)).toBe(true);
    // Label rect of m: x∈[178,222], y∈[86,100] (bottom+gap .. +labelH).
    const lab = { x0: 178, y0: 86, x1: 222, y1: 100 };
    let overLabel = false;
    for (let i = 0; i < p.length - 1; i++)
      for (let t = 0; t <= 1; t += 0.02) {
        const x = p[i].x + (p[i + 1].x - p[i].x) * t;
        const y = p[i].y + (p[i + 1].y - p[i].y) * t;
        if (
          x > lab.x0 + 1 &&
          x < lab.x1 - 1 &&
          y > lab.y0 + 1 &&
          y < lab.y1 - 1
        )
          overLabel = true;
      }
    expect(overLabel).toBe(false);
  });

  it("labelSide:'right' frees the space BELOW the body (label no longer there)", () => {
    // Same setup as the below-label test, but the label is now on the RIGHT.
    // The a→c line under `m` is therefore clear → the wire runs straight again.
    const m: RouterObstacle = {
      id: 'm',
      x: 200,
      y: 60,
      w: 40,
      h: 40,
      labelW: 44,
      labelH: 14,
      labelSide: 'right',
    };
    const wires: RouterWire[] = [
      {
        key: 'w',
        from: pin('a', 120, 96, 1, 0),
        to: pin('c', 280, 96, -1, 0),
      },
    ];
    const routes = routeOrthogonal(
      [body('a', 100, 96), m, body('c', 300, 96)],
      wires
    );
    const p = routes.get('w')!;
    expect(allOrthogonal(p)).toBe(true);
    expect(p).toHaveLength(2); // straight, no detour around a phantom below-label
  });

  it("labelSide:'right' places the label obstacle to the RIGHT of the body", () => {
    // `m` sits left of a vertical a→c wire; its RIGHT label crosses that wire.
    const m: RouterObstacle = {
      id: 'm',
      x: 60,
      y: 200,
      w: 40,
      h: 40,
      labelW: 44,
      labelH: 14,
      labelSide: 'right',
    };
    const wires: RouterWire[] = [
      {
        key: 'w',
        from: pin('a', 96, 120, 0, 1),
        to: pin('c', 96, 280, 0, -1),
      },
    ];
    const routes = routeOrthogonal(
      [body('a', 96, 100), m, body('c', 96, 300)],
      wires
    );
    const p = routes.get('w')!;
    expect(allOrthogonal(p)).toBe(true);
    // Right label rect of m: x∈[86,130], y∈[193,207]; the wire must skirt it.
    const lab = { x0: 86, y0: 193, x1: 130, y1: 207 };
    let overLabel = false;
    for (let i = 0; i < p.length - 1; i++)
      for (let t = 0; t <= 1; t += 0.02) {
        const x = p[i].x + (p[i + 1].x - p[i].x) * t;
        const y = p[i].y + (p[i + 1].y - p[i].y) * t;
        if (
          x > lab.x0 + 1 &&
          x < lab.x1 - 1 &&
          y > lab.y0 + 1 &&
          y < lab.y1 - 1
        )
          overLabel = true;
      }
    expect(overLabel).toBe(false);
  });

  it('reaches a POINT endpoint at its centre (not blocked by its own body)', () => {
    // A junction/pad anchors at its CENTRE, inside its own body — the wire must
    // still be able to reach it (a hard body would otherwise trap the goal).
    const j = body('j', 200, 100);
    const wires: RouterWire[] = [
      {
        key: 'w',
        from: pin('a', 120, 100, 1, 0),
        to: {
          node: 'j',
          point: { x: 200, y: 100 },
          normal: { x: -1, y: 0 },
          hardNormal: false,
        },
      },
    ];
    const routes = routeOrthogonal([body('a', 100, 100), j], wires);
    const p = routes.get('w')!;
    expect(allOrthogonal(p)).toBe(true);
    const last = p[p.length - 1];
    expect(last.x).toBeCloseTo(200, 0);
    expect(last.y).toBeCloseTo(100, 0);
  });

  it('simplify drops collinear and duplicate points', () => {
    expect(
      simplify([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 10 },
      ])
    ).toEqual([
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 10 },
    ]);
  });

  it('simplify fuses two aligned DIAGONAL segments into one', () => {
    expect(
      simplify([
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: 20, y: 20 },
        { x: 20, y: 40 },
      ])
    ).toEqual([
      { x: 0, y: 0 },
      { x: 20, y: 20 },
      { x: 20, y: 40 },
    ]);
  });

  it('draws a flagged wire octilinearly (only 45/90°) and adds a diagonal', () => {
    const wires: RouterWire[] = [
      {
        key: 'w',
        from: pin('a', 120, 100, 1, 0),
        to: pin('b', 280, 140, -1, 0),
        diagonal: true,
      },
    ];
    const routes = routeOrthogonal(
      [body('a', 100, 100), body('b', 300, 140)],
      wires
    );
    const p = routes.get('w')!;
    expect(allOctilinear(p)).toBe(true);
    expect(hasDiagonal(p)).toBe(true); // the corner became a 45° miter
  });

  it('keeps a diagonal wire clear of a body it must route around', () => {
    const mid = body('m', 200, 120);
    const wires: RouterWire[] = [
      {
        key: 'w',
        from: pin('a', 120, 100, 1, 0),
        to: pin('c', 280, 160, -1, 0),
        diagonal: true,
      },
    ];
    const routes = routeOrthogonal(
      [body('a', 100, 100), mid, body('c', 300, 160)],
      wires
    );
    const p = routes.get('w')!;
    expect(allOctilinear(p)).toBe(true);
    expect(hitsBody(p, mid)).toBe(false); // the miter never cuts into the body
  });

  it('routes a feedback wire as ONE centred diagonal (the elbow), not a dogleg', () => {
    // Output on the right of one gate → input on the left of a gate below it (the
    // SR-latch cross-couple). The elbow must draw a single bold 45° diagonal
    // between two straight rails, so a pair of these reads as a central X.
    const wires: RouterWire[] = [
      {
        key: 'w',
        from: pin('g1', 210, 78, 1, 0),
        to: pin('g2', 170, 194, -1, 0),
        diagonal: true,
      },
    ];
    const routes = routeOrthogonal(
      [body('g1', 190, 78), body('g2', 190, 194)],
      wires
    );
    const p = routes.get('w')!;
    expect(allOctilinear(p)).toBe(true);
    const diagAt: number[] = [];
    for (let i = 0; i < p.length - 1; i++) {
      const dx = Math.abs(p[i + 1].x - p[i].x);
      const dy = Math.abs(p[i + 1].y - p[i].y);
      if (dx > 0.6 && dy > 0.6) diagAt.push(i);
    }
    expect(diagAt).toHaveLength(1); // ONE diagonal, no mid-jog
    expect(diagAt[0]).toBeGreaterThan(0); // flanked by a rail before…
    expect(diagAt[0]).toBeLessThan(p.length - 2); // …and after
  });

  it('leaves a hard pin along its normal (a straight stub before any diagonal)', () => {
    const wires: RouterWire[] = [
      {
        key: 'w',
        from: pin('a', 120, 100, 1, 0),
        to: pin('b', 280, 160, -1, 0),
        diagonal: true,
      },
    ];
    const routes = routeOrthogonal(
      [body('a', 100, 100), body('b', 300, 160)],
      wires
    );
    const p = routes.get('w')!;
    // First segment runs along the +x normal (horizontal), not straight into 45°.
    expect(Math.abs(p[1].y - p[0].y)).toBeLessThan(0.6);
    expect(p[1].x - p[0].x).toBeGreaterThan(6);
  });

  it('leaves an aligned wire straight even when flagged diagonal', () => {
    const wires: RouterWire[] = [
      {
        key: 'w',
        from: pin('a', 120, 100, 1, 0),
        to: pin('b', 280, 100, -1, 0),
        diagonal: true,
      },
    ];
    const routes = routeOrthogonal(
      [body('a', 100, 100), body('b', 300, 100)],
      wires
    );
    const p = routes.get('w')!;
    expect(p).toHaveLength(2); // no corner to miter → unchanged
    expect(hasDiagonal(p)).toBe(false);
  });

  it('handles vertical pin normals in diagonal mode', () => {
    const wires: RouterWire[] = [
      {
        key: 'w',
        from: pin('a', 100, 100, 0, 1), // exits downward
        to: pin('b', 220, 60, 0, -1), // enters from below
        diagonal: true,
      },
    ];
    const routes = routeOrthogonal(
      [body('a', 100, 80), body('b', 220, 80)],
      wires
    );
    const p = routes.get('w')!;
    expect(allOctilinear(p)).toBe(true);
    expect(hasDiagonal(p)).toBe(true);
  });

  it('routes SCALE-INVARIANTLY: geometry ×k with scale:k gives the ×k route', () => {
    // The same physical diagram rendered at a thumbnail vs full-screen must draw
    // the SAME corners. A bending config (offset terminals) at the design size…
    const wires: RouterWire[] = [
      {
        key: 'w',
        from: pin('a', 120, 100, 1, 0),
        to: pin('b', 280, 160, -1, 0),
      },
    ];
    const base = routeOrthogonal(
      [body('a', 100, 100), body('b', 300, 160)],
      wires
    ).get('w')!;

    // …and the identical diagram measured 3× bigger, told scale:3, must produce
    // exactly the 3× polyline — same number of corners, proportional coordinates.
    const K = 3;
    const bodyK = (id: string, x: number, y: number): RouterObstacle => ({
      id,
      x: x * K,
      y: y * K,
      w: 40 * K,
      h: 40 * K,
    });
    const pinK = (
      node: string,
      x: number,
      y: number,
      nx: number,
      ny: number
    ): RouterWire['from'] => ({
      node,
      point: { x: x * K, y: y * K },
      normal: { x: nx, y: ny },
      hardNormal: true,
    });
    const scaled = routeOrthogonal(
      [bodyK('a', 100, 100), bodyK('b', 300, 160)],
      [
        {
          key: 'w',
          from: pinK('a', 120, 100, 1, 0),
          to: pinK('b', 280, 160, -1, 0),
        },
      ],
      { scale: K }
    ).get('w')!;

    expect(scaled).toHaveLength(base.length);
    for (let i = 0; i < base.length; i++) {
      expect(scaled[i].x).toBeCloseTo(base[i].x * K, 4);
      expect(scaled[i].y).toBeCloseTo(base[i].y * K, 4);
    }
  });

  it('is identical to orthogonal routing when the flag is off/absent', () => {
    const build = (diagonal?: boolean): RouterWire[] => [
      {
        key: 'w',
        from: pin('a', 120, 100, 1, 0),
        to: pin('b', 280, 140, -1, 0),
        ...(diagonal === undefined ? {} : { diagonal }),
      },
    ];
    const obstacles = [body('a', 100, 100), body('b', 300, 140)];
    const off = routeOrthogonal(obstacles, build(false)).get('w')!;
    const absent = routeOrthogonal(obstacles, build()).get('w')!;
    expect(allOrthogonal(off)).toBe(true);
    expect(off).toEqual(absent); // an explicit false and an absent flag agree
  });
});
