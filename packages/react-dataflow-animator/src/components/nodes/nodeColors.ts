import type { CSSProperties } from 'react';
import type { Node } from '../../types';

/**
 * Variables CSS de teinte d'un nœud, calculées depuis `background_color` /
 * `border_color`. Posées sur la racine `.rdfa-node` ; le CSS des formes, panneaux
 * et pictogrammes les lit avec un fallback sur les couleurs du thème.
 *
 * - `--rdfa-fill` : couleur de fond (remplissage des formes, fond des panneaux,
 *   pastille des pictogrammes).
 * - `--rdfa-stroke` : couleur de bordure/trait.
 * - `--rdfa-ink` : couleur du texte interne (lue par le CSS hors zones de code).
 *
 * Deux dérivations automatiques, toutes deux en **CSS pur** (SSR-safe, aucun accès
 * DOM, valables pour un nom prédéfini comme pour un hex) :
 * - Bordure : si seul `background_color` est fourni, une bordure coordonnée (le
 *   fond assombri) via `color-mix`.
 * - Texte : si `text_color` est absent mais qu'un fond est défini, une couleur à
 *   très fort contraste (noir ou blanc) selon la luminance du fond, via la syntaxe
 *   de couleur relative `oklch(from …)`.
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

/** Bordure coordonnée par défaut : le fond assombri de ~32 % (s'agence bien). */
function complementaryBorder(background: string): string {
  return `color-mix(in srgb, ${background}, #000 32%)`;
}

/**
 * Texte auto à très fort contraste sur `--rdfa-fill` : noir si le fond est clair,
 * blanc s'il est sombre. On compare la luminance perceptuelle (`l` en oklch) à un
 * seuil ; `clamp(0, (seuil − l) × 1000, 1)` bascule L vers 0 (noir) ou 1 (blanc).
 */
function contrastingInk(): string {
  return 'oklch(from var(--rdfa-fill) clamp(0, (0.62 - l) * 1000, 1) 0 0)';
}
