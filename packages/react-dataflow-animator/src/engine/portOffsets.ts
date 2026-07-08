import type { DataFlowSpec, Action, Direction } from '../types';
import { connectionAxis } from './layout';
import { refNode } from './pins';

/** Spacing (px) between two edges of the same pair or a fan-out. */
export const PORT_SPACING = 30;

export interface ConnectionRef {
  key: string;
  from: string;
  to: string;
}

/**
 * Collects all connections referenced in the spec (permanent connections
 * + arrow actions + move actions, recursing into parallels).
 *
 * Deduplication rules:
 * - Static connections and arrows: deduplicated by key (id or compound).
 * - Moves: a given direction (from→to) is only added if no
 *   static connection or arrow already covers this direction; the move then reuses
 *   this entry via Stage.tsx's by-from/to fallback. This ensures
 *   that a move and an arrow on the same path share the same portOffset.
 */
export function collectArrowConnections(spec: DataFlowSpec): ConnectionRef[] {
  const all: ConnectionRef[] = [];
  const keysSeen = new Set<string>(); // deduplication by key (existing)
  const directedSeen = new Set<string>(); // "from|to": priority connections/arrows over moves
  // Directions added in pass 1 only — used in pass 2 to prevent
  // a reverse move from duplicating a pair already covered by a line.
  const passe1Directed = new Set<string>();

  // Pass 1: static connections and arrows (establish priority directions).
  spec.connections?.forEach((c, i) => {
    const key = c.id ?? `${c.from}|${c.to}|${i}`;
    if (!keysSeen.has(key)) {
      keysSeen.add(key);
      // ConnectionRef.from/to are bare node ids (any `:pin` dropped) so the
      // pairing/offset math keys on nodes; the `key` stays raw to match Stage.
      all.push({ key, from: refNode(c.from), to: refNode(c.to) });
      directedSeen.add(`${c.from}|${c.to}`);
      passe1Directed.add(`${c.from}|${c.to}`);
    }
  });

  const extractArrows = (actions: Action[]) => {
    actions.forEach((a, i) => {
      if (a.type === 'arrow' && a.from && a.to) {
        const dk = `${a.from}|${a.to}`;
        // Deduplication by direction: multiple A→B arrows (or an arrow + a
        // static connection on the same path) represent the same visual "lane"
        // and shouldn't inflate the pair's count.
        if (!directedSeen.has(dk)) {
          directedSeen.add(dk);
          passe1Directed.add(dk);
          const key = a.id ?? `${a.from}|${a.to}|action_${i}`;
          if (!keysSeen.has(key)) {
            keysSeen.add(key);
            all.push({ key, from: refNode(a.from), to: refNode(a.to) });
          }
        }
      } else if (a.type === 'parallel' && a.actions) {
        extractArrows(a.actions);
      }
    });
  };
  if (spec.timeline) extractArrows(spec.timeline);

  // Pass 2: moves — added only if:
  //   1. the exact direction is not already covered, AND
  //   2. the reverse direction is not covered by a pass 1 connection/arrow.
  //      (a B→A move with a static A→B line must share the center path,
  //      not create a 2nd entry in the pair which would shift the existing line)
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
            all.push({ key, from: refNode(a.from), to: refNode(a.to) });
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

/** Default: no node opts out of merging — every face converges. */
const NO_FANOUT_NODES: ReadonlySet<string> = new Set();

/**
 * Calculates, for each connection, the lateral offset (px) of the start
 * and end port accounting for two phenomena:
 *
 * - **intra-pair**: multiple edges between the same two nodes are
 *   spaced out perpendicularly to their axis. Always applied so bidirectional
 *   request/response tracks stay distinct.
 * - **fan-out**: multiple pairs sharing the same face of a node are
 *   sorted by the other end's position to avoid crossings.
 *
 * Fan-out is **off by default**: edges sharing a face converge to a single
 * anchor point. A node restores its fan-out by opting out via `fanOutNodes`
 * (the `merge_edges: false` flag in the spec). The decision is per-node-face:
 * a connection X→Y fans out at X only if X opted out, and at Y only if Y did.
 */
export function computePortOffsets(
  connections: ConnectionRef[],
  layout: Record<string, { cx: number; cy: number }>,
  aspect = 1,
  direction: Direction = 'left-to-right',
  fanOutNodes: ReadonlySet<string> = NO_FANOUT_NODES
): Record<string, { start: number; end: number }> {
  // Group by node pair (independent of direction)
  const pairConnections: Record<string, ConnectionRef[]> = {};
  for (const c of connections) {
    const pair = [c.from, c.to].sort().join('-');
    if (!pairConnections[pair]) pairConnections[pair] = [];
    pairConnections[pair].push(c);
  }

  // Compute start/end faces for each pair (fan-out)
  const nodeFaces: Record<string, { pairKey: string; coord: number }[]> = {};
  Object.keys(pairConnections).forEach((pairId) => {
    const conns = pairConnections[pairId];
    const { from, to } = conns[0]; // Use the first connection as reference
    const p1 = layout[from] ?? { cx: 0.5, cy: 0.5 };
    const p2 = layout[to] ?? { cx: 0.5, cy: 0.5 };
    const dx = p2.cx - p1.cx;
    const dy = p2.cy - p1.cy;
    // Orientation derived from layout FLOW (cf. connectionAxis) — the SAME decision
    // as `connection`'s attachment, so fan-out and endpoints agree.
    const isHorizontal =
      connectionAxis(p1, p2, direction, aspect) === 'horizontal';

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
      const isHorizontal =
        connectionAxis(p1, p2, direction, aspect) === 'horizontal';

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

      // Fan-out only when the node at that end opts out of merging; otherwise
      // the port collapses to the face center (offset 0 → convergence).
      const fanOutStart = fanOutNodes.has(from)
        ? (faceOffsets[faceFrom]?.[pairId] ?? 0)
        : 0;
      const fanOutEnd = fanOutNodes.has(to)
        ? (faceOffsets[faceTo]?.[pairId] ?? 0)
        : 0;

      offsets[key] = {
        start: intraPairOffset + fanOutStart,
        end: intraPairOffset + fanOutEnd,
      };
    });
  }

  return offsets;
}
