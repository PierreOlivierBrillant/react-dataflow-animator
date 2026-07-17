import { clamp } from './timeline';
import type { GeometryMap } from './geometry';

export const PLACEMENT_PAD = 6;

/** Spacing (px) between the bottom of the visual and the label — reflects the `.rdfa-node` CSS gap. */
const LABEL_GAP = 6;

/** Estimated half-size (px) of a neighbor node (pictogram) for layout calculation. */
const NEIGHBOR_HALF = 28;

/** Margin (px) between a panel and a neighbor's box, in layout calculation. */
const CONTENT_NEIGHBOR_GAP = 22;

/** Absolute minimum margin (px, design space) between a set_content panel's edge
 *  and a neighboring icon's edge — guarantees that a packet remains visible
 *  even on thumbnails where CONTENT_NEIGHBOR_GAP × scale becomes too small. */
const MIN_PACKET_VISIBLE_GAP = 40;

/** Minimum panel size (px): below this we stop shrinking (edge case). */
const MIN_CONTENT_BOX = 48;

/**
 * Positions each node at its LAYOUT place, simply clamped so it doesn't
 * go outside the canvas (label included). Nodes are NEVER pushed apart
 * from each other: a set_content lacking space SHRINKS (see computeContentLimits)
 * instead of pushing its neighbors.
 */
export function computePlacements(
  layout: Record<string, { cx: number; cy: number }>,
  geometry: GeometryMap,
  width: number,
  height: number,
  pad: number = PLACEMENT_PAD,
  /** Nodes whose label is drawn to a SIDE (circuit top/bottom-wired component)
   *  rather than below — their reserved room is horizontal, not vertical. */
  labelSides?: Map<string, 'left' | 'right'>
): Record<string, { cx: number; cy: number }> {
  const map: Record<string, { cx: number; cy: number }> = {};
  for (const id of Object.keys(layout)) {
    const base = layout[id];
    const g = geometry[id];
    if (!g || !width || !height) {
      map[id] = base;
      continue;
    }
    const halfW = g.width / 2;
    const halfH = g.height / 2;
    const side = labelSides?.get(id);
    if (side && g.labelW) {
      // Side label: it extends horizontally past one face and is vertically
      // centred on the visual, so it reserves room on that HORIZONTAL side (never
      // below). Otherwise a node hugging the left/right edge would clip its text.
      const reach = LABEL_GAP + g.labelW;
      const leftR = (halfW + (side === 'left' ? reach : 0) + pad) / width;
      const rightR = (halfW + (side === 'right' ? reach : 0) + pad) / width;
      const vR = (Math.max(halfH, (g.labelH ?? 0) / 2) + pad) / height;
      map[id] = {
        cx: leftR + rightR < 1 ? clamp(base.cx, leftR, 1 - rightR) : base.cx,
        cy: 2 * vR < 1 ? clamp(base.cy, vR, 1 - vR) : base.cy,
      };
      continue;
    }
    const hwr = (halfW + pad) / width;
    // The label lives UNDER the visual: its height expands the bottom bound, otherwise a
    // node near the bottom edge would have its text clipped by the Stage.
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
 * Computes, for EACH node, the maximum panel (`set_content`) size that
 * fits in its place WITHOUT overlapping its neighbors. Since nodes don't move,
 * this is the ONLY way to prevent a panel from covering another: a panel
 * that is too large must SHRINK (font/content) to respect this limit.
 *
 * PREDICTIVE: we consider ALL nodes in the spec (positions known in advance),
 * even those currently hidden — thus the panel is already small enough BEFORE its
 * neighbors appear, so it can never cover them.
 *
 * The closest neighbor on the horizontal axis limits the width, the closest
 * on the vertical axis limits the height. Also bounded by the player's edges and
 * by global ceilings `maxW`/`maxH`.
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
      // The neighbor constrains the axis it is most aligned with.
      // The gap proportional to scale guarantees proportionality on large
      // players; the absolute floor ensures a packet always remains visible
      // on thumbnails where scale is small and would make the gap almost zero.
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
