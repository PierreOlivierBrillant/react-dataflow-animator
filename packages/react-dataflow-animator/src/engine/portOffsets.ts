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
 * permanentes + actions arrow + actions move, récursion dans les parallèles).
 *
 * Règle de déduplication :
 * - Connexions statiques et arrows : déduplication par clé (id ou composé).
 * - Moves : une direction donnée (from→to) n'est ajoutée que si aucune
 *   connexion statique ou arrow ne couvre déjà ce sens ; le move réutilise
 *   alors cette entrée via le fallback by-from/to de Stage.tsx. Cela garantit
 *   qu'un move et une arrow sur le même trajet partagent le même portOffset.
 */
export function collectArrowConnections(spec: DataFlowSpec): ConnectionRef[] {
  const all: ConnectionRef[] = [];
  const keysSeen = new Set<string>(); // déduplication par clé (existant)
  const directedSeen = new Set<string>(); // "from|to" : priorité connexions/arrows sur moves
  // Directions ajoutées en passe 1 uniquement — utilisé en passe 2 pour éviter
  // qu'un move en sens inverse ne duplique une paire déjà couverte par une ligne.
  const passe1Directed = new Set<string>();

  // Passe 1 : connexions statiques et arrows (établissent les directions prioritaires).
  spec.connections?.forEach((c, i) => {
    const key = c.id ?? `${c.from}|${c.to}|${i}`;
    if (!keysSeen.has(key)) {
      keysSeen.add(key);
      all.push({ key, from: c.from, to: c.to });
      directedSeen.add(`${c.from}|${c.to}`);
      passe1Directed.add(`${c.from}|${c.to}`);
    }
  });

  const extractArrows = (actions: Action[]) => {
    actions.forEach((a, i) => {
      if (a.type === 'arrow' && a.from && a.to) {
        const dk = `${a.from}|${a.to}`;
        // Déduplication par direction : plusieurs arrows A→B (ou une arrow + une
        // connexion statique sur le même trajet) représentent la même "voie" visuelle
        // et ne doivent pas gonfler le compte de la paire.
        if (!directedSeen.has(dk)) {
          directedSeen.add(dk);
          passe1Directed.add(dk);
          const key = a.id ?? `${a.from}|${a.to}|action_${i}`;
          if (!keysSeen.has(key)) {
            keysSeen.add(key);
            all.push({ key, from: a.from, to: a.to });
          }
        }
      } else if (a.type === 'parallel' && a.actions) {
        extractArrows(a.actions);
      }
    });
  };
  if (spec.timeline) extractArrows(spec.timeline);

  // Passe 2 : moves — ajoutés seulement si :
  //   1. la direction exacte n'est pas déjà couverte, ET
  //   2. la direction inverse n'est pas couverte par une connexion/arrow de passe 1.
  //      (un move B→A avec une ligne statique A→B doit partager le chemin central,
  //      pas créer une 2e entrée dans la paire qui décalerait la ligne existante)
  const extractMoves = (actions: Action[]) => {
    actions.forEach((a, i) => {
      if (a.type === 'move' && a.from && a.to) {
        const dk = `${a.from}|${a.to}`;
        const dkReverse = `${a.to}|${a.from}`;
        if (!directedSeen.has(dk) && !passe1Directed.has(dkReverse)) {
          directedSeen.add(dk);
          const key = a.id ?? `${a.from}|${a.to}|move_${i}`;
          if (!keysSeen.has(key)) {
            keysSeen.add(key);
            all.push({ key, from: a.from, to: a.to });
          }
        }
      } else if (a.type === 'parallel' && a.actions) {
        extractMoves(a.actions);
      }
    });
  };
  if (spec.timeline) extractMoves(spec.timeline);

  return all;
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
  aspect = 1
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
    // Multiplie dx par l'aspect (largeur/hauteur) pour comparer en pixels, pas en ratios.
    const isHorizontal = Math.abs(dx * aspect) >= Math.abs(dy);

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
      const isHorizontal = Math.abs(dx * aspect) >= Math.abs(dy);

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
