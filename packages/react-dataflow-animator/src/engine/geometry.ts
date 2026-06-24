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

/** Marge (px) laissée entre un nœud et le bout des flèches / paquets. */
const NODE_GAP = 14;

/** Espacement (px) entre le bas du visuel et le haut du label (CSS gap). */
const LABEL_GAP = 6;

export interface Connection {
  start: Point;
  end: Point;
  /** Points intermédiaires pour contourner des labels obstacles. */
  waypoints?: Point[];
  /** Angle du dernier segment en degrés (utile pour orienter une pointe de flèche). */
  angleDeg: number;
  /**
   * Ancre du label médian. Indéfinie quand le milieu du chemin est dégagé (le
   * rendu retombe alors sur ce milieu) ; définie et décalée perpendiculairement
   * au trait quand le milieu tomberait sur le visuel d'un nœud intercalé.
   */
  labelAnchor?: Point;
}

/**
 * Bounding rect du label d'un nœud (sous le visuel), ou null si pas de label.
 */
function labelBounds(
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

  const lbFrom = labelBounds(from);
  const fromBottom = lbFrom
    ? Math.max(from.y + from.height / 2, lbFrom.y + lbFrom.h)
    : from.y + from.height / 2;
  const fromRect = {
    x: from.x - from.width / 2 - NODE_GAP,
    y: from.y - from.height / 2 - NODE_GAP,
    w: from.width + 2 * NODE_GAP,
    h: fromBottom - (from.y - from.height / 2) + 2 * NODE_GAP,
  };

  const lbTo = labelBounds(to);
  const toBottom = lbTo
    ? Math.max(to.y + to.height / 2, lbTo.y + lbTo.h)
    : to.y + to.height / 2;
  const toRect = {
    x: to.x - to.width / 2 - NODE_GAP,
    y: to.y - to.height / 2 - NODE_GAP,
    w: to.width + 2 * NODE_GAP,
    h: toBottom - (to.y - to.height / 2) + 2 * NODE_GAP,
  };

  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  const isHorizontal = Math.abs(dx) >= Math.abs(dy);

  const c1_s = { x: c1.x, y: c1.y };
  const c2_s = { x: c2.x, y: c2.y };

  if (isHorizontal) {
    c1_s.y += startPortOffset;
    c2_s.y += endPortOffset;
  } else {
    c1_s.x += startPortOffset;
    c2_s.x += endPortOffset;
  }

  const isectFrom = segmentIntersectsRect(c1_s, c2_s, fromRect);
  const startBase = isectFrom
    ? {
        x: c1_s.x + (c2_s.x - c1_s.x) * isectFrom.tExit,
        y: c1_s.y + (c2_s.y - c1_s.y) * isectFrom.tExit,
      }
    : c1_s;

  const isectTo = segmentIntersectsRect(c1_s, c2_s, toRect);
  const endBase = isectTo
    ? {
        x: c1_s.x + (c2_s.x - c1_s.x) * isectTo.tEntry,
        y: c1_s.y + (c2_s.y - c1_s.y) * isectTo.tEntry,
      }
    : c2_s;

  const start: Point = startBase;
  const end: Point = endBase;

  // Détecte le premier label tiers que le segment traverse et insère un waypoint
  // juste au-dessus pour le contourner.
  let waypoints: Point[] | undefined;
  if (obstacles && obstacles.length > 0) {
    let firstT = Infinity;
    let bestWps: Point[] | null = null;
    for (const obs of obstacles) {
      if (obs.id === from.id || obs.id === to.id) continue;
      const lb = labelBounds(obs);
      if (!lb) continue;
      const isect = segmentIntersectsRect(start, end, lb);
      if (isect !== null && isect.tEntry < firstT && isect.tEntry > 1e-10) {
        firstT = isect.tEntry;
        if (isHorizontal) {
          const xAt = start.x + (end.x - start.x) * isect.tEntry;
          bestWps = [{ x: xAt, y: lb.y - NODE_GAP }];
        } else {
          // Segment quasi-vertical : contourner latéralement plutôt que de
          // rebrousser vers le haut, ce qui produit un détour non naturel.
          const yAt = start.y + (end.y - start.y) * isect.tEntry;
          // start.x strictement à gauche de l'obstacle → contourner à gauche.
          // start.x au même x ou à droite (ex. même lane) → contourner à droite
          // pour éviter les croisements avec les flèches partant vers la gauche.
          bestWps = [
            {
              x: start.x < obs.x ? lb.x - NODE_GAP : lb.x + lb.w + NODE_GAP,
              y: yAt,
            },
          ];
        }
      }
    }
    if (bestWps) waypoints = bestWps;
  }

  // Angle du dernier segment (pour la pointe de flèche).
  const lastPt = waypoints ? waypoints[waypoints.length - 1] : start;
  const angleDeg =
    (Math.atan2(end.y - lastPt.y, end.x - lastPt.x) * 180) / Math.PI;

  // Ancre du label médian. Le texte d'une connexion est posé au milieu du
  // chemin ; si ce milieu tombe sur le VISUEL d'un nœud intercalé (ex. une
  // connexion A→C qui enjambe un nœud B placé entre les deux), on décale l'ancre
  // perpendiculairement au trait pour dégager le texte. Sans ça il se superpose
  // au nœud — et, le label vivant sous la couche des nœuds, passe derrière lui.
  let labelAnchor: Point | undefined;
  if (obstacles && obstacles.length > 0) {
    const mid = pathTip({ start, end, waypoints, angleDeg }, 0.5);
    for (const obs of obstacles) {
      if (obs.id === from.id || obs.id === to.id) continue;
      const halfW = obs.width / 2;
      const halfH = obs.height / 2;
      if (
        Math.abs(mid.x - obs.x) <= halfW + NODE_GAP &&
        Math.abs(mid.y - obs.y) <= halfH + NODE_GAP
      ) {
        labelAnchor = isHorizontal
          ? // Trait horizontal : on remonte le label au-dessus du nœud. La marge
            // verticale ne dépend pas de la largeur (inconnue) du texte.
            { x: mid.x, y: obs.y - halfH - NODE_GAP }
          : // Trait vertical : on dégage latéralement. Le label restant ancré au
            // centre (textAnchor=middle) et sa largeur étant inconnue ici, on
            // garantit au moins que son centre quitte le nœud.
            {
              x: obs.x + (mid.x <= obs.x ? -1 : 1) * (halfW + NODE_GAP),
              y: mid.y,
            };
        break;
      }
    }
  }

  return {
    start,
    end,
    waypoints,
    angleDeg,
    ...(labelAnchor ? { labelAnchor } : {}),
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
