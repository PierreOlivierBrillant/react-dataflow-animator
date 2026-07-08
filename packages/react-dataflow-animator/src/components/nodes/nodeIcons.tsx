import type { ReactNode } from 'react';
import type { NodeType } from '../../types';

/**
 * Node icons registry (by `type`). Inline SVG, using `currentColor`
 * (color follows the theme). Extensible via `registerNodeIcon`.
 *
 * Electrical component symbols are drawn in the same 0..24 box with their leads
 * reaching the box EDGES (x = 0 / x = 24 at y = 12 for a two-terminal part), so
 * the named terminals from `engine/pins.ts` (`a` at x = 0, `b` at x = 1…) land
 * flush on the visible leads. Stateful contacts (`switch`, `push_button`) are
 * drawn from a `closed` fraction so the `toggle` action can animate the lever.
 */

const svg = (children: ReactNode): ReactNode => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    role="presentation"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const icons: Partial<Record<NodeType, ReactNode>> = {
  desktop: svg(
    <>
      <rect x="2.5" y="4" width="19" height="12" rx="1.5" />
      <path d="M9 20h6M12 16v4" />
    </>
  ),
  laptop: svg(
    <>
      <rect x="4" y="5" width="16" height="10" rx="1.2" />
      <path d="M3 18l1.5-2h15L21 18z" />
    </>
  ),
  client: svg(
    <>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M3 8h18" />
      <path d="M6 6h.01M8.5 6h.01M11 6h.01" />
    </>
  ),
  server: svg(
    <>
      <rect x="3.5" y="3.5" width="17" height="7" rx="1.2" />
      <rect x="3.5" y="13" width="17" height="7" rx="1.2" />
      <path d="M7 7h.01M7 16.5h.01" />
    </>
  ),
  database: svg(
    <>
      <path d="M4 6c0-1.66 3.58-3 8-3s8 1.34 8 3v12c0 1.66-3.58 3-8 3s-8-1.34-8-3z" />
      <path d="M4 6c0 1.66 3.58 3 8 3s8-1.34 8-3" />
      <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
    </>
  ),
  mobile: svg(
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2" />
      <path d="M11 18.5h2" />
    </>
  ),
  user: svg(
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    </>
  ),
  admin: svg(
    <>
      <circle cx="10" cy="8" r="3" />
      <path d="M3.5 20c0-3.2 2.7-5.5 6.5-5.5" />
      <path d="M17 13l3 1v2.5c0 2-1.5 3.2-3 3.8-1.5-.6-3-1.8-3-3.8V14z" />
    </>
  ),
  users: svg(
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c0-3 2.6-5 6-5s6 2 6 5" />
      <path d="M16 6.7a3 3 0 0 1 0 5.6" />
      <path d="M17 14.2c2.3.5 4 2.3 4 4.8" />
    </>
  ),
  cloud: svg(<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />),
  alice: svg(
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      {/* bun */}
      <circle cx="12" cy="4" r="1.5" />
      <path d="M5 21c0-3.5 3-6 7-6s7 2.5 7 6" />
    </>
  ),
  bob: svg(
    <>
      <circle cx="12" cy="9" r="3.5" />
      {/* cap */}
      <path d="M9 7c0-2 1.3-3.5 3-3.5s3 1.5 3 3.5h-6z" />
      <path d="M7.5 7h9" />
      <path d="M5 21c0-3.5 3-6 7-6s7 2.5 7 6" />
    </>
  ),
  eve: svg(
    <>
      <circle cx="12" cy="8.5" r="3" />
      {/* headphones — visually reminds of the spy */}
      <path d="M9 8.5a3 3 0 0 1 6 0" />
      <rect x="7.5" y="8" width="2" height="3" rx="1" />
      <rect x="14.5" y="8" width="2" height="3" rx="1" />
      <path d="M5 21c0-3.5 3-5.5 7-5.5s7 2 7 5.5" />
    </>
  ),

  // ─── Electrical components ─────────────────────────────────────────────────
  resistor: svg(
    <>
      <path d="M0 12h5M19 12h5" />
      <rect x="5" y="8" width="14" height="8" />
    </>
  ),
  potentiometer: svg(
    <>
      <path d="M0 12h5M19 12h5" />
      <rect x="5" y="8" width="14" height="8" />
      <path d="M12 0v4" />
      <path d="M9 7l3 3 3-3" />
    </>
  ),
  capacitor: svg(
    <>
      <path d="M0 12h10M14 12h10" />
      <path d="M10 6v12M14 6v12" />
    </>
  ),
  polarized_capacitor: svg(
    <>
      <path d="M0 12h10M15 12h9" />
      <path d="M10 6v12" />
      <path d="M18 6a9 9 0 0 0 0 12" />
      <path d="M5 5h3M6.5 3.5v3" />
    </>
  ),
  inductor: svg(
    <>
      <path d="M0 12h3q2-6 4 0t4 0t4 0t4 0h3" />
    </>
  ),
  fuse: svg(
    <>
      <path d="M0 12h4M20 12h4" />
      <rect x="4" y="8" width="16" height="8" rx="4" />
      <path d="M6 12h12" />
    </>
  ),
  battery: svg(
    <>
      <path d="M0 12h9M15 12h9" />
      <path d="M9 9v6" />
      <path d="M15 6v12" />
      <path d="M18 4.5h3M19.5 3v3" />
    </>
  ),
  dc_source: svg(
    <>
      <path d="M0 12h4M20 12h4" />
      <circle cx="12" cy="12" r="8" />
      <path d="M7.5 10h3M9 8.5v3" />
      <path d="M13.5 15h3" />
    </>
  ),
  ac_source: svg(
    <>
      <path d="M0 12h4M20 12h4" />
      <circle cx="12" cy="12" r="8" />
      <path d="M8 12q2-4 4 0t4 0" />
    </>
  ),
  current_source: svg(
    <>
      <path d="M0 12h4M20 12h4" />
      <circle cx="12" cy="12" r="8" />
      <path d="M12 17V7M9 10l3-3 3 3" />
    </>
  ),
  diode: svg(
    <>
      <path d="M0 12h7M17 12h7" />
      <path d="M7 7v10l10-5z" />
      <path d="M17 7v10" />
    </>
  ),
  led: svg(
    <>
      <path d="M0 12h6M18 12h6" />
      {/* diode: flat anode (left) → apex + cathode bar (right) */}
      <path d="M6 6v12l12-6z" />
      <path d="M18 6v12" />
      {/* two parallel "emitted light" arrows, up-right, clear of the cathode */}
      <path d="M9 5l3-3M12 2h-2.2M12 2v2.2" />
      <path d="M12.5 7.5l3-3M15.5 4.5h-2.2M15.5 4.5v2.2" />
    </>
  ),
  transistor_npn: svg(
    <>
      <path d="M0 12h7" />
      <path d="M7 6v12" />
      <path d="M7 9l10-6M17 3V0" />
      <path d="M7 15l10 6M17 21v3" />
      <path d="M11.5 15.7l3.5 2.1-3.9 1" />
    </>
  ),
  transistor_pnp: svg(
    <>
      <path d="M0 12h7" />
      <path d="M7 6v12" />
      <path d="M7 9l10-6M17 3V0" />
      <path d="M7 15l10 6M17 21v3" />
      <path d="M10.4 15.1l-3.4 1.9 3.9 1" />
    </>
  ),
  opamp: svg(
    <>
      <path d="M0 7h6M0 17h6M20 12h4" />
      <path d="M6 2v20l14-10z" />
      <path d="M2.5 17h3M4 15.5v3" />
      <path d="M2.5 7h3" />
    </>
  ),
  lamp: svg(
    <>
      <path d="M0 12h4M20 12h4" />
      <circle cx="12" cy="12" r="8" />
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </>
  ),
  motor: svg(
    <>
      <path d="M0 12h4M20 12h4" />
      <circle cx="12" cy="12" r="8" />
      <path d="M8 15V9l4 4 4-4v6" />
    </>
  ),
  buzzer: svg(
    <>
      <path d="M0 12h4M20 12h4" />
      <path d="M8 5v14h3a7 7 0 0 0 0-14z" />
    </>
  ),
  ground: svg(
    <>
      <path d="M12 0v10" />
      <path d="M5 10h14M8 14h8M10.5 18h3" />
    </>
  ),
  junction: svg(<circle cx="12" cy="12" r="3.2" fill="currentColor" />),
  ammeter: svg(
    <>
      <path d="M0 12h4M20 12h4" />
      <circle cx="12" cy="12" r="8" />
      <path d="M9 16l3-8 3 8M10.2 13h3.6" />
    </>
  ),
  voltmeter: svg(
    <>
      <path d="M0 12h4M20 12h4" />
      <circle cx="12" cy="12" r="8" />
      <path d="M9 8l3 8 3-8" />
    </>
  ),
  antenna: svg(
    <>
      <path d="M12 24V10" />
      <path d="M12 10L6.5 2M12 10l5.5-8" />
    </>
  ),
  transformer: svg(
    <>
      <path d="M0 5h5M0 19h5M19 5h5M19 19h5" />
      <path d="M5 5q-4 2.3 0 4.6t0 4.6t0 4.6" />
      <path d="M19 5q4 2.3 0 4.6t0 4.6t0 4.6" />
      <path d="M11 5v14M13 5v14" />
    </>
  ),

  // ─── Digital logic gates ─────────────────────────────────────────────────
  and_gate: svg(
    <>
      <path d="M0 8h6M0 16h6M19 12h5" />
      <path d="M6 4h5a8 8 0 0 1 0 16h-5z" />
    </>
  ),
  or_gate: svg(
    <>
      <path d="M0 8h6M0 16h6M20 12h4" />
      <path d="M5 4q4 8 0 16q10-1 15-8q-5-7-15-8z" />
    </>
  ),
  not_gate: svg(
    <>
      <path d="M0 12h6M22 12h2" />
      <path d="M6 4v16l13-8z" />
      <circle cx="20.5" cy="12" r="1.8" />
    </>
  ),
  buffer_gate: svg(
    <>
      <path d="M0 12h6M20 12h4" />
      <path d="M6 4v16l14-8z" />
    </>
  ),
  nand_gate: svg(
    <>
      <path d="M0 8h6M0 16h6M22.6 12h1.4" />
      <path d="M6 4h5a8 8 0 0 1 0 16h-5z" />
      <circle cx="20.8" cy="12" r="1.8" />
    </>
  ),
  nor_gate: svg(
    <>
      <path d="M0 8h6M0 16h6M22 12h2" />
      <path d="M5 4q4 8 0 15q10-1 14-7q-4-6-14-8z" />
      <circle cx="20.5" cy="12" r="1.8" />
    </>
  ),
  xor_gate: svg(
    <>
      <path d="M0 8h6M0 16h6M21 12h3" />
      <path d="M6 4q4 8 0 16q10-1 15-8q-5-7-15-8z" />
      <path d="M3 4q4 8 0 16" />
    </>
  ),
  xnor_gate: svg(
    <>
      <path d="M0 8h6M0 16h6M23 12h1" />
      <path d="M6 4q4 8 0 15q10-1 14-7q-4-6-14-8z" />
      <path d="M3 4q4 8 0 15" />
      <circle cx="21.5" cy="12" r="1.8" />
    </>
  ),
};

