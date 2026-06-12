import { clamp } from './timeline';

export type Density = 'compact' | 'comfortable' | 'spacious';

const PAIR_W = 190;
const PAIR_H = 130;
const EDGE_MARGIN_X = 60;
const EDGE_MARGIN_Y = 60;

const DENSITY: Record<Density, { scale: number; maxw: number }> = {
  compact: { scale: 0.82, maxw: 0.78 },
  comfortable: { scale: 1, maxw: 0.86 },
  spacious: { scale: 1.18, maxw: 0.92 },
};

export interface ScaleResult {
  scale: number;
  maxW: number;
  contentMaxW: number;
}

export function computeScale(
  layout: Record<string, { cx: number; cy: number }>,
  width: number,
  height: number,
  density: Density
): ScaleResult {
  const ids = Object.keys(layout);
  if (ids.length === 0 || width === 0 || height === 0) {
    return { scale: 1, maxW: 240, contentMaxW: 320 };
  }

  let maxAllowedScale = Infinity;

  for (let i = 0; i < ids.length; i++) {
    const a = layout[ids[i]];
    const edgeX = Math.min(a.cx, 1 - a.cx) * width;
    const edgeY = Math.min(a.cy, 1 - a.cy) * height;
    maxAllowedScale = Math.min(maxAllowedScale, edgeX / EDGE_MARGIN_X);
    maxAllowedScale = Math.min(maxAllowedScale, edgeY / EDGE_MARGIN_Y);

    for (let j = i + 1; j < ids.length; j++) {
      const b = layout[ids[j]];
      const dx = Math.abs(a.cx - b.cx) * width;
      const dy = Math.abs(a.cy - b.cy) * height;
      const pairScale = Math.max(dx / PAIR_W, dy / PAIR_H);
      maxAllowedScale = Math.min(maxAllowedScale, pairScale);
    }
  }

  const sizeScale = Math.min((width || 800) / 700, (height || 500) / 350);

  const d = DENSITY[density];
  const targetScale = Math.min(maxAllowedScale, sizeScale) * d.scale;

  const finalScale = clamp(targetScale, 0.3, 1.6);

  return {
    scale: finalScale,
    maxW: Math.max(PAIR_W, 320),
    contentMaxW: Math.round((width || 320) * 0.95),
  };
}
