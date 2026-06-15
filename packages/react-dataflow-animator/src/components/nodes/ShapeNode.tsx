import type { ReactNode } from 'react';
import type { Node } from '../../types';
import type { ShapeType } from './nodeKinds';

/**
 * Nœuds géométriques : une forme dessinée en SVG qui peut contenir un court
 * texte centré (`body`). La forme remplit la boîte (qui s'adapte au texte) ;
 * une marge de sécurité par forme + `overflow:hidden` (CSS) garantissent que le
 * texte ne déborde pas du tracé visible. Le `subicon` reste géré par StaticNode.
 *
 * Le SVG est tracé en `preserveAspectRatio="none"` (il épouse la boîte) avec un
 * `vector-effect: non-scaling-stroke` (côté CSS) pour conserver une épaisseur de
 * trait constante même quand la boîte est étirée par un texte long.
 */

/**
 * Tracé de chaque forme dans un viewBox 0..100. `rect` est partagé par le carré
 * et les deux rectangles (l'orientation est portée par la boîte, pas le tracé).
 * Les 5 sommets de l'étoile et le cercle sont fixes ; tout est étiré sur la boîte.
 */
function shapeGeometry(type: ShapeType): ReactNode {
  switch (type) {
    case 'square':
    case 'width_rectangle':
    case 'height_rectangle':
      return <rect x="2" y="2" width="96" height="96" rx="4" />;
    case 'circle':
      return <ellipse cx="50" cy="50" rx="48" ry="48" />;
    case 'diamond':
      return <polygon points="50,2 98,50 50,98 2,50" />;
    case 'triangle':
      return <polygon points="50,4 97,96 3,96" />;
    case 'parallelogram':
      return <polygon points="24,8 98,8 76,92 2,92" />;
    case 'star':
      return (
        <polygon points="50,2 61.3,34.5 95.6,35.2 68.3,55.9 78.2,88.8 50,69.2 21.8,88.8 31.7,55.9 4.4,35.2 38.7,34.5" />
      );
  }
}

export function ShapeNode({ object }: { object: Node }): ReactNode {
  const type = object.type as ShapeType;
  return (
    <div className={`rdfa-shape rdfa-shape--${type}`}>
      <svg
        className="rdfa-shape-bg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        role="presentation"
        aria-hidden="true"
      >
        {shapeGeometry(type)}
      </svg>
      {object.body ? (
        <span className="rdfa-shape-text">{object.body}</span>
      ) : null}
    </div>
  );
}
