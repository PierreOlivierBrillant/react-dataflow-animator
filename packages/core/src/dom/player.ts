import type { DataFlowSpec, Highlighter, PlayerTheme } from '../types';
import { compile } from '../engine/compiler';
import { nextStop, prevStop } from '../engine/timeline';
import { copyText, downloadJson, serializeSpec } from '../export/json';
import { highlightCode } from '../highlight/highlight';
import { createPlayerClock, type PlayerClock } from './clock';
import {
  applyControlsElement,
  createControlsElement,
  type ControlsElement,
} from './controls';
import { h, s, setStyle } from './el';
import { createJsonDialog, type JsonDialogElement } from './jsonDialog';
import { mountVanillaStage, type VanillaStageHandle } from './mount';

/**
 * Framework-agnostic player — the vanilla-DOM equivalent of `DataFlowPlayer`.
 *
 * This is where the retained renderer finally gets a clock: `createPlayerClock`
 * (delivered in step 2.2 with no caller) drives `VanillaStageHandle.update`
 * through a subscription. One notification per frame, one `update(t)`, no
 * rebuild — which is the whole point of the migration.
 *
 * OUT OF SCOPE, deliberately: changing the `spec` on a live player. `update`
 * only moves time. A new spec means a new mount, and arranging that is the
 * React wrapper's job at step 2.6.
 *
 * SSR-safe: nothing here touches `document` until `mountVanillaPlayer` is
 * called.
 */

export interface VanillaPlayerOptions {
  /** Height of the player. A number is taken as pixels. Default: 420. */
  height?: number | string;
  /**
   * Width of the player. A number is taken as pixels; omitted, the player
   * takes its width from its container.
   *
   * It exists for the same reason `height` does: the stage MEASURES during
   * mount — including the one-shot capture of a `set_content` node's pre-panel
   * geometry — so a caller that sizes the root afterwards would anchor the
   * icon→panel morph to a box the player never actually has. Sizing has to
   * happen before the first measurement, not after it.
   */
  width?: number | string;
  autoPlay?: boolean;
  loop?: boolean;
  /** Renders the control bar, the keyboard shortcuts and the focus ring. */
  controls?: boolean;
  /** Adds the JSON spec button and its dialog. */
  exportable?: boolean;
  theme?: PlayerTheme;
  mode?: 'auto' | 'light' | 'dark';
  density?: 'compact' | 'comfortable';
  speed?: number;
  highlight?: Highlighter;
  className?: string;
}

export interface VanillaPlayerHandle {
  /** The `.rdfa-player` root, for callers that need to place or measure it. */
  readonly el: HTMLElement;
  readonly clock: PlayerClock;
  /** Detaches everything and releases the clock, observers and listeners. */
  destroy(): void;
}

/** The JSON spec button, ported from `DataFlowPlayer`'s `exportSlot`. */
function jsonButton(onOpen: () => void): HTMLButtonElement {
  const svg = s('svg', {
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    'aria-hidden': 'true',
  });
  svg.appendChild(
    s('path', {
      d: 'M7 4a3 3 0 0 0-3 3v2a2 2 0 0 1-2 2v2a2 2 0 0 1 2 2v2a3 3 0 0 0 3 3h1v-2H7a1 1 0 0 1-1-1v-2a3 3 0 0 0-1.2-2.4A3 3 0 0 0 6 9V7a1 1 0 0 1 1-1h1V4H7zm10 0a3 3 0 0 1 3 3v2a2 2 0 0 0 2 2v2a2 2 0 0 0-2 2v2a3 3 0 0 1-3 3h-1v-2h1a1 1 0 0 0 1-1v-2a3 3 0 0 1 1.2-2.4A3 3 0 0 1 18 9V7a1 1 0 0 0-1-1h-1V4h1z',
    })
  );
  const btn = h(
    'button',
    {
      type: 'button',
      class: 'rdfa-btn',
      'aria-label': 'Spécification JSON',
      title: 'Spécification JSON',
    },
    [svg]
  );
  btn.addEventListener('click', onOpen);
  return btn;
}

