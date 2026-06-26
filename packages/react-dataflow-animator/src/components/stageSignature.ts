import type { DataFlowSpec } from '../types';

/** Chaîne unique représentant les champs qui influencent la position des nœuds.
 *  `type` et `background_color` en font partie : ils déterminent `borderOutset`
 *  (débord de la pastille teintée), qui décale les extrémités des flèches. */
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
