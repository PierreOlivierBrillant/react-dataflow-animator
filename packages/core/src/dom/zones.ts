import type { Zone } from '../types';
import type { GeometryMap } from '../engine/geometry';
import { h, px, setStyle } from './el';
import {
  NODE_LABEL_GAP,
  ZONE_LABEL_EXTRA_TOP,
  ZONE_PADDING,
} from './stageConstants';
import { appendRichText } from './richtext';

/**
 * Zone rectangles and their labels — the port of `Stage.tsx`'s
 * `computeZoneBounds` plus the two JSX blocks that consume it.
 *
 * The two are emitted at DIFFERENT points in the document: the rectangles go
 * behind the arrows and nodes, the labels after the nodes (above them, below the
 * animated packets).
 */

export interface ZoneBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The key a zone is addressed by — its id, or its index when unnamed. */
export function zoneKey(zone: Zone, index: number): string {
  return zone.id ?? `__zone_${index}`;
}

/**
 * Computes the bounds (px, relative to the stage) of each zone. Inner zones are
 * resolved before the zones that contain them.
 *
 * Origin: `Stage.tsx` `computeZoneBounds`.
 */
export function computeZoneBounds(
  zones: Zone[] | undefined,
  geometry: GeometryMap
): Record<string, ZoneBounds> {
  if (!zones?.length) return {};

  const keys = zones.map(zoneKey);
  const computed: Record<string, ZoneBounds> = {};

  const tryOne = (zone: Zone, key: string): boolean => {
    if (computed[key]) return false;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const id of zone.contains) {
      const g = geometry[id];
      if (g) {
        const lh = g.labelH ?? 0;
        const lw = lh > 0 ? (g.labelW ?? Math.max(g.width * 1.5, 60)) : 0;
        const halfW = Math.max(g.width / 2, lw / 2);
        minX = Math.min(minX, g.x - halfW);
        maxX = Math.max(maxX, g.x + halfW);
        minY = Math.min(minY, g.y - g.height / 2);
        maxY = Math.max(
          maxY,
          g.y + g.height / 2 + (lh > 0 ? NODE_LABEL_GAP + lh : 0)
        );
      } else if (computed[id]) {
        const b = computed[id];
        minX = Math.min(minX, b.x);
        maxX = Math.max(maxX, b.x + b.width);
        minY = Math.min(minY, b.y);
        maxY = Math.max(maxY, b.y + b.height);
      } else if (keys.includes(id)) {
        return false; // sub-zone not yet computed
      }
      // unknown ID → silently ignored
    }
    if (minX === Infinity) return false;
    const topExtra = zone.label ? ZONE_LABEL_EXTRA_TOP : 0;
    computed[key] = {
      x: minX - ZONE_PADDING,
      y: minY - ZONE_PADDING - topExtra,
      width: maxX - minX + 2 * ZONE_PADDING,
      height: maxY - minY + 2 * ZONE_PADDING + topExtra,
    };
    return true;
  };

  // Fixed point: continues as long as zones are resolved (handles nesting).
  let progress = true;
  while (progress) {
    progress = false;
    zones.forEach((zone, i) => {
      if (tryOne(zone, keys[i])) progress = true;
    });
  }

  return computed;
}

export function buildZoneRect(zone: Zone, bounds: ZoneBounds): HTMLElement {
  const el = h('div', { class: 'rdfa-zone' });
  setStyle(el, {
    left: px(bounds.x),
    top: px(bounds.y),
    width: px(bounds.width),
    height: px(bounds.height),
    '--rdfa-zone-color': zone.color,
  });
  return el;
}

/** Label offsets are hard-coded from the zone box origin, as in the JSX. */
export function buildZoneLabel(zone: Zone, bounds: ZoneBounds): HTMLElement {
  const el = h('span', { class: 'rdfa-zone-label' });
  setStyle(el, {
    left: px(bounds.x + 12),
    top: px(bounds.y + 8),
    '--rdfa-zone-color': zone.color,
  });
  appendRichText(el, zone.label ?? '');
  return el;
}
