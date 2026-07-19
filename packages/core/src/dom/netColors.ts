import type { DataFlowSpec, NodeType } from '../types';
import { refNode } from '../engine/pins';
import { NET_PALETTE } from './stageConstants';

/** A node that drives a logic net — a `signal` input or any `*_gate` output.
 *  Origin: `Stage.tsx` `isLogicType`. */
const isLogicType = (t: NodeType): boolean =>
  t === 'signal' || t.endsWith('_gate');

/**
 * Assigns a stable colour to every logic net of a circuit schematic, so wires
 * belonging to different nets (which may cross or run parallel) read as
 * distinct and are visibly NOT joined. A net is identified by its driver — the
 * source node of a wire — when that source is a logic node; all wires sharing a
 * driver share the colour. Non-logic sources (a battery, a junction) are left
 * neutral, so electrical circuits are unaffected. Drivers are numbered in
 * first-appearance order for determinism.
 *
 * Origin: `Stage.tsx` `netColorMap`.
 */
export function netColorMap(spec: DataFlowSpec): Map<string, string> {
  const colors = new Map<string, string>();
  if (spec.direction !== 'circuit') return colors;
  const nodeById = new Map(spec.nodes.map((n) => [n.id, n]));
  let i = 0;
  for (const link of spec.connections ?? []) {
    const src = refNode(link.from);
    if (colors.has(src)) continue;
    const n = nodeById.get(src);
    if (n && isLogicType(n.type))
      colors.set(src, NET_PALETTE[i++ % NET_PALETTE.length]);
  }
  return colors;
}
