import type { NodeGeom } from '../engine/geometry';
import { clamp } from '../engine/timeline';
import { h, px, setStyle } from './el';
import { appendRichText } from './richtext';

/**
 * Comment bubble markup — the port of `CommentBubble.tsx`.
 *
 * FIDELITY NOTE — the rich-text treatment is ASYMMETRIC in the React component,
 * and that asymmetry is reproduced here rather than tidied up: the OMNISCIENT
 * bubble renders `richText(text)`, the node-anchored one renders the raw string
 * plus a tail `<span>`. Normalising the two would change pixels for any spec
 * whose comment contains `$…$`.
 *
 * Like packets, this is an ABSOLUTE OVERLAY (`.rdfa-comment` is
 * `position: absolute`), so it cannot feed back into node measurement and is
 * built once, after the convergence loop.
 */

/** Margin (px) kept between a bubble and the stage edges. `CommentBubble`'s. */
const PAD = 8;

/** Gap (px) between the bubble and the node it points at. */
const NODE_GAP = 8;

/** Half the tail's base (px) — the tail never leaves the bubble's rounded ends. */
const TAIL_INSET = 14;

export interface CommentElementOptions {
  /** Anchor node. Absent = omniscient bubble, centred at the top of the stage. */
  node?: NodeGeom;
  text: string;
  opacity: number;
  stageW: number;
  stageH: number;
}

/**
 * Builds the bubble and appends it to `parent`, then positions it.
 *
 * The two-phase shape is REQUIRED, not stylistic: the bubble's placement is a
 * function of its own rendered size, which is only knowable once it is in the
 * document. React discovers that size through a `ResizeObserver` and re-renders;
 * here the element is appended, measured, then placed — reaching the same
 * resting state in one synchronous step instead of two frames.
 *
 * `offsetWidth`/`offsetHeight` (not `getBoundingClientRect`) on purpose: React
 * stores those, and they are ROUNDED to integers. A fractional rect would place
 * the bubble a sub-pixel off and light up the diff.
 */
export function appendCommentElement(
  parent: HTMLElement,
  options: CommentElementOptions
): HTMLElement {
  const { node, text, opacity, stageW, stageH } = options;
  const omniscient = !node;

  const el = h('div', {
    class: omniscient
      ? 'rdfa-comment rdfa-comment--omniscient'
      : 'rdfa-comment',
  });
  // Omniscient bubbles interpret `$…$`; anchored ones do not — see the note above.
  if (omniscient) appendRichText(el, text);
  else el.appendChild(document.createTextNode(text));

  const tail = omniscient
    ? undefined
    : h('span', { class: 'rdfa-comment-tail' });
  if (tail) el.appendChild(tail);

  // Placed off-flow with no left/top yet: `.rdfa-comment` is absolutely
  // positioned and width-capped by `max-width`, so its size does NOT depend on
  // where it ends up — measuring before placing is safe.
  parent.appendChild(el);
  const w = el.offsetWidth;
  const h0 = el.offsetHeight;
  const degenerate = w === 0 || h0 === 0;

  if (omniscient) {
    let left = stageW / 2 - w / 2;
    if (w > 0 && stageW > 0) {
      left = clamp(left, PAD, Math.max(PAD, stageW - w - PAD));
    }
    setStyle(el, {
      left: px(left),
      top: px(PAD),
      opacity: String(opacity),
      visibility: degenerate ? 'hidden' : 'visible',
    });
    return el;
  }

  const nodeTop = node.y - node.height / 2;
  const nodeBottom = node.y + node.height / 2;
  // Not enough room above → flip below the node (and flip the tail with it).
  const below = h0 > 0 && nodeTop - NODE_GAP - h0 < PAD;
  if (below) el.classList.add('rdfa-comment--below');

  let top = below ? nodeBottom + NODE_GAP : nodeTop - NODE_GAP - h0;
  if (h0 > 0 && stageH > 0) {
    top = clamp(top, PAD, Math.max(PAD, stageH - h0 - PAD));
  }
  let left = node.x - w / 2;
  if (w > 0 && stageW > 0) {
    left = clamp(left, PAD, Math.max(PAD, stageW - w - PAD));
  }
  // The tail keeps pointing at the node even when the bubble is pushed off the
  // node's axis by an edge clamp.
  const tailX =
    w > 0 ? clamp(node.x - left, TAIL_INSET, w - TAIL_INSET) : w / 2;

  setStyle(el, {
    left: px(left),
    top: px(top),
    opacity: String(opacity),
    visibility: degenerate ? 'hidden' : 'visible',
  });
  if (tail) setStyle(tail, { left: px(tailX) });
  return el;
}
