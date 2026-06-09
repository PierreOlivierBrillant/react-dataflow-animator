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
  /** Hauteur du label textuel situé sous le visuel (px). Indéfini si pas de label. */
  labelH?: number;
  /** Largeur du label textuel (px). */
  labelW?: number;
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

/** Marge (px) laissée entre un nœud et le bout des flèches / paquets. */
export const NODE_GAP = 14;

/** Espacement (px) entre le bas du visuel et le haut du label (CSS gap). */
export const LABEL_GAP = 6;

/**
 * Amplitude du décalage anti-collision, en fraction de la taille du nœud.
 * Deux voies parallèles (shift +1 / -1) sont donc séparées de 2 × ce ratio.
 */
export const SHIFT_RATIO = 0.3;

export interface Connection {
  start: Point;
  end: Point;
  /** Points intermédiaires pour contourner des labels obstacles. */
  waypoints?: Point[];
  /** Angle du dernier segment en degrés (utile pour orienter une pointe de flèche). */
  angleDeg: number;
  /** Longueur du segment tracé (après rognage aux bords). */
  length: number;
}

/**
 * Bounding rect du label d'un nœud (sous le visuel), ou null si pas de label.
 */
export function labelBounds(
  node: NodeGeom
): { x: number; y: number; w: number; h: number } | null {
  if (!node.labelH || node.labelH <= 0) return null;
  const lw = node.labelW ?? Math.max(node.width * 1.5, 60);
  return {
    x: node.x - lw / 2,
    y: node.y + node.height / 2 + LABEL_GAP,
    w: lw,
    h: node.labelH,
  };
}

/**
 * Renvoie les paramètres t d'entrée/sortie d'un segment p1→p2 dans un rect,
 * ou null si pas d'intersection (méthode des slabs).
 */
function segmentIntersectsRect(
  p1: Point,
  p2: Point,
  rect: { x: number; y: number; w: number; h: number }
): { tEntry: number; tExit: number } | null {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  let tMin = 0;
  let tMax = 1;

  if (Math.abs(dx) < 1e-10) {
    if (p1.x < rect.x || p1.x > rect.x + rect.w) return null;
  } else {
    const t1 = (rect.x - p1.x) / dx;
    const t2 = (rect.x + rect.w - p1.x) / dx;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  }

  if (Math.abs(dy) < 1e-10) {
    if (p1.y < rect.y || p1.y > rect.y + rect.h) return null;
  } else {
    const t1 = (rect.y - p1.y) / dy;
    const t2 = (rect.y + rect.h - p1.y) / dy;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  }

  if (tMin > tMax + 1e-10) return null;
  return { tEntry: tMin, tExit: tMax };
}

/**
 * Points de connexion entre deux nœuds.
 *
 * - Rogne les extrémités pour qu'elles touchent le bord des nœuds (pas le centre).
 * - Applique le décalage perpendiculaire anti-collision : `shift` ∈ {-1, 0, +1}.
 *   L'amplitude vaut `SHIFT_RATIO` × la taille moyenne des nœuds.
 * - `obstacles` : liste de tous les nœuds → repousse start/end hors des labels
 *   source/destination et insère un waypoint si le segment croise un label tiers.
 */