/** SPST toggle switch, drawn from a `closed` fraction (0 = open, 1 = closed):
 *  the lever swings down onto the right contact as it closes. */
function switchIcon(closed: number): ReactNode {
  const ex = lerp(17.2, 18, closed);
  const ey = lerp(5, 12, closed);
  return svg(
    <>
      <path d="M0 12h6M18 12h6" />
      <circle cx="6" cy="12" r="1.4" fill="currentColor" />
      <circle cx="18" cy="12" r="1.4" fill="currentColor" />
      <path d={`M6 12L${ex.toFixed(2)} ${ey.toFixed(2)}`} />
    </>
  );
}

/** Momentary push button: a plunger bar that drops to bridge the two contacts
 *  as it closes. */
function pushButtonIcon(closed: number): ReactNode {
  const barY = lerp(8, 11.4, closed);
  return svg(
    <>
      <path d="M0 12h7M17 12h7" />
      <circle cx="7" cy="12" r="1.3" fill="currentColor" />
      <circle cx="17" cy="12" r="1.3" fill="currentColor" />
      <path d={`M6 ${barY.toFixed(2)}h12`} />
      <path d={`M12 ${barY.toFixed(2)}V3`} />
      <path d="M8 3h8" />
    </>
  );
}

const fallback = svg(<rect x="4" y="4" width="16" height="16" rx="2" />);

/** Registers/overwrites the icon for a node type (extensibility). */
export function registerNodeIcon(type: string, node: ReactNode): void {
  (icons as Record<string, ReactNode>)[type] = node;
}

/**
 * Icon for a node type. `state.closed` (0..1) drives the stateful contacts
 * (`switch`, `push_button`); it is ignored by every other type.
 */
export function getNodeIcon(
  type: NodeType,
  state?: { closed?: number }
): ReactNode {
  if (type === 'switch') return switchIcon(state?.closed ?? 0);
  if (type === 'push_button') return pushButtonIcon(state?.closed ?? 0);
  return icons[type] ?? fallback;
}
