import type { Highlighter, Node } from '../types';
import { isPanelNode, isShapeType, type ShapeType } from '../render/nodeKinds';
import { nodeTint, type ColorOverride } from '../render/nodeColors';
import { h, pct, s, setStyle, type Child } from './el';
import { renderNodeIcon } from './icons/nodeIcons';
import { renderSubIcon } from './icons/subIcons';
import { appendRichText } from './richtext';

/**
 * Static node markup — the port of `StaticNode` + `NodeView` + `NodePanel` +
 * `ShapeNode`.
 *
 * Scope note for phase 2.2: `set_content` panels (`ContentPanel`) are NOT built
 * here. A node whose content is active therefore renders its pictogram, which is
 * a real difference from the React `Stage` — the cells where that happens are
 * listed in the compare ratchet, not worked around.
 */

export interface NodeElementOptions {
  /** Placement at build time; rewritten each convergence pass. */
  placement: { cx: number; cy: number };
  /** Runtime badge override (`set_icon`); `''` clears it. */
  iconOverride?: string;
  /** Live contact state (0..1) for `switch` / `push_button`. */
  closed?: number;
  loading?: boolean;
  highlighted?: boolean;
  /** Global node opacity (`set_visible` fade). Omitted when >= 1. */
  opacity?: number;
  /** Clockwise rotation (deg) of the VISUAL. The label stays upright. */
  rotation?: number;
  labelSide?: 'left' | 'right';
  colorOverride?: ColorOverride;
  highlight: Highlighter;
}

/**
 * Text under the node: its `text`, its `value` (+`unit`), or both joined — the
 * label convenience for electrical components (`R1 · 10 kΩ`).
 */
function nodeLabel(o: Node): string | undefined {
  const valuePart =
    o.value != null && o.value !== ''
      ? `${o.value}${o.unit ? ` ${o.unit}` : ''}`
      : undefined;
  if (o.text && valuePart) return `${o.text} · ${valuePart}`;
  return o.text ?? valuePart;
}

/**
 * The subset of a node a text panel reads.
 *
 * Origin: `NodePanel.tsx` `PanelContent`.
 */
type PanelContent = Pick<Node, 'type' | 'header' | 'body' | 'language'>;

/** Port of `ShapeNode`'s geometry table. */
function shapeGeometry(type: ShapeType): SVGElement {
  switch (type) {
    case 'circle':
      return s('ellipse', { cx: '50', cy: '50', rx: '48', ry: '48' });
    case 'diamond':
      return s('polygon', { points: '50,2 98,50 50,98 2,50' });
    case 'triangle':
      return s('polygon', { points: '50,4 97,96 3,96' });
    case 'parallelogram':
      return s('polygon', { points: '24,8 98,8 76,92 2,92' });
    case 'star':
      return s('polygon', {
        points:
          '50,2 61.3,34.5 95.6,35.2 68.3,55.9 78.2,88.8 50,69.2 21.8,88.8 31.7,55.9 4.4,35.2 38.7,34.5',
      });
    // `square`, `width_rectangle` and `height_rectangle` — and anything a
    // future ShapeType adds — share the rounded box; the CSS class gives them
    // their proportions.
    default:
      return s('rect', { x: '2', y: '2', width: '96', height: '96', rx: '4' });
  }
}

/** Port of `ShapeNode`. */
function buildShape(object: Node): HTMLElement {
  const type = object.type as ShapeType;
  const children: Child[] = [
    s(
      'svg',
      {
        class: 'rdfa-shape-bg',
        viewBox: '0 0 100 100',
        preserveAspectRatio: 'none',
        role: 'presentation',
        'aria-hidden': 'true',
      },
      [shapeGeometry(type)]
    ),
  ];
  if (object.body) {
    const text = h('span', { class: 'rdfa-shape-text' });
    appendRichText(text, object.body);
    children.push(text);
  }
  return h('div', { class: `rdfa-shape rdfa-shape--${type}` }, children);
}

/** Port of `NodePanel`. */
function buildPanel(object: PanelContent, highlight: Highlighter): HTMLElement {
  const isComplex = object.type === 'complex_node';
  const { header, body, language } = object;

  const zone = (text: string, className: string): HTMLElement => {
    if (!language) return h('div', { class: className }, [text]);
    const el = h('div', { class: `${className} rdfa-code` });
    // The React side uses `dangerouslySetInnerHTML` here — the highlighter
    // returns markup by contract, so this is the literal equivalent.
    el.innerHTML = highlight(text, language);
    return el;
  };

  const children: Child[] = [];
  // The header is only emitted for `complex_node`; `simple_node` is body-only.
  if (isComplex && header)
    children.push(zone(header, 'rdfa-node-panel-header'));
  if (body) children.push(zone(body, 'rdfa-node-panel-body'));

  return h(
    'div',
    {
      class: 'rdfa-node-panel' + (isComplex ? ' rdfa-node-panel--complex' : ''),
    },
    children
  );
}

