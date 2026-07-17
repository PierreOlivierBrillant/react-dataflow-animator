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

const EMPTY_IGNORE: ReadonlySet<string> = new Set();

export interface ScaleResult {
  scale: number;
  maxW: number;
  /** Max width of a set_content panel (px) — bounded by viewer edges. */
  contentMaxW: number;
  /** Max height of a set_content panel (px) — bounded by viewer edges. */
  contentMaxH: number;
}

export function computeScale(
  layout: Record<string, { cx: number; cy: number }>,
  width: number,
  height: number,
  density: Density,
  /** Node ids that claim (almost) no room — junction dots. They are excluded
   *  from the spacing calc, so a corner junction next to a component does not
   *  shrink the whole schematic. */
  ignore: ReadonlySet<string> = EMPTY_IGNORE,
  /** Tightens the min pair spacing (circuit schematics): schematic symbols read
   *  well packed close, and the orthogonal router keeps the wires between them
   *  clean, so a value < 1 lets the SAME diagram render its components bigger. */
  spacingFactor = 1
): ScaleResult {
  const ids = Object.keys(layout).filter((id) => !ignore.has(id));
  if (ids.length === 0 || width === 0 || height === 0) {
    return { scale: 1, maxW: 240, contentMaxW: 320, contentMaxH: 240 };
  }

  const pairW = PAIR_W * spacingFactor;
  const pairH = PAIR_H * spacingFactor;
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
      const pairScale = Math.max(dx / pairW, dy / pairH);
      maxAllowedScale = Math.min(maxAllowedScale, pairScale);
    }
  }

  const sizeScale = Math.min((width || 800) / 700, (height || 500) / 350);

  const d = DENSITY[density];
  const targetScale = Math.min(maxAllowedScale, sizeScale) * d.scale;

  const finalScale = clamp(targetScale, 0.3, 1.6);

  // Max size of a set_content panel. The panel adjusts to its CONTENT.
  // - Width: conservative ceiling (~38% of viewer) to leave more
  //   margin for neighbors, especially on thumbnails.
  // - Height: 88% of the height to keep a visible margin around the
  //   panel; bounded by edges. CodeBlock reduces font size if needed.
  const contentMaxW = Math.round(clamp(width * 0.38, 120, 420));
  const contentMaxH = Math.round(clamp(height * 0.88, 100, 560));

  return {
    scale: finalScale,
    maxW: Math.max(PAIR_W, 320),
    contentMaxW,
    contentMaxH,
  };
}
