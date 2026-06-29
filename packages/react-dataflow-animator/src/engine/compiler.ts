import type {
  Action,
  ActionType,
  DataFlowSpec,
  LineStyle,
  PathShape,
} from '../types';
import type {
  ArrowClip,
  Clip,
  CommentClip,
  HighlightClip,
  LoadingClip,
  MoveClip,
  RotateClip,
  SetContentClip,
  SetVisibleClip,
  Step,
  Timeline,
} from './timeline';

/**
 * Compiler: `spec.timeline` -> `Timeline` (deterministic IR).
 *
 * Manages: default sequential ordering, `parallel` blocks (same timestamp),
 * relative synchronization `wait_for`, lifecycle `keep_until`/`keep_until_next`,
 * and splitting into root steps.
 */

export interface CompileResult {
  timeline: Timeline;
  /** Non-blocking warnings (missing references, etc.). */
  warnings: string[];
}

/** Pause (ms) inserted between two root steps, for clear stops in navigation. */
export const STEP_GAP = 250;

/** Time (ms) during which a `move` stays at the origin before leaving. */
export const APPEAR_HOLD = 300;
/** Time (ms) during which a `move` stays at destination before disappearing. */
export const ARRIVE_HOLD = 300;

const DEFAULT_DURATION: Record<ActionType, number> = {
  move: 500,
  arrow: 500,
  loading: 1200,
  set_content: 500,
  comment: 500,
  highlight: 600,
  parallel: 0,
  set_visible: 300,
  rotate: 600,
  wait: 1000,
};

// Default for `keep_until_next` by action type (see schema).
const DEFAULT_KEEP_NEXT: Partial<Record<ActionType, boolean>> = {
  move: false,
  arrow: true,
  comment: true,
  set_content: true,
  highlight: true,
  loading: false,
  set_visible: false,
  rotate: false,
};

/** Normalizes line style (accepts historical alias `full`). */
function normalizeStyle(style: string | undefined): LineStyle {
  if (style === 'dotted' || style === 'dashed' || style === 'animated')
    return style;
  return 'solid'; // 'solid', 'full' (alias) or missing
}

/** Normalizes path shape (bezier by default, including unknown value). */
function normalizePath(path: string | undefined): PathShape {
  if (
    path === 'straight' ||
    path === 'step' ||
    path === 'smoothstep' ||
    path === 'simplebezier'
  )
    return path;
  return 'bezier';
}

interface PendingClip {
  clip: Clip;
  keepUntil?: string;
  keepNext: boolean;
  keepEnd: boolean;
  stepIndex: number;
  /**
   * Continuous-spin speed (deg/s) for a `rotate` spin. When set, pass 2 resolves
   * the clip's spin-stop instant (`endMs`) and final `toDeg` from the timing
   * fields (`duration` / `keep_until` / `keep_until_end`).
   */
  spinDegPerSec?: number;
}

interface Ctx {
  pending: PendingClip[];
  timingById: Map<string, { startMs: number; endMs: number }>;
  warnings: string[];
  counter: number;
  /**
   * Running rotation angle (deg) per node, seeded from `node.rotation`.
   * Each `rotate` action reads it as the interpolation start, then updates it
   * to its target — so chained rotations accumulate in declaration order.
   */
  rotationById: Map<string, number>;
}

function makeId(ctx: Ctx, action: Action): string {
  return action.id ?? `${action.type}-${ctx.counter++}`;
}

interface Window {
  startMs: number;
  /** Animation end (arrival). Serves as target for wait_for. */
  animEndMs: number;
  /** End of time footprint (anim + arrival hold), for sequencing. */
  occupiedEndMs: number;
}

/**
 * Compiles an action and returns its time window.
 *
 * @param minStartMs — floor for startMs (used for root actions so
 *   that wait_for can only delay, never go back before step start).
 *   Not passed to parallel children, which keep strict semantics.
 */
