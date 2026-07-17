import type { NodeType } from '../types';

/**
 * Named terminals ("pins") of electrical component symbols, and the parsing of
 * `"node:pin"` endpoint references.
 *
 * A dataflow node anchors its edges on the nearest cardinal FACE. A schematic
 * component instead exposes fixed, NAMED terminals (a resistor's `a`/`b`, a
 * transistor's `base`/`collector`/`emitter`, a source's `+`/`-`): a wire must
 * meet a specific one, wherever the other end sits. This module is the single
 * source of truth for where those terminals live on each symbol; the vector math
 * that turns a {@link PinDef} into an on-screen anchor lives in `geometry.ts`
 * (`pinAttach`), so this module stays free of any DOM/measure concern.
 */

/**
 * A terminal, in the symbol's UNROTATED local box:
 * - `x` / `y`: position as a fraction of the box (`0,0` = top-left corner,
 *   `1,1` = bottom-right), so it is size-independent;
 * - `nx` / `ny`: the OUTWARD direction the wire leaves the terminal (a unit-ish
 *   vector; it is normalized at use). Both the position and the normal are
 *   rotated by the node's `rotation` at anchor time.
 */
export interface PinDef {
  x: number;
  y: number;
  nx: number;
  ny: number;
}

// Shorthand terminals for the very common axis-aligned cases.
const WEST: PinDef = { x: 0, y: 0.5, nx: -1, ny: 0 };
const EAST: PinDef = { x: 1, y: 0.5, nx: 1, ny: 0 };
const NORTH: PinDef = { x: 0.5, y: 0, nx: 0, ny: -1 };

/** Two-terminal inline component (resistor, capacitor…): `a` west, `b` east. */
const TWO_TERMINAL: Record<string, PinDef> = { a: WEST, b: EAST };

/** Two-terminal polarized component / source: `-` west, `+` east (plus `a`/`b`
 *  aliases so a source can be wired like any inline component). */
const POLARIZED: Record<string, PinDef> = {
  '-': WEST,
  '+': EAST,
  a: WEST,
  b: EAST,
};

/** Two-input logic gate: inputs `a` (upper-left) / `b` (lower-left), output `y`
 *  (right, `out` alias). */
const LOGIC_2IN: Record<string, PinDef> = {
  a: { x: 0, y: 0.32, nx: -1, ny: 0 },
  b: { x: 0, y: 0.68, nx: -1, ny: 0 },
  y: EAST,
  out: EAST,
};

/** One-input logic gate (NOT / buffer): input `a` (`in` alias), output `y`. */
const LOGIC_1IN: Record<string, PinDef> = {
  a: WEST,
  in: WEST,
  y: EAST,
  out: EAST,
};

/**
 * Terminal map per component type. A type absent from this table has no named
 * terminals: its edges keep the ordinary cardinal-face (or round-outline)
 * anchoring, and a `"node:pin"` reference to it falls back to the whole node.
 */
export const COMPONENT_PINS: Partial<Record<NodeType, Record<string, PinDef>>> =
  {
    resistor: TWO_TERMINAL,
    potentiometer: {
      a: WEST,
      b: EAST,
      // Wiper taps the top of the body.
      wiper: { x: 0.5, y: 0, nx: 0, ny: -1 },
      w: { x: 0.5, y: 0, nx: 0, ny: -1 },
    },
    capacitor: TWO_TERMINAL,
    polarized_capacitor: POLARIZED,
    inductor: TWO_TERMINAL,
    fuse: TWO_TERMINAL,
    diode: { a: WEST, b: EAST, anode: WEST, cathode: EAST },
    led: { a: WEST, b: EAST, anode: WEST, cathode: EAST },
    lamp: TWO_TERMINAL,
    motor: TWO_TERMINAL,
    buzzer: POLARIZED,
    ammeter: TWO_TERMINAL,
    voltmeter: TWO_TERMINAL,
    switch: TWO_TERMINAL,
    push_button: TWO_TERMINAL,
    battery: POLARIZED,
    dc_source: POLARIZED,
    ac_source: TWO_TERMINAL,
    current_source: POLARIZED,
    transformer: {
      p1: { x: 0, y: 0.2, nx: -1, ny: 0 },
      p2: { x: 0, y: 0.8, nx: -1, ny: 0 },
      s1: { x: 1, y: 0.2, nx: 1, ny: 0 },
      s2: { x: 1, y: 0.8, nx: 1, ny: 0 },
    },
    transistor_npn: {
      base: WEST,
      collector: { x: 1, y: 0.15, nx: 1, ny: 0 },
      emitter: { x: 1, y: 0.85, nx: 1, ny: 0 },
      b: WEST,
      c: { x: 1, y: 0.15, nx: 1, ny: 0 },
      e: { x: 1, y: 0.85, nx: 1, ny: 0 },
    },
    transistor_pnp: {
      base: WEST,
      collector: { x: 1, y: 0.15, nx: 1, ny: 0 },
      emitter: { x: 1, y: 0.85, nx: 1, ny: 0 },
      b: WEST,
      c: { x: 1, y: 0.15, nx: 1, ny: 0 },
      e: { x: 1, y: 0.85, nx: 1, ny: 0 },
    },
    opamp: {
      in_plus: { x: 0, y: 0.72, nx: -1, ny: 0 },
      in_minus: { x: 0, y: 0.28, nx: -1, ny: 0 },
      out: EAST,
      '+': { x: 0, y: 0.72, nx: -1, ny: 0 },
      '-': { x: 0, y: 0.28, nx: -1, ny: 0 },
    },
    // Digital logic gates: two inputs on the left, one output on the right.
    and_gate: LOGIC_2IN,
    or_gate: LOGIC_2IN,
    nand_gate: LOGIC_2IN,
    nor_gate: LOGIC_2IN,
    xor_gate: LOGIC_2IN,
    xnor_gate: LOGIC_2IN,
    not_gate: LOGIC_1IN,
    buffer_gate: LOGIC_1IN,
    // Single terminal at the top (the reference potential hangs below it).
    ground: { a: NORTH, t: NORTH },
    // Antenna is fed from the bottom (the mast rises above the feed point).
    antenna: {
      a: { x: 0.5, y: 1, nx: 0, ny: 1 },
      t: { x: 0.5, y: 1, nx: 0, ny: 1 },
    },
  };

