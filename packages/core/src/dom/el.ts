/**
 * Minimal DOM-building helpers for the framework-agnostic renderer.
 *
 * Two deliberate design choices, both aimed at making a side-by-side diff
 * against the React components auditable:
 *
 *  - **Keys are the literal names that must land in the DOM** — `'stroke-width'`,
 *    `'text-anchor'`, `'flex-direction'` — never React's camelCase. There is no
 *    name-mangling layer: a reviewer comparing `arrowElement.ts` to
 *    `ArrowLine.tsx` SEES the rename and can check it. A magic camelCase→kebab
 *    converter would instead hide the one case it gets wrong.
 *  - **Style values are `string`, never `number`.** React's number→px coercion is
 *    per-property (`left: 12` → `12px`, but `opacity: 0.5` → `0.5`), which is
 *    exactly the class of bug that costs a pixel silently. Forcing `px(x)` at the
 *    call site keeps the unit visible.
 *
 * SSR-safe: `document` is only touched when a function is CALLED, never at module
 * evaluation.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** `undefined` skips the attribute entirely, the way React omits it. */
export type Attrs = Record<string, string | undefined>;

export type Child = Node | string;

function fill(el: Element, attrs?: Attrs, children?: Child[]): void {
  if (attrs) {
    for (const name in attrs) {
      const value = attrs[name];
      if (value !== undefined) el.setAttribute(name, value);
    }
  }
  if (children) {
    for (const child of children) {
      el.appendChild(
        typeof child === 'string' ? document.createTextNode(child) : child
      );
    }
  }
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Attrs,
  children?: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  fill(el, attrs, children);
  return el;
}

/**
 * SVG counterpart of {@link h}. Beyond the namespace, this is why classes go
 * through `setAttribute` in {@link fill} rather than a `className` assignment:
 * on an SVG element `className` is a read-only `SVGAnimatedString`, so
 * `el.className = 'x'` silently does nothing.
 */
export function s<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs?: Attrs,
  children?: Child[]
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  fill(el, attrs, children);
  return el;
}

/**
 * Sets inline styles, custom properties included.
 *
 * One function rather than a `setStyle` / `setVars` pair, because `setProperty`
 * is the only form that works for BOTH: `el.style.foo = …` cannot reach a
 * `--rdfa-*` custom property at all. The single entry point removes the choice —
 * and with it the chance of picking the branch that silently no-ops. Names are
 * therefore CSS names (`'flex-direction'`), matching the attribute convention
 * above.
 */
export function setStyle(
  el: HTMLElement | SVGElement,
  style: Record<string, string | undefined>
): void {
  for (const name in style) {
    const value = style[name];
    if (value !== undefined) el.style.setProperty(name, value);
  }
}

/**
 * Retained-mode counterpart of {@link setStyle}: writes `style`, then REMOVES
 * every property the previous call wrote that is absent now. Returns the key set
 * to hand back on the next call.
 *
 * This asymmetry is the single most common way a retained renderer drifts from
 * a rebuilding one. React re-creates the `style` object each render, so a
 * declaration that stops being produced simply disappears; `setStyle` alone
 * would leave it behind forever. A node that stops being tinted, an arrow that
 * loses its colour, a visual whose rotation returns to 0 — each would keep the
 * stale value and diverge from a fresh mount.
 */
export function syncStyle(
  el: HTMLElement | SVGElement,
  style: Record<string, string | undefined>,
  previous?: readonly string[]
): string[] {
  const written: string[] = [];
  for (const name in style) {
    const value = style[name];
    if (value === undefined) continue;
    // Reading the current value first is what makes a STATIC frame free. Under
    // playback most elements are unchanged, and `setProperty` with an identical
    // value still dirties the element for style recalculation; `getPropertyValue`
    // is a map read that touches no layout.
    if (el.style.getPropertyValue(name) !== value)
      el.style.setProperty(name, value);
    written.push(name);
  }
  if (previous) {
    for (const name of previous) {
      if (!written.includes(name)) el.style.removeProperty(name);
    }
  }
  pruneEmptyStyle(el);
  return written;
}

/**
 * Drops an empty `style=""` attribute.
 *
 * Any mutation of `el.style` — including a `removeProperty` for a property that
 * is not set — MATERIALISES the attribute, so an element that has been written
 * to and then emptied carries `style=""` while one that was never written to
 * carries no attribute at all. The two render identically, but they are not the
 * same DOM, and the mount-vs-update gate is right to say so.
 *
 * The test is on the SERIALISED attribute rather than on `el.style.length`,
 * deliberately: `length` counts standard longhands only, and engines disagree
 * about whether custom properties are included. Asking for the string the DOM
 * will actually expose is the question we mean, and the only one that is
 * portable.
 */
export function pruneEmptyStyle(el: HTMLElement | SVGElement): void {
  if (el.getAttribute('style') === '') el.removeAttribute('style');
}

/**
 * Attribute counterpart of the read-before-write in {@link syncStyle}: skips the
 * write when the attribute already holds `value`.
 *
 * Same reasoning — a connection whose `d` has not moved should cost nothing, and
 * `getAttribute` is a map read where `setAttribute` invalidates.
 */
export function setAttrIfChanged(
  el: Element,
  name: string,
  value: string
): void {
  if (el.getAttribute(name) !== value) el.setAttribute(name, value);
}

export function px(n: number): string {
  return `${n}px`;
}

/** Placement fractions reach the DOM as percentages (`StaticNode`'s left/top). */
export function pct(n: number): string {
  return `${n * 100}%`;
}
