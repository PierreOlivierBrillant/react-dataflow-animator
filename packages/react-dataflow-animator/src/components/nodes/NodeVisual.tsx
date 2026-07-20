import type { ReactNode } from 'react';
import type { Highlighter, Node } from '../../types';
import { escapeHtml } from '@react-dataflow-animator/core/highlight/highlight';
import { getNodeIcon } from './nodeIcons';
import { getSubIcon } from './subIcons';
import { NodePanel } from './NodePanel';
import { ShapeNode } from './ShapeNode';
import {
  isPanelNode,
  isShapeType,
} from '@react-dataflow-animator/core/render/nodeKinds';

export interface NodeVisualProps {
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
 * INTERNAL JSX rendering path of a node's visual core, consumed only by
 * `StaticNode` — and therefore by the React `Stage`, which is panel A of the A/B
 * gate and the subject of every Playwright golden.
 *
 * This is the former body of `NodeView`, moved here verbatim. The split exists
 * because the PUBLIC `NodeView` is being reimplemented on top of the core's
 * `renderNodeVisual`: rewriting it in place would have rewritten panel A too,
 * moving the very reference the migration is measured against.
 *
 * Deleted along with the rest of the React renderer at step 2.6b.
 */
export function NodeVisual({
  node,
  highlight = escapeHtml,
  closed,
  signalValue,
}: NodeVisualProps): ReactNode {
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
