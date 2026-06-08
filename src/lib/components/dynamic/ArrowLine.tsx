import { connection, type NodeGeom } from '../../engine/geometry';
import { lerp } from '../../engine/timeline';
import type { LineStyle } from '../../types';

/**
 * Flèche SVG entre deux nœuds. `progress` ∈ [0,1] anime le dessin progressif
 * (x2/y2 interpolés). À utiliser à l'intérieur d'un `<svg className="rdfa-arrow-svg">`.
 */
export interface ArrowLineProps {
  from: NodeGeom;
  to: NodeGeom;
  shift?: number;
  style?: LineStyle;
  text?: string;
  /** 1 pour une flèche statique (décor), interpolé pour une flèche dynamique. */
  progress?: number;
}

const HEAD = 9;

export function ArrowLine({
  from,
  to,
  shift = 0,
  style = 'full',
  text,
  progress = 1,
}: ArrowLineProps) {
  const conn = connection(from, to, shift);
  const tipX = lerp(conn.start.x, conn.end.x, progress);
  const tipY = lerp(conn.start.y, conn.end.y, progress);

  const ang = (conn.angleDeg * Math.PI) / 180;
  const head = `${tipX},${tipY} ` +
    `${tipX - HEAD * Math.cos(ang - Math.PI / 6)},${tipY - HEAD * Math.sin(ang - Math.PI / 6)} ` +
    `${tipX - HEAD * Math.cos(ang + Math.PI / 6)},${tipY - HEAD * Math.sin(ang + Math.PI / 6)}`;

  const midX = (conn.start.x + conn.end.x) / 2;
  const midY = (conn.start.y + conn.end.y) / 2;

  return (
    <g>
      <line
        className="rdfa-arrow-line"
        data-style={style}
        x1={conn.start.x}
        y1={conn.start.y}
        x2={tipX}
        y2={tipY}
      />
      {progress > 0.02 ? <polygon className="rdfa-arrow-head" points={head} /> : null}
      {text ? (
        <text
          className="rdfa-arrow-label"
          x={midX}
          y={midY - 6}
          textAnchor="middle"
          opacity={progress}
        >
          {text}
        </text>
      ) : null}
    </g>
  );
}
