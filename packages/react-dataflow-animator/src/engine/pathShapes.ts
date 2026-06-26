/**
 * Transforme une polyligne de contrôle (`[start, …détours, end]`) en points
 * intermédiaires selon la {@link PathShape} demandée. Le résultat est consommé
 * tel quel par `connection()` (champ `waypoints`) : `pathTip`/`visiblePath`
 * parcourent la polyligne par longueur d'arc, si bien qu'une courbe échantillonnée
 * en N points anime la pointe de flèche et les paquets exactement comme un trait.
 *
 * Renvoyer `undefined` signifie « aucun point intermédiaire » : le tracé est un
 * segment droit `start → end`. C'est le cas le plus courant (nœuds alignés), pour
 * lequel toutes les formes se confondent — on évite alors d'émettre des points
 * inutiles.
 */

import type { Point } from './geometry';
import type { PathShape } from '../types';

/** Échantillons par segment de courbe de Bézier (points strictement intérieurs). */
const BEZIER_SAMPLES = 18;
/** Échantillons pour arrondir un coin de smoothstep (quart de tour). */
const CORNER_SAMPLES = 6;
/** Rayon (px) des coins arrondis de smoothstep. */
const SMOOTH_RADIUS = 14;
/**
 * En-deçà de ce décalage transverse (px), une Bézier à 2 points de contrôle est
 * rectiligne : on n'émet aucun point intermédiaire (cas aligné le plus courant).
 */
const STRAIGHT_EPS = 0.5;

export function shapeWaypoints(
  control: Point[],
  shape: PathShape
): Point[] | undefined {
  // control = [start, …détours anti-collision, end] (longueur ≥ 2).
  switch (shape) {
    case 'straight':
      // Les seuls points intermédiaires sont les détours déjà calculés.
      return control.length > 2 ? control.slice(1, -1) : undefined;
    case 'step':
    case 'smoothstep':
      return stepWaypoints(control, shape === 'smoothstep');
    case 'simplebezier':
      return curveWaypoints(control, true);
    case 'bezier':
    default:
      return curveWaypoints(control, false);
  }
}

// ─── Bézier ──────────────────────────────────────────────────────────────────

/**
 * Décalage des points de contrôle le long de l'axe dominant :
 * - bezier : moitié de l'écart → courbe en S marquée (façon React Flow) ;
 * - simplebezier : quart de l'écart → courbe plus discrète.
 */
function ctrlOffset(primaryDelta: number, simple: boolean): number {
  return (simple ? 0.25 : 0.5) * primaryDelta;
}

function cubicAt(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  const w0 = u * u * u;
  const w1 = 3 * u * u * t;
  const w2 = 3 * u * t * t;
  const w3 = t * t * t;
  return {
    x: w0 * p0.x + w1 * p1.x + w2 * p2.x + w3 * p3.x,
    y: w0 * p0.y + w1 * p1.y + w2 * p2.y + w3 * p3.y,
  };
}

/** Points STRICTEMENT intérieurs (a et b exclus) d'une cubique a→b dont les
 *  poignées suivent l'axe dominant du segment. */
function bezierBetween(a: Point, b: Point, simple: boolean): Point[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  let cp1: Point;
  let cp2: Point;
  if (horizontal) {
    const off = ctrlOffset(dx, simple);
    cp1 = { x: a.x + off, y: a.y };
    cp2 = { x: b.x - off, y: b.y };
  } else {
    const off = ctrlOffset(dy, simple);
    cp1 = { x: a.x, y: a.y + off };
    cp2 = { x: b.x, y: b.y - off };
  }
  const pts: Point[] = [];
  for (let i = 1; i < BEZIER_SAMPLES; i++) {
    pts.push(cubicAt(a, cp1, cp2, b, i / BEZIER_SAMPLES));
  }
  return pts;
}

function curveWaypoints(
  control: Point[],
  simple: boolean
): Point[] | undefined {
  if (control.length === 2) {
    const [a, b] = control;
    const horizontal = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
    const crossDelta = horizontal ? b.y - a.y : b.x - a.x;
    // Aucun décalage transverse → la cubique se confond avec le segment droit.
    if (Math.abs(crossDelta) < STRAIGHT_EPS) return undefined;
    return bezierBetween(a, b, simple);
  }
  // Détour(s) présents : on enchaîne une cubique par segment de contrôle, en
  // réinsérant chaque point de jonction pour que la courbe le traverse.
  const out: Point[] = [];
  for (let i = 0; i < control.length - 1; i++) {
    out.push(...bezierBetween(control[i], control[i + 1], simple));
    if (i < control.length - 2) out.push(control[i + 1]);
  }
  return out;
}

// ─── Step / SmoothStep ───────────────────────────────────────────────────────

/** Deux coins orthogonaux reliant a→b (mi-parcours sur l'axe dominant). */
function stepCorners(a: Point, b: Point): Point[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    const mx = (a.x + b.x) / 2;
    return [
      { x: mx, y: a.y },
      { x: mx, y: b.y },
    ];
  }
  const my = (a.y + b.y) / 2;
  return [
    { x: a.x, y: my },
    { x: b.x, y: my },
  ];
}

function dedupe(pts: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 1e-6) out.push(p);
  }
  return out;
}

function stepWaypoints(control: Point[], smooth: boolean): Point[] | undefined {
  // Polyligne orthogonale complète (extrémités incluses).
  const ortho: Point[] = [control[0]];
  for (let i = 0; i < control.length - 1; i++) {
    ortho.push(...stepCorners(control[i], control[i + 1]));
    ortho.push(control[i + 1]);
  }
  const poly = dedupe(ortho);
  // Tout est aligné → coins dégénérés supprimés → trait droit.
  if (poly.length <= 2) return undefined;
  if (!smooth) return poly.slice(1, -1);
  return roundCorners(poly);
}

function quadAt(p0: Point, c: Point, p1: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x,
    y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y,
  };
}

/** Remplace chaque sommet intérieur d'une polyligne orthogonale par un arc
 *  (quadratique, point de contrôle = le sommet). Renvoie les points intérieurs. */
function roundCorners(poly: Point[]): Point[] {
  const out: Point[] = [];
  for (let i = 1; i < poly.length - 1; i++) {
    const v = poly[i];
    const p = poly[i - 1];
    const n = poly[i + 1];
    const lenP = Math.hypot(p.x - v.x, p.y - v.y);
    const lenN = Math.hypot(n.x - v.x, n.y - v.y);
    const r = Math.min(SMOOTH_RADIUS, lenP / 2, lenN / 2);
    if (r < 0.5) {
      out.push(v);
      continue;
    }
    const entry = {
      x: v.x + ((p.x - v.x) / lenP) * r,
      y: v.y + ((p.y - v.y) / lenP) * r,
    };
    const exit = {
      x: v.x + ((n.x - v.x) / lenN) * r,
      y: v.y + ((n.y - v.y) / lenN) * r,
    };
    out.push(entry);
    for (let k = 1; k < CORNER_SAMPLES; k++) {
      out.push(quadAt(entry, v, exit, k / CORNER_SAMPLES));
    }
    out.push(exit);
  }
  return out;
}
