import type { Node } from '../types';

/**
 * Runtime recolor override (the `set_color` action). Each channel, when present,
 * replaces the node's corresponding static color before derivation — so a
 * `background_color` override alone still derives a coordinated border / ink,
 * exactly like a static tint. Values are already-resolved CSS color strings,
 * possibly a `color-mix(...)` expression (the eased recolor cross-fade).
 */
export interface ColorOverride {
  background_color?: string;
  border_color?: string;
  text_color?: string;
}

/**
 * Node tint CSS variables, computed from `background_color` /
 * `border_color`. Applied to the `.rdfa-node` root; the CSS for shapes, panels
 * and pictograms reads them with a fallback to theme colors.
 *
 * - `--rdfa-fill`: background color (shape fill, panel background,
 *   pictogram badge).
 * - `--rdfa-stroke`: border/stroke color.
 * - `--rdfa-ink`: internal text color (read by CSS outside code blocks).
 *
 * Two automatic derivations, both in **pure CSS** (SSR-safe, no DOM access,
 * valid for both predefined names and hex values):
 * - Border: if only `background_color` is provided, a coordinated border (the
 *   darkened background) via `color-mix`.
 * - Text: if `text_color` is absent but a background is defined, a very high
 *   contrast color (black or white) based on the background luminance, via the
 *   relative color syntax `oklch(from …)`.
 *
 * An optional `override` (from an active `set_color`) takes precedence over the
 * static colors per channel; derivations then run on the effective values, so
 * the border/ink follow a recolored background.
 *
 * Returns a plain string-keyed record (not React's `CSSProperties`): this
 * module is framework-agnostic. Callers spread it into their own style object.
 */
export function nodeTint(
  node: Node,
  override?: ColorOverride
): Record<string, string> {
  const bg = override?.background_color ?? node.background_color;
  const border = override?.border_color ?? node.border_color;
  const text = override?.text_color ?? node.text_color;
  const style: Record<string, string> = {};
  if (bg) style['--rdfa-fill'] = bg;
  const stroke = border ?? (bg ? complementaryBorder(bg) : undefined);
  if (stroke) style['--rdfa-stroke'] = stroke;
  const ink = text ?? (bg ? contrastingInk() : undefined);
  if (ink) style['--rdfa-ink'] = ink;
  return style;
}

/** Default coordinated border: the background darkened by ~32% (looks good). */
function complementaryBorder(background: string): string {
  return `color-mix(in srgb, ${background}, #000 32%)`;
}

/**
 * Auto very high contrast text on `--rdfa-fill`: black if the background is light,
 * white if it is dark. We compare the perceptual luminance (`l` in oklch) to a
 * threshold; `clamp(0, (threshold - l) * 1000, 1)` switches L to 0 (black) or 1 (white).
 */
function contrastingInk(): string {
  return 'oklch(from var(--rdfa-fill) clamp(0, (0.62 - l) * 1000, 1) 0 0)';
}
