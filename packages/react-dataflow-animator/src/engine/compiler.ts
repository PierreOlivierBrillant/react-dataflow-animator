import type { Action, ActionType, DataFlowSpec, LineStyle } from '../types';
import type {
  ArrowClip,
  Clip,
  CommentClip,
  HighlightClip,
  LoadingClip,
  MoveClip,
  SetContentClip,
  SetVisibleClip,
  Step,
  Timeline,
} from './timeline';

/**
 * Compilateur : `spec.timeline` -> `Timeline` (IR déterministe).
 *
 * Gère : ordonnancement séquentiel par défaut, blocs `parallel` (même timestamp),
 * synchronisation relative `wait_for`, cycle de vie `keep_until`/`keep_until_next`,
 * et découpage en étapes racines.
 */

export interface CompileResult {
  timeline: Timeline;
  /** Avertissements non bloquants (références manquantes, etc.). */
  warnings: string[];
}

/** Pause (ms) insérée entre deux étapes racines, pour des arrêts nets en navigation. */
export const STEP_GAP = 250;

/** Temps (ms) pendant lequel un `move` reste à l'origine avant de partir. */
export const APPEAR_HOLD = 300;
/** Temps (ms) pendant lequel un `move` reste à destination avant de disparaître. */
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
};

// Défaut de `keep_until_next` par type d'action (cf. schema).
const DEFAULT_KEEP_NEXT: Partial<Record<ActionType, boolean>> = {
  move: false,
  arrow: true,
  comment: true,
  set_content: true,
  highlight: true,
  loading: false,
  set_visible: false,
};

/** Normalise le style de ligne (accepte l'alias historique `full`). */
function normalizeStyle(style: string | undefined): LineStyle {
  if (style === 'dotted' || style === 'dashed' || style === 'animated')
    return style;
  return 'solid'; // 'solid', 'full' (alias) ou absent
}

interface PendingClip {
  clip: Clip;
  keepUntil?: string;
  keepNext: boolean;
  keepEnd: boolean;
  stepIndex: number;
}

interface Ctx {
  pending: PendingClip[];
  timingById: Map<string, { startMs: number; endMs: number }>;
  warnings: string[];
  counter: number;
}

function makeId(ctx: Ctx, action: Action): string {
  return action.id ?? `${action.type}-${ctx.counter++}`;
}

interface Window {
  startMs: number;
  /** Fin de l'animation (arrivée). Sert de cible à wait_for. */
  animEndMs: number;
  /** Fin de l'empreinte temporelle (anim + hold d'arrivée), pour séquencer. */
  occupiedEndMs: number;
}

/**
 * Compile une action et renvoie sa fenêtre temporelle.
 *
 * @param minStartMs — plancher du startMs (utilisé pour les actions racines afin
 *   que wait_for ne puisse que retarder, jamais remonter avant le début de l'étape).
 *   Non transmis aux enfants de parallel, qui gardent la sémantique stricte.
 */
