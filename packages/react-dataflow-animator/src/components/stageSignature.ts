import type { DataFlowSpec } from '../types';

/** Unique string representing the fields that influence node position.
 *  `type` and `background_color` are included: they determine `borderOutset`
 *  (outset of the tinted badge), which offsets the arrow ends. In tree mode the
 *  INITIAL topology (`spec.tree`) drives the base positions, so it is part of the
 *  signature too (rotations happen over time and don't change measured sizes).
 *  In graph mode the free `x`/`y` coordinates drive positions, so they are in the
 *  signature as well — a pure displacement (no resize) must force a re-measure,
 *  since a ResizeObserver only sees size changes, not moves. */
export function buildStageSignature(spec: DataFlowSpec): string {
  const tree = spec.tree
    ? `|tree:${spec.tree.root};` +
      Object.entries(spec.tree.children)
        .map(([id, ch]) => `${id}>${ch.left ?? ''}/${ch.right ?? ''}`)
        .join(',')
    : '';
  return (
    `${spec.direction ?? 'left-to-right'}|` +
    spec.nodes
      .map(
        (o) =>
          `${o.id}:${o.lane ?? 1}:${o.main ? 1 : 0}:${o.align_with ?? ''}:${o.x ?? ''}:${o.y ?? ''}:${o.type}:${o.background_color ?? ''}`
      )
      .join(',') +
    tree
  );
}
