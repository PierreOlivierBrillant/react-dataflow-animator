import type { NodeType } from '../../types';
import { s } from '../el';
import { lerp } from '../stageConstants';
import { NODE_ICON_SHAPES, type IconShape } from './nodeIconShapes';

/**
 * Framework-free node pictograms — the port of
 * `packages/react-dataflow-animator/src/components/nodes/nodeIcons.tsx`.
 *
 * Inline SVG using `currentColor`, so the glyph follows the theme.
 */

/**
 * Bodies are OPAQUE, like `ShapeNode`'s (`.rdfa-shape-bg` fills with the same
 * token). Left hollow, a pictogram lets whatever is behind it — notably a
 * palette's canvas texture (grid, dots, scanlines) — run straight through the
 * glyph and compete with its own strokes.
 *
 * Inherited by children, so a path that is a pure stroke with no interior (a
 * coil, a lead, an arc) must opt out with its own `fill="none"`: an open path
 * fills as if closed, which would paint a blob over its neighbours. Those
 * opt-outs are carried in `nodeIconShapes.ts`.
 */
const BODY_FILL = 'var(--rdfa-fill, var(--rdfa-node-bg, #fff))';

function svg(shapes: IconShape[]): SVGElement {
  return s(
    'svg',
    {
      viewBox: '0 0 24 24',
      fill: BODY_FILL,
      stroke: 'currentColor',
      'stroke-width': '1.6',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      role: 'presentation',
      'aria-hidden': 'true',
    },
    shapes.map((shape) => s(shape.tag, shape.attr))
  );
}

/** SPST toggle switch, drawn from a `closed` fraction (0 = open, 1 = closed):
 *  the lever swings down onto the right contact as it closes. */
function switchIcon(closed: number): SVGElement {
  const ex = lerp(17.2, 18, closed);
  const ey = lerp(5, 12, closed);
  return svg([
    { tag: 'path', attr: { d: 'M0 12h6M18 12h6' } },
    {
      tag: 'circle',
      attr: { cx: '6', cy: '12', r: '1.4', fill: 'currentColor' },
    },
    {
      tag: 'circle',
      attr: { cx: '18', cy: '12', r: '1.4', fill: 'currentColor' },
    },
    { tag: 'path', attr: { d: `M6 12L${ex.toFixed(2)} ${ey.toFixed(2)}` } },
  ]);
}

/** Momentary push button: a plunger bar that drops to bridge the two contacts
 *  as it closes. */
function pushButtonIcon(closed: number): SVGElement {
  const barY = lerp(8, 11.4, closed);
  return svg([
    { tag: 'path', attr: { d: 'M0 12h7M17 12h7' } },
    {
      tag: 'circle',
      attr: { cx: '7', cy: '12', r: '1.3', fill: 'currentColor' },
    },
    {
      tag: 'circle',
      attr: { cx: '17', cy: '12', r: '1.3', fill: 'currentColor' },
    },
    { tag: 'path', attr: { d: `M6 ${barY.toFixed(2)}h12` } },
    { tag: 'path', attr: { d: `M12 ${barY.toFixed(2)}V3` } },
    { tag: 'path', attr: { d: 'M8 3h8' } },
  ]);
}

const FALLBACK: IconShape[] = [
  { tag: 'rect', attr: { x: '4', y: '4', width: '16', height: '16', rx: '2' } },
];

/**
 * Icon for a node type. `state.closed` (0..1) drives the stateful contacts
 * (`switch`, `push_button`); it is ignored by every other type.
 *
 * The React version also consults a `registerNodeIcon` registry. There is no
 * vanilla equivalent yet, for the same reason as `renderSubIcon`: the extension
 * point takes a `ReactNode` today, so its framework-free shape belongs to the
 * public vanilla API that step 2.6 designs.
 */
export function renderNodeIcon(
  type: NodeType,
  state?: { closed?: number }
): SVGElement {
  if (type === 'switch') return switchIcon(state?.closed ?? 0);
  if (type === 'push_button') return pushButtonIcon(state?.closed ?? 0);
  return svg(NODE_ICON_SHAPES[type] ?? FALLBACK);
}

/** Every node type the registry draws a dedicated pictogram for. */
export function nodeIconTypes(): string[] {
  return Object.keys(NODE_ICON_SHAPES);
}
