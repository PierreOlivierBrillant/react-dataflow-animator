import type { DataFlowSpec, Direction, Node } from '../types';

/**
 * Moteur de disposition spatiale : calcule la position de chaque nœud statique
 * SANS coordonnées (x, y) en entrée, à partir de `direction` et de `lane`.
 *
 * Les positions sont renvoyées en RATIOS (0..1) relatifs au Stage : le placement
 * se fait alors en pur CSS (`left: cx%`, `top: cy%`), donc aucune mesure DOM
 * n'est nécessaire pour POSITIONNER les nœuds (la mesure ne sert qu'au tracé des
 * connexions).
 */

export interface NodePlacement {
  /** Centre horizontal, ratio 0..1. */
  cx: number;
  /** Centre vertical, ratio 0..1. */
  cy: number;
}

export type LayoutMap = Record<string, NodePlacement>;

export interface LayoutOptions {
  /** Ratio largeur/hauteur du Stage, pour garder un cercle rond en mode circular. */
  aspect?: number;
}

/** Répartit n positions à intervalles réguliers avec marges aux extrémités. */
/**
 * Répartit `count` positions sur l'axe, étalées entre une marge `[m, 1-m]`.
 * La marge `m` est plafonnée à 0,2 : pour peu d'éléments (2-3) on exploite
 * l'espace disponible aux extrémités pour les éloigner davantage ; pour beaucoup
 * d'éléments, on retombe sur la répartition `(i+1)/(count+1)` (marges plus fines).
 */
function spread(index: number, count: number): number {
  if (count <= 1) return 0.5;
  const m = Math.min(0.2, 1 / (count + 1));
  return m + (1 - 2 * m) * (index / (count - 1));
}

function linearLayout(nodes: Node[], direction: Direction): LayoutMap {
  // Regroupement par lane (défaut: 1), lanes triées en ordre croissant.
  const byLane = new Map<number, Node[]>();
  for (const node of nodes) {
    const lane = node.lane ?? 1;
    const list = byLane.get(lane);
    if (list) list.push(node);
    else byLane.set(lane, [node]);
  }
  // NB : `Array.from` plutôt que `[...byLane.keys()]`. Certains consommateurs
  // (ex. Babel de Docusaurus en mode « loose ») retranspilent le spread d'un
  // itérable en `[].concat(iterable)`, ce qui n'aplatit PAS un itérateur de Map
  // et casse silencieusement le layout. `Array.from` est immunisé.
  const lanes = Array.from(byLane.keys()).sort((a, b) => a - b);

  const map: LayoutMap = {};
  lanes.forEach((lane, laneOrder) => {
    const main = spread(laneOrder, lanes.length);
    const members = byLane.get(lane)!;
    members.forEach((node, k) => {
      const cross = spread(k, members.length);
      let cx: number;
      let cy: number;
      switch (direction) {
        case 'right-to-left':
          cx = 1 - main;
          cy = cross;
          break;
        case 'top-to-bottom':
          cx = cross;
          cy = main;
          break;
        case 'bottom-to-top':
          cx = cross;
          cy = 1 - main;
          break;
        case 'left-to-right':
        default:
          cx = main;
          cy = cross;
          break;
      }
      map[node.id] = { cx, cy };
    });
  });
  return map;
}

function circularLayout(nodes: Node[], aspect: number): LayoutMap {
  const map: LayoutMap = {};
  const mainNode = nodes.find((n) => n.main);
  const ring = nodes.filter((n) => n !== mainNode);

  if (mainNode) map[mainNode.id] = { cx: 0.5, cy: 0.5 };

  // Rayon en px = 0.4 * plus petite dimension ; converti en ratios par axe pour
  // rester circulaire quelle que soit la forme du Stage.
  const base = 0.4;
  const rx = aspect >= 1 ? base / aspect : base;
  const ry = aspect >= 1 ? base : base * aspect;

  const n = ring.length;
  ring.forEach((node, i) => {
    // On démarre en haut (-90°) et on tourne dans le sens horaire.
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(1, n);
    map[node.id] = {
      cx: 0.5 + rx * Math.cos(angle),
      cy: 0.5 + ry * Math.sin(angle),
    };
  });
  return map;
}

/**
 * Applique `align_with` : aligne un nœud sur l'axe TRANSVERSE d'un autre
 * (vertical si la direction est horizontale, et inversement).
 */
function applyAlignment(
  map: LayoutMap,
  nodes: Node[],
  direction: Direction
): void {
  const horizontal =
    direction === 'left-to-right' || direction === 'right-to-left';
  for (const node of nodes) {
    if (!node.align_with) continue;
    const self = map[node.id];
    const target = map[node.align_with];
    if (!self || !target) continue;
    if (horizontal) self.cy = target.cy;
    else self.cx = target.cx;
  }
}

export function computeLayout(
  spec: DataFlowSpec,
  options: LayoutOptions = {}
): LayoutMap {
  const direction = spec.direction ?? 'left-to-right';
  const nodes = spec.nodes;
  if (direction === 'circular') {
    return circularLayout(nodes, options.aspect ?? 1.6);
  }
  const map = linearLayout(nodes, direction);
  applyAlignment(map, nodes, direction);
  return map;
}