/**
 * Whether `type` declares named terminals at all. A type that does NOT (a `signal`
 * I/O pad, a plain box) has a single terminal centred on the face it presents — so
 * callers must not read a missing {@link PinDef} as "unknown pin"; it is the absence
 * of a pin MAP that says "this is a face-anchored pad".
 */
export function hasPins(type: NodeType): boolean {
  return COMPONENT_PINS[type] !== undefined;
}

/** The two INPUT terminals of a two-input logic gate, whose order is logically
 *  irrelevant (`a AND b === b AND a`, likewise NAND/OR/NOR/XOR/XNOR). The router
 *  may therefore swap which incoming wire takes the upper (`a`) vs lower (`b`) pin
 *  to avoid a wire crossing, with no change to the circuit. A gate NOT listed here
 *  (an op-amp's `+`/`-`, a transistor's terminals) keeps its author-given pins. */
const COMMUTATIVE_INPUT_PINS: Partial<Record<NodeType, [string, string]>> = {
  and_gate: ['a', 'b'],
  or_gate: ['a', 'b'],
  nand_gate: ['a', 'b'],
  nor_gate: ['a', 'b'],
  xor_gate: ['a', 'b'],
  xnor_gate: ['a', 'b'],
};

/** The interchangeable input-pin pair of `type`, or `undefined` if its terminals
 *  are order-sensitive. See {@link COMMUTATIVE_INPUT_PINS}. */
export function commutativeInputPins(
  type: NodeType
): readonly [string, string] | undefined {
  return COMMUTATIVE_INPUT_PINS[type];
}

/** A parsed endpoint reference: the node id and, optionally, a terminal name. */
export interface EndpointRef {
  /** Bare node id (what geometry / layout are keyed by). */
  node: string;
  /** Terminal name after the first `:`, if any. */
  pin?: string;
}

/**
 * Splits a `"node:pin"` endpoint reference. The `:` is the reserved delimiter
 * (no existing node id uses one); everything before it is the node, everything
 * after is the terminal. A bare `"node"` yields `{ node }` with no pin. A
 * trailing/empty pin (`"node:"`) is treated as no pin.
 */
export function parseRef(ref: string): EndpointRef {
  const i = ref.indexOf(':');
  if (i < 0) return { node: ref };
  const pin = ref.slice(i + 1);
  return pin ? { node: ref.slice(0, i), pin } : { node: ref.slice(0, i) };
}

/** Bare node id of an endpoint reference (drops any `:pin`). */
export function refNode(ref: string): string {
  const i = ref.indexOf(':');
  return i < 0 ? ref : ref.slice(0, i);
}

/**
 * Resolves the {@link PinDef} a `"node:pin"` reference targets, given the node's
 * `type`. Returns `undefined` when the reference has no pin, the type has no
 * terminals, or the name is unknown — the caller then falls back to face/outline
 * anchoring.
 */
export function resolvePin(
  type: NodeType,
  pin: string | undefined
): PinDef | undefined {
  if (!pin) return undefined;
  return COMPONENT_PINS[type]?.[pin];
}
