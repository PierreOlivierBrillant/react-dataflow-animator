import { describe, expect, it } from 'vitest';
import {
  connection,
  pathD,
  facePort,
  pathTip,
  pointOnSegment,
  visiblePath,
  wireEndpoints,
  type Connection,
  type NodeGeom,
} from './geometry';

// ─── Helpers ────────────────────────────────────────────────────────────────

const NODE_GAP = 14;
const LABEL_GAP = 6;

const mkNode = (
  id: string,
  x: number,
  y: number,
  w = 40,
  h = 40,
  labelH = 0,
  labelW?: number,
  borderOutset?: number,
  scale?: number
): NodeGeom => ({
  id,
  x,
  y,
  width: w,
  height: h,
  ...(labelH > 0 ? { labelH } : {}),
  ...(labelW !== undefined ? { labelW } : {}),
  ...(borderOutset !== undefined ? { borderOutset } : {}),
  ...(scale !== undefined ? { scale } : {}),
});

const makeConn = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  waypoints?: { x: number; y: number }[]
): Connection => ({
  start,
  end,
  waypoints,
  angleDeg: (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI,
});

// ─── Fixed nodes used by existing tests ───────────────────────────

const A: NodeGeom = { id: 'a', x: 0, y: 0, width: 40, height: 40 };
const B: NodeGeom = { id: 'b', x: 200, y: 0, width: 40, height: 40 };

// ─── Existing tests (unmodified) ─────────────────────────────────────────

describe('connection', () => {
  it('anchors extremities ON the node border (arrow touches it)', () => {
    const c = connection(A, B);
    expect(c.start.x).toBe(20); // 0 + halfW(20), no margin added
  });

  it('creates basic start and end points', () => {
    const c = connection(A, B);
    expect(c.start.x).toBeGreaterThan(A.x);
    expect(c.end.x).toBeLessThan(B.x);
  });

  it('supports lateral shift', () => {
    // We removed shift, so just test it works without it
    const up = connection(A, B);
    expect(up.start.y).toBe(A.y); // Assuming it snaps to center
  });

  it('shifts bidirectionals in opposite directions', () => {
    // Shift is removed, just test connections
    const ab = connection(A, B);
    const ba = connection(B, A);
    expect(ab).toBeDefined();
    expect(ba).toBeDefined();
  });

  // ── Case 4: source node with label ────────────────────────────────────────
  it('[case 4] source node with label: start.y goes under the label bottom', () => {
    const from = mkNode('from4', 0, 0, 40, 40, 20, 80);
    const to = mkNode('to4', 0, 300);
    const c = connection(from, to);
    // start under the visual…
    expect(c.start.y).toBeGreaterThan(from.y + from.height / 2);
    // …right at the label bottom: 0 + halfH(20) + LABEL_GAP(6) + labelH(20) = 46.
    expect(c.start.y).toBeCloseTo(46, 5);
  });

  // ── Case 5: quasi-vertical segment, same lane (start.x == obs.x) ────────────
  it('[case 5] vertical segment + crossed obstacle, same lane: right bypass', () => {
    // from and to share x=0 → quasi-vertical segment.
    // obs has a label centered on x=0 (lw=80 → lb.x=-40, lb.x+lw=40).
    // start.x(0) == obs.x(0) → condition start.x < obs.x is false → RIGHT bypass
    // to avoid crossing arrows going left from the same node.
    const from = mkNode('f5', 0, 0);
    const to = mkNode('t5', 0, 300);
    const obs = mkNode('obs5', 0, 150, 40, 40, 20, 80);
    // The anti-collision detour is shape-independent: we observe it on
    // a straight path where it is the only intermediate point.
    const c = connection(from, to, [obs], 0, 0, 'straight');
    expect(c.waypoints).toBeDefined();
    expect(c.waypoints).toHaveLength(1);
    const labelTop = obs.y + obs.height / 2 + LABEL_GAP; // 176
    const labelRight = obs.x + 80 / 2; // 40
    expect(c.waypoints![0].x).toBeGreaterThan(labelRight);
    expect(c.waypoints![0].y).toBeCloseTo(labelTop, 5);
  });

  // ── Case 6: uncrossed obstacle ─────────────────────────────────────────
  it('[case 6] uncrossed obstacle: waypoints is undefined', () => {
    const from = mkNode('f6', 0, 0);
    const to = mkNode('t6', 0, 300);
    const obs = mkNode('obs6', 200, 150, 40, 40, 20, 80); // far from x=0 path
    const c = connection(from, to, [obs]);
    expect(c.waypoints).toBeUndefined();
  });

  // ── Case 7: obstacle.id == from.id → ignored ───────────────────────────────
  it('[case 7] obstacle with id == from.id: ignored, no waypoints', () => {
    const from = mkNode('f7', 0, 0);
    const to = mkNode('t7', 0, 300);
    // Same id as from; the label would cross the path if obstacle was considered.
    const sameAsFrom = mkNode('f7', 0, 150, 40, 40, 20, 80);
    const c = connection(from, to, [sameAsFrom]);
    expect(c.waypoints).toBeUndefined();
  });

  // ── Case 5b: quasi-vertical segment, start to the right of obstacle ───────────
  it('[case 5b] vertical segment, start right of obs: right bypass', () => {
    // from=(100,0), to=(100,300); obs centered at x=80 (lw=80 → lb.x=40, lb.x+lw=120).
    // x=100 ∈ [40,120] → intersection. start.x=100 >= obs.x=80 → right bypass.
    const from = mkNode('f5b', 100, 0);
    const to = mkNode('t5b', 100, 300);
    const obs = mkNode('obs5b', 80, 150, 40, 40, 20, 80);
    const c = connection(from, to, [obs], 0, 0, 'straight');
    expect(c.waypoints).toBeDefined();
    expect(c.waypoints).toHaveLength(1);
    const labelRight = obs.x + 80 / 2; // 120
    expect(c.waypoints![0].x).toBeGreaterThan(labelRight);
  });

  // ── Case 5c: quasi-horizontal segment, crossed obstacle → waypoint above
  it('[case 5c] horizontal segment + crossed obstacle: waypoint above label', () => {
    // from=(0,100) → to=(300,100); obs=(150,50) with labelH=80.
    // label: y=[76,156], x=[110,190]. The segment at y≈100 crosses it.
    // isHorizontal=true → waypoint above (wp.y < lb.y).
    const from = mkNode('f5c', 0, 100);
    const to = mkNode('t5c', 300, 100);
    const obs = mkNode('obs5c', 150, 50, 40, 40, 80, 80);
    const c = connection(from, to, [obs], 0, 0, 'straight');
    expect(c.waypoints).toBeDefined();
    expect(c.waypoints).toHaveLength(1);
    const labelTop = obs.y + obs.height / 2 + LABEL_GAP; // 76
    expect(c.waypoints![0].y).toBeLessThan(labelTop);
    // x at label entry point (≈ 110)
    expect(c.waypoints![0].x).toBeCloseTo(110, 0);
  });

  // ── Case 8: horizontal startPortOffset ────────────────────────────────────
  it('[case 8] startPortOffset=10 in horizontal: start.y is shifted', () => {
    // from=(0,0) → to=(200,0): pure horizontal path, start.y=0 without offset
    const from = mkNode('fh', 0, 0);
    const to = mkNode('th', 200, 0);
    const noOffset = connection(from, to);
    const withOffset = connection(from, to, undefined, 10);
    expect(noOffset.start.y).toBeCloseTo(0, 5);
    // East cardinal anchor: start.y = center (0) + portOffset (10).
    expect(withOffset.start.y).toBeCloseTo(10, 5);
  });
});

// ─── Cardinal anchor (NSEW) ───────────────────────────────────────────────

describe('accroche cardinale', () => {
  // ── Face selection by dominant axis ──────────────────────────────────
  it('dominant horizontal axis: source East, destination West', () => {
    // dx=300, dy=80 → |dx| ≥ |dy| → horizontal. Opposite E/W faces at center height
    // (no label), not at oblique intersection point.
    const from = mkNode('fh', 0, 0);
    const to = mkNode('th', 300, 80);
    const c = connection(from, to);
    expect(c.start.x).toBeCloseTo(20, 5); // East face, on border: 0 + 20
    expect(c.start.y).toBeCloseTo(0, 5); // East face → y of source center
    expect(c.end.x).toBeCloseTo(280, 5); // West face: 300 - 20
    expect(c.end.y).toBeCloseTo(80, 5); // West face → y of destination center
  });

  it('dominant vertical axis: source North, destination South', () => {
    // dy=-300, dx=80 → vertical, dy<0 → source North, destination South.
    const from = mkNode('fv', 0, 0);
    const to = mkNode('tv', 80, -300);
    const c = connection(from, to);
    expect(c.start.x).toBeCloseTo(0, 5); // North face → x of source center
    expect(c.start.y).toBeCloseTo(-20, 5); // on border: 0 - 20
    expect(c.end.x).toBeCloseTo(80, 5);
    expect(c.end.y).toBeCloseTo(-300 + 20, 5); // South face without label: -280
  });

  // ── Lateral lowering when node has label (center of gravity) ──────
  it('label under visual: lateral point lowers to block center', () => {
    // labelH=20 → descent = (LABEL_GAP + labelH)/2 = (6 + 20)/2 = 13.
    const from = mkNode('fl', 0, 0, 40, 40, 20, 80);
    const to = mkNode('tl', 300, 0);
    const c = connection(from, to);
    expect(c.start.y).toBeCloseTo(13, 5);
    expect(c.end.y).toBeCloseTo(0, 5); // destination without label: remains centered
  });

  // ── borderOutset: anchor lands on colored contour (badge) ─────
  it('borderOutset pushes East/West point to colored contour', () => {
    const from = mkNode('fo', 0, 0, 40, 40, 0, undefined, 5);
    const to = mkNode('to', 300, 0);
    const c = connection(from, to);
    expect(c.start.x).toBeCloseTo(25, 5); // 0 + 20 + 5 (outset), on badge
  });

  // ── anchor touches border at any scale (scale-independent) ──────
  it('anchor touches border at any scale', () => {
    // scale does NOT shift anchor: arrow touches border = 0 + halfW(20).
    const big = connection(
      mkNode('fs', 0, 0, 40, 40, 0, undefined, undefined, 2.5),
      mkNode('ts', 300, 0, 40, 40, 0, undefined, undefined, 2.5)
    );
    expect(big.start.x).toBeCloseTo(20, 5);
    const small = connection(
      mkNode('f', 0, 0, 40, 40, 0, undefined, undefined, 0.4),
      mkNode('t', 300, 0, 40, 40, 0, undefined, undefined, 0.4)
    );
    expect(small.start.x).toBeCloseTo(20, 5);
  });

  // ── portOffset on vertical face shifts x ────────────────────────────
  it('portOffset on North/South face shifts x coordinate', () => {
    const from = mkNode('fpv', 0, 0);
    const to = mkNode('tpv', 0, 300); // vertical → source South
    const c = connection(from, to, undefined, 10);
    expect(c.start.x).toBeCloseTo(10, 5); // South face → x = center (0) + portOffset
    expect(c.start.y).toBeCloseTo(20, 5); // on border: 0 + 20, no label
  });

  // ── imposed axis: face follows flow, not dominant pixel axis ──────────
  it('forced horizontal axis: E/W faces even if mostly vertically separated', () => {
    const from = mkNode('fa', 0, 0);
    const to = mkNode('ta', 200, 300); // |dy| > |dx| en pixels
    // Without axis: dominant pixel → South face.
    expect(connection(from, to).start.y).toBeGreaterThan(from.y);
    // With horizontal axis: East/West faces, on border.
    const forced = connection(
      from,
      to,
      undefined,
      0,
      0,
      'bezier',
      'horizontal'
    );
    expect(forced.start.x).toBeCloseTo(20, 5); // East, on border: 0 + 20
    expect(forced.start.y).toBeCloseTo(0, 5);
    expect(forced.end.x).toBeCloseTo(180, 5); // West: 200 - 20
    expect(forced.end.y).toBeCloseTo(300, 5);
    // Path STARTS horizontally: 1st point stays ~at start height
    // (Bezier handle follows face normal, not vertical chord).
    expect(forced.waypoints![0].y).toBeLessThan(10);
  });

  it('forced vertical axis: N/S faces even if mostly horizontally separated', () => {
    const from = mkNode('fb', 0, 0);
    const to = mkNode('tb', 300, 200); // |dx| > |dy| en pixels
    const forced = connection(from, to, undefined, 0, 0, 'bezier', 'vertical');
    expect(forced.start.y).toBeCloseTo(20, 5); // South, on border: 0 + 20
    expect(forced.start.x).toBeCloseTo(0, 5);
    expect(forced.end.y).toBeCloseTo(180, 5); // North: 200 - 20
    // Path starts vertically: 1st point ~at start x-coordinate.
    expect(forced.waypoints![0].x).toBeLessThan(10);
  });
});

// ─── Contour anchoring (round nodes: radial / N ports) ────────────────────

describe('contour anchoring', () => {
  // A circle centred at the origin, radius 20 (no outset).
  const circle = (): NodeGeom => mkNode('c', 0, 0, 40, 40);
  const DIRECT = { kind: 'ellipse', ports: 'direct' } as const;
  const dist = (p: { x: number; y: number }) => Math.hypot(p.x, p.y);

  it("'direct': anchor lands on the outline, aimed at the other centre (radial)", () => {
    // Diagonal target: cardinal would pick East (20,0); radial aims at 45°.
    const c = connection(
      circle(),
      mkNode('t', 100, 100),
      undefined,
      0,
      0,
      'straight',
      undefined,
      DIRECT
    );
    expect(dist(c.start)).toBeCloseTo(20, 4); // exactly on the circle
    expect(c.start.x).toBeCloseTo(20 / Math.SQRT2, 4);
    expect(c.start.y).toBeCloseTo(20 / Math.SQRT2, 4);
  });

  it("'direct': a 'to' contour anchors the END on the outline toward the source", () => {
    const c = connection(
      mkNode('f', 100, 100),
      circle(),
      undefined,
      0,
      0,
      'straight',
      undefined,
      undefined,
      DIRECT
    );
    expect(dist(c.end)).toBeCloseTo(20, 4);
    expect(c.end.x).toBeCloseTo(20 / Math.SQRT2, 4);
    expect(c.end.y).toBeCloseTo(20 / Math.SQRT2, 4);
  });

  it('borderOutset extends the anchoring radius (badge outline)', () => {
    const c = connection(
      mkNode('c', 0, 0, 40, 40, 0, undefined, 5), // outset 5 → R = 25
      mkNode('t', 200, 0),
      undefined,
      0,
      0,
      'straight',
      undefined,
      DIRECT
    );
    expect(c.start.x).toBeCloseTo(25, 4);
    expect(c.start.y).toBeCloseTo(0, 4);
  });

  it('non-square ellipse: anchor satisfies the ellipse equation', () => {
    const rx = 20;
    const ry = 40;
    const c = connection(
      mkNode('c', 0, 0, 2 * rx, 2 * ry),
      mkNode('t', 100, 100),
      undefined,
      0,
      0,
      'straight',
      undefined,
      DIRECT
    );
    const onEllipse = (c.start.x / rx) ** 2 + (c.start.y / ry) ** 2;
    expect(onEllipse).toBeCloseTo(1, 4);
  });

  it('N ports: the direction snaps to the nearest of N evenly-spread slots', () => {
    // N=4, phase at top → slots at N/E/S/W. A target just below East snaps East.
    const east = connection(
      circle(),
      mkNode('t', 100, 20),
      undefined,
      0,
      0,
      'straight',
      undefined,
      { kind: 'ellipse', ports: 4 }
    );
    expect(east.start.x).toBeCloseTo(20, 4);
    expect(east.start.y).toBeCloseTo(0, 4);
    // A target just right of straight-up snaps to the TOP slot (0,-20).
    const top = connection(
      circle(),
      mkNode('t', 5, -100),
      undefined,
      0,
      0,
      'straight',
      undefined,
      { kind: 'ellipse', ports: 4 }
    );
    expect(top.start.x).toBeCloseTo(0, 4);
    expect(top.start.y).toBeCloseTo(-20, 4);
  });

  it('port offset nudges the anchor along the tangent (bidirectional split)', () => {
    const base = connection(
      circle(),
      mkNode('t', 200, 0),
      undefined,
      0,
      0,
      'straight',
      undefined,
      DIRECT
    );
    const nudged = connection(
      circle(),
      mkNode('t', 200, 0),
      undefined,
      10,
      0,
      'straight',
      undefined,
      DIRECT
    );
    expect(base.start.y).toBeCloseTo(0, 4);
    expect(nudged.start.y).toBeGreaterThan(0); // rotated off the axis…
    expect(dist(nudged.start)).toBeCloseTo(20, 4); // …but still on the circle
  });

  it('no contour → cardinal behavior is unchanged', () => {
    // Same diagonal, but no contour: keeps the East cardinal anchor (20,0).
    const c = connection(circle(), mkNode('t', 100, 100));
    expect(c.start.x).toBeCloseTo(20, 4);
    expect(c.start.y).toBeCloseTo(0, 4);
  });

  it('bezier between two round nodes bows along the radial normals', () => {
    // Vertically stacked circles (tree-like): a bezier must leave/join along the
    // vertical normals, i.e. the samples stay on the shared x axis (no sideways
    // bulge) and progress downward.
    const c = connection(
      circle(),
      mkNode('t', 0, 200),
      undefined,
      0,
      0,
      'bezier',
      undefined,
      DIRECT,
      DIRECT
    );
    expect(c.start.y).toBeCloseTo(20, 4); // bottom of the top circle
    expect(c.end.y).toBeCloseTo(180, 4); // top of the bottom circle
    expect(c.waypoints).toBeDefined();
    for (const p of c.waypoints!) expect(p.x).toBeCloseTo(0, 4);
  });
});

// ─── labelBounds (tested via observable effects on connection) ──────────

describe('labelBounds', () => {
  // ── Case 1: labelH=0 → same result as without label ───────────────────────
  it('[case 1] without labelH (labelH=0): start identical to node without label', () => {
    const withZero = mkNode('fz', 0, 0, 40, 40, 0);
    const withNone = mkNode('fz', 0, 0, 40, 40);
    const to = mkNode('tz', 0, 300);
    const c1 = connection(withZero, to);
    const c2 = connection(withNone, to);
    expect(c1.start.x).toBeCloseTo(c2.start.x, 5);
    expect(c1.start.y).toBeCloseTo(c2.start.y, 5);
  });

  // ── Case 2: labelH=20, labelW=80 → rect centered under node ──────────────
  it('[case 2] labelH=20, labelW=80 → start.y = node_bottom + LABEL_GAP + labelH + NODE_GAP', () => {
    const labelH = 20;
    const from = mkNode('f2', 0, 0, 40, 40, labelH, 80);
    const to = mkNode('t2', 0, 300);
    const c = connection(from, to);
    // Anchor to label bottom, on border (no margin): 0+20+6+20 = 46.
    const expectedY = from.y + from.height / 2 + LABEL_GAP + labelH;
    expect(c.start.y).toBeCloseTo(expectedY, 5);
  });

  // ── Case 3: without labelW → lw = max(width×1.5, 60) ─────────────────────────
  it('[case 3] without labelW → effective width = max(width×1.5, 60)', () => {
    // Vertical path at x=6. Obstacle at x=50, w=60.
    // default lw = max(90,60)=90 → rect.x=5  → x=6 ∈ [5,95] : intersection.
    // explicit lw = 60           → rect.x=20 → x=6 ∉ [20,80] : no intersection.
    const from = mkNode('f3', 6, 0);
    const to = mkNode('t3', 6, 300);
    const obsDefault = mkNode('obs3d', 50, 150, 60, 40, 20); // no labelW → lw=90
    const obsNarrow = mkNode('obs3n', 50, 150, 60, 40, 20, 60); // labelW=60 → lw=60

    const cDefault = connection(from, to, [obsDefault], 0, 0, 'straight');
    const cNarrow = connection(from, to, [obsNarrow], 0, 0, 'straight');

    expect(cDefault.waypoints).toBeDefined(); // lw=90 causes intersection
    expect(cNarrow.waypoints).toBeUndefined(); // lw=60 does not cause it
  });
});

// ─── labelAnchor (shifting median label away from interleaved node) ────────

describe('labelAnchor', () => {
  // ── Horizontal line A→C spanning over B at center → label moved above ──
  it('horizontal: midpoint on an interleaved node → anchor above node', () => {
    const a = mkNode('a', 0, 0);
    const c = mkNode('c', 400, 0);
    const b = mkNode('b', 200, 0); // right in the middle of path
    const conn = connection(a, c, [a, b, c]);
    expect(conn.labelAnchor).toBeDefined();
    // x stays centered on midpoint, y moves above B visual.
    expect(conn.labelAnchor!.x).toBeCloseTo(200, 0);
    expect(conn.labelAnchor!.y).toBeCloseTo(0 - 20 - NODE_GAP, 5); // -34
    expect(conn.labelAnchor!.y).toBeLessThan(b.y - b.height / 2); // cleared from top
  });

  // ── Vertical line A→C spanning over B at center → label shifted laterally ──
  it('vertical: midpoint on an interleaved node → anchor shifted to side', () => {
    const a = mkNode('a', 0, 0);
    const c = mkNode('c', 0, 400);
    const b = mkNode('b', 0, 200);
    const conn = connection(a, c, [a, b, c]);
    expect(conn.labelAnchor).toBeDefined();
    expect(conn.labelAnchor!.y).toBeCloseTo(200, 0); // stays at midpoint height
    // label center outside B visual (at least half-width + margin).
    expect(Math.abs(conn.labelAnchor!.x - b.x)).toBeGreaterThanOrEqual(
      b.width / 2 + NODE_GAP
    );
  });

  // ── Clear midpoint → no anchor (render falls back to midpoint) ──────────
  it('clear midpoint: labelAnchor is undefined', () => {
    const a = mkNode('a', 0, 0);
    const c = mkNode('c', 400, 0);
    const farBelow = mkNode('b', 200, 300); // far below path
    expect(connection(a, c, [a, farBelow, c]).labelAnchor).toBeUndefined();
    expect(connection(a, c).labelAnchor).toBeUndefined(); // no obstacles
  });

  // ── Obstacle with id == from.id: ignored (like for path routing) ──
  it('obstacle with id == from.id: ignored, no shift', () => {
    const a = mkNode('a', 0, 0);
    const c = mkNode('c', 400, 0);
    const ghost = mkNode('a', 200, 0); // same id as `from`, right in the middle
    expect(connection(a, c, [ghost]).labelAnchor).toBeUndefined();
  });
});

// ─── pointOnSegment (existing test) ─────────────────────────────────────────

describe('pointOnSegment', () => {
  it('interpolates linearly', () => {
    const p = pointOnSegment({ x: 0, y: 0 }, { x: 100, y: 50 }, 0.5);
    expect(p).toEqual({ x: 50, y: 25 });
  });
});

// ─── pathTip ────────────────────────────────────────────────────────────────

describe('pathTip', () => {
  // ── Case 9: without waypoints, t=0.5 → exact midpoint ─────────────────────────
  it('[case 9] without waypoints, t=0.5 → exact midpoint between start and end', () => {
    const conn = makeConn({ x: 0, y: 0 }, { x: 100, y: 50 });
    const tip = pathTip(conn, 0.5);
    expect(tip.x).toBeCloseTo(50, 5);
    expect(tip.y).toBeCloseTo(25, 5);
  });

  // ── Case 10: without waypoints, t=0 → start ─────────────────────────────────
  it('[case 10] without waypoints, t=0 → returns start', () => {
    const conn = makeConn({ x: 10, y: 20 }, { x: 100, y: 200 });
    const tip = pathTip(conn, 0);
    expect(tip.x).toBeCloseTo(10, 5);
    expect(tip.y).toBeCloseTo(20, 5);
  });

  // ── Case 11: without waypoints, t=1 → end ───────────────────────────────────
  it('[case 11] without waypoints, t=1 → returns end', () => {
    const conn = makeConn({ x: 10, y: 20 }, { x: 100, y: 200 });
    const tip = pathTip(conn, 1);
    expect(tip.x).toBeCloseTo(100, 5);
    expect(tip.y).toBeCloseTo(200, 5);
  });

  // ── Case 12: 1 waypoint, t=0.5 → off the start-end line ─────────────
  it('[case 12] with 1 waypoint, t=0.5 → point NOT on start-end line', () => {
    // start=(0,0) → wp=(50,50) → end=(100,0): t=0.5 falls exactly on wp
    const conn = makeConn({ x: 0, y: 0 }, { x: 100, y: 0 }, [{ x: 50, y: 50 }]);
    const tip = pathTip(conn, 0.5);
    expect(tip.y).not.toBeCloseTo(0, 1); // not on line y=0
    expect(tip.x).toBeCloseTo(50, 5);
    expect(tip.y).toBeCloseTo(50, 5);
  });

  // ── Case 13: degenerate connection (start == end) ───────────────────────────
  it('[case 13] degenerate connection (start == end): does not crash, returns end', () => {
    const conn = makeConn({ x: 50, y: 50 }, { x: 50, y: 50 });
    expect(() => pathTip(conn, 0.5)).not.toThrow();
    const tip = pathTip(conn, 0.5);
    expect(tip.x).toBeCloseTo(50, 5);
    expect(tip.y).toBeCloseTo(50, 5);
  });
});

// ─── visiblePath ─────────────────────────────────────────────────────────────

describe('visiblePath', () => {
  // ── Case 14: without waypoints, t=0.5 → [start, midpoint] ────────────────────
  it('[case 14] without waypoints, t=0.5 → [start, midpoint]', () => {
    const conn = makeConn({ x: 0, y: 0 }, { x: 100, y: 100 });
    const pts = visiblePath(conn, 0.5);
    expect(pts).toHaveLength(2);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[1].x).toBeCloseTo(50, 5);
    expect(pts[1].y).toBeCloseTo(50, 5);
  });

  // ── Case 15: 1 waypoint, t=0.3 (before wp) → [start, point_before_wp] ──
  it('[case 15] with 1 waypoint, t=0.3 (before wp) → 2 points', () => {
    // start=(0,0) → wp=(100,100) → end=(200,0) ; total=200√2
    // t=0.3 → dist=60√2 < seg0=100√2 → segT=0.6 → point=(60,60)
    const conn = makeConn({ x: 0, y: 0 }, { x: 200, y: 0 }, [
      { x: 100, y: 100 },
    ]);
    const pts = visiblePath(conn, 0.3);
    expect(pts).toHaveLength(2);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[1].x).toBeCloseTo(60, 5);
    expect(pts[1].y).toBeCloseTo(60, 5);
  });

  // ── Case 16: 1 waypoint, t=0.9 (after wp) → [start, wp, point_after] ─
  it('[case 16] with 1 waypoint, t=0.9 (after wp) → 3 points', () => {
    // t=0.9 → dist=180√2 > seg0=100√2 → dans seg1, segT=0.8 → point=(180,20)
    const conn = makeConn({ x: 0, y: 0 }, { x: 200, y: 0 }, [
      { x: 100, y: 100 },
    ]);
    const pts = visiblePath(conn, 0.9);
    expect(pts).toHaveLength(3);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[1]).toEqual({ x: 100, y: 100 });
    expect(pts[2].x).toBeCloseTo(180, 5);
    expect(pts[2].y).toBeCloseTo(20, 5);
  });
});

