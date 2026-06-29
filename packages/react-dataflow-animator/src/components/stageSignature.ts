import type { DataFlowSpec } from '../types';

/** Unique string representing the fields that influence node position.
 *  `type` and `background_color` are included: they determine `borderOutset`
 *  (outset of the tinted badge), which offsets the arrow ends. */
export function buildStageSignature(spec: DataFlowSpec): string {
  return (
    `${spec.direction ?? 'left-to-right'}|` +
    spec.nodes
      .map(
        (o) =>
          `${o.id}:${o.lane ?? 1}:${o.main ? 1 : 0}:${o.align_with ?? ''}:${o.type}:${o.background_color ?? ''}`
      )
      .join(',')
  );
}
