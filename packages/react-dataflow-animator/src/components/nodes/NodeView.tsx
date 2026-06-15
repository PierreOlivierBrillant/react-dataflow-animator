import type { ReactNode } from 'react';
import type { Highlighter, Node } from '../../types';
import { escapeHtml } from '../../highlight/highlight';
import { getNodeIcon } from './nodeIcons';
import { NodePanel } from './NodePanel';
import { ShapeNode } from './ShapeNode';
import { isPanelNode, isShapeType } from './nodeKinds';

export interface NodeViewProps {
  /** Le nœud à représenter. Seuls `type` — et, pour les panneaux,
   *  `header`/`body`/`language` — sont lus. */
  node: Node;
  /** Coloration syntaxique des panneaux (quand `language` est fourni).
   *  Défaut : échappement HTML simple, suffisant pour un rendu sans coloration. */
  highlight?: Highlighter;
}

/**
 * Cœur visuel d'un nœud — pictogramme ou panneau de texte — sans positionnement,
 * sous-icône, spinner ni Stage englobant. Se dimensionne sur `--rdfa-scale`
 * (fallback `1`), donc rendable hors d'un `<DataFlowPlayer>`.
 *
 * `StaticNode` le réutilise (un seul chemin de rendu, une seule décision
 * panneau/forme/pictogramme via {@link isPanelNode} / {@link isShapeType}) ; il
 * est exporté pour afficher un nœud isolé, par ex. la galerie des types de la
 * référence API.
 */
export function NodeView({
  node,
  highlight = escapeHtml,
}: NodeViewProps): ReactNode {
  if (isPanelNode(node.type)) {
    return <NodePanel object={node} highlight={highlight} />;
  }
  if (isShapeType(node.type)) {
    return <ShapeNode object={node} />;
  }
  return <span className="rdfa-node-icon">{getNodeIcon(node.type)}</span>;
}
