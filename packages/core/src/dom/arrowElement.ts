import type { LineStyle, PathShape } from '../types';
import {
  connection,
  pathD,
  pathTip,
  visiblePath,
  type Connection,
  type NodeContour,
  type NodeGeom,
  type Point,
} from '../engine/geometry';
import type { ConnectionAxis } from '../engine/layout';
import { s, setStyle } from './el';
import { ARROW_HEAD } from './stageConstants';
import { appendRichTextSvg } from './richtext';

/**
 * SVG arrow between two nodes — the port of `ArrowLine.tsx`.
 *
 * `progress` ∈ [0,1] animates the progressive drawing; a static connection
 * passes 1. Produces a `<g>` meant to live inside `<svg class="rdfa-arrow-svg">`.
 */

export interface ArrowDescriptor {
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
  highlighted?: boolean;
  /** Line colour (CSS string, possibly a `color-mix(...)` cross-fade). */
  color?: string;
  /** All stage nodes — to route around labels. */
  obstacles?: NodeGeom[];
  axis?: ConnectionAxis;
  fromContour?: NodeContour;
  toContour?: NodeContour;
  /** Precomputed orthogonal polyline (circuit schematics). When given, it fully
   *  replaces the per-wire `connection()` routing. */
  route?: Point[];
  /** Points of `route` where THIS wire steps over another net's wire. */
  hops?: Point[];
  hopRadius?: number;
}

/** Builds a {@link Connection} from a ready-made polyline (router output), so
 *  the arrowhead / progress animation traverse it exactly like a routed path. */
function connectionFromRoute(route: Point[]): Connection {
  const start = route[0];
  const end = route[route.length - 1];
  const prev = route[route.length - 2] ?? start;
  const angleDeg = (Math.atan2(end.y - prev.y, end.x - prev.x) * 180) / Math.PI;
  return {
    start,
    end,
    waypoints: route.length > 2 ? route.slice(1, -1) : undefined,
    angleDeg,
  };
}

function headPoints(tip: Point, angleRad: number): string {
  return (
    `${tip.x},${tip.y} ` +
    `${tip.x - ARROW_HEAD * Math.cos(angleRad - Math.PI / 6)},${tip.y - ARROW_HEAD * Math.sin(angleRad - Math.PI / 6)} ` +
    `${tip.x - ARROW_HEAD * Math.cos(angleRad + Math.PI / 6)},${tip.y - ARROW_HEAD * Math.sin(angleRad + Math.PI / 6)}`
  );
}

export function buildArrowElement(desc: ArrowDescriptor): SVGGElement {
  const {
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
    fromContour,
    toContour,
    route,
    hops,
    hopRadius,
  } = desc;

  const headStyle = arrow_head ?? 'forward';
  const renderForward = headStyle === 'forward' || headStyle === 'both';
  const renderBackward = headStyle === 'backward' || headStyle === 'both';

  // A precomputed orthogonal route (circuit schematics) fully replaces the
  // per-wire routing; otherwise `connection()` anchors + shapes the path,
  // taking obstacles (labels) into account.
  const conn =
    route && route.length >= 2
      ? connectionFromRoute(route)
      : connection(
          from,
          to,
          obstacles,
          startPortOffset,
          endPortOffset,
          path,
          axis,
          fromContour,
          toContour
        );

  // Position and angle of the tip at parameter `progress`.
  const tip = pathTip(conn, progress);
  const ang = (tip.angleDeg * Math.PI) / 180;
  const startTip = pathTip(conn, 0);
  const angStart = (startTip.angleDeg * Math.PI) / 180 + Math.PI;

  // Visible path (polyline) from start to tip. The ends are shortened to the
  // base of the arrow triangle so the stroke thickness does not protrude under
  // the tip.
  const pts = visiblePath(conn, progress);
  const ptsAdjusted = [...pts];
  if (renderForward && progress > 0.02 && ptsAdjusted.length >= 2) {
    ptsAdjusted[ptsAdjusted.length - 1] = {
      x: tip.x - ARROW_HEAD * Math.cos(ang),
      y: tip.y - ARROW_HEAD * Math.sin(ang),
    };
  }
  if (renderBackward && progress > 0.02 && ptsAdjusted.length >= 2) {
    ptsAdjusted[0] = {
      x: startTip.x - ARROW_HEAD * Math.cos(angStart),
      y: startTip.y - ARROW_HEAD * Math.sin(angStart),
    };
  }

  const lineCls = `rdfa-arrow-line${highlighted ? ' rdfa-arrow-line--highlight' : ''}`;
  const headCls = `rdfa-arrow-head${highlighted ? ' rdfa-arrow-head--highlight' : ''}`;

  const g = s('g');
  // A custom colour overrides the theme's neutral stroke variable that both the
  // line (stroke) and the head (fill) read; the `--highlight` classes paint
  // `--rdfa-accent` instead, so a highlighted connection keeps the accent.
  if (color) setStyle(g, { '--rdfa-arrow': color });

  // `style` is destructured with a default, so `data-style` is ALWAYS emitted.
  g.appendChild(
    s('path', {
      class: lineCls,
      'data-style': style,
      d: pathD(ptsAdjusted, hops, hopRadius),
    })
  );

  if (renderForward && progress > 0.02)
    g.appendChild(
      s('polygon', { class: headCls, points: headPoints(tip, ang) })
    );
  if (renderBackward && progress > 0.02)
    g.appendChild(
      s('polygon', { class: headCls, points: headPoints(startTip, angStart) })
    );

  if (text) {
    // Label position: the anchor offset if the middle of the path falls on an
    // interleaved node, otherwise the middle of the path.
    const mid = conn.labelAnchor ?? pathTip(conn, 0.5);
    const label = s('text', {
      class: 'rdfa-arrow-label',
      x: String(mid.x),
      y: String(mid.y - 6),
      'text-anchor': 'middle',
      opacity: String(progress),
    });
    appendRichTextSvg(label, text);
    g.appendChild(label);
  }

  return g;
}
