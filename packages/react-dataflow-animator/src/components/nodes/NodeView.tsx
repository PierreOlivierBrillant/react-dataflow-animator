import type { ReactNode } from 'react';
import type { Highlighter, Node } from '../../types';
import { escapeHtml } from '../../highlight/highlight';
import { getNodeIcon } from './nodeIcons';
import { NodePanel } from './NodePanel';
import { ShapeNode } from './ShapeNode';
import { isPanelNode, isShapeType } from './nodeKinds';

export interface NodeViewProps {
  /** The node to represent. Only `type` — and, for panels,
   *  `header`/`body`/`language` — are read. */
  node: Node;
  /** Syntax highlighting of panels (when `language` is provided).
   *  Default: simple HTML escaping, sufficient for rendering without highlighting. */
  highlight?: Highlighter;
}

/**
 * Visual core of a node — pictogram or text panel — without positioning,
 * sub-icon, spinner or enclosing Stage. Sizes itself on `--rdfa-scale`
 * (fallback `1`), so it's renderable outside a `<DataFlowPlayer>`.
 *
 * `StaticNode` reuses it (a single rendering path, a single decision
 * panel/shape/pictogram via {@link isPanelNode} / {@link isShapeType}); it
 * is exported to display an isolated node, e.g. the types gallery of the
 * API reference.
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
