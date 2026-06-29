import type { CSSProperties } from 'react';
import type { Node } from '../../types';

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
 */
export function nodeTint(node: Node): CSSProperties {
  const { background_color: bg, border_color: border, text_color: text } = node;
  const style: Record<string, string> = {};
  if (bg) style['--rdfa-fill'] = bg;
  const stroke = border ?? (bg ? complementaryBorder(bg) : undefined);
  if (stroke) style['--rdfa-stroke'] = stroke;
  const ink = text ?? (bg ? contrastingInk() : undefined);
  if (ink) style['--rdfa-ink'] = ink;
  return style as CSSProperties;
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