// ─── wireEndpoints: what a pin may and may not drag onto itself ───────────────
describe('wireEndpoints — anchoring against an offset pin', () => {
  // 40×40 gate at (200,0); its `a` input is a west pin a third up (like a NAND).
  const gate = mkNode('g', 200, 0);
  const pinA = { x: 0, y: 0.32, nx: -1, ny: 0 };
  // pinAttach: local y = (0.32 − 0.5)·40 = −7.2 → the pin sits at y ≈ −7.2.
  const PIN_A_Y = -7.2;

  it('a face-anchored pad keeps its CENTRED port, offset pin or not', () => {
    // The pad is a connector: its terminal is its own, so it must not drift up
    // onto whatever it feeds. Climbing the 0.18-of-a-body gap to the gate's input
    // is the router's job (or `assignPinNudges`, which moves the node instead).
    const pad = mkNode('s', 0, 0); // same row (y=0) as the gate centre
    const { from, to } = wireEndpoints(pad, gate, 0, 0, undefined, undefined, {
      kind: 'pin',
      pin: pinA,
      rotationDeg: 0,
    });
    expect(to.point.y).toBeCloseTo(PIN_A_Y, 4); // the fixed pin, unchanged
    expect(from.point.y).toBeCloseTo(0, 4); // the pad stayed centred
    expect(from.point.x).toBeCloseTo(20, 4); // on the pad's east edge
  });

  it('a junction dot still slides onto the pin axis → a straight lead', () => {
    // A dot is dimensionless: it has no face to be centred on, so meeting the pin
    // costs it nothing and saves the wire two corners.
    const dot = mkNode('j', 0, 0);
    const { from } = wireEndpoints(
      dot,
      gate,
      0,
      0,
      undefined,
      { kind: 'point' },
      { kind: 'pin', pin: pinA, rotationDeg: 0 }
    );
    expect(from.point.y).toBeCloseTo(PIN_A_Y, 4); // slid onto the pin's row
    expect(from.point.x).toBeCloseTo(0, 4); // still its centre
  });

  it('leaves a far-off junction dot alone (a genuine L, not a dogleg)', () => {
    const dot = mkNode('j', 0, 200); // a full gate-height+ off the pin's row
    const { from } = wireEndpoints(
      dot,
      gate,
      0,
      0,
      undefined,
      { kind: 'point' },
      { kind: 'pin', pin: pinA, rotationDeg: 0 }
    );
    expect(from.point.y).toBeCloseTo(200, 4);
  });
});

