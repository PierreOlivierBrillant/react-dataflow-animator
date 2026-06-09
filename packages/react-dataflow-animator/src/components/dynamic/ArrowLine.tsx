
import { connection, pathTip, visiblePath, type NodeGeom } from '../../engine/geometry';
import type { LineStyle } from '../../types';

/**
 * Flèche SVG entre deux nœuds. `progress` ∈ [0,1] anime le dessin progressif.
 * `obstacles` est la liste de tous les nœuds — utilisée pour router la flèche
 * autour des labels. À utiliser à l'intérieur d'un `<svg className="rdfa-arrow-svg">`.
 */
export interface ArrowLineProps {
  from: NodeGeom;
  to: NodeGeom;
  startPortOffset?: number;
  endPortOffset?: number;
  style?: LineStyle;
  text?: string;
  /** 1 pour une flèche statique (décor), interpolé pour une flèche dynamique. */
  progress: number;
  /** Surlignée par une action highlight. */
  highlighted?: boolean;
  /** Tous les nœuds du stage — pour éviter les labels lors du routage. */
  obstacles?: NodeGeom[];
}

const HEAD = 9;

export function ArrowLine({
  from,
  to,
  startPortOffset = 0,
  endPortOffset = 0,
  style = 'solid',
  text,
  progress,
  highlighted,
  obstacles,
}: ArrowLineProps) {
  // L'animation est gérée par stroke-dasharray/stroke-dashoffset sur un
  // Intersection et décalages géométriques (obstacles pris en compte)
  const conn = connection(from, to, obstacles, startPortOffset, endPortOffset);

  // Position et angle de la pointe au paramètre `progress`.
  const tip = pathTip(conn, progress);
  const tipX = tip.x;
  const tipY = tip.y;
  const ang = (tip.angleDeg * Math.PI) / 180;

  const head =
    `${tipX},${tipY} ` +
    `${tipX - HEAD * Math.cos(ang - Math.PI / 6)},${tipY - HEAD * Math.sin(ang - Math.PI / 6)} ` +
    `${tipX - HEAD * Math.cos(ang + Math.PI / 6)},${tipY - HEAD * Math.sin(ang + Math.PI / 6)}`;

  // Chemin visible (polyline) de start jusqu'à la pointe.
  const pts = visiblePath(conn, progress);
  const ptStr = pts.map((p) => `${p.x},${p.y}`).join(' ');

  // Position du label de texte au milieu du chemin complet.
  const mid = pathTip(conn, 0.5);

  const lineCls = `rdfa-arrow-line${highlighted ? ' rdfa-arrow-line--highlight' : ''}`;
  const headCls = `rdfa-arrow-head${highlighted ? ' rdfa-arrow-head--highlight' : ''}`;

  return (
    <g>
      <polyline className={lineCls} data-style={style} points={ptStr} />
      {progress > 0.02 ? <polygon className={headCls} points={head} /> : null}
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