export function connection(
  from: NodeGeom,
  to: NodeGeom,
  obstacles?: NodeGeom[],
  startPortOffset = 0,
  endPortOffset = 0
): Connection {
  const c1 = { x: from.x, y: from.y };
  const c2 = { x: to.x, y: to.y };

  const fromRect = {
    x: from.x - from.width / 2 - NODE_GAP,
    y: from.y - from.height / 2 - NODE_GAP,
    w: from.width + 2 * NODE_GAP,
    h: from.height + 2 * NODE_GAP,
  };
  const toRect = {
    x: to.x - to.width / 2 - NODE_GAP,
    y: to.y - to.height / 2 - NODE_GAP,
    w: to.width + 2 * NODE_GAP,
    h: to.height + 2 * NODE_GAP,
  };

  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  const isHorizontal = Math.abs(dx) >= Math.abs(dy);

  const startBase = { x: c1.x, y: c1.y };
  if (isHorizontal) {
    if (dx > 0) {
      startBase.x = fromRect.x + fromRect.w;
      startBase.y = c1.y + startPortOffset;
    } else {
      startBase.x = fromRect.x;
      startBase.y = c1.y + startPortOffset;
    }
  } else {
    if (dy > 0) {
      startBase.x = c1.x + startPortOffset;
      startBase.y = fromRect.y + fromRect.h;
    } else {
      startBase.x = c1.x + startPortOffset;
      startBase.y = fromRect.y;
    }
  }

  const endBase = { x: c2.x, y: c2.y };
  if (isHorizontal) {
    if (dx > 0) {
      endBase.x = toRect.x;
      endBase.y = c2.y + endPortOffset;
    } else {
      endBase.x = toRect.x + toRect.w;
      endBase.y = c2.y + endPortOffset;
    }
  } else {
    if (dy > 0) {
      endBase.x = c2.x + endPortOffset;
      endBase.y = toRect.y;
    } else {
      endBase.x = c2.x + endPortOffset;
      endBase.y = toRect.y + toRect.h;
    }
  }

  const start: Point = startBase;
  const end: Point = endBase;

  // Détecte le premier label tiers que le segment traverse et insère un waypoint
  // juste au-dessus pour le contourner.
  let waypoints: Point[] | undefined;
  if (obstacles && obstacles.length > 0) {
    let firstT = Infinity;
    let bestWp: Point | null = null;
    for (const obs of obstacles) {
      if (obs.id === from.id || obs.id === to.id) continue;
      const lb = labelBounds(obs);
      if (!lb) continue;
      const isect = segmentIntersectsRect(start, end, lb);
      if (isect !== null && isect.tEntry < firstT && isect.tEntry > 1e-10) {
        firstT = isect.tEntry;
        const xAt = start.x + (end.x - start.x) * isect.tEntry;
        bestWp = { x: xAt, y: lb.y - NODE_GAP };
      }
    }
    if (bestWp) waypoints = [bestWp];
  }

  // Angle du dernier segment (pour la pointe de flèche).
  const lastPt = waypoints ? waypoints[waypoints.length - 1] : start;
  const angleDeg =
    (Math.atan2(end.y - lastPt.y, end.x - lastPt.x) * 180) / Math.PI;

  return {
    start,
    end,
    waypoints,
    angleDeg,
    length: length(sub(end, start)),
  };
}

/** Point intermédiaire d'un segment, pour positionner un paquet en mouvement. */
export function pointOnSegment(start: Point, end: Point, t: number): Point {
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
  };
}

/**
 * Position et angle au paramètre t ∈ [0,1] le long du chemin complet
 * (start → waypoints → end). Utilisé pour animer la pointe de flèche
 * et les paquets en mouvement.
 */
export function pathTip(
  conn: Connection,
  t: number
): { x: number; y: number; angleDeg: number } {
  if (!conn.waypoints?.length) {
    return {
      x: conn.start.x + (conn.end.x - conn.start.x) * t,
      y: conn.start.y + (conn.end.y - conn.start.y) * t,
      angleDeg: conn.angleDeg,
    };
  }
  const pts = [conn.start, ...conn.waypoints, conn.end];
  let totalLen = 0;
  const segLens: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    segLens.push(l);
    totalLen += l;
  }
  if (totalLen < 1e-10)
    return { x: conn.end.x, y: conn.end.y, angleDeg: conn.angleDeg };
  let dist = t * totalLen;
  for (let i = 0; i < segLens.length; i++) {
    if (dist <= segLens[i] || i === segLens.length - 1) {
      const segT = segLens[i] > 1e-10 ? Math.min(dist / segLens[i], 1) : 1;
      return {
        x: pts[i].x + (pts[i + 1].x - pts[i].x) * segT,
        y: pts[i].y + (pts[i + 1].y - pts[i].y) * segT,
        angleDeg:
          (Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x) * 180) /
          Math.PI,
      };
    }
    dist -= segLens[i];
  }
  return { x: conn.end.x, y: conn.end.y, angleDeg: conn.angleDeg };
}

/**
 * Points du chemin visible de start jusqu'à la position t.
 * Retourne start + éventuels waypoints déjà dépassés + tip courant.
 * Utilisé par ArrowLine pour tracer le trait progressif.
 */
export function visiblePath(conn: Connection, t: number): Point[] {
  if (!conn.waypoints?.length) {
    return [
      conn.start,
      {
        x: conn.start.x + (conn.end.x - conn.start.x) * t,
        y: conn.start.y + (conn.end.y - conn.start.y) * t,
      },
    ];
  }
  const pts = [conn.start, ...conn.waypoints, conn.end];
  let totalLen = 0;
  const segLens: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    segLens.push(l);
    totalLen += l;
  }
  const result: Point[] = [pts[0]];
  let dist = t * totalLen;
  for (let i = 0; i < segLens.length; i++) {
    if (dist <= segLens[i] || i === segLens.length - 1) {
      const segT = segLens[i] > 1e-10 ? Math.min(dist / segLens[i], 1) : 1;
      result.push({
        x: pts[i].x + (pts[i + 1].x - pts[i].x) * segT,
        y: pts[i].y + (pts[i + 1].y - pts[i].y) * segT,
      });
      return result;
    }
    result.push(pts[i + 1]);
    dist -= segLens[i];
  }
  return result;
}
