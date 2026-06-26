import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { GeometryMap, NodeGeom } from '../engine/geometry';

/**
 * Mesure la position réelle des nœuds (BoundingClientRect) relativement au Stage,
 * et la garde à jour via un ResizeObserver (sur le Stage ET sur chaque nœud, afin
 * de réagir aux nœuds qui s'agrandissent — ex: `set_content`).
 *
 * SSR-safe : la mesure n'a lieu que dans des effets (côté client).
 */
export interface StageGeometry {
  stageRef: React.RefObject<HTMLDivElement | null>;
  geometry: GeometryMap;
  /** Ratio largeur/hauteur du Stage. */
  aspect: number;
  /** Dimensions mesurées du Stage (px). */
  width: number;
  height: number;
  /**
   * Force une nouvelle mesure DOM immédiate (synchrone dans un layout effect).
   * Permet de batcher la capture de géométrie icône et la mesure ContentPanel
   * en un seul cycle React pour éviter un flash intermédiaire.
   */
  forceRemeasure: () => void;
}

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Égalité de deux cartes de géométrie. Permet à `measure()` de NE PAS publier un
 * nouvel état quand rien n'a bougé : indispensable pour qu'une re-mesure
 * déclenchée par un changement de placements converge au lieu de boucler.
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
      x.borderOutset !== y.borderOutset
    )
      return false;
  }
  return true;
}

/**
 * Débord (px, avant échelle) de la pastille des pictogrammes teintés au-delà du
 * glyphe. DOIT rester synchronisé avec le CSS :
 * `.rdfa-node--tinted .rdfa-node-icon::before { inset: calc(-5px * var(--rdfa-scale)) }`.
 * La mesure DOM ne voit pas ce pseudo-élément (hors flux), on le reconstitue donc.
 */
const PASTILLE_INSET = 5;

/**
 * @param signature chaîne qui change quand l'ensemble des nœuds change, pour
 *   forcer une nouvelle mesure (ajout/suppression de nœuds, nouvelle spec).
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

    const map: GeometryMap = {};
    stage.querySelectorAll<HTMLElement>('[data-node-id]').forEach((el) => {
      const id = el.getAttribute('data-node-id');
      if (!id) return;
      // On mesure le visuel (icône / panneau de contenu), pas le label en dessous,
      // pour que les connexions pointent au centre de l'élément.
      const target = el.querySelector<HTMLElement>('.rdfa-node-visual') ?? el;
      const r = target.getBoundingClientRect();
      const node: NodeGeom = {
        id,
        x: r.left - sr.left + r.width / 2,
        y: r.top - sr.top + r.height / 2,
        width: r.width,
        height: r.height,
      };
      // Mesure le label textuel (sous le visuel) pour le routage des flèches.
      const labelEl = el.querySelector<HTMLElement>('.rdfa-node-label');
      if (labelEl) {
        const lr = labelEl.getBoundingClientRect();
        node.labelH = lr.height;
        node.labelW = lr.width;
      }
      // Pictogramme teinté : la pastille (`background_color`) déborde du glyphe
      // mesuré. Les flèches s'accrochent sur ce contour coloré → on expose le
      // débord, à l'échelle courante (--rdfa-scale), comme `borderOutset`.
      if (
        el.classList.contains('rdfa-node--tinted') &&
        el.querySelector('.rdfa-node-icon')
      ) {
        const scale =
          parseFloat(getComputedStyle(el).getPropertyValue('--rdfa-scale')) ||
          1;
        node.borderOutset = PASTILLE_INSET * scale;
      }
      map[id] = node;
    });
    setGeometry((prev) => (sameGeometry(prev, map) ? prev : map));
  }, []);

  useIsomorphicLayoutEffect(() => {
    measure();
    // Après ce commit, les positions peuvent encore bouger : l'échelle se
    // stabilise sur les premiers rendus (computeScale dépend de la taille mesurée),
    // ce qui peut faire cesser le clamp anti-débordement d'un nœud de bord — un
    // DÉPLACEMENT que le ResizeObserver ne voit pas (il ne capte que les tailles).
    // On re-mesure sur quelques frames pour fixer la position définitive. Borné
    // (pas piloté par les rendus) → aucune boucle ; idempotent → pas de churn.
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
