/**
 * Canonical serialisation of a rendered subtree, for the mount-vs-update gate.
 *
 * The retained renderer's central claim is that `mount(t₀) + update(t)` lands on
 * the same DOM as a fresh `mount(t)`. A pixel diff can only refute that claim
 * once the drift is big enough to move a pixel; comparing the DOM refutes it the
 * moment the two states differ at all, and says WHERE. This is the stronger
 * instrument, so it is the gate's primary signal.
 *
 * Three things are normalised away, because they are genuinely free to differ
 * without the rendering differing:
 *
 *  - **Attribute order.** `create` writes some attributes and `apply` the rest,
 *    so a freshly mounted element and an updated one can carry the same
 *    attributes in a different order. Browsers serialise in insertion order;
 *    the DOM is identical either way.
 *  - **Inline declaration order**, for the same reason.
 *  - **Float precision.** Geometry flows through trigonometry and easing, and
 *    the two paths can accumulate different last-bit error in a value that
 *    rounds to the same rendered position. Three decimals of a CSS pixel is far
 *    below anything observable and far above IEEE noise.
 *
 * Nothing else is touched. Element identity, nesting, child ORDER, class names,
 * text content and the set of declarations all compare verbatim — those are
 * exactly what a drifting retained renderer would get wrong.
 */

/** Decimals kept on every number found in an attribute or style value. */
const DEFAULT_PRECISION = 3;

function roundNumbers(value: string, precision: number): string {
  return value.replace(/-?\d+\.\d+(e[+-]?\d+)?/gi, (match) => {
    const n = Number(match);
    if (!Number.isFinite(n)) return match;
    // `Number(...)` on the fixed string drops trailing zeros, so 1.500 and 1.5
    // agree — they are the same number and one path may produce either.
    return String(Number(n.toFixed(precision)));
  });
}

/** Splits an inline `style` attribute into sorted `prop:value` declarations. */
function normalizeStyle(value: string, precision: number): string {
  return value
    .split(';')
    .map((decl) => decl.trim())
    .filter((decl) => decl.length > 0)
    .map((decl) => {
      const colon = decl.indexOf(':');
      if (colon === -1) return roundNumbers(decl, precision);
      const prop = decl.slice(0, colon).trim();
      const val = roundNumbers(decl.slice(colon + 1).trim(), precision);
      return `${prop}:${val}`;
    })
    .sort()
    .join(';');
}

function serialize(node: Node, precision: number, out: string[]): void {
  if (node.nodeType === 3 /* Node.TEXT_NODE */) {
    out.push(node.nodeValue ?? '');
    return;
  }
  if (node.nodeType !== 1 /* Node.ELEMENT_NODE */) return;

  const el = node as Element;
  const attrs = Array.from(el.attributes)
    .map((attr) => {
      const value =
        attr.name === 'style'
          ? normalizeStyle(attr.value, precision)
          : roundNumbers(attr.value, precision);
      return `${attr.name}="${value}"`;
    })
    .sort();

  out.push(`<${el.tagName.toLowerCase()}`);
  for (const attr of attrs) {
    out.push(' ');
    out.push(attr);
  }
  out.push('>');
  for (const child of Array.from(el.childNodes))
    serialize(child, precision, out);
  out.push(`</${el.tagName.toLowerCase()}>`);
}

/**
 * Serialises `root` and its subtree into a form two independently-produced but
 * equivalent renderings compare equal on.
 */
export function normalizeStageHtml(
  root: Element,
  precision: number = DEFAULT_PRECISION
): string {
  const out: string[] = [];
  serialize(root, precision, out);
  return out.join('');
}

/**
 * First differing offset between two normalised strings, with a window of
 * context on each side — so a failing gate reports the divergence instead of two
 * unreadable multi-kilobyte blobs.
 *
 * Returns `null` when the two are identical.
 */
export function firstDifference(
  a: string,
  b: string,
  context = 120
): { index: number; a: string; b: string } | null {
  if (a === b) return null;
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[i] === b[i]) i++;
  const from = Math.max(0, i - context);
  const to = i + context;
  return { index: i, a: a.slice(from, to), b: b.slice(from, to) };
}
