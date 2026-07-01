import type { CSSProperties } from 'react';
import {
  defineAnimatable,
  type AnimatableComponent,
} from '../../utils/animatable';
import {
  connection,
  pathTip,
  visiblePath,
  type NodeGeom,
} from '../../engine/geometry';
import type { ConnectionAxis } from '../../engine/layout';
import type { LineStyle, PathShape } from '../../types';

/**
 * SVG arrow between two nodes. `progress` ∈ [0,1] animates the progressive drawing.
 * `obstacles` is the list of all nodes — used to route the arrow
 * around labels. To be used inside an `<svg className="rdfa-arrow-svg">`.
 */
export interface ArrowLineProps {
  from: NodeGeom;
  to: NodeGeom;
  startPortOffset?: number;
  endPortOffset?: number;
  style?: LineStyle;
  /** Path shape. Default: 'bezier'. */
  path?: PathShape;
  arrow_head?: 'forward' | 'backward' | 'both' | 'none';
  text?: string;
  /** 1 for a static arrow (decoration), interpolated for a dynamic arrow. */
  progress: number;
  /** Highlighted by a highlight action. */
  highlighted?: boolean;
  /**
   * Line color (CSS string, possibly a `color-mix(...)` cross-fade). Overrides
   * the theme's neutral stroke for the path and its head; an active `highlighted`
   * still wins (it paints the accent). Undefined = theme color.
   */
  color?: string;
  /** All stage nodes — to avoid labels during routing. */
  obstacles?: NodeGeom[];
  /** Anchor axis derived from layout flow (see `connectionAxis`). Determines the
   *  face (E/W vs N/S) and the start/end orientation of the path. */
  axis?: ConnectionAxis;
}

const HEAD = 9;

export const ArrowLine: AnimatableComponent<ArrowLineProps> = defineAnimatable(
  function ArrowLine({
    from,
    to,
    startPortOffset = 0,
    endPortOffset = 0,
    style = 'solid',
    path,
    text,
    progress,
    highlighted,
    color,
    obstacles,
    arrow_head,
    axis,
  }: ArrowLineProps) {
    const headStyle = arrow_head ?? 'forward';
    const renderForward = headStyle === 'forward' || headStyle === 'both';
    const renderBackward = headStyle === 'backward' || headStyle === 'both';

    // Animation is managed by stroke-dasharray/stroke-dashoffset on a
    // Intersection and geometric offsets (obstacles taken into account)
    const conn = connection(
      from,
      to,
      obstacles,
      startPortOffset,
      endPortOffset,
      path,
      axis
    );

    // Position and angle of the tip at parameter `progress`.
    const tip = pathTip(conn, progress);
    const ang = (tip.angleDeg * Math.PI) / 180;
    const headFwd =
      `${tip.x},${tip.y} ` +
      `${tip.x - HEAD * Math.cos(ang - Math.PI / 6)},${tip.y - HEAD * Math.sin(ang - Math.PI / 6)} ` +
      `${tip.x - HEAD * Math.cos(ang + Math.PI / 6)},${tip.y - HEAD * Math.sin(ang + Math.PI / 6)}`;

    // Start position for an inverted arrow
    const startTip = pathTip(conn, 0);
    const angStart = (startTip.angleDeg * Math.PI) / 180 + Math.PI;
    const headBwd =
      `${startTip.x},${startTip.y} ` +
      `${startTip.x - HEAD * Math.cos(angStart - Math.PI / 6)},${startTip.y - HEAD * Math.sin(angStart - Math.PI / 6)} ` +
      `${startTip.x - HEAD * Math.cos(angStart + Math.PI / 6)},${startTip.y - HEAD * Math.sin(angStart + Math.PI / 6)}`;

    // Visible path (polyline) from start to tip.
    // The ends are shortened to the base of the arrow triangle
    // so that the stroke thickness does not protrude under the tip.
    const pts = visiblePath(conn, progress);
    const ptsAdjusted = [...pts];
    if (renderForward && progress > 0.02 && ptsAdjusted.length >= 2) {
      const last = ptsAdjusted.length - 1;
      ptsAdjusted[last] = {
        x: tip.x - HEAD * Math.cos(ang),
        y: tip.y - HEAD * Math.sin(ang),
      };
    }
    if (renderBackward && progress > 0.02 && ptsAdjusted.length >= 2) {
      ptsAdjusted[0] = {
        x: startTip.x - HEAD * Math.cos(angStart),
        y: startTip.y - HEAD * Math.sin(angStart),
      };
    }
    const ptStr = ptsAdjusted.map((p) => `${p.x},${p.y}`).join(' ');

    // Text label position: anchor offset if the middle of the path falls
    // on an interleaved node, otherwise middle of the path.
    const mid = conn.labelAnchor ?? pathTip(conn, 0.5);

    const lineCls = `rdfa-arrow-line${highlighted ? ' rdfa-arrow-line--highlight' : ''}`;
    const headCls = `rdfa-arrow-head${highlighted ? ' rdfa-arrow-head--highlight' : ''}`;

    // A custom color overrides the theme's neutral stroke variable that both the
    // line (stroke) and the head (fill) read; the `--highlight` classes paint
    // `--rdfa-accent` instead, so a highlighted connection keeps the accent.
    const gStyle = color
      ? ({ '--rdfa-arrow': color } as CSSProperties)
      : undefined;

    return (
      <g style={gStyle}>
        <polyline className={lineCls} data-style={style} points={ptStr} />
        {renderForward && progress > 0.02 ? (
          <polygon className={headCls} points={headFwd} />
        ) : null}
        {renderBackward && progress > 0.02 ? (
          <polygon className={headCls} points={headBwd} />
        ) : null}
        {text ? (
          <text
            className="rdfa-arrow-label"
            x={mid.x}
            y={mid.y - 6}
            textAnchor="middle"
            opacity={progress}
          >
            {text}
          </text>
        ) : null}
      </g>
    );
  }
);
