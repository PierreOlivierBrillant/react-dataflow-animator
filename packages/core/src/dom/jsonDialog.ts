import type { Highlighter } from '../types';
import { h, s, setAttrIfChanged, type Child } from './el';

/**
 * Modal window showing the highlighted JSON spec — the port of `JsonDialog.tsx`.
 *
 * Unlike the controls, this is not on the animation path: it is created when the
 * dialog opens and destroyed when it closes, so there is no `create`/`apply`
 * split. The only thing that mutates is the transient "copied" state.
 *
 * REPRODUCED WARTS — three behaviours are ported as they are, not fixed, because
 * this step is a port and changing them is a product decision:
 *
 *  - no `Escape` handler, no focus trap, no focus restoration on close;
 *  - the copy button's `title` stays "Copier dans le presse-papier" while its
 *    `aria-label` swaps to "Copié" — so the two disagree for 1.5s;
 *  - the copied-state timer is not cleared on teardown. Here it at least cannot
 *    outlive the DOM it writes to, since `destroy` clears it — see below.
 *
 * All three, and the hardcoded French labels, are flagged in the step report.
 */

export interface JsonDialogOptions {
  json: string;
  /** Syntax highlighting (Prism by default), applied to the `json` language. */
  highlight: Highlighter;
  onCopy(): Promise<void>;
  onDownload(): void;
  onClose(): void;
}

export interface JsonDialogElement {
  readonly el: HTMLElement;
  /** Clears the pending copied-state timer. */
  destroy(): void;
}

/** How long the copy button shows its confirmation. `JsonDialog`'s. */
const COPIED_MS = 1500;

function lineIcon(paths: Child[]): SVGSVGElement {
  const svg = s('svg', {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
  });
  for (const p of paths) svg.appendChild(p as Node);
  return svg;
}

const copyIcon = (): SVGSVGElement =>
  lineIcon([
    s('rect', { x: '9', y: '9', width: '13', height: '13', rx: '2', ry: '2' }),
    s('path', {
      d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
    }),
  ]);

const checkIcon = (): SVGSVGElement =>
  lineIcon([s('path', { d: 'M20 6 9 17l-5-5' })]);

const downloadIcon = (): SVGSVGElement =>
  lineIcon([
    s('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }),
    s('path', { d: 'M7 10l5 5 5-5' }),
    s('path', { d: 'M12 15V3' }),
  ]);

function closeIcon(): SVGSVGElement {
  const svg = s('svg', {
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    'aria-hidden': 'true',
  });
  svg.appendChild(
    s('path', {
      d: 'M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6z',
    })
  );
  return svg;
}

export function createJsonDialog(
  options: JsonDialogOptions
): JsonDialogElement {
  const { json, highlight, onCopy, onDownload, onClose } = options;

  const backdrop = h('button', {
    type: 'button',
    class: 'rdfa-dialog-backdrop',
    'aria-label': 'Fermer la fenêtre',
    tabindex: '-1',
  });
  backdrop.addEventListener('click', onClose);

  const title = h('span', { class: 'rdfa-dialog-title' }, [
    'Spécification JSON',
  ]);

  const downloadBtn = h(
    'button',
    {
      type: 'button',
      class: 'rdfa-btn',
      'aria-label': 'Télécharger le JSON',
      title: 'Télécharger le JSON',
    },
    [downloadIcon()]
  );
  downloadBtn.addEventListener('click', onDownload);

  const copyBtn = h(
    'button',
    {
      type: 'button',
      class: 'rdfa-btn rdfa-copy-btn',
      'aria-label': 'Copier',
      // Constant, unlike the aria-label — reproduced, see the header note.
      title: 'Copier dans le presse-papier',
    },
    [copyIcon()]
  );

  let copiedTimer: ReturnType<typeof setTimeout> | undefined;
  const setCopied = (copied: boolean): void => {
    setAttrIfChanged(
      copyBtn,
      'class',
      `rdfa-btn rdfa-copy-btn${copied ? ' rdfa-copied' : ''}`
    );
    setAttrIfChanged(copyBtn, 'aria-label', copied ? 'Copié' : 'Copier');
    copyBtn.replaceChildren(copied ? checkIcon() : copyIcon());
  };
  copyBtn.addEventListener('click', () => {
    void onCopy().then(
      () => {
        setCopied(true);
        clearTimeout(copiedTimer);
        copiedTimer = setTimeout(() => setCopied(false), COPIED_MS);
      },
      () => setCopied(false)
    );
  });

  const closeBtn = h(
    'button',
    {
      type: 'button',
      class: 'rdfa-btn',
      'aria-label': 'Fermer',
      title: 'Fermer',
    },
    [closeIcon()]
  );
  closeBtn.addEventListener('click', onClose);

  const code = h('code');
  // The React side uses `dangerouslySetInnerHTML` here — the highlighter
  // returns markup by contract, so this is the literal equivalent.
  code.innerHTML = highlight(json, 'json');

  const el = h(
    'div',
    {
      class: 'rdfa-dialog-overlay',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': 'Spécification JSON',
    },
    [
      backdrop,
      h('div', { class: 'rdfa-dialog' }, [
        h('div', { class: 'rdfa-dialog-head' }, [
          title,
          downloadBtn,
          copyBtn,
          closeBtn,
        ]),
        h('pre', { class: 'rdfa-dialog-code rdfa-code' }, [code]),
      ]),
    ]
  );

  return {
    el,
    destroy() {
      // React leaks this timer; a vanilla handle has an explicit teardown, so
      // there is no reason to reproduce a callback firing into a detached tree.
      clearTimeout(copiedTimer);
      el.remove();
    },
  };
}
