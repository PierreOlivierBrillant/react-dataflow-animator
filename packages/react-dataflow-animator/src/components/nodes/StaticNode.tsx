import type { CSSProperties, ReactNode } from 'react';
import {
  defineAnimatable,
  type AnimatableComponent,
} from '../../utils/animatable';
import type { Highlighter, ObjectContent, Node } from '../../types';
import type { NodePlacement } from '@react-dataflow-animator/core/engine/layout';
import { ContentPanel } from '../dynamic/ContentPanel';
import { NodeVisual } from './NodeVisual';
import {
  isPanelNode,
  isShapeType,
} from '@react-dataflow-animator/core/render/nodeKinds';
import {
  nodeTint,
  type ColorOverride,
} from '@react-dataflow-animator/core/render/nodeColors';
import { getSubIcon } from './subIcons';
import { richText } from '../../tex/RichText';

/**
 * Text under the node: its `text`, its `value` (+`unit`), or both joined —
 * the label convenience for electrical components (`R1 · 10 kΩ`).
 */
function nodeLabel(o: Node): string | undefined {
  const valuePart =
    o.value != null && o.value !== ''
      ? `${o.value}${o.unit ? ` ${o.unit}` : ''}`
      : undefined;
  if (o.text && valuePart) return `${o.text} · ${valuePart}`;
  return o.text ?? valuePart;
}

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
  /** Clockwise rotation (deg) of the node visual. The label stays upright. */
  rotation?: number;
  /** Side the label is drawn on. Default (undefined) = below the visual. A
   *  circuit component wired top/bottom moves it to a side so the label no longer
   *  sits on the outgoing vertical wire (decided by Stage; the router models the
   *  obstacle on the same side). */
  labelSide?: 'left' | 'right';
  /** Live contact state (0..1) for stateful component icons (`switch`,
   *  `push_button`), driven by the `toggle` action. Undefined = from `closed`. */
  closed?: number;
  /** Runtime color override (active set_color), eased cross-fade per channel. */
  colorOverride?: ColorOverride;
  /** Runtime icon-badge override (set_icon). Undefined = keep the static
   *  `object.icon`; an empty string clears the badge. */
  iconOverride?: string;
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
    rotation,
    labelSide,
    closed,
    colorOverride,
    iconOverride,
    reveal,
    contentLimit,
    codeFontScale,
    onCodeFit,
  }: StaticNodeProps) {
    // Runtime set_icon wins over the static badge; '' clears it (nullish
    // coalescing keeps '' distinct from "no override").
    const effIcon = iconOverride ?? object.icon;
    const isPanel = isPanelNode(object.type);
    const isShape = isShapeType(object.type);
    // A `signal` I/O pad shows its value IN the pad (not as a corner badge).
    const isSignal = object.type === 'signal';
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
        <NodeVisual
          node={object}
          highlight={highlight}
          closed={closed}
          signalValue={isSignal ? effIcon : undefined}
        />
        {/* Unique corner badge: the subicon (tech) and the loading ring
            share the same positioned container, so they always remain
            concentric. The container holds the solid background that serves
            as the backdrop for the spinner ("inwards"). A signal pad shows its
            value inside instead, so it carries no corner badge. */}
        {!isSignal && (effIcon || loading) ? (
          <span className="rdfa-node-badge">
            {effIcon ? (
              <span className="rdfa-node-subicon">{getSubIcon(effIcon)}</span>
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
    // Rotation lives on the visual (not the whole .rdfa-node) so the label stays
    // upright and the node's layout box — used for arrow anchoring — is unchanged.
    const rotated = rotation != null && rotation !== 0;
    const visualStyle: CSSProperties | undefined =
      content || rotated
        ? {
            ...(content
              ? {
                  opacity: contentOpacity,
                  ...(reveal != null && reveal < 1
                    ? {
                        clipPath: `inset(0 0 ${((1 - reveal) * 100).toFixed(2)}% 0)`,
                      }
                    : {}),
                }
              : {}),
            ...(rotated ? { transform: `rotate(${rotation}deg)` } : {}),
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
      (!content && isSignal ? ' rdfa-node--signal' : '') +
      (!content &&
      !isSignal &&
      (colorOverride?.background_color ?? object.background_color)
        ? ' rdfa-node--tinted'
        : '') +
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
            ...nodeTint(object, colorOverride),
          } as CSSProperties
        }
      >
        {inner}
        {(() => {
          const label = nodeLabel(object);
          return label ? (
            <span
              className={
                'rdfa-node-label' +
                (labelSide ? ` rdfa-node-label--${labelSide}` : '')
              }
            >
              {richText(label)}
            </span>
          ) : null;
        })()}
      </div>
    );
  });
