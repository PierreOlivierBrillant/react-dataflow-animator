import { clamp } from './timeline';
import type { GeometryMap } from './geometry';

export const PLACEMENT_PAD = 6;

/** Espacement (px) entre le bas du visuel et le label — reflète le gap CSS `.rdfa-node`. */
const LABEL_GAP = 6;

/** Demi-taille (px) estimée d'un nœud-voisin (pictogramme) pour le calcul de place. */
const NEIGHBOR_HALF = 28;

/** Marge (px) entre un panneau et la boîte d'un voisin, dans le calcul de place. */
const CONTENT_NEIGHBOR_GAP = 22;

/** Marge absolue minimale (px, espace de conception) entre le bord d'un panneau
 *  set_content et le bord de l'icône voisine — garantit qu'un paquet reste visible
 *  même sur les miniatures où CONTENT_NEIGHBOR_GAP × scale devient trop faible. */
const MIN_PACKET_VISIBLE_GAP = 40;

/** Taille mini (px) d'un panneau : en deçà on ne rétrécit plus (cas extrême). */
const MIN_CONTENT_BOX = 48;

/**
 * Positionne chaque nœud à sa place de LAYOUT, simplement bornée pour qu'il ne
 * sorte pas du canevas (label inclus). Les nœuds ne sont JAMAIS écartés les uns
 * des autres : un set_content qui manque de place RÉTRÉCIT (cf. computeContentLimits)
 * au lieu de pousser ses voisins.
 */
export function computePlacements(
  layout: Record<string, { cx: number; cy: number }>,
  geometry: GeometryMap,
  width: number,
  height: number,
  pad: number = PLACEMENT_PAD
): Record<string, { cx: number; cy: number }> {
  const map: Record<string, { cx: number; cy: number }> = {};
  for (const id of Object.keys(layout)) {
    const base = layout[id];
    const g = geometry[id];
    if (!g || !width || !height) {
      map[id] = base;
      continue;
    }
    const hwr = (g.width / 2 + pad) / width;
    const halfH = g.height / 2;
    // Le label vit SOUS le visuel : sa hauteur élargit la borne basse, sinon un
    // nœud près du bord inférieur verrait son texte clippé par le Stage.
    const labelExtra = g.labelH ? LABEL_GAP + g.labelH : 0;
    const topR = (halfH + pad) / height;
    const botR = (halfH + labelExtra + pad) / height;
    map[id] = {
      cx: 2 * hwr < 1 ? clamp(base.cx, hwr, 1 - hwr) : base.cx,
      cy: topR + botR < 1 ? clamp(base.cy, topR, 1 - botR) : base.cy,
    };
  }
  return map;
}

export interface ContentLimit {
  maxW: number;
  maxH: number;
}

/**
 * Calcule, pour CHAQUE nœud, la taille de panneau (`set_content`) maximale qui
 * tient à sa place SANS chevaucher ses voisins. Comme les nœuds ne bougent pas,
 * c'est le SEUL moyen d'éviter qu'un panneau en recouvre un autre : un panneau
 * trop grand doit RÉTRÉCIR (police/contenu) pour respecter cette borne.
 *
 * PRÉDICTIF : on considère TOUS les nœuds de la spec (positions connues d'avance),
 * même ceux encore masqués — ainsi le panneau est déjà assez petit AVANT que ses
 * voisins n'apparaissent, donc il ne peut jamais les recouvrir.
 *
 * Le voisin le plus proche sur l'axe horizontal borne la largeur, le plus proche
 * sur l'axe vertical borne la hauteur. Bornes aussi par les rebords du lecteur et
 * par les plafonds globaux `maxW`/`maxH`.
 */
export function computeContentLimits(
  layout: Record<string, { cx: number; cy: number }>,
  width: number,
  height: number,
  scale: number,
  maxW: number,
  maxH: number,
  pad: number = PLACEMENT_PAD
): Record<string, ContentLimit> {
  const ids = Object.keys(layout);
  const out: Record<string, ContentLimit> = {};
  if (!width || !height) {
    for (const id of ids) out[id] = { maxW, maxH };
    return out;
  }
  const half = NEIGHBOR_HALF * scale;
  for (const id of ids) {
    const nx = layout[id].cx * width;
    const ny = layout[id].cy * height;
    let halfW = Math.min(nx, width - nx) - pad;
    let halfH = Math.min(ny, height - ny) - pad;
    for (const oid of ids) {
      if (oid === id) continue;
      const dx = Math.abs(nx - layout[oid].cx * width);
      const dy = Math.abs(ny - layout[oid].cy * height);
      // Le voisin contraint l'axe sur lequel il est le plus aligné.
      // Le gap proportionnel à l'échelle garantit la proportionnalité sur les grands
      // lecteurs ; le plancher absolu assure qu'un paquet reste toujours visible
      // sur les miniatures où scale est faible et rendrait le gap quasi nul.
      const gap =
        half + Math.max(CONTENT_NEIGHBOR_GAP * scale, MIN_PACKET_VISIBLE_GAP);
      if (dx >= dy) halfW = Math.min(halfW, dx - gap);
      else halfH = Math.min(halfH, dy - gap);
    }
    out[id] = {
      maxW: Math.max(MIN_CONTENT_BOX, Math.min(maxW, 2 * halfW)),
      maxH: Math.max(MIN_CONTENT_BOX, Math.min(maxH, 2 * halfH)),
    };
  }
  return out;
}
