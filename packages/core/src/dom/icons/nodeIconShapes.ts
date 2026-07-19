import type { NodeType } from '../../types';

/** One SVG element of a pictogram, in the shared 0..24 box. */
export interface IconShape {
  tag: 'rect' | 'path' | 'circle' | 'ellipse' | 'polygon';
  attr: Record<string, string>;
}

/**
 * Node pictograms by `type`, as data.
 *
 * Transcribed from `nodeIcons.tsx`'s JSX registry — the same 0..24 box, the
 * same coordinates. Electrical symbols keep their leads reaching the box EDGES
 * (x = 0 / x = 24 at y = 12 for a two-terminal part) so the named terminals from
 * `engine/pins.ts` land flush on the visible leads.
 *
 * The stateful contacts (`switch`, `push_button`) are NOT here: their geometry
 * is a function of the `closed` fraction, so they are built in `nodeIcons.ts`.
 */
export const NODE_ICON_SHAPES: Partial<Record<NodeType, IconShape[]>> = {
  desktop: [
    {
      tag: 'rect',
      attr: { x: '2.5', y: '4', width: '19', height: '12', rx: '1.5' },
    },
    { tag: 'path', attr: { d: 'M9 20h6M12 16v4' } },
  ],
  laptop: [
    {
      tag: 'rect',
      attr: { x: '4', y: '5', width: '16', height: '10', rx: '1.2' },
    },
    { tag: 'path', attr: { d: 'M3 18l1.5-2h15L21 18z' } },
  ],
  client: [
    {
      tag: 'rect',
      attr: { x: '3', y: '4', width: '18', height: '16', rx: '1.5' },
    },
    { tag: 'path', attr: { d: 'M3 8h18' } },
    { tag: 'path', attr: { d: 'M6 6h.01M8.5 6h.01M11 6h.01' } },
  ],
  server: [
    {
      tag: 'rect',
      attr: { x: '3.5', y: '3.5', width: '17', height: '7', rx: '1.2' },
    },
    {
      tag: 'rect',
      attr: { x: '3.5', y: '13', width: '17', height: '7', rx: '1.2' },
    },
    { tag: 'path', attr: { d: 'M7 7h.01M7 16.5h.01' } },
  ],
  database: [
    {
      tag: 'path',
      attr: {
        d: 'M4 6c0-1.66 3.58-3 8-3s8 1.34 8 3v12c0 1.66-3.58 3-8 3s-8-1.34-8-3z',
      },
    },
    { tag: 'path', attr: { d: 'M4 6c0 1.66 3.58 3 8 3s8-1.34 8-3' } },
    { tag: 'path', attr: { d: 'M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3' } },
  ],
  mobile: [
    {
      tag: 'rect',
      attr: { x: '7', y: '2.5', width: '10', height: '19', rx: '2' },
    },
    { tag: 'path', attr: { d: 'M11 18.5h2' } },
  ],
  user: [
    { tag: 'circle', attr: { cx: '12', cy: '8', r: '3.5' } },
    { tag: 'path', attr: { d: 'M5 20c0-3.5 3-6 7-6s7 2.5 7 6' } },
  ],
  admin: [
    { tag: 'circle', attr: { cx: '10', cy: '8', r: '3' } },
    { tag: 'path', attr: { d: 'M3.5 20c0-3.2 2.7-5.5 6.5-5.5' } },
    {
      tag: 'path',
      attr: { d: 'M17 13l3 1v2.5c0 2-1.5 3.2-3 3.8-1.5-.6-3-1.8-3-3.8V14z' },
    },
  ],
  users: [
    { tag: 'circle', attr: { cx: '9', cy: '8', r: '3' } },
    { tag: 'path', attr: { d: 'M3 19c0-3 2.6-5 6-5s6 2 6 5' } },
    { tag: 'path', attr: { d: 'M16 6.7a3 3 0 0 1 0 5.6', fill: 'none' } },
    { tag: 'path', attr: { d: 'M17 14.2c2.3.5 4 2.3 4 4.8', fill: 'none' } },
  ],
  cloud: [
    {
      tag: 'path',
      attr: { d: 'M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z' },
    },
  ],
  alice: [
    { tag: 'circle', attr: { cx: '12', cy: '8.5', r: '3.5' } },
    { tag: 'circle', attr: { cx: '12', cy: '4', r: '1.5' } },
    { tag: 'path', attr: { d: 'M5 21c0-3.5 3-6 7-6s7 2.5 7 6' } },
  ],
  bob: [
    { tag: 'circle', attr: { cx: '12', cy: '9', r: '3.5' } },
    { tag: 'path', attr: { d: 'M9 7c0-2 1.3-3.5 3-3.5s3 1.5 3 3.5h-6z' } },
    { tag: 'path', attr: { d: 'M7.5 7h9' } },
    { tag: 'path', attr: { d: 'M5 21c0-3.5 3-6 7-6s7 2.5 7 6' } },
  ],
  eve: [
    { tag: 'circle', attr: { cx: '12', cy: '8.5', r: '3' } },
    { tag: 'path', attr: { d: 'M9 8.5a3 3 0 0 1 6 0' } },
    {
      tag: 'rect',
      attr: { x: '7.5', y: '8', width: '2', height: '3', rx: '1' },
    },
    {
      tag: 'rect',
      attr: { x: '14.5', y: '8', width: '2', height: '3', rx: '1' },
    },
    { tag: 'path', attr: { d: 'M5 21c0-3.5 3-5.5 7-5.5s7 2 7 5.5' } },
  ],
  resistor: [
    { tag: 'path', attr: { d: 'M0 12h5M19 12h5' } },
    { tag: 'rect', attr: { x: '5', y: '8', width: '14', height: '8' } },
  ],
  potentiometer: [
    { tag: 'path', attr: { d: 'M0 12h5M19 12h5' } },
    { tag: 'rect', attr: { x: '5', y: '8', width: '14', height: '8' } },
    { tag: 'path', attr: { d: 'M12 0v4' } },
    { tag: 'path', attr: { d: 'M9 7l3 3 3-3', fill: 'none' } },
  ],
  capacitor: [
    { tag: 'path', attr: { d: 'M0 12h10M14 12h10' } },
    { tag: 'path', attr: { d: 'M10 6v12M14 6v12' } },
  ],
  polarized_capacitor: [
    { tag: 'path', attr: { d: 'M0 12h10M15 12h9' } },
    { tag: 'path', attr: { d: 'M10 6v12' } },
    { tag: 'path', attr: { d: 'M18 6a9 9 0 0 0 0 12', fill: 'none' } },
    { tag: 'path', attr: { d: 'M5 5h3M6.5 3.5v3' } },
  ],
  inductor: [
    { tag: 'path', attr: { d: 'M0 12h3q2-6 4 0t4 0t4 0t4 0h3', fill: 'none' } },
  ],
  fuse: [
    { tag: 'path', attr: { d: 'M0 12h4M20 12h4' } },
    {
      tag: 'rect',
      attr: { x: '4', y: '8', width: '16', height: '8', rx: '4' },
    },
    { tag: 'path', attr: { d: 'M6 12h12' } },
  ],
  battery: [
    { tag: 'path', attr: { d: 'M0 12h9M15 12h9' } },
    { tag: 'path', attr: { d: 'M9 9v6' } },
    { tag: 'path', attr: { d: 'M15 6v12' } },
    { tag: 'path', attr: { d: 'M18 4.5h3M19.5 3v3' } },
  ],
  dc_source: [
    { tag: 'path', attr: { d: 'M0 12h4M20 12h4' } },
    { tag: 'circle', attr: { cx: '12', cy: '12', r: '8' } },
    { tag: 'path', attr: { d: 'M7.5 10h3M9 8.5v3' } },
    { tag: 'path', attr: { d: 'M13.5 15h3' } },
  ],
  ac_source: [
    { tag: 'path', attr: { d: 'M0 12h4M20 12h4' } },
    { tag: 'circle', attr: { cx: '12', cy: '12', r: '8' } },
    { tag: 'path', attr: { d: 'M8 12q2-4 4 0t4 0' } },
  ],
  current_source: [
    { tag: 'path', attr: { d: 'M0 12h4M20 12h4' } },
    { tag: 'circle', attr: { cx: '12', cy: '12', r: '8' } },
    { tag: 'path', attr: { d: 'M12 17V7M9 10l3-3 3 3' } },
  ],
  diode: [
    { tag: 'path', attr: { d: 'M0 12h7M17 12h7' } },
    { tag: 'path', attr: { d: 'M7 7v10l10-5z' } },
    { tag: 'path', attr: { d: 'M17 7v10' } },
  ],
  led: [
    { tag: 'path', attr: { d: 'M0 12h6M18 12h6' } },
    { tag: 'path', attr: { d: 'M6 6v12l12-6z' } },
    { tag: 'path', attr: { d: 'M18 6v12' } },
    { tag: 'path', attr: { d: 'M9 5l3-3M12 2h-2.2M12 2v2.2' } },
    { tag: 'path', attr: { d: 'M12.5 7.5l3-3M15.5 4.5h-2.2M15.5 4.5v2.2' } },
  ],
  transistor_npn: [
    { tag: 'path', attr: { d: 'M0 12h7' } },
    { tag: 'path', attr: { d: 'M7 6v12' } },
    { tag: 'path', attr: { d: 'M7 9l10-6M17 3V0' } },
    { tag: 'path', attr: { d: 'M7 15l10 6M17 21v3' } },
    { tag: 'path', attr: { d: 'M11.5 15.7l3.5 2.1-3.9 1' } },
  ],
  transistor_pnp: [
    { tag: 'path', attr: { d: 'M0 12h7' } },
    { tag: 'path', attr: { d: 'M7 6v12' } },
    { tag: 'path', attr: { d: 'M7 9l10-6M17 3V0' } },
    { tag: 'path', attr: { d: 'M7 15l10 6M17 21v3' } },
    { tag: 'path', attr: { d: 'M10.4 15.1l-3.4 1.9 3.9 1' } },
  ],
  opamp: [
    { tag: 'path', attr: { d: 'M0 7h6M0 17h6M20 12h4' } },
    { tag: 'path', attr: { d: 'M6 2v20l14-10z' } },
    { tag: 'path', attr: { d: 'M2.5 17h3M4 15.5v3' } },
    { tag: 'path', attr: { d: 'M2.5 7h3' } },
  ],
  lamp: [
    { tag: 'path', attr: { d: 'M0 12h4M20 12h4' } },
    { tag: 'circle', attr: { cx: '12', cy: '12', r: '8' } },
    { tag: 'path', attr: { d: 'M6.5 6.5l11 11M17.5 6.5l-11 11' } },
  ],
  motor: [
    { tag: 'path', attr: { d: 'M0 12h4M20 12h4' } },
    { tag: 'circle', attr: { cx: '12', cy: '12', r: '8' } },
    { tag: 'path', attr: { d: 'M8 15V9l4 4 4-4v6' } },
  ],
  buzzer: [
    { tag: 'path', attr: { d: 'M0 12h4M20 12h4' } },
    { tag: 'path', attr: { d: 'M8 5v14h3a7 7 0 0 0 0-14z' } },
  ],
  ground: [
    { tag: 'path', attr: { d: 'M12 0v10' } },
    { tag: 'path', attr: { d: 'M5 10h14M8 14h8M10.5 18h3' } },
  ],
  junction: [
    {
      tag: 'circle',
      attr: { cx: '12', cy: '12', r: '3.2', fill: 'currentColor' },
    },
  ],
  ammeter: [
    { tag: 'path', attr: { d: 'M0 12h4M20 12h4' } },
    { tag: 'circle', attr: { cx: '12', cy: '12', r: '8' } },
    { tag: 'path', attr: { d: 'M9 16l3-8 3 8M10.2 13h3.6' } },
  ],
  voltmeter: [
    { tag: 'path', attr: { d: 'M0 12h4M20 12h4' } },
    { tag: 'circle', attr: { cx: '12', cy: '12', r: '8' } },
    { tag: 'path', attr: { d: 'M9 8l3 8 3-8' } },
  ],
  antenna: [
    { tag: 'path', attr: { d: 'M12 24V10' } },
    { tag: 'path', attr: { d: 'M12 10L6.5 2M12 10l5.5-8' } },
  ],
  transformer: [
    { tag: 'path', attr: { d: 'M0 5h5M0 19h5M19 5h5M19 19h5' } },
    { tag: 'path', attr: { d: 'M5 5q-4 2.3 0 4.6t0 4.6t0 4.6', fill: 'none' } },
    { tag: 'path', attr: { d: 'M19 5q4 2.3 0 4.6t0 4.6t0 4.6', fill: 'none' } },
    { tag: 'path', attr: { d: 'M11 5v14M13 5v14' } },
  ],
  and_gate: [
    { tag: 'path', attr: { d: 'M0 8h6M0 16h6M19 12h5' } },
    { tag: 'path', attr: { d: 'M6 4h5a8 8 0 0 1 0 16h-5z' } },
  ],
  or_gate: [
    { tag: 'path', attr: { d: 'M0 8h6M0 16h6M20 12h4' } },
    { tag: 'path', attr: { d: 'M5 4q4 8 0 16q10-1 15-8q-5-7-15-8z' } },
  ],
  not_gate: [
    { tag: 'path', attr: { d: 'M0 12h6M22 12h2' } },
    { tag: 'path', attr: { d: 'M6 4v16l13-8z' } },
    { tag: 'circle', attr: { cx: '20.5', cy: '12', r: '1.8' } },
  ],
  buffer_gate: [
    { tag: 'path', attr: { d: 'M0 12h6M20 12h4' } },
    { tag: 'path', attr: { d: 'M6 4v16l14-8z' } },
  ],
  nand_gate: [
    { tag: 'path', attr: { d: 'M0 8h6M0 16h6M22.6 12h1.4' } },
    { tag: 'path', attr: { d: 'M6 4h5a8 8 0 0 1 0 16h-5z' } },
    { tag: 'circle', attr: { cx: '20.8', cy: '12', r: '1.8' } },
  ],
  nor_gate: [
    { tag: 'path', attr: { d: 'M0 8h6M0 16h6M22 12h2' } },
    { tag: 'path', attr: { d: 'M5 4q4 8 0 15q10-1 14-7q-4-6-14-8z' } },
    { tag: 'circle', attr: { cx: '20.5', cy: '12', r: '1.8' } },
  ],
  xor_gate: [
    { tag: 'path', attr: { d: 'M0 8h6M0 16h6M21 12h3' } },
    { tag: 'path', attr: { d: 'M6 4q4 8 0 16q10-1 15-8q-5-7-15-8z' } },
    { tag: 'path', attr: { d: 'M3 4q4 8 0 16', fill: 'none' } },
  ],
  xnor_gate: [
    { tag: 'path', attr: { d: 'M0 8h6M0 16h6M23 12h1' } },
    { tag: 'path', attr: { d: 'M6 4q4 8 0 15q10-1 14-7q-4-6-14-8z' } },
    { tag: 'path', attr: { d: 'M3 4q4 8 0 15', fill: 'none' } },
    { tag: 'circle', attr: { cx: '21.5', cy: '12', r: '1.8' } },
  ],
};