/** Port of `NodeView`: dispatch to panel / shape / signal pad / pictogram. */
function buildVisualBody(
  object: Node,
  options: NodeElementOptions,
  effIcon: string | undefined,
  isSignal: boolean
): HTMLElement | SVGElement {
  if (isPanelNode(object.type))
    return buildPanel(object as PanelContent, options.highlight);
  if (isShapeType(object.type)) return buildShape(object);
  if (isSignal) {
    // A labelled I/O pad for logic diagrams: the bit value sits in the centre.
    const val = effIcon ?? object.icon ?? '';
    return h(
      'span',
      { class: 'rdfa-signal' },
      val
        ? [h('span', { class: 'rdfa-signal-value' }, [renderSubIcon(val)])]
        : []
    );
  }
  // Stateful contacts read `closed` (live from a `toggle`, else the static
  // `node.closed`); other component/pictogram types ignore it.
  const closedFrac = options.closed ?? (object.closed ? 1 : 0);
  return h('span', { class: 'rdfa-node-icon' }, [
    renderNodeIcon(object.type, { closed: closedFrac }),
  ]);
}

/**
 * Builds one `.rdfa-node` element.
 *
 * The class-name CONCATENATION ORDER is reproduced exactly from `StaticNode`:
 * the CSS has no order-sensitive selectors today, but a diff against the React
 * markup is the main review tool here and gratuitous reordering would hide real
 * changes in noise.
 */
export function buildNodeElement(
  object: Node,
  options: NodeElementOptions
): HTMLElement {
  // Runtime set_icon wins over the static badge; '' clears it (nullish
  // coalescing keeps '' distinct from "no override").
  const effIcon = options.iconOverride ?? object.icon;
  const isPanel = isPanelNode(object.type);
  const isShape = isShapeType(object.type);
  // A `signal` I/O pad shows its value IN the pad (not as a corner badge).
  const isSignal = object.type === 'signal';
  const tinted = !isSignal
    ? (options.colorOverride?.background_color ?? object.background_color)
    : undefined;

  const cls =
    'rdfa-node' +
    (isPanel ? ' rdfa-node--panel' : '') +
    (isShape ? ' rdfa-node--shape' : '') +
    (isSignal ? ' rdfa-node--signal' : '') +
    (tinted ? ' rdfa-node--tinted' : '') +
    (options.highlighted ? ' rdfa-node--highlight' : '');

  const visual = h('span', { class: 'rdfa-node-visual' }, [
    buildVisualBody(object, options, effIcon, isSignal),
  ]);
  // Rotation lives on the VISUAL, never on `.rdfa-node`: the label must stay
  // upright, and the layout box arrows anchor to must not change.
  if (options.rotation != null && options.rotation !== 0)
    setStyle(visual, { transform: `rotate(${options.rotation}deg)` });

  // Unique corner badge: the subicon (tech) and the loading ring share the same
  // positioned container, so they always remain concentric. A signal pad shows
  // its value inside instead, so it carries no corner badge.
  if (!isSignal && (effIcon || options.loading)) {
    const badge = h('span', { class: 'rdfa-node-badge' });
    if (effIcon)
      badge.appendChild(
        h('span', { class: 'rdfa-node-subicon' }, [renderSubIcon(effIcon)])
      );
    if (options.loading)
      badge.appendChild(
        h('span', { class: 'rdfa-spinner', 'aria-hidden': 'true' })
      );
    visual.appendChild(badge);
  }

  // A node with a `url` wraps its visual in a link. The wrapper sits BETWEEN
  // `.rdfa-node` and `.rdfa-node-visual`, so `measure()` still finds the visual
  // via `querySelector` and the geometry is unaffected.
  const inner = object.url
    ? h(
        'a',
        {
          class: 'rdfa-node-link',
          href: object.url,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
        [visual]
      )
    : visual;

  const el = h('div', { class: cls, 'data-node-id': object.id }, [inner]);
  setStyle(el, {
    left: pct(options.placement.cx),
    top: pct(options.placement.cy),
    opacity:
      options.opacity != null && options.opacity < 1
        ? String(options.opacity)
        : undefined,
    ...nodeTint(object, options.colorOverride),
  });

  const label = nodeLabel(object);
  if (label) {
    const labelEl = h('span', {
      class:
        'rdfa-node-label' +
        (options.labelSide ? ` rdfa-node-label--${options.labelSide}` : ''),
    });
    appendRichText(labelEl, label);
    el.appendChild(labelEl);
  }

  return el;
}

/** Writes a node's measured placement. Called once per convergence pass. */
export function applyNodePlacement(
  el: HTMLElement,
  placement: { cx: number; cy: number }
): void {
  setStyle(el, { left: pct(placement.cx), top: pct(placement.cy) });
}
