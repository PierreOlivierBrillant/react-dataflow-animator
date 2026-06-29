import type { CSSProperties, ReactNode } from 'react';
import {
  defineAnimatable,
  type AnimatableComponent,
} from '../../utils/animatable';
import type { Highlighter, ObjectContent, Node } from '../../types';
import type { NodePlacement } from '../../engine/layout';
import { ContentPanel } from '../dynamic/ContentPanel';
import { NodeView } from './NodeView';
import { isPanelNode, isShapeType } from './nodeKinds';
import { nodeTint } from './nodeColors';
import { getSubIcon } from './subIcons';

export interface StaticNodeProps {
  object: Node;
  placement: NodePlacement;
  /** Effective content (active set_content, or initial node content). */
  content?: ObjectContent | null;
  /** Content opacity (fade in/out of set_content). */
  contentOpacity?: number;
  /** Active loading spinner. */
  loading?: boolean;
  /** Node highlighted by a highlight action. */
  highlighted?: boolean;
  highlight: Highlighter;
  /** Global node opacity (show/hide fade of set_visible). */
  opacity?: number;
  /** Revealed fraction [0..1] of the panel during a set_content transition. The
   *  reveal happens from TOP to bottom via `clip-path` — which does not change the
   *  layout size, so the ResizeObserver always measures the full panel
   *  (no feedback loop with geometry). */
  reveal?: number;
  /** Max size (px) of the set_content panel so it doesn't overlap neighbors
   *  (nodes don't move, the panel shrinks to fit). */
  contentLimit?: { maxW: number; maxH: number };
  /** COMMON font factor for all code panels (synchronization). */
  codeFontScale?: number;
  /** Sends up to the Stage the reduction ratio this code would need alone. */
  onCodeFit?: (id: string, ratio: number) => void;
}

export const StaticNode: AnimatableComponent<StaticNodeProps> =
  defineAnimatable(function StaticNode({
    object,
    placement,
    content,
    contentOpacity = 1,
    loading,
    highlighted,
    highlight,
    opacity,
    reveal,
    contentLimit,
    codeFontScale,
    onCodeFit,
  }: StaticNodeProps) {
    const isPanel = isPanelNode(object.type);
    const isShape = isShapeType(object.type);
    const visual: ReactNode = content ? (
      <ContentPanel
        content={content}
        highlight={highlight}
        codeFontScale={codeFontScale}
        onCodeFit={
          onCodeFit ? (ratio) => onCodeFit(object.id, ratio) : undefined
        }
      />
    ) : (
      <>
        <NodeView node={object} highlight={highlight} />
        {/* Unique corner badge: the subicon (tech) and the loading ring
            share the same positioned container, so they always remain
            concentric. The container holds the solid background that serves
            as the backdrop for the spinner ("inwards"). */}
        {object.icon || loading ? (
          <span className="rdfa-node-badge">
            {object.icon ? (
              <span className="rdfa-node-subicon">
                {getSubIcon(object.icon)}
              </span>
            ) : null}
            {loading ? (
              <span className="rdfa-spinner" aria-hidden="true" />
            ) : null}
          </span>
        ) : null}
      </>
    );

    // During a set_content transition, we reveal the panel from TOP to bottom
    // via clip-path (window bar first). Unlike `height`,
    // clip-path does NOT touch the layout box: the ResizeObserver always
    // measures the full panel → geometry remains stable (no loop freezing
    // the morph to the icon size), and the panel no longer opens
    // "from the center upwards and downwards".
    const visualStyle: CSSProperties | undefined = content
      ? {
          opacity: contentOpacity,
          ...(reveal != null && reveal < 1
            ? { clipPath: `inset(0 0 ${((1 - reveal) * 100).toFixed(2)}% 0)` }
            : {}),
        }
      : undefined;
    const inner = object.url ? (
      <a
        className="rdfa-node-link"
        href={object.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="rdfa-node-visual" style={visualStyle}>
          {visual}
        </span>
      </a>
    ) : (
      <span className="rdfa-node-visual" style={visualStyle}>
        {visual}
      </span>
    );

    // `tinted` is only used for pictogram badges; shapes/panels read
    // --rdfa-fill directly. Useless when a set_content occupies the node.
    const cls =
      'rdfa-node' +
      (content ? ' rdfa-node--content' : '') +
      (!content && isPanel ? ' rdfa-node--panel' : '') +
      (!content && isShape ? ' rdfa-node--shape' : '') +
      (!content && object.background_color ? ' rdfa-node--tinted' : '') +
      (highlighted ? ' rdfa-node--highlight' : '');

    return (
      <div
        className={cls}
        data-node-id={object.id}
        style={
          {
            left: `${placement.cx * 100}%`,
            top: `${placement.cy * 100}%`,
            opacity,
            // Per-node ceilings: the set_content panel shrinks so it doesn't
            // overlap its neighbors (nodes do not move).
            ...(content && contentLimit
              ? {
                  '--rdfa-content-maxw': `${contentLimit.maxW}px`,
                  '--rdfa-content-maxh': `${contentLimit.maxH}px`,
                }
              : {}),
            ...nodeTint(object),
          } as CSSProperties
        }
      >
        {inner}
        {object.text ? (
          <span className="rdfa-node-label">{object.text}</span>
        ) : null}
      </div>
    );
  });
