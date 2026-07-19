/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { reconcileKeyed, reorder } from './reconcile';

const el = (id: string): HTMLElement => {
  const node = document.createElement('div');
  node.id = id;
  return node;
};

const ids = (parent: Element): string[] =>
  Array.from(parent.children).map((c) => c.id);

describe('reconcileKeyed', () => {
  it('creates what is missing and applies to it', () => {
    const map = new Map<string, HTMLElement>();
    const applied: string[] = [];
    const out = reconcileKeyed({
      map,
      desired: [
        { key: 'a', data: 1 },
        { key: 'b', data: 2 },
      ],
      create: (_data, key) => el(key),
      apply: (_item, data, key) => applied.push(`${key}=${data}`),
      remove: () => {},
    });

    expect(out.map((o) => o.id)).toEqual(['a', 'b']);
    expect(applied).toEqual(['a=1', 'b=2']);
    expect([...map.keys()]).toEqual(['a', 'b']);
  });

  // The whole point of the retained mode: a survivor is mutated, never rebuilt.
  it('reuses a surviving item rather than recreating it', () => {
    const map = new Map<string, HTMLElement>();
    const create = vi.fn((_d: number, key: string) => el(key));
    const base = { map, create, apply: () => {}, remove: () => {} };

    reconcileKeyed({ ...base, desired: [{ key: 'a', data: 1 }] });
    const first = map.get('a');
    reconcileKeyed({ ...base, desired: [{ key: 'a', data: 2 }] });

    expect(map.get('a')).toBe(first);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('removes what is no longer desired, and drops it from the map', () => {
    const map = new Map<string, HTMLElement>();
    const removed: string[] = [];
    const base = {
      map,
      create: (_d: number, key: string) => el(key),
      apply: () => {},
      remove: (_item: HTMLElement, key: string) => removed.push(key),
    };

    reconcileKeyed({
      ...base,
      desired: [
        { key: 'a', data: 1 },
        { key: 'b', data: 2 },
      ],
    });
    reconcileKeyed({ ...base, desired: [{ key: 'b', data: 2 }] });

    expect(removed).toEqual(['a']);
    expect([...map.keys()]).toEqual(['b']);
  });

  it('returns items in DESIRED order, not in map insertion order', () => {
    const map = new Map<string, HTMLElement>();
    const base = {
      map,
      create: (_d: number, key: string) => el(key),
      apply: () => {},
      remove: () => {},
    };
    reconcileKeyed({
      ...base,
      desired: [
        { key: 'a', data: 1 },
        { key: 'b', data: 1 },
      ],
    });
    const out = reconcileKeyed({
      ...base,
      desired: [
        { key: 'b', data: 1 },
        { key: 'a', data: 1 },
      ],
    });

    expect(out.map((o) => o.id)).toEqual(['b', 'a']);
  });
});

describe('reorder', () => {
  it('imposes the desired order', () => {
    const parent = document.createElement('div');
    const [a, b, c] = ['a', 'b', 'c'].map(el);
    parent.append(a, b, c);

    reorder(parent, [c, a, b]);

    expect(ids(parent)).toEqual(['c', 'a', 'b']);
  });

  // Document order breaks z-index ties in several `.rdfa-*` layers, so an order
  // that drifted with update history would drift the rendering with it.
  it('is idempotent and mutates nothing when the order already matches', () => {
    const parent = document.createElement('div');
    const [a, b] = ['a', 'b'].map(el);
    parent.append(a, b);
    const spy = vi.spyOn(parent, 'insertBefore');

    reorder(parent, [a, b]);

    expect(spy).not.toHaveBeenCalled();
    expect(ids(parent)).toEqual(['a', 'b']);
  });

  it('inserts an element that is not in the parent yet', () => {
    const parent = document.createElement('div');
    const a = el('a');
    parent.append(a);

    reorder(parent, [el('new'), a]);

    expect(ids(parent)).toEqual(['new', 'a']);
  });

  it('leaves trailing children beyond the imposed prefix alone', () => {
    const parent = document.createElement('div');
    const [a, b, tail] = ['a', 'b', 'tail'].map(el);
    parent.append(a, b, tail);

    reorder(parent, [b, a]);

    expect(ids(parent)).toEqual(['b', 'a', 'tail']);
  });
});