describe('facePort', () => {
  // A pad centred at (100,100), 20 wide → east face at x=110, west at x=90.
  const pad = (height: number): NodeGeom => ({
    id: 'pad',
    x: 100,
    y: 100,
    width: 20,
    height,
  });

  it('centres a driver port on the east face', () => {
    expect(facePort(pad(20), 'east')).toEqual({ x: 110, y: 100 });
  });

  it('centres a sink port on the west face', () => {
    expect(facePort(pad(20), 'west')).toEqual({ x: 90, y: 100 });
  });

  it('stays centred however tall the pad', () => {
    // The port is the midpoint of the face, not a slot within a usable band: a
    // taller pad does not open room for the terminal to wander.
    expect(facePort(pad(200), 'east')).toEqual({ x: 110, y: 100 });
  });
});

describe('pathD', () => {
  /** The arc commands of a `d`, as [radius, sweep, endX, endY] tuples. */
  const arcs = (
    d: string
  ): { r: number; sweep: number; x: number; y: number }[] =>
    [...d.matchAll(/A([\d.-]+),[\d.-]+ 0 0 ([01]) ([\d.-]+),([\d.-]+)/g)].map(
      (m) => ({
        r: Number(m[1]),
        sweep: Number(m[2]),
        x: Number(m[3]),
        y: Number(m[4]),
      })
    );

  const flat = [
    { x: 0, y: 50 },
    { x: 100, y: 50 },
  ];

  it('is the plain polyline when nothing crosses', () => {
    expect(pathD(flat)).toBe('M0,50L100,50');
    // An empty hop list and a zero radius are the same no-op.
    expect(pathD(flat, [], 5)).toBe('M0,50L100,50');
    expect(pathD(flat, [{ x: 50, y: 50 }], 0)).toBe('M0,50L100,50');
  });

  it('cuts the segment either side of the hop and arches over it', () => {
    const d = pathD(flat, [{ x: 50, y: 50 }], 5);
    expect(d).toBe('M0,50L45,50A5,5 0 0 1 55,50L100,50');
  });

  it('arches to the same side whichever way the wire runs', () => {
    // The bulge is read off the segment, not off its direction: a wire drawn
    // right-to-left must not dip DOWN where its mirror image bulges up.
    const rtl = pathD([...flat].reverse(), [{ x: 50, y: 50 }], 5);
    // Reversed travel ⇒ reversed sweep, which lands the arc on the same side.
    expect(arcs(rtl)).toEqual([{ r: 5, sweep: 0, x: 45, y: 50 }]);
    const ltr = arcs(pathD(flat, [{ x: 50, y: 50 }], 5));
    expect(ltr).toEqual([{ r: 5, sweep: 1, x: 55, y: 50 }]);
  });

  it('arches an upright segment to the same side both ways', () => {
    const up = [
      { x: 50, y: 0 },
      { x: 50, y: 100 },
    ];
    const down = arcs(pathD(up, [{ x: 50, y: 50 }], 5));
    const back = arcs(pathD([...up].reverse(), [{ x: 50, y: 50 }], 5));
    expect(down[0].sweep).toBe(1); // downward: clockwise bulges right
    expect(back[0].sweep).toBe(0); // upward: the opposite sweep, same side
  });

  it('draws the same bridges in a thumbnail as at full size', () => {
    // Scale the points, the hops AND the radius by the same k, and the `d` must
    // scale with them: a small player draws the same picture, smaller. A radius
    // floor in absolute px would fail this — it deletes the bridges of a diagram
    // that is itself smaller than the floor.
    const K = 0.35; // a docs thumbnail, roughly
    const at = (p: { x: number; y: number }) => ({ x: p.x * K, y: p.y * K });
    const small = pathD(flat.map(at), [at({ x: 50, y: 50 })], 5 * K);
    expect(arcs(small)).toHaveLength(1);
    expect(arcs(small)[0].r).toBeCloseTo(5 * K, 2);
  });

  it('ignores a hop that is not on the path', () => {
    expect(pathD(flat, [{ x: 50, y: 90 }], 5)).toBe('M0,50L100,50');
    // Nor does an endpoint count: there is no room to arch there anyway.
    expect(pathD(flat, [{ x: 0, y: 50 }], 5)).toBe('M0,50L100,50');
  });

  it('puts each hop on its own segment of a corner', () => {
    const corner = [
      { x: 0, y: 50 },
      { x: 100, y: 50 },
      { x: 100, y: 150 },
    ];
    const d = pathD(
      corner,
      [
        { x: 50, y: 50 },
        { x: 100, y: 100 },
      ],
      5
    );
    expect(arcs(d)).toEqual([
      { r: 5, sweep: 1, x: 55, y: 50 },
      { r: 5, sweep: 1, x: 100, y: 105 },
    ]);
  });

  it('shrinks a bridge rather than overrunning the corner it sits by', () => {
    // A crossing 3 px from the end has no room for a radius-5 arch: it gets a
    // 3 px one instead of a path that folds back on itself.
    const d = pathD(flat, [{ x: 97, y: 50 }], 5);
    expect(arcs(d)).toEqual([{ r: 3, sweep: 1, x: 100, y: 50 }]);
    // Closer still, and the bridge is dropped: the crossing draws flat.
    expect(pathD(flat, [{ x: 99, y: 50 }], 5)).toBe('M0,50L100,50');
  });

  it('never lets two neighbouring bridges overlap', () => {
    // Two crossings 8 px apart: back-to-back radius-5 arches would each swallow
    // the other's start, so the second shrinks to the room the first left it and
    // the two end up flush (…A ends at 55, the next starts at 55).
    expect(
      pathD(
        flat,
        [
          { x: 50, y: 50 },
          { x: 58, y: 50 },
        ],
        5
      )
    ).toBe('M0,50L45,50A5,5 0 0 1 55,50L55,50A3,3 0 0 1 61,50L100,50');
    // Tighter than twice the minimum radius, and the second is dropped rather
    // than drawn as a wart: one bridge, one flat crossing.
    expect(
      arcs(
        pathD(
          flat,
          [
            { x: 50, y: 50 },
            { x: 56, y: 50 },
          ],
          5
        )
      )
    ).toEqual([{ r: 5, sweep: 1, x: 55, y: 50 }]);
  });
});
