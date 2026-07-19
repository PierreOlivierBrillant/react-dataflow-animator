import type { DataFlowSpec } from '../types';
import type { ColorOverride } from '../render/nodeColors';
import {
  easeInOutCubic,
  type ActiveClip,
  type RotateClip,
  type SetColorClip,
  type SetIconClip,
  type SetVisibleClip,
  type ToggleClip,
} from '../engine/timeline';
import { lerp } from './stageConstants';

/**
 * Per-node visual state at a frozen instant — the port of the clip-accumulation
 * block of `Stage.tsx` (roughly lines 939–1100).
 *
 * Pure: a function of `(spec, active clips)` only, with no DOM and no
 * measurement. Everything here is derived from `evaluate(timeline, t)`, so it
 * scrubs both ways.
 *
 * Several clip kinds are compiled with `keepEnd: true`, meaning they stay in
 * `active` after their animation finishes. That is what lets a finished
 * `set_visible` / `rotate` / `toggle` / `set_color` / `set_icon` persist its
 * result without any mutable state: iterating the active clips in start order
 * leaves the most recent one holding the value.
 */

export interface NodeStateAtT {
  /** 0 = hidden, 1 = visible, in between = fading. */
  visibility: Record<string, number>;
  /** Degrees, seeded from `node.rotation` or the circuit auto-layout. */
  rotation: Record<string, number>;
  /** Contact state (0..1) of a `switch` / `push_button`. */
  closed: Record<string, number>;
  /** Accumulated colour overrides; only ids in `recolored` are applied. */
  color: Record<string, ColorOverride>;
  recolored: Set<string>;
  /** Per-connection line colour, keyed by connection id. */
  connectionColor: Record<string, string>;
  /** Badge override; `''` clears the badge and is distinct from "no override". */
  icon: Record<string, string>;
  loading: Set<string>;
  highlighted: Set<string>;
}

export function computeNodeStateAtT(
  spec: DataFlowSpec,
  active: ActiveClip[],
  autoRotationById: Map<string, number>
): NodeStateAtT {
  // ─── Visibility ───────────────────────────────────────────────────────────
  const visibility: Record<string, number> = {};
  for (const node of spec.nodes) {
    if (node.visible === false) visibility[node.id] = 0;
  }
  for (const a of active) {
    if (a.clip.kind === 'set_visible') {
      const clip = a.clip as SetVisibleClip;
      visibility[clip.objectId] = clip.visible ? a.progress : 1 - a.progress;
    }
  }

  // ─── Rotation ─────────────────────────────────────────────────────────────
  const rotation: Record<string, number> = {};
  for (const node of spec.nodes) {
    // Explicit rotation wins; otherwise the circuit auto-layout may rotate a
    // component that sits on a vertical edge of the loop.
    const base = node.rotation ?? autoRotationById.get(node.id);
    if (typeof base === 'number') rotation[node.id] = base;
  }
  for (const a of active) {
    if (a.clip.kind === 'rotate') {
      const clip = a.clip as RotateClip;
      // A continuous spin turns at constant speed (linear); a target rotation
      // eases in/out.
      const f = clip.spin ? a.progress : easeInOutCubic(a.progress);
      rotation[clip.objectId] = lerp(clip.fromDeg, clip.toDeg, f);
    }
  }

  // ─── Contact state ────────────────────────────────────────────────────────
  const closed: Record<string, number> = {};
  for (const node of spec.nodes) if (node.closed) closed[node.id] = 1;
  for (const a of active) {
    if (a.clip.kind === 'toggle') {
      const clip = a.clip as ToggleClip;
      const f = easeInOutCubic(a.progress);
      closed[clip.objectId] = clip.closed ? f : 1 - f;
    }
  }

  // ─── Colours ──────────────────────────────────────────────────────────────
  // Seeded with the static colours so the very first recolor cross-fades FROM
  // the node's initial colour.
  const color: Record<string, ColorOverride> = {};
  for (const node of spec.nodes) {
    if (node.background_color || node.border_color || node.text_color)
      color[node.id] = {
        background_color: node.background_color,
        border_color: node.border_color,
        text_color: node.text_color,
      };
  }
  const connectionColor: Record<string, string> = {};
  const connectionIds = new Set<string>();
  for (const link of spec.connections ?? []) {
    if (link.id) {
      connectionIds.add(link.id);
      if (link.color) connectionColor[link.id] = link.color;
    }
  }
  const recolored = new Set<string>();
  for (const a of active) {
    if (a.clip.kind !== 'set_color') continue;
    const clip = a.clip as SetColorClip;
    const p = easeInOutCubic(a.progress);
    // No faithful "from" when the channel was never coloured: adopt the target
    // directly rather than inventing an origin and flashing a wrong colour.
    const mix = (from: string | undefined, to: string): string =>
      from ? `color-mix(in srgb, ${from}, ${to} ${(p * 100).toFixed(2)}%)` : to;

    if (connectionIds.has(clip.objectId)) {
      if (clip.color != null)
        connectionColor[clip.objectId] = mix(
          connectionColor[clip.objectId],
          clip.color
        );
      continue;
    }
    recolored.add(clip.objectId);
    const prev = color[clip.objectId] ?? {};
    const next: ColorOverride = { ...prev };
    if (clip.backgroundColor != null)
      next.background_color = mix(prev.background_color, clip.backgroundColor);
    if (clip.borderColor != null)
      next.border_color = mix(prev.border_color, clip.borderColor);
    if (clip.textColor != null)
      next.text_color = mix(prev.text_color, clip.textColor);
    color[clip.objectId] = next;
  }

  // ─── Badge, loading, highlight ────────────────────────────────────────────
  const icon: Record<string, string> = {};
  const loading = new Set<string>();
  const highlighted = new Set<string>();
  for (const a of active) {
    if (a.clip.kind === 'set_icon')
      icon[(a.clip as SetIconClip).objectId] = (a.clip as SetIconClip).icon;
    else if (a.clip.kind === 'loading') loading.add(a.clip.objectId);
    else if (a.clip.kind === 'highlight') highlighted.add(a.clip.targetId);
  }

  return {
    visibility,
    rotation,
    closed,
    color,
    recolored,
    connectionColor,
    icon,
    loading,
    highlighted,
  };
}

/**
 * Auto-rotation assigned by the circuit auto-layout (a component on a vertical
 * edge of the loop). An explicit `Node.rotation` still wins. Aspect-independent,
 * so this is stable across resizes.
 *
 * Origin: `Stage.tsx` `autoRotationById`.
 */
export function autoRotationMap(
  layout: Record<string, { rotation?: number }>
): Map<string, number> {
  const m = new Map<string, number>();
  for (const [id, p] of Object.entries(layout))
    if (p.rotation != null) m.set(id, p.rotation);
  return m;
}