export function mountVanillaPlayer(
  container: HTMLElement,
  spec: DataFlowSpec,
  options: VanillaPlayerOptions = {}
): VanillaPlayerHandle {
  const {
    height = 420,
    width,
    autoPlay = false,
    loop = false,
    controls = true,
    exportable = false,
    theme = 'default',
    mode = 'auto',
    speed = 1,
    highlight = highlightCode,
    className,
  } = options;

  const { timeline } = compile(spec);

  const root = h('div', {
    class: `rdfa-player${className ? ` ${className}` : ''}`,
    'data-theme': theme,
    'data-mode': mode,
  });
  setStyle(root, {
    height: typeof height === 'number' ? `${height}px` : height,
    ...(width != null
      ? { width: typeof width === 'number' ? `${width}px` : width }
      : {}),
  });
  // `tabIndex` is what makes the root focusable for the keyboard shortcuts, so
  // it is present exactly when the controls are — as in React.
  if (controls) root.setAttribute('tabindex', '0');
  container.appendChild(root);

  const clock = createPlayerClock({
    durationMs: timeline.durationMs,
    speed,
    loop,
    autoPlay,
  });

  let isFullscreen = false;
  const toggleFullscreen = (): void => {
    // Reproduced from React, including the asymmetry: this exits full screen
    // whenever ANY element is full screen, not only when it is this player.
    // Flagged in the step report.
    if (document.fullscreenElement) void document.exitFullscreen();
    else void root.requestFullscreen?.();
  };

  let bar: ControlsElement | undefined;
  let dialog: JsonDialogElement | undefined;

  const openDialog = (): void => {
    if (dialog) return;
    const json = serializeSpec(spec);
    dialog = createJsonDialog({
      json,
      highlight,
      onCopy: () => copyText(json),
      onDownload: () => downloadJson(json),
      onClose: closeDialog,
    });
    root.appendChild(dialog.el);
  };
  const closeDialog = (): void => {
    dialog?.destroy();
    dialog = undefined;
  };

  // The control bar goes in BEFORE the stage is mounted, and that ordering is
  // load-bearing rather than stylistic. The stage takes its height from the
  // space the bar leaves, and it MEASURES during `mountVanillaStage` — including
  // the one-shot capture of a `set_content` node's pre-panel geometry. Mounting
  // the stage first would measure it at the full player height, anchor the
  // icon→panel morph to that, and then shrink it when the bar arrived; React
  // commits the stage and the bar together and never sees the intermediate
  // size. The stage is moved back in front of the bar afterwards, which changes
  // the document order without changing either box.
  if (controls) {
    bar = createControlsElement({
      clock,
      timeline,
      onToggleFullscreen: toggleFullscreen,
      exportSlot: exportable ? jsonButton(openDialog) : undefined,
    });
    applyControlsElement(bar, clock, isFullscreen);
    root.appendChild(bar.el);
  }

  const stage: VanillaStageHandle = mountVanillaStage(root, spec, clock.t);
  if (bar) root.insertBefore(stage.el, bar.el);

  const onFullscreenChange = (): void => {
    isFullscreen = document.fullscreenElement === root;
    if (bar) applyControlsElement(bar, clock, isFullscreen);
  };
  document.addEventListener('fullscreenchange', onFullscreenChange);

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === ' ') {
      event.preventDefault();
      clock.toggle();
    } else if (event.key === 'ArrowRight') {
      // NOTE — the keyboard JUMPS to the next stop where the "next" button
      // PLAYS to it. That asymmetry is React's; reproduced, not repaired.
      event.preventDefault();
      clock.pause();
      clock.seek(nextStop(timeline, clock.t));
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      clock.pause();
      clock.seek(prevStop(timeline, clock.t));
    }
  };
  if (controls) root.addEventListener('keydown', onKeyDown);

  // The one line the whole migration was for: a clock tick mutates the stage
  // instead of re-rendering it.
  const unsubscribe = clock.subscribe(() => {
    stage.update(clock.t);
    if (bar) applyControlsElement(bar, clock, isFullscreen);
  });

  return {
    el: root,
    clock,
    destroy() {
      // Order matters: drop the subscription before stopping the clock, so a
      // final notification cannot reach a stage that is already gone.
      unsubscribe();
      clock.destroy();
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      root.removeEventListener('keydown', onKeyDown);
      closeDialog();
      stage.destroy();
      root.remove();
    },
  };
}
