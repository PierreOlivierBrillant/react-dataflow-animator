import { clamp } from './timeline';
import type { GeometryMap } from './geometry';

export const PLACEMENT_PAD = 6;

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
    const hhr = (g.height / 2 + pad) / height;
    map[id] = {
      cx: 2 * hwr < 1 ? clamp(base.cx, hwr, 1 - hwr) : base.cx,
      cy: 2 * hhr < 1 ? clamp(base.cy, hhr, 1 - hhr) : base.cy,
    };
  }
  return map;
}
