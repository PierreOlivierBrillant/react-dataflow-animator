/**
 * Keyed reconciliation primitives for the retained-mode renderer.
 *
 * At a frozen `t` the renderer could afford to `replaceChildren()` every layer
 * on each pass. Under playback it cannot: rebuilding the overlay sixty times a
 * second is exactly the cost the framework-agnostic renderer exists to remove.
 * These two helpers are what replace it.
 *
 * The pair is deliberately split. {@link reconcileKeyed} decides WHICH elements
 * exist; {@link reorder} decides in what ORDER they sit. Keeping the order pass
 * separate is not tidiness — it is what makes the DOM a function of the desired
 * list alone, rather than of the history of insertions and removals that led to
 * it. Several `.rdfa-*` layers share a z-index and break the tie on document
 * order, so an order that drifted with update history would drift the rendering
 * with it.
 */

/** One entry of the desired list: a stable identity plus what to draw. */
export interface KeyedItem<D> {
  key: string;
  data: D;
}

export interface ReconcileOptions<T, D> {
  /** Live elements from the previous pass, keyed. Mutated in place. */
  map: Map<string, T>;
  desired: ReadonlyArray<KeyedItem<D>>;
  create: (data: D, key: string) => T;
  apply: (item: T, data: D, key: string) => void;
  /** Detach an item that is no longer desired. */
  remove: (item: T, key: string) => void;
}

/**
 * Brings `map` in line with `desired`: creates what is missing, drops what is
 * gone, and applies to everything that survives.
 *
 * Returns the items in desired order, ready to hand to {@link reorder}.
 *
 * Survivors are MUTATED rather than replaced — that is the whole point. A packet
 * crossing the stage is created once when its clip opens and destroyed once when
 * it closes; in between it only ever receives style writes.
 */
export function reconcileKeyed<T, D>(options: ReconcileOptions<T, D>): T[] {
  const { map, desired, create, apply, remove } = options;

  const out: T[] = [];
  const seen = new Set<string>();

  for (const { key, data } of desired) {
    seen.add(key);
    let item = map.get(key);
    if (item === undefined) {
      item = create(data, key);
      map.set(key, item);
    }
    apply(item, data, key);
    out.push(item);
  }

  for (const [key, item] of map) {
    if (seen.has(key)) continue;
    remove(item, key);
    map.delete(key);
  }

  return out;
}

/**
 * Imposes `desired` as the leading child order of `parent`, moving only the
 * elements that are actually out of place.
 *
 * `parent` may hold children beyond `desired` (the stage root keeps its overlay
 * layers there); they are left after the imposed prefix, untouched.
 *
 * When the order already matches — the common case, since the desired list is
 * built by walking the spec in a fixed order — this walks the list and performs
 * no DOM mutation at all.
 */
export function reorder(parent: Element, desired: readonly Element[]): void {
  let next: ChildNode | null = parent.firstChild;
  for (const el of desired) {
    if (next === el) {
      next = el.nextSibling;
      continue;
    }
    // Moves `el` if it is already elsewhere in the parent, inserts it otherwise.
    // `next` keeps pointing at the same node either way, so the invariant
    // "everything before `next` is already in position" is preserved.
    parent.insertBefore(el, next);
  }
}
