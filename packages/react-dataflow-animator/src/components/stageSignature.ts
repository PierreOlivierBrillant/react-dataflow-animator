import type { DataFlowSpec } from '../types';

/** Chaîne unique représentant les champs qui influencent la position des nœuds. */
export function buildStageSignature(spec: DataFlowSpec): string {
  return (
    `${spec.direction ?? 'left-to-right'}|` +
    spec.nodes
      .map(
        (o) => `${o.id}:${o.lane ?? 1}:${o.main ? 1 : 0}:${o.align_with ?? ''}`
      )
      .join(',')
  );
}
