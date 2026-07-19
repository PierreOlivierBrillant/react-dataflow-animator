/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { appendCommentElement } from './commentElement';
import type { NodeGeom } from '../engine/geometry';

/**
 * jsdom has no layout: `offsetWidth`/`offsetHeight` are always 0. Every
 * placement rule here is a function of the bubble's OWN size, so the size has to
 * be faked — that is the whole input to the geometry under test.
 */
function withSize(w: number, h: number): void {
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(w);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(h);
}

const node = (over: Partial<NodeGeom> = {}): NodeGeom => ({
  id: 'n',
  x: 200,
  y: 150,
  width: 40,
  height: 40,
  ...over,
});

let parent: HTMLElement;

beforeEach(() => {
  vi.restoreAllMocks();
  parent = document.createElement('div');
  document.body.replaceChildren(parent);
});

describe('appendCommentElement — omniscient', () => {
  it('centres at the top of the stage, with no tail', () => {
    withSize(100, 30);
    const el = appendCommentElement(parent, {
      text: 'hi',
      opacity: 0.5,
      stageW: 480,
      stageH: 320,
    });

    expect(el.className).toBe('rdfa-comment rdfa-comment--omniscient');
    expect(el.querySelector('.rdfa-comment-tail')).toBeNull();
    expect(el.style.left).toBe('190px'); // 480/2 - 100/2
    expect(el.style.top).toBe('8px');
    expect(el.style.opacity).toBe('0.5');
    expect(el.style.visibility).toBe('visible');
  });

  it('clamps to the stage padding when it is wider than the stage', () => {
    withSize(600, 30);
    const el = appendCommentElement(parent, {
      text: 'wide',
      opacity: 1,
      stageW: 480,
      stageH: 320,
    });

    expect(el.style.left).toBe('8px');
  });

  it('INTERPRETS rich text — unlike the anchored variant', () => {
    withSize(80, 20);
    const el = appendCommentElement(parent, {
      text: 'water $H_2O$',
      opacity: 1,
      stageW: 480,
      stageH: 320,
    });

    expect(el.querySelector('sub')?.textContent).toBe('2');
  });

  it('hides itself while it has no measurable size', () => {
    withSize(0, 0);
    const el = appendCommentElement(parent, {
      text: 'x',
      opacity: 1,
      stageW: 480,
      stageH: 320,
    });

    expect(el.style.visibility).toBe('hidden');
  });
});

describe('appendCommentElement — anchored', () => {
  it('sits above the node and points its tail at it', () => {
    withSize(100, 30);
    const el = appendCommentElement(parent, {
      node: node(),
      text: 'above',
      opacity: 1,
      stageW: 480,
      stageH: 320,
    });

    expect(el.className).toBe('rdfa-comment');
    // nodeTop (150-20) - gap 8 - height 30
    expect(el.style.top).toBe('92px');
    expect(el.style.left).toBe('150px'); // 200 - 100/2
    const tail = el.querySelector<HTMLElement>('.rdfa-comment-tail');
    expect(tail?.style.left).toBe('50px'); // 200 - 150
  });

  it('flips below the node when there is no room above', () => {
    withSize(100, 30);
    const el = appendCommentElement(parent, {
      node: node({ y: 30 }),
      text: 'below',
      opacity: 1,
      stageW: 480,
      stageH: 320,
    });

    expect(el.className).toBe('rdfa-comment rdfa-comment--below');
    expect(el.style.top).toBe('58px'); // nodeBottom (30+20) + gap 8
  });

  it('keeps the tail inside the bubble when an edge clamp shifts it', () => {
    withSize(100, 30);
    const el = appendCommentElement(parent, {
      node: node({ x: 10 }),
      text: 'edge',
      opacity: 1,
      stageW: 480,
      stageH: 320,
    });

    // left clamps to the 8px pad, so the node sits only 2px into the bubble —
    // the tail is held back to its 14px inset instead of leaving the rounded end.
    expect(el.style.left).toBe('8px');
    expect(
      el.querySelector<HTMLElement>('.rdfa-comment-tail')?.style.left
    ).toBe('14px');
  });

  it('does NOT interpret rich text', () => {
    withSize(80, 20);
    const el = appendCommentElement(parent, {
      node: node(),
      text: 'water $H_2O$',
      opacity: 1,
      stageW: 480,
      stageH: 320,
    });

    expect(el.querySelector('sub')).toBeNull();
    expect(el.textContent).toBe('water $H_2O$');
  });

  it('clamps a bubble taller than the stage to the top pad', () => {
    withSize(100, 400);
    const el = appendCommentElement(parent, {
      node: node(),
      text: 'tall',
      opacity: 1,
      stageW: 480,
      stageH: 320,
    });

    expect(el.style.top).toBe('8px');
  });
});
