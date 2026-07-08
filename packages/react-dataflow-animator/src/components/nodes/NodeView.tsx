import type { ReactNode } from 'react';
import type { Highlighter, Node } from '../../types';
import { escapeHtml } from '../../highlight/highlight';
import { getNodeIcon } from './nodeIcons';
import { getSubIcon } from './subIcons';
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
  /** Contact state (0..1) for stateful component icons (`switch`,
   *  `push_button`). Ignored by every other type. Undefined = from `node.closed`. */
  closed?: number;
  /** Live value shown in a `signal` I/O pad (from a `set_icon`); falls back to
   *  the node's static `icon`. Ignored by every other type. */
  signalValue?: string;
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
  closed,
  signalValue,
}: NodeViewProps): ReactNode {
  if (isPanelNode(node.type)) {
    return <NodePanel object={node} highlight={highlight} />;
  }
  if (isShapeType(node.type)) {
    return <ShapeNode object={node} />;
  }
  if (node.type === 'signal') {
    // A labelled I/O pad for logic diagrams: the bit value sits in the centre.
    const val = signalValue ?? node.icon ?? '';
    return (
      <span className="rdfa-signal">
        {val ? (
          <span className="rdfa-signal-value">{getSubIcon(val)}</span>
        ) : null}
      </span>
    );
  }
  // Stateful contacts read `closed` (live from a `toggle`, else the static
  // `node.closed`); other component/pictogram types ignore it.
  const closedFrac = closed ?? (node.closed ? 1 : 0);
  return (
    <span className="rdfa-node-icon">
      {getNodeIcon(node.type, { closed: closedFrac })}
    </span>
  );
}