function compileAction(
  action: Action,
  baseStart: number,
  stepIndex: number,
  ctx: Ctx,
  minStartMs = 0
): Window {
  // Résolution de wait_for (référence à une action déjà compilée).
  let startMs = baseStart;
  if (action.wait_for) {
    const ref = ctx.timingById.get(action.wait_for);
    if (ref) startMs = ref.endMs;
    else
      ctx.warnings.push(
        `wait_for: action "${action.wait_for}" introuvable (ou définie plus tard).`
      );
  }
  // Borne inférieure : une action racine ne peut pas commencer avant son étape,
  // même si wait_for pointe vers une action très antérieure.
  if (startMs < minStartMs) startMs = minStartMs;
  // Décalage explicite (delay_ms), appliqué après le clamp : toujours additif.
  if (action.delay_ms) startMs += action.delay_ms;

  if (action.type === 'parallel') {
    const children = action.actions ?? [];
    let animEndMs = startMs;
    let occupiedEndMs = startMs;
    for (const child of children) {
      // minStartMs non transmis : les enfants conservent la sémantique stricte.
      const r = compileAction(child, startMs, stepIndex, ctx);
      if (r.animEndMs > animEndMs) animEndMs = r.animEndMs;
      if (r.occupiedEndMs > occupiedEndMs) occupiedEndMs = r.occupiedEndMs;
    }
    if (action.id) ctx.timingById.set(action.id, { startMs, endMs: animEndMs });
    return { startMs, animEndMs, occupiedEndMs };
  }

  const duration = action.duration ?? DEFAULT_DURATION[action.type];
  const isMove = action.type === 'move';
  // Un `move` est maintenu à l'origine (APPEAR_HOLD) puis à destination (ARRIVE_HOLD),
  // ce qui crée deux instants de repos : apparition et arrivée.
  const animStartMs = startMs + (isMove ? APPEAR_HOLD : 0);
  const endMs = animStartMs + duration; // fin d'animation (arrivée)
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

  // visibleUntilMs par défaut = fin d'empreinte (inclut le hold d'arrivée).
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
        ctx.warnings.push(`move "${id}": object/from/to requis.`);
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
        ctx.warnings.push(`arrow "${id}": from/to requis.`);
        break;
      }
      const clip: ArrowClip = {
        ...base,
        kind: 'arrow',
        fromId: action.from,
        toId: action.to,
        style: normalizeStyle(action.style),
        arrow_head: action.arrow_head,
        text: action.text,
      };
      push(clip);
      break;
    }
    case 'loading': {
      if (!action.object) {
        ctx.warnings.push(`loading "${id}": object requis.`);
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
        ctx.warnings.push(`set_content "${id}": object/content requis.`);
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
      if (!action.object || !action.text) {
        ctx.warnings.push(`comment "${id}": object/text requis.`);
        break;
      }
      const clip: CommentClip = {
        ...base,
        kind: 'comment',
        nextToId: action.object,
        text: action.text,
      };
      push(clip);
      break;
    }
    case 'highlight': {
      if (!action.object) {
        ctx.warnings.push(`highlight "${id}": object requis.`);
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
        ctx.warnings.push(`set_visible "${id}": object requis.`);
        break;
      }
      const clip: SetVisibleClip = {
        ...base,
        kind: 'set_visible',
        objectId: action.object,
        visible: action.visible,
        // keepEnd forcé à true : l'état de visibilité persiste jusqu'à la fin de la
        // chronologie pour que Stage puisse interroger le clip à tout instant.
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
    default: {
      throw new Error(
        `Type d'action non reconnu : "${(action as Record<string, unknown>).type}"`
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
  };

  const steps: Step[] = [];
  let cursor = 0;

  // Chaque action racine = une étape logique. Une courte pause (STEP_GAP) sépare
  // les étapes : l'arrêt « Suivant » montre ainsi l'étape « posée » seule, sans
  // chevaucher l'apparition de la suivante.
  const lastIndex = spec.timeline.length - 1;
  spec.timeline.forEach((action, index) => {
    const stepStart = cursor;
    // stepStart passé comme minStartMs : wait_for ne peut que retarder l'action racine,
    // jamais la faire démarrer avant le début de son étape.
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

  // Durée totale : fin de la dernière étape, étendue si un clip dépasse (wait_for).
  let durationMs = cursor;
  for (const { clip } of ctx.pending) {
    durationMs = Math.max(durationMs, clip.endMs, clip.visibleUntilMs);
  }
  if (steps.length > 0) steps[steps.length - 1].endMs = durationMs;

  // Passe 2 : résolution du cycle de vie (visibleUntilMs).
  for (const { clip, keepUntil, keepNext, keepEnd, stepIndex } of ctx.pending) {
    if (keepUntil) {
      const ref = ctx.timingById.get(keepUntil);
      if (ref) clip.visibleUntilMs = ref.startMs;
      else ctx.warnings.push(`keep_until: action "${keepUntil}" introuvable.`);
    } else if (keepEnd) {
      // Visible jusqu'à la fin de la chronologie.
      clip.visibleUntilMs = durationMs;
    } else if (keepNext) {
      // Visible jusqu'au DÉBUT de l'étape suivante (donc à travers la pause).
      clip.visibleUntilMs = steps[stepIndex + 1]?.startMs ?? durationMs;
    }
    // sinon : visibleUntilMs reste = fin d'empreinte (disparaît après son hold).
  }

  // Points d'arrêt : un move s'arrête à l'apparition (animStart) ET à l'arrivée
  // (end) ; les autres clips s'arrêtent une fois « posés » (end).
  const stopSet = new Set<number>();
  for (const { clip } of ctx.pending) {
    if (clip.kind === 'move') stopSet.add(clip.animStartMs);
    stopSet.add(clip.endMs);
  }
  // NB : `Array.from` plutôt que `[...stopSet]`. Docusaurus Babel en mode
  // « loose » retranspile le spread d'un itérable en `[].concat(iterable)`,
  // ce qui n'aplatit PAS un Set et produit un tableau vide après le filtre.
  const stops = Array.from(stopSet)
    .filter((s) => s > 0 && s <= durationMs)
    .sort((a, b) => a - b);

  const sortedClips = ctx.pending
    .map((p) => p.clip)
    .sort((a, b) => a.startMs - b.startMs);

  // Passe 3 : pré-calcul des clips actifs par étape pour un rendu en O(K)
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
