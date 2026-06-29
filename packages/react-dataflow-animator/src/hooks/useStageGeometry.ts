import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { GeometryMap, NodeGeom } from '../engine/geometry';

/**
 * Measures the actual position of the nodes (BoundingClientRect) relative to the Stage,
 * and keeps it up to date via a ResizeObserver (on the Stage AND on each node, in order
 * to react to nodes that grow — ex: `set_content`).
 *
 * SSR-safe: measurement only occurs in effects (client-side).
 */
export interface StageGeometry {
  stageRef: React.RefObject<HTMLDivElement | null>;
  geometry: GeometryMap;
  /** Width/height ratio of the Stage. */
  aspect: number;
  /** Measured dimensions of the Stage (px). */
  width: number;
  height: number;
  /**
   * Forces a new immediate DOM measurement (synchronous in a layout effect).
   * Allows batching icon geometry capture and ContentPanel measurement
   * in a single React cycle to avoid an intermediate flash.
   */
  forceRemeasure: () => void;
}

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Equality of two geometry maps. Allows `measure()` to NOT publish a
 * new state when nothing has moved: essential so that a re-measurement
 * triggered by a change in placements converges instead of looping.
 */
function sameGeometry(a: GeometryMap, b: GeometryMap): boolean {
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  for (const id of ka) {
    const x = a[id];
    const y = b[id];
    if (!y) return false;
    if (
      x.x !== y.x ||
      x.y !== y.y ||
      x.width !== y.width ||
      x.height !== y.height ||
      x.labelH !== y.labelH ||
      x.labelW !== y.labelW ||
      x.borderOutset !== y.borderOutset ||
      x.scale !== y.scale
    )
      return false;
  }
  return true;
}

/**
 * Overhang (px, before scale) of the tinted pictograms pill beyond the
 * glyph. MUST stay synchronized with the CSS:
 * `.rdfa-node--tinted .rdfa-node-icon::before { inset: calc(-5px * var(--rdfa-scale)) }`.
 * DOM measurement does not see this pseudo-element (out of flow), so we reconstitute it.
 */
const PASTILLE_INSET = 5;

/**
 * @param signature string that changes when the set of nodes changes, to
 *   force a new measurement (addition/removal of nodes, new spec).
 */
export function useStageGeometry(signature: string): StageGeometry {
  const stageRef = useRef<HTMLDivElement>(null);
  const [geometry, setGeometry] = useState<GeometryMap>({});
  const [aspect, setAspect] = useState(1.6);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const measure = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const sr = stage.getBoundingClientRect();
    if (sr.width > 0 && sr.height > 0) {
      setAspect(sr.width / sr.height);
      setSize((prev) =>
        prev.width === sr.width && prev.height === sr.height
          ? prev
          : { width: sr.width, height: sr.height }
      );
    }

    // Stage scale (--rdfa-scale), inherent to all nodes: read only
    // once on the Stage. Used to scale the arrow↔node gap and the pill
    // overhang (both expressed at scale 1 in the geometry).
    const scale =
      parseFloat(getComputedStyle(stage).getPropertyValue('--rdfa-scale')) || 1;

    const map: GeometryMap = {};
    stage.querySelectorAll<HTMLElement>('[data-node-id]').forEach((el) => {
      const id = el.getAttribute('data-node-id');
      if (!id) return;
      // We measure the visual (icon / content panel), not the label below,
      // so that the connections point to the center of the element.
      const target = el.querySelector<HTMLElement>('.rdfa-node-visual') ?? el;
      const r = target.getBoundingClientRect();
      const node: NodeGeom = {
        id,
        x: r.left - sr.left + r.width / 2,
        y: r.top - sr.top + r.height / 2,
        width: r.width,
        height: r.height,
        scale,
      };
      // Measures the text label (under the visual) for arrow routing.
      const labelEl = el.querySelector<HTMLElement>('.rdfa-node-label');
      if (labelEl) {
        const lr = labelEl.getBoundingClientRect();
        node.labelH = lr.height;
        node.labelW = lr.width;
      }
      // Tinted pictogram: the pill (`background_color`) overhangs the measured
      // glyph. Arrows snap to this colored outline → we expose the
      // overhang, at the current scale, as `borderOutset`.
      if (
        el.classList.contains('rdfa-node--tinted') &&
        el.querySelector('.rdfa-node-icon')
      ) {
        node.borderOutset = PASTILLE_INSET * scale;
      }
      map[id] = node;
    });
    setGeometry((prev) => (sameGeometry(prev, map) ? prev : map));
  }, []);

  useIsomorphicLayoutEffect(() => {
    measure();
    // After this commit, positions can still move: the scale
    // stabilizes on the first renders (computeScale depends on measured size),
    // which can stop the anti-overflow clamp of an edge node — a
    // MOVEMENT that the ResizeObserver does not see (it only catches sizes).
    // We re-measure over a few frames to fix the final position. Bounded
    // (not driven by renders) → no loop; idempotent → no churn.
    if (typeof requestAnimationFrame === 'undefined') return;
    let raf = 0;
    let n = 0;
    const tick = () => {
      measure();
      if (++n < 3) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [measure, signature]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(stage);
    stage
      .querySelectorAll<HTMLElement>('[data-node-id]')
      .forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, [measure, signature]);

  return {
    stageRef,
    geometry,
    aspect,
    width: size.width,
    height: size.height,
    forceRemeasure: measure,
  };
}
