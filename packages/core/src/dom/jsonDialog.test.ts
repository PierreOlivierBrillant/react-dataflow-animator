/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createJsonDialog } from './jsonDialog';

const escape = (code: string): string =>
  code.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function make(over: Partial<Parameters<typeof createJsonDialog>[0]> = {}) {
  const onCopy = vi.fn(() => Promise.resolve());
  const onDownload = vi.fn();
  const onClose = vi.fn();
  const dialog = createJsonDialog({
    json: '{"a":1}',
    highlight: escape,
    onCopy,
    onDownload,
    onClose,
    ...over,
  });
  document.body.appendChild(dialog.el);
  return { dialog, onCopy, onDownload, onClose };
}

const byLabel = (root: Element, label: string): HTMLButtonElement =>
  root.querySelector(`button[aria-label="${label}"]`)!;

beforeEach(() => {
  document.body.innerHTML = '';
});
afterEach(() => {
  vi.useRealTimers();
});

describe('createJsonDialog — accessibility surface', () => {
  it('is a labelled modal dialog', () => {
    const { dialog } = make();

    expect(dialog.el.getAttribute('role')).toBe('dialog');
    expect(dialog.el.getAttribute('aria-modal')).toBe('true');
    expect(dialog.el.getAttribute('aria-label')).toBe('Spécification JSON');
  });

  it('keeps the backdrop out of the tab order', () => {
    const { dialog } = make();
    const backdrop = dialog.el.querySelector('.rdfa-dialog-backdrop')!;

    // Clickable but not tabbable: it is a dismissal target, not a stop.
    expect(backdrop.getAttribute('tabindex')).toBe('-1');
    expect(backdrop.getAttribute('aria-label')).toBe('Fermer la fenêtre');
  });

  it('offers download, copy and close in that focus order', () => {
    const { dialog } = make();
    const tabbable = [...dialog.el.querySelectorAll('button')].filter(
      (b) => b.getAttribute('tabindex') !== '-1'
    );

    expect(tabbable.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Télécharger le JSON',
      'Copier',
      'Fermer',
    ]);
  });

  it('titles its head with the same string as the dialog label', () => {
    const { dialog } = make();

    expect(dialog.el.querySelector('.rdfa-dialog-title')!.textContent).toBe(
      'Spécification JSON'
    );
  });

  it('renders the highlighted JSON inside a pre > code', () => {
    const { dialog } = make({ json: '{"a":"<b>"}' });
    const code = dialog.el.querySelector('pre.rdfa-dialog-code > code')!;

    expect(code.innerHTML).toBe('{"a":"&lt;b&gt;"}');
  });
});

describe('createJsonDialog — wiring', () => {
  it('closes from the backdrop and from the close button', () => {
    const { dialog, onClose } = make();

    (dialog.el.querySelector('.rdfa-dialog-backdrop') as HTMLElement).click();
    byLabel(dialog.el, 'Fermer').click();

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('downloads on demand', () => {
    const { dialog, onDownload } = make();

    byLabel(dialog.el, 'Télécharger le JSON').click();

    expect(onDownload).toHaveBeenCalled();
  });

  it('confirms a copy for 1.5s, then reverts', async () => {
    vi.useFakeTimers();
    const { dialog } = make();
    const btn = byLabel(dialog.el, 'Copier');

    btn.click();
    await vi.advanceTimersByTimeAsync(0);

    expect(
      dialog.el.querySelector('button[aria-label="Copié"]')
    ).not.toBeNull();
    expect(
      dialog.el
        .querySelector('.rdfa-copy-btn')!
        .classList.contains('rdfa-copied')
    ).toBe(true);

    await vi.advanceTimersByTimeAsync(1500);

    expect(
      dialog.el.querySelector('button[aria-label="Copier"]')
    ).not.toBeNull();
  });

  // Reproduced from React rather than repaired: the title does NOT follow the
  // aria-label, so the two disagree while the confirmation shows.
  it('leaves the copy title constant while the label swaps', async () => {
    vi.useFakeTimers();
    const { dialog } = make();

    byLabel(dialog.el, 'Copier').click();
    await vi.advanceTimersByTimeAsync(0);

    expect(
      dialog.el.querySelector('.rdfa-copy-btn')!.getAttribute('title')
    ).toBe('Copier dans le presse-papier');
  });

  it('stays un-confirmed when the copy is refused', async () => {
    const { dialog } = make({ onCopy: () => Promise.reject(new Error('no')) });

    byLabel(dialog.el, 'Copier').click();
    await Promise.resolve();
    await Promise.resolve();

    expect(dialog.el.querySelector('button[aria-label="Copié"]')).toBeNull();
  });
});

describe('createJsonDialog — teardown', () => {
  it('detaches and cancels a pending confirmation timer', async () => {
    vi.useFakeTimers();
    const { dialog } = make();
    byLabel(dialog.el, 'Copier').click();
    await vi.advanceTimersByTimeAsync(0);

    dialog.destroy();

    // The React component leaks this timer; firing it into a detached tree is
    // exactly what an explicit handle exists to prevent.
    expect(() => vi.advanceTimersByTime(1500)).not.toThrow();
    expect(document.querySelector('.rdfa-dialog-overlay')).toBeNull();
  });
});
