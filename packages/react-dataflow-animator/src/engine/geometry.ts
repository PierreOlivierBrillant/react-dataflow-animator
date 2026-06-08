/**
 * Calcul vectoriel : points de connexion entre nœuds, décalage anti-collision
 * (path shifting) et utilitaires de tracé. Toutes les coordonnées sont relatives
 * au conteneur « Stage ».
 */

export interface Point {
  x: number;
  y: number;
}

/** Position et taille mesurées d'un nœud statique, relatives au Stage. */
export interface NodeGeom {
  id: string;
  /** Centre du nœud. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export type GeometryMap = Record<string, NodeGeom>;

export function center(node: NodeGeom): Point {
  return { x: node.x, y: node.y };
}

function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

function length(v: Point): number {
  return Math.hypot(v.x, v.y);
}

/** Rayon approximatif d'un nœud (pour faire toucher les flèches à ses bords). */
function radius(node: NodeGeom): number {
  return Math.min(node.width, node.height) / 2;
}

/** Marge (px) laissée entre un nœud et le bout des flèches / paquets. */
export const NODE_GAP = 8;

/**
 * Amplitude du décalage anti-collision, en fraction de la taille du nœud.
 * Deux voies parallèles (shift +1 / -1) sont donc séparées de 2 × ce ratio.
 */
export const SHIFT_RATIO = 0.3;

export interface Connection {
  start: Point;
  end: Point;
  /** Angle du segment en degrés (utile pour orienter une pointe de flèche). */
  angleDeg: number;
  /** Longueur du segment tracé (après rognage aux bords). */
  length: number;
}

/**
 * Points de connexion entre deux nœuds.
 *
 * - Rogne les extrémités pour qu'elles touchent le bord des nœuds (pas le centre).
 * - Applique le décalage perpendiculaire anti-collision : `shift` ∈ {-1, 0, +1}.
 *   L'amplitude vaut `SHIFT_RATIO` × la taille moyenne des nœuds.
 */
export function connection(
  from: NodeGeom,
  to: NodeGeom,
  shift = 0,
): Connection {
  const c1 = center(from);
  const c2 = center(to);
  const raw = sub(c2, c1);
  const len = length(raw) || 1;
  const unit = { x: raw.x / len, y: raw.y / len }; // sens de parcours from -> to

  // Perpendiculaire dans un repère CANONIQUE (indépendant du sens de parcours) :
  // sinon, pour A->B et B->A, unit ET shift s'inversent tous les deux et le
  // décalage s'annule -> les deux flèches se superposent. On fige donc la base.
  const canon = from.id <= to.id ? 1 : -1;
  const perp = { x: -unit.y * canon, y: unit.x * canon };

  const nodeSize = (from.width + to.width) / 2;
  const offset = shift * SHIFT_RATIO * nodeSize;

  // Marge : les flèches/paquets s'arrêtent à quelques pixels du nœud.
  const start: Point = {
    x: c1.x + unit.x * (radius(from) + NODE_GAP) + perp.x * offset,
    y: c1.y + unit.y * (radius(from) + NODE_GAP) + perp.y * offset,
  };
  const end: Point = {
    x: c2.x - unit.x * (radius(to) + NODE_GAP) + perp.x * offset,
    y: c2.y - unit.y * (radius(to) + NODE_GAP) + perp.y * offset,
  };

  return {
    start,
    end,
    angleDeg: (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI,
    length: length(sub(end, start)),
  };
}

/** Point intermédiaire d'un segment, pour positionner un paquet en mouvement. */
export function pointOnSegment(start: Point, end: Point, t: number): Point {
  return { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t };
}
