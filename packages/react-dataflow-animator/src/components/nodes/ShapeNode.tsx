import type { ReactNode } from 'react';
import type { Node } from '../../types';
import type { ShapeType } from '@react-dataflow-animator/core/render/nodeKinds';
import { richText } from '../../tex/RichText';

/**
 * Geometric nodes: an SVG-drawn shape that can contain a short
 * centered text (`body`). The shape fills the box (which adapts to the text);
 * a safe margin per shape + `overflow:hidden` (CSS) ensure that the
 * text does not overflow the visible path. The `subicon` is still managed by StaticNode.
 *
 * The SVG is drawn with `preserveAspectRatio="none"` (it fits the box) with a
 * `vector-effect: non-scaling-stroke` (CSS side) to keep a constant stroke
 * thickness even when the box is stretched by long text.
 */

/**
 * Path for each shape in a 0..100 viewBox. `rect` is shared by the square
 * and both rectangles (orientation is handled by the box, not the path).
 * The 5 vertices of the star and the circle are fixed; everything is stretched over the box.
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
        <span className="rdfa-shape-text">{richText(object.body)}</span>
      ) : null}
    </div>
  );
}