function compileAction(
  action: Action,
  baseStart: number,
  stepIndex: number,
  ctx: Ctx,
  minStartMs = 0
): Window {
  // wait_for resolution (reference to an already compiled action).
  let startMs = baseStart;
  if (action.wait_for) {
    const ref = ctx.timingById.get(action.wait_for);
    if (ref) startMs = ref.endMs;
    else
      ctx.warnings.push(
        `wait_for: action "${action.wait_for}" not found (or defined later).`
      );
  }
  // Lower bound: a root action cannot start before its step,
  // even if wait_for points to a much earlier action.
  if (startMs < minStartMs) startMs = minStartMs;
  // Explicit offset (delay_ms), applied after clamp: always additive.
  if (action.delay_ms) startMs += action.delay_ms;

  if (action.type === 'parallel') {
    const children = action.actions ?? [];
    let animEndMs = startMs;
    let occupiedEndMs = startMs;
    for (const child of children) {
      // minStartMs not passed: children keep strict semantics.
      const r = compileAction(child, startMs, stepIndex, ctx);
      if (r.animEndMs > animEndMs) animEndMs = r.animEndMs;
      if (r.occupiedEndMs > occupiedEndMs) occupiedEndMs = r.occupiedEndMs;
    }
    if (action.id) ctx.timingById.set(action.id, { startMs, endMs: animEndMs });
    return { startMs, animEndMs, occupiedEndMs };
  }

  if (action.type === 'wait') {
    // Dead time: no clip emitted, we only occupy the time window
    // so the next step starts later. Clips kept by
    // previous steps (keep_until_next) stay visible during wait.
    const endMs = startMs + (action.duration ?? DEFAULT_DURATION.wait);
    if (action.id) ctx.timingById.set(action.id, { startMs, endMs });
    return { startMs, animEndMs: endMs, occupiedEndMs: endMs };
  }

  const duration = action.duration ?? DEFAULT_DURATION[action.type];
  const isMove = action.type === 'move';
  // A `move` is held at origin (APPEAR_HOLD) then at destination (ARRIVE_HOLD),
  // which creates two rest instances: appearance and arrival.
  const animStartMs = startMs + (isMove ? APPEAR_HOLD : 0);
  const endMs = animStartMs + duration; // animation end (arrival)
  const occupiedEndMs = endMs + (isMove ? ARRIVE_HOLD : 0);
  const id = makeId(ctx, action);
  const keepNext =
    action.keep_until_next ?? DEFAULT_KEEP_NEXT[action.type] ?? false;

  const push = (clip: Clip) => {
    ctx.pending.push({
      clip,
      keepUntil: action.keep_until,
      keepNext,
      keepEnd: action.keep_until_end ?? false,
      stepIndex,
    });
    if (action.id) ctx.timingById.set(action.id, { startMs, endMs });
  };

  // visibleUntilMs default = footprint end (includes arrival hold).
  const keepEnd = action.keep_until_end ?? false;
  const base = {
    id,
    startMs,
    animStartMs,
    endMs,
    visibleUntilMs: occupiedEndMs,
    stepIndex,
    keepEnd,
    fadeInMs: action.fade_in_ms,
    fadeOutMs: action.fade_out_ms,
  };

  switch (action.type) {
    case 'move': {
      if (!action.object || !action.from || !action.to) {
        ctx.warnings.push(`move "${id}": object/from/to required.`);
        break;
      }
      const clip: MoveClip = {
        ...base,
        kind: 'move',
        objectId: action.object,
        fromId: action.from,
        toId: action.to,
      };
      push(clip);
      break;
    }
    case 'arrow': {
      if (!action.from || !action.to) {
        ctx.warnings.push(`arrow "${id}": from/to required.`);
        break;
      }
      const clip: ArrowClip = {
        ...base,
        kind: 'arrow',
        fromId: action.from,
        toId: action.to,
        style: normalizeStyle(action.style),
        path: normalizePath(action.path),
        arrow_head: action.arrow_head,
        text: action.text,
      };
      push(clip);
      break;
    }
    case 'loading': {
      if (!action.object) {
        ctx.warnings.push(`loading "${id}": object required.`);
        break;
      }
      const clip: LoadingClip = {
        ...base,
        kind: 'loading',
        objectId: action.object,
      };
      push(clip);
      break;
    }
    case 'set_content': {
      if (!action.object || !action.content) {
        ctx.warnings.push(`set_content "${id}": object/content required.`);
        break;
      }
      const clip: SetContentClip = {
        ...base,
        kind: 'set_content',
        objectId: action.object,
        content: action.content,
      };
      push(clip);
      break;
    }
    case 'comment': {
      if (!action.text) {
        ctx.warnings.push(`comment "${id}": text requis.`);
        break;
      }
      const clip: CommentClip = {
        ...base,
        kind: 'comment',
        ...(action.object ? { nextToId: action.object } : {}),
        text: action.text,
      };
      push(clip);
      break;
    }
    case 'highlight': {
      if (!action.object) {
        ctx.warnings.push(`highlight "${id}": object required.`);
        break;
      }
      const clip: HighlightClip = {
        ...base,
        kind: 'highlight',
        targetId: action.object,
      };
      push(clip);
      break;
    }
    case 'set_visible': {
      if (!action.object) {
        ctx.warnings.push(`set_visible "${id}": object required.`);
        break;
      }
      const clip: SetVisibleClip = {
        ...base,
        kind: 'set_visible',
        objectId: action.object,
        visible: action.visible,
        // keepEnd forced to true: visibility state persists until the end of the
        // timeline so Stage can query the clip at any time.
        keepEnd: true,
      };
      ctx.pending.push({
        clip,
        keepUntil: undefined,
        keepNext: false,
        keepEnd: true,
        stepIndex,
      });
      if (action.id) ctx.timingById.set(action.id, { startMs, endMs });
      break;
    }
    case 'rotate': {
      const hasTo = typeof action.to === 'number';
      const hasSpin = typeof action.spin === 'number';
      if (!action.object || (!hasTo && !hasSpin)) {
        ctx.warnings.push(
          `rotate "${id}": object and to/spin (number) required.`
        );
        break;
      }
      if (hasTo && hasSpin) {
        ctx.warnings.push(
          `rotate "${id}": to and spin are mutually exclusive; spin wins.`
        );
      }
      const fromDeg = ctx.rotationById.get(action.object) ?? 0;
      // keepEnd forced to true on every rotate clip: the final angle persists
      // until the end of the timeline so Stage can read the node's rotation at
      // any later instant.
      if (hasSpin) {
        const degPerSec = action.spin as number;
        // Provisional sweep for the `duration` mode (animStart..endMs). For
        // keep_until / keep_until_end the real stop instant — and thus toDeg —
        // is only known in pass 2, once all durations are resolved.
        const sweep = (degPerSec * (endMs - animStartMs)) / 1000;
        const clip: RotateClip = {
          ...base,
          kind: 'rotate',
          objectId: action.object,
          fromDeg,
          toDeg: fromDeg + sweep,
          spin: true,
          keepEnd: true,
        };
        // Chaining is exact only when the spin stops at a known instant (the
        // `duration` mode). An open-ended spin (keep_until / keep_until_end)
        // leaves the running angle at its start; a later rotate resumes there.
        if (!action.keep_until && !action.keep_until_end) {
          ctx.rotationById.set(action.object, fromDeg + sweep);
        }
        ctx.pending.push({
          clip,
          keepUntil: action.keep_until,
          keepNext: false,
          keepEnd: action.keep_until_end ?? false,
          stepIndex,
          spinDegPerSec: degPerSec,
        });
        if (action.id) ctx.timingById.set(action.id, { startMs, endMs });
        break;
      }
      const clip: RotateClip = {
        ...base,
        kind: 'rotate',
        objectId: action.object,
        fromDeg,
        toDeg: action.to as number,
        keepEnd: true,
      };
      // Update the running angle for chaining (next rotate on this node starts here).
      ctx.rotationById.set(action.object, action.to as number);
      ctx.pending.push({
        clip,
        keepUntil: undefined,
        keepNext: false,
        keepEnd: true,
        stepIndex,
      });
      if (action.id) ctx.timingById.set(action.id, { startMs, endMs });
      break;
    }
    default: {
      throw new Error(
        `Unrecognized action type: "${(action as Record<string, unknown>).type}"`
      );
    }
  }

  return { startMs, animEndMs: endMs, occupiedEndMs };
}

