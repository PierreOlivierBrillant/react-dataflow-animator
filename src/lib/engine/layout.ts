import type { DataFlowSpec, Direction, StaticObject } from '../types';

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

/** Les flèches statiques sont des connexions, pas des nœuds à placer. */
function isPlaceable(obj: StaticObject): boolean {
  return obj.object_type !== 'arrow';
}

/** Répartit n positions à intervalles réguliers avec marges aux extrémités. */
function evenRatio(index: number, count: number): number {
  return (index + 1) / (count + 1);
}

function linearLayout(nodes: StaticObject[], direction: Direction): LayoutMap {
  // Regroupement par lane (défaut: 1), lanes triées en ordre croissant.
  const byLane = new Map<number, StaticObject[]>();
  for (const node of nodes) {
    const lane = node.lane ?? 1;
    const list = byLane.get(lane);
    if (list) list.push(node);
    else byLane.set(lane, [node]);
  }
  const lanes = [...byLane.keys()].sort((a, b) => a - b);

  const map: LayoutMap = {};
  lanes.forEach((lane, laneOrder) => {
    const main = evenRatio(laneOrder, lanes.length);
    const members = byLane.get(lane)!;
    members.forEach((node, k) => {
      const cross = evenRatio(k, members.length);
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

function circularLayout(nodes: StaticObject[], aspect: number): LayoutMap {
  const map: LayoutMap = {};
  const mainNode = nodes.find((n) => n.is_main);
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

export function computeLayout(
  spec: DataFlowSpec,
  options: LayoutOptions = {},
): LayoutMap {
  const direction = spec.direction ?? 'left-to-right';
  const nodes = spec.static_objects.filter(isPlaceable);
  if (direction === 'circular') {
    return circularLayout(nodes, options.aspect ?? 1.6);
  }
  return linearLayout(nodes, direction);
}
