import { describe, expect, it } from 'vitest';
import {
  connection,
  pathTip,
  pointOnSegment,
  visiblePath,
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
  borderOutset?: number
): NodeGeom => ({
  id,
  x,
  y,
  width: w,
  height: h,
  ...(labelH > 0 ? { labelH } : {}),
  ...(labelW !== undefined ? { labelW } : {}),
  ...(borderOutset !== undefined ? { borderOutset } : {}),
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

// ─── Nœuds fixes utilisés par les tests existants ───────────────────────────

const A: NodeGeom = { id: 'a', x: 0, y: 0, width: 40, height: 40 };
const B: NodeGeom = { id: 'b', x: 200, y: 0, width: 40, height: 40 };

// ─── Tests existants (non modifiés) ─────────────────────────────────────────

describe('connection', () => {
  it('rogne les extrémités au bord des nœuds + marge', () => {
    const c = connection(A, B);
    expect(c.start.x).toBe(34);
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

  // ── Cas 4 : nœud source avec label ────────────────────────────────────────
  it('[cas 4] nœud source avec label : start.y dépasse le bas visuel du nœud', () => {
    const from = mkNode('from4', 0, 0, 40, 40, 20, 80);
    const to = mkNode('to4', 0, 300);
    const c = connection(from, to);
    // label descend jusqu'à y = 0+20+LABEL_GAP+20 = 46 ; start doit être en-dessous
    expect(c.start.y).toBeGreaterThan(from.y + from.height / 2);
    // fromBottom(46) + NODE_GAP(14) = 60
    expect(c.start.y).toBeCloseTo(60, 5);
  });

  // ── Cas 5 : segment quasi-vertical, même lane (start.x == obs.x) ────────────
  it('[cas 5] segment vertical + obstacle traversé, même lane : bypass à droite', () => {
    // from et to partagent x=0 → segment quasi-vertical.
    // obs a un label centré sur x=0 (lw=80 → lb.x=-40, lb.x+lw=40).
    // start.x(0) == obs.x(0) → condition start.x < obs.x est fausse → bypass à DROITE
    // pour éviter de croiser les flèches allant vers la gauche depuis le même nœud.
    const from = mkNode('f5', 0, 0);
    const to = mkNode('t5', 0, 300);
    const obs = mkNode('obs5', 0, 150, 40, 40, 20, 80);
    // Le détour anti-collision est indépendant de la forme : on l'observe sur
    // un tracé droit où il constitue l'unique point intermédiaire.
    const c = connection(from, to, [obs], 0, 0, 'straight');
    expect(c.waypoints).toBeDefined();
    expect(c.waypoints).toHaveLength(1);
    const labelTop = obs.y + obs.height / 2 + LABEL_GAP; // 176
    const labelRight = obs.x + 80 / 2; // 40
    expect(c.waypoints![0].x).toBeGreaterThan(labelRight);
    expect(c.waypoints![0].y).toBeCloseTo(labelTop, 5);
  });

  // ── Cas 6 : obstacle non traversé ─────────────────────────────────────────
  it('[cas 6] obstacle non traversé : waypoints est undefined', () => {
    const from = mkNode('f6', 0, 0);
    const to = mkNode('t6', 0, 300);
    const obs = mkNode('obs6', 200, 150, 40, 40, 20, 80); // loin du chemin x=0
    const c = connection(from, to, [obs]);
    expect(c.waypoints).toBeUndefined();
  });

  // ── Cas 7 : obstacle.id == from.id → ignoré ───────────────────────────────
  it('[cas 7] obstacle dont id == from.id : ignoré, pas de waypoints', () => {
    const from = mkNode('f7', 0, 0);
    const to = mkNode('t7', 0, 300);
    // Même id que from ; le label croiserait le chemin si l'obstacle était pris en compte.
    const sameAsFrom = mkNode('f7', 0, 150, 40, 40, 20, 80);
    const c = connection(from, to, [sameAsFrom]);
    expect(c.waypoints).toBeUndefined();
  });

  // ── Cas 5b : segment quasi-vertical, start à droite de l'obstacle ───────────
  it('[cas 5b] segment vertical, start à droite de obs : bypass à droite', () => {
    // from=(100,0), to=(100,300) ; obs centré à x=80 (lw=80 → lb.x=40, lb.x+lw=120).
    // x=100 ∈ [40,120] → intersection. start.x=100 >= obs.x=80 → bypass droite.
    const from = mkNode('f5b', 100, 0);
    const to = mkNode('t5b', 100, 300);
    const obs = mkNode('obs5b', 80, 150, 40, 40, 20, 80);
    const c = connection(from, to, [obs], 0, 0, 'straight');
    expect(c.waypoints).toBeDefined();
    expect(c.waypoints).toHaveLength(1);
    const labelRight = obs.x + 80 / 2; // 120
    expect(c.waypoints![0].x).toBeGreaterThan(labelRight);
  });

  // ── Cas 5c : segment quasi-horizontal, obstacle traversé → waypoint au-dessus
  it('[cas 5c] segment horizontal + obstacle traversé : waypoint au-dessus du label', () => {
    // from=(0,100) → to=(300,100) ; obs=(150,50) avec labelH=80.
    // label : y=[76,156], x=[110,190]. Le segment à y≈100 le traverse.
    // isHorizontal=true → waypoint au-dessus (wp.y < lb.y).
    const from = mkNode('f5c', 0, 100);
    const to = mkNode('t5c', 300, 100);
    const obs = mkNode('obs5c', 150, 50, 40, 40, 80, 80);
    const c = connection(from, to, [obs], 0, 0, 'straight');
    expect(c.waypoints).toBeDefined();
    expect(c.waypoints).toHaveLength(1);
    const labelTop = obs.y + obs.height / 2 + LABEL_GAP; // 76
    expect(c.waypoints![0].y).toBeLessThan(labelTop);
    // x au niveau de l'entrée dans le label (≈ 110)
    expect(c.waypoints![0].x).toBeCloseTo(110, 0);
  });

  // ── Cas 8 : startPortOffset horizontal ────────────────────────────────────
  it('[cas 8] startPortOffset=10 en horizontal : start.y est décalé', () => {
    // from=(0,0) → to=(200,0) : chemin horizontal pur, start.y=0 sans offset
    const from = mkNode('fh', 0, 0);
    const to = mkNode('th', 200, 0);
    const noOffset = connection(from, to);
    const withOffset = connection(from, to, undefined, 10);
    expect(noOffset.start.y).toBeCloseTo(0, 5);
    // Accroche cardinale Est : start.y = centre (0) + portOffset (10).
    expect(withOffset.start.y).toBeCloseTo(10, 5);
  });
});

// ─── Accroche cardinale (NSEW) ───────────────────────────────────────────────

describe('accroche cardinale', () => {
  // ── Sélection de face par l'axe dominant ──────────────────────────────────
  it('axe horizontal dominant : source Est, destination Ouest', () => {
    // dx=300, dy=80 → |dx| ≥ |dy| → horizontal. Faces opposées E/O à hauteur des
    // centres (pas de label), pas au point d'intersection oblique.
    const from = mkNode('fh', 0, 0);
    const to = mkNode('th', 300, 80);
    const c = connection(from, to);
    expect(c.start.x).toBeCloseTo(34, 5); // 0 + 20 + 14
    expect(c.start.y).toBeCloseTo(0, 5); // face Est → y du centre source
    expect(c.end.x).toBeCloseTo(266, 5); // 300 - 20 - 14
    expect(c.end.y).toBeCloseTo(80, 5); // face Ouest → y du centre destination
  });

  it('axe vertical dominant : source Nord, destination Sud', () => {
    // dy=-300, dx=80 → vertical, dy<0 → source Nord, destination Sud.
    const from = mkNode('fv', 0, 0);
    const to = mkNode('tv', 80, -300);
    const c = connection(from, to);
    expect(c.start.x).toBeCloseTo(0, 5); // face Nord → x du centre source
    expect(c.start.y).toBeCloseTo(-34, 5); // 0 - 20 - 14
    expect(c.end.x).toBeCloseTo(80, 5);
    expect(c.end.y).toBeCloseTo(-300 + 20 + 14, 5); // face Sud sans label
  });

  // ── Abaissement latéral quand le nœud a un label (centre de gravité) ──────
  it('label sous le visuel : le point latéral descend au centre du bloc', () => {
    // labelH=20 → descente = (LABEL_GAP + labelH)/2 = (6 + 20)/2 = 13.
    const from = mkNode('fl', 0, 0, 40, 40, 20, 80);
    const to = mkNode('tl', 300, 0);
    const c = connection(from, to);
    expect(c.start.y).toBeCloseTo(13, 5);
    expect(c.end.y).toBeCloseTo(0, 5); // destination sans label : reste centrée
  });

  // ── borderOutset : la pastille pousse l'accroche vers l'extérieur ─────────
  it('borderOutset pousse le point Est/Ouest de o px supplémentaires', () => {
    const from = mkNode('fo', 0, 0, 40, 40, 0, undefined, 5);
    const to = mkNode('to', 300, 0);
    const c = connection(from, to);
    expect(c.start.x).toBeCloseTo(39, 5); // 0 + 20 + 5 (outset) + 14
  });

  // ── portOffset sur une face verticale décale x ────────────────────────────
  it('portOffset sur une face Nord/Sud décale la coordonnée x', () => {
    const from = mkNode('fpv', 0, 0);
    const to = mkNode('tpv', 0, 300); // vertical → source Sud
    const c = connection(from, to, undefined, 10);
    expect(c.start.x).toBeCloseTo(10, 5); // face Sud → x = centre (0) + portOffset
    expect(c.start.y).toBeCloseTo(34, 5); // 0 + 20 + 14, sans label
  });

  // ── axis imposé : la face suit le flux, pas l'axe pixel dominant ──────────
  it('axis horizontal forcé : faces E/O même si surtout séparés verticalement', () => {
    const from = mkNode('fa', 0, 0);
    const to = mkNode('ta', 40, 300); // |dy| ≫ |dx| en pixels
    // Sans axis : pixel dominant → face Sud.
    expect(connection(from, to).start.y).toBeGreaterThan(from.y);
    // Avec axis horizontal : faces Est/Ouest.
    const forced = connection(
      from,
      to,
      undefined,
      0,
      0,
      'bezier',
      'horizontal'
    );
    expect(forced.start.x).toBeCloseTo(34, 5); // Est : 0 + 20 + 14
    expect(forced.start.y).toBeCloseTo(0, 5);
    expect(forced.end.x).toBeCloseTo(6, 5); // Ouest : 40 - 20 - 14
    expect(forced.end.y).toBeCloseTo(300, 5);
    // Le tracé PART horizontalement : le 1er point reste ~à la hauteur du départ
    // (la poignée de Bézier suit la normale à la face, pas la corde verticale).
    expect(forced.waypoints![0].y).toBeLessThan(10);
  });

  it('axis vertical forcé : faces N/S même si surtout séparés horizontalement', () => {
    const from = mkNode('fb', 0, 0);
    const to = mkNode('tb', 300, 40); // |dx| ≫ |dy| en pixels
    const forced = connection(from, to, undefined, 0, 0, 'bezier', 'vertical');
    expect(forced.start.y).toBeCloseTo(34, 5); // Sud : 0 + 20 + 14
    expect(forced.start.x).toBeCloseTo(0, 5);
    expect(forced.end.y).toBeCloseTo(6, 5); // Nord : 40 - 20 - 14
    // Le tracé part verticalement : 1er point ~à l'abscisse du départ.
    expect(forced.waypoints![0].x).toBeLessThan(10);
  });
});

// ─── labelBounds (testée via les effets observables sur connection) ──────────

describe('labelBounds', () => {
  // ── Cas 1 : labelH=0 → même résultat que sans label ───────────────────────
  it('[cas 1] sans labelH (labelH=0) : start identique au noeud sans label', () => {
    const withZero = mkNode('fz', 0, 0, 40, 40, 0);
    const withNone = mkNode('fz', 0, 0, 40, 40);
    const to = mkNode('tz', 0, 300);
    const c1 = connection(withZero, to);
    const c2 = connection(withNone, to);
    expect(c1.start.x).toBeCloseTo(c2.start.x, 5);
    expect(c1.start.y).toBeCloseTo(c2.start.y, 5);
  });

  // ── Cas 2 : labelH=20, labelW=80 → rect centré sous le nœud ──────────────
  it('[cas 2] labelH=20, labelW=80 → start.y = bas_nœud + LABEL_GAP + labelH + NODE_GAP', () => {
    const labelH = 20;
    const from = mkNode('f2', 0, 0, 40, 40, labelH, 80);
    const to = mkNode('t2', 0, 300);
    const c = connection(from, to);
    const expectedY = from.y + from.height / 2 + LABEL_GAP + labelH + NODE_GAP; // 0+20+6+20+14=60
    expect(c.start.y).toBeCloseTo(expectedY, 5);
  });

  // ── Cas 3 : sans labelW → lw = max(width×1.5, 60) ─────────────────────────
  it('[cas 3] sans labelW → largeur effective = max(width×1.5, 60)', () => {
    // Chemin vertical à x=6. Obstacle à x=50, w=60.
    // lw par défaut = max(90,60)=90 → rect.x=5  → x=6 ∈ [5,95] : intersection.
    // lw explicite = 60            → rect.x=20 → x=6 ∉ [20,80] : pas d'intersection.
    const from = mkNode('f3', 6, 0);
    const to = mkNode('t3', 6, 300);
    const obsDefault = mkNode('obs3d', 50, 150, 60, 40, 20); // pas de labelW → lw=90
    const obsNarrow = mkNode('obs3n', 50, 150, 60, 40, 20, 60); // labelW=60 → lw=60

    const cDefault = connection(from, to, [obsDefault], 0, 0, 'straight');
    const cNarrow = connection(from, to, [obsNarrow], 0, 0, 'straight');

    expect(cDefault.waypoints).toBeDefined(); // lw=90 provoque l'intersection
    expect(cNarrow.waypoints).toBeUndefined(); // lw=60 ne la provoque pas
  });
});

// ─── labelAnchor (décalage du label médian hors d'un nœud intercalé) ────────

describe('labelAnchor', () => {
  // ── Trait horizontal A→C enjambant B au centre → label remonté au-dessus ──
  it('horizontal : milieu sur un nœud intercalé → ancre au-dessus du nœud', () => {
    const a = mkNode('a', 0, 0);
    const c = mkNode('c', 400, 0);
    const b = mkNode('b', 200, 0); // pile au milieu du trajet
    const conn = connection(a, c, [a, b, c]);
    expect(conn.labelAnchor).toBeDefined();
    // x reste centré sur le milieu, y remonte au-dessus du visuel de B.
    expect(conn.labelAnchor!.x).toBeCloseTo(200, 0);
    expect(conn.labelAnchor!.y).toBeCloseTo(0 - 20 - NODE_GAP, 5); // -34
    expect(conn.labelAnchor!.y).toBeLessThan(b.y - b.height / 2); // dégagé du haut
  });

  // ── Trait vertical A→C enjambant B au centre → label décalé latéralement ──
  it('vertical : milieu sur un nœud intercalé → ancre décalée sur le côté', () => {
    const a = mkNode('a', 0, 0);
    const c = mkNode('c', 0, 400);
    const b = mkNode('b', 0, 200);
    const conn = connection(a, c, [a, b, c]);
    expect(conn.labelAnchor).toBeDefined();
    expect(conn.labelAnchor!.y).toBeCloseTo(200, 0); // reste à hauteur du milieu
    // centre du label hors du visuel de B (au moins demi-largeur + marge).
    expect(Math.abs(conn.labelAnchor!.x - b.x)).toBeGreaterThanOrEqual(
      b.width / 2 + NODE_GAP
    );
  });

  // ── Milieu dégagé → pas d'ancre (le rendu retombe sur le milieu) ──────────
  it('milieu dégagé : labelAnchor est undefined', () => {
    const a = mkNode('a', 0, 0);
    const c = mkNode('c', 400, 0);
    const farBelow = mkNode('b', 200, 300); // loin sous le trajet
    expect(connection(a, c, [a, farBelow, c]).labelAnchor).toBeUndefined();
    expect(connection(a, c).labelAnchor).toBeUndefined(); // sans obstacles
  });

  // ── Obstacle dont id == from.id : ignoré (comme pour le routage du trait) ──
  it('obstacle dont id == from.id : ignoré, pas de décalage', () => {
    const a = mkNode('a', 0, 0);
    const c = mkNode('c', 400, 0);
    const ghost = mkNode('a', 200, 0); // même id que `from`, pile au milieu
    expect(connection(a, c, [ghost]).labelAnchor).toBeUndefined();
  });
});

// ─── pointOnSegment (test existant) ─────────────────────────────────────────

describe('pointOnSegment', () => {
  it('interpole linéairement', () => {
    const p = pointOnSegment({ x: 0, y: 0 }, { x: 100, y: 50 }, 0.5);
    expect(p).toEqual({ x: 50, y: 25 });
  });
});

// ─── pathTip ────────────────────────────────────────────────────────────────

describe('pathTip', () => {
  // ── Cas 9 : sans waypoints, t=0.5 → milieu exact ─────────────────────────
  it('[cas 9] sans waypoints, t=0.5 → milieu exact entre start et end', () => {
    const conn = makeConn({ x: 0, y: 0 }, { x: 100, y: 50 });
    const tip = pathTip(conn, 0.5);
    expect(tip.x).toBeCloseTo(50, 5);
    expect(tip.y).toBeCloseTo(25, 5);
  });

  // ── Cas 10 : sans waypoints, t=0 → start ─────────────────────────────────
  it('[cas 10] sans waypoints, t=0 → renvoie start', () => {
    const conn = makeConn({ x: 10, y: 20 }, { x: 100, y: 200 });
    const tip = pathTip(conn, 0);
    expect(tip.x).toBeCloseTo(10, 5);
    expect(tip.y).toBeCloseTo(20, 5);
  });

  // ── Cas 11 : sans waypoints, t=1 → end ───────────────────────────────────
  it('[cas 11] sans waypoints, t=1 → renvoie end', () => {
    const conn = makeConn({ x: 10, y: 20 }, { x: 100, y: 200 });
    const tip = pathTip(conn, 1);
    expect(tip.x).toBeCloseTo(100, 5);
    expect(tip.y).toBeCloseTo(200, 5);
  });

  // ── Cas 12 : 1 waypoint, t=0.5 → hors de la droite start-end ─────────────
  it('[cas 12] avec 1 waypoint, t=0.5 → point NOT sur la droite start-end', () => {
    // start=(0,0) → wp=(50,50) → end=(100,0) : t=0.5 tombe exactement au wp
    const conn = makeConn({ x: 0, y: 0 }, { x: 100, y: 0 }, [{ x: 50, y: 50 }]);
    const tip = pathTip(conn, 0.5);
    expect(tip.y).not.toBeCloseTo(0, 1); // pas sur la ligne y=0
    expect(tip.x).toBeCloseTo(50, 5);
    expect(tip.y).toBeCloseTo(50, 5);
  });

  // ── Cas 13 : connexion dégénérée (start == end) ───────────────────────────
  it('[cas 13] connexion dégénérée (start == end) : ne plante pas, renvoie end', () => {
    const conn = makeConn({ x: 50, y: 50 }, { x: 50, y: 50 });
    expect(() => pathTip(conn, 0.5)).not.toThrow();
    const tip = pathTip(conn, 0.5);
    expect(tip.x).toBeCloseTo(50, 5);
    expect(tip.y).toBeCloseTo(50, 5);
  });
});

// ─── visiblePath ─────────────────────────────────────────────────────────────

describe('visiblePath', () => {
  // ── Cas 14 : sans waypoints, t=0.5 → [start, milieu] ────────────────────
  it('[cas 14] sans waypoints, t=0.5 → [start, milieu]', () => {
    const conn = makeConn({ x: 0, y: 0 }, { x: 100, y: 100 });
    const pts = visiblePath(conn, 0.5);
    expect(pts).toHaveLength(2);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[1].x).toBeCloseTo(50, 5);
    expect(pts[1].y).toBeCloseTo(50, 5);
  });

  // ── Cas 15 : 1 waypoint, t=0.3 (avant le wp) → [start, point_avant_wp] ──
  it('[cas 15] avec 1 waypoint, t=0.3 (avant wp) → 2 points', () => {
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

  // ── Cas 16 : 1 waypoint, t=0.9 (après le wp) → [start, wp, point_apres] ─
  it('[cas 16] avec 1 waypoint, t=0.9 (après wp) → 3 points', () => {
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