export function compile(spec: DataFlowSpec): CompileResult {
  const ctx: Ctx = {
    pending: [],
    timingById: new Map(),
    warnings: [],
    counter: 0,
    rotationById: new Map(
      spec.nodes
        .filter((n) => typeof n.rotation === 'number')
        .map((n) => [n.id, n.rotation as number])
    ),
  };

  const steps: Step[] = [];
  let cursor = 0;

  // Each root action = one logical step. A short pause (STEP_GAP) separates
  // steps: the "Next" stop thus shows the "settled" step alone, without
  // overlapping the next one's appearance.
  const lastIndex = spec.timeline.length - 1;
  spec.timeline.forEach((action, index) => {
    const stepStart = cursor;
    // stepStart passed as minStartMs: wait_for can only delay the root action,
    // never start it before the beginning of its step.
    const { occupiedEndMs } = compileAction(
      action,
      stepStart,
      index,
      ctx,
      stepStart
    );
    const stepEnd = Math.max(cursor, occupiedEndMs);
    steps.push({
      index,
      startMs: stepStart,
      endMs: stepEnd,
      actionId: action.id,
    });
    cursor = stepEnd + (index < lastIndex ? STEP_GAP : 0);
  });

  // Total duration: end of last step, extended if a clip overflows (wait_for).
  let durationMs = cursor;
  for (const { clip } of ctx.pending) {
    durationMs = Math.max(durationMs, clip.endMs, clip.visibleUntilMs);
  }
  if (steps.length > 0) steps[steps.length - 1].endMs = durationMs;

  // Start of next "content" step after `stepIndex`: the steps
  // `wait` (dead times without clip) are skipped so keep_until_next holds
  // the content DURING the wait rather than leaving an empty screen.
  const nextContentStepStart = (stepIndex: number): number => {
    let i = stepIndex + 1;
    while (i < steps.length && spec.timeline[i]?.type === 'wait') i++;
    return steps[i]?.startMs ?? durationMs;
  };

  // Pass 2: lifecycle resolution (visibleUntilMs).
  for (const {
    clip,
    keepUntil,
    keepNext,
    keepEnd,
    stepIndex,
    spinDegPerSec,
  } of ctx.pending) {
    if (spinDegPerSec !== undefined && clip.kind === 'rotate') {
      // Spin: resolve the instant the rotation STOPS (its animation end), then
      // the final angle. The node never disappears, so it stays visible until
      // the end of the timeline, holding that final angle.
      let stopMs = clip.endMs; // `duration` mode: already animStartMs + duration
      if (keepUntil) {
        const ref = ctx.timingById.get(keepUntil);
        if (ref) stopMs = ref.startMs;
        else ctx.warnings.push(`keep_until: action "${keepUntil}" not found.`);
      } else if (keepEnd) {
        stopMs = durationMs;
      }
      if (stopMs < clip.animStartMs) stopMs = clip.animStartMs;
      clip.endMs = stopMs;
      clip.toDeg =
        clip.fromDeg + (spinDegPerSec * (stopMs - clip.animStartMs)) / 1000;
      clip.visibleUntilMs = durationMs;
      continue;
    }
    if (keepUntil) {
      const ref = ctx.timingById.get(keepUntil);
      if (ref) clip.visibleUntilMs = ref.startMs;
      else ctx.warnings.push(`keep_until: action "${keepUntil}" not found.`);
    } else if (keepEnd) {
      // Visible until timeline end.
      clip.visibleUntilMs = durationMs;
    } else if (keepNext) {
      // Visible until the START of the next content step (through the
      // inter-step pause and any `wait` dead times).
      clip.visibleUntilMs = nextContentStepStart(stepIndex);
    }
    // else: visibleUntilMs remains = footprint end (disappears after its hold).
  }

  // Stop points: a move stops at appearance (animStart) AND at arrival
  // (end); other clips stop once "settled" (end).
  const stopSet = new Set<number>();
  for (const { clip } of ctx.pending) {
    if (clip.kind === 'move') stopSet.add(clip.animStartMs);
    stopSet.add(clip.endMs);
  }
  // NB: `Array.from` rather than `[...stopSet]`. Docusaurus Babel in mode
  // "loose" transpiles iterable spread to `[].concat(iterable)`,
  // which does NOT flatten a Set and produces an empty array after filter.
  const stops = Array.from(stopSet)
    .filter((s) => s > 0 && s <= durationMs)
    .sort((a, b) => a - b);

  const sortedClips = ctx.pending
    .map((p) => p.clip)
    .sort((a, b) => a.startMs - b.startMs);

  // Pass 3: pre-calculation of active clips per step for O(K) rendering
  for (let i = 0; i < steps.length; i++) {
    const stepStart = steps[i].startMs;
    const stepNext = i < steps.length - 1 ? steps[i + 1].startMs : durationMs;
    steps[i].activeClips = sortedClips.filter(
      (clip) => clip.startMs <= stepNext && clip.visibleUntilMs >= stepStart
    );
  }

  const timeline: Timeline = {
    clips: sortedClips,
    steps,
    stops,
    durationMs,
  };
  return { timeline, warnings: ctx.warnings };
}
