import type { DataFlowSpec, Action } from '../types';

/** Espacement (px) entre deux arêtes d'une même paire ou d'un fan-out. */
export const PORT_SPACING = 30;

export interface ConnectionRef {
  key: string;
  from: string;
  to: string;
}

/**
 * Collecte toutes les connexions référencées dans la spec (connections
 * permanentes + actions arrow, récursion dans les parallèles) et les
 * déduplique par clé (id explicite ou composé `from|to|index`).
 */
export function collectArrowConnections(spec: DataFlowSpec): ConnectionRef[] {
  const all: ConnectionRef[] = [];

  spec.connections?.forEach((c, i) => {
    const key = c.id ?? `${c.from}|${c.to}|${i}`;
    all.push({ key, from: c.from, to: c.to });
  });

  const extractArrows = (actions: Action[]) => {
    actions.forEach((a, i) => {
      if (a.action_type === 'arrow' && a.from && a.to) {
        const key = a.id ?? `${a.from}|${a.to}|action_${i}`;
        all.push({ key, from: a.from, to: a.to });
      } else if (a.action_type === 'parallel' && a.actions) {
        extractArrows(a.actions);
      }
    });
  };
  if (spec.actions) extractArrows(spec.actions);

  const seen = new Set<string>();
  const unique: ConnectionRef[] = [];
  for (const c of all) {
    if (!seen.has(c.key)) {
      seen.add(c.key);
      unique.push(c);
    }
  }
  return unique;
}

/**
 * Calcule, pour chaque connexion, le décalage latéral (px) du port de départ
 * et d'arrivée en tenant compte de deux phénomènes :
 *
 * - **intra-paire** : plusieurs arêtes entre les mêmes deux nœuds sont
 *   écartées perpendiculairement à leur axe.
 * - **fan-out** : plusieurs paires partageant la même face d'un nœud sont
 *   triées par position de l'autre extrémité pour éviter les croisements.
 */
export function computePortOffsets(
  connections: ConnectionRef[],
  layout: Record<string, { cx: number; cy: number }>,
): Record<string, { start: number; end: number }> {
  // On groupe par paire de nœuds (indépendamment de la direction)
  const pairConnections: Record<string, ConnectionRef[]> = {};
  for (const c of connections) {
    const pair = [c.from, c.to].sort().join('-');
    if (!pairConnections[pair]) pairConnections[pair] = [];
    pairConnections[pair].push(c);
  }

  // Calcul des faces de départ/arrivée pour chaque paire (fan-out)
  const nodeFaces: Record<string, { pairKey: string; coord: number }[]> = {};
  Object.keys(pairConnections).forEach((pairId) => {
    const conns = pairConnections[pairId];
    const { from, to } = conns[0]; // On prend la première connexion comme référence
    const p1 = layout[from] ?? { cx: 0.5, cy: 0.5 };
    const p2 = layout[to] ?? { cx: 0.5, cy: 0.5 };
    const dx = p2.cx - p1.cx;
    const dy = p2.cy - p1.cy;
    const isHorizontal = Math.abs(dx) >= Math.abs(dy);

    const faceFrom = isHorizontal
      ? dx >= 0
        ? `${from}|RIGHT`
        : `${from}|LEFT`
      : dy >= 0
        ? `${from}|BOTTOM`
        : `${from}|TOP`;
    const coordFrom = isHorizontal ? p2.cy : p2.cx;
    if (!nodeFaces[faceFrom]) nodeFaces[faceFrom] = [];
    nodeFaces[faceFrom].push({ pairKey: pairId, coord: coordFrom });

    const faceTo = isHorizontal
      ? dx >= 0
        ? `${to}|LEFT`
        : `${to}|RIGHT`
      : dy >= 0
        ? `${to}|TOP`
        : `${to}|BOTTOM`;
    const coordTo = isHorizontal ? p1.cy : p1.cx;
    if (!nodeFaces[faceTo]) nodeFaces[faceTo] = [];
    nodeFaces[faceTo].push({ pairKey: pairId, coord: coordTo });
  });

  const faceOffsets: Record<string, Record<string, number>> = {};
  for (const [face, items] of Object.entries(nodeFaces)) {
    items.sort((a, b) => a.coord - b.coord);
    const total = items.length;
    faceOffsets[face] = {};
    items.forEach((item, i) => {
      faceOffsets[face][item.pairKey] = (i - (total - 1) / 2) * PORT_SPACING;
    });
  }

  const offsets: Record<string, { start: number; end: number }> = {};
  for (const [pairId, conns] of Object.entries(pairConnections)) {
    const total = conns.length;
    conns.forEach(({ key, from, to }, i) => {
      const intraPairOffset = (i - (total - 1) / 2) * PORT_SPACING;

      const p1 = layout[from] ?? { cx: 0.5, cy: 0.5 };
      const p2 = layout[to] ?? { cx: 0.5, cy: 0.5 };
      const dx = p2.cx - p1.cx;
      const dy = p2.cy - p1.cy;
      const isHorizontal = Math.abs(dx) >= Math.abs(dy);

      const faceFrom = isHorizontal
        ? dx >= 0
          ? `${from}|RIGHT`
          : `${from}|LEFT`
        : dy >= 0
          ? `${from}|BOTTOM`
          : `${from}|TOP`;
      const faceTo = isHorizontal
        ? dx >= 0
          ? `${to}|LEFT`
          : `${to}|RIGHT`
        : dy >= 0
          ? `${to}|TOP`
          : `${to}|BOTTOM`;

      const fanOutStart = faceOffsets[faceFrom]?.[pairId] ?? 0;
      const fanOutEnd = faceOffsets[faceTo]?.[pairId] ?? 0;

      offsets[key] = {
        start: intraPairOffset + fanOutStart,
        end: intraPairOffset + fanOutEnd,
      };
    });
  }

  return offsets;
}
