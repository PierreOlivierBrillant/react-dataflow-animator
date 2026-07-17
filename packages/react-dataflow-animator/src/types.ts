import type { CSSProperties, ReactNode } from 'react';
import type {
  DataFlowSpec,
  PlayerTheme,
  PlayerMode,
  Highlighter,
} from '@react-dataflow-animator/core/types';

// The framework-agnostic spec types now live in @react-dataflow-animator/core.
// Re-export them here so the package's public API (via ./index.ts) and every
// internal `./types` import keep resolving unchanged; only the React-facing
// props type, which depends on React, is defined in this package.
export type * from '@react-dataflow-animator/core/types';

export interface DataFlowPlayerProps {
  /** The specification to animate. */
  spec: DataFlowSpec;
  /** Additional CSS class on the root container. */
  className?: string;
  /** Inline styles on the root container. */
  style?: CSSProperties;
  /** Scene height (e.g., 420, '60vh'). Default: 420. */
  height?: number | string;
  /** Starts playback automatically. Default: false. */
  autoPlay?: boolean;
  /** Replays in a loop at the end. Default: false. */
  loop?: boolean;
  /** Displays navigation controls. Default: true. */
  controls?: boolean;
  /**
   * Adds a button in the controls bar that opens the JSON specification
   * (colored) in a window, with copy to clipboard and
   * download as a `.json` file. No effect if `controls` is false.
   * Default: false.
   */
  exportable?: boolean;
  /** Visual palette; each one has a light and a dark variant. Default: 'default'. */
  theme?: PlayerTheme;
  /**
   * Which variant of `theme` to display. `'auto'` follows the host site when an
   * ancestor carries `data-theme="light|dark"` (the Docusaurus convention), and
   * the OS preference otherwise. Default: 'auto'.
   */
  mode?: PlayerMode;
  /**
   * Visual density: adjusts the size of elements relative to the available
   * space. 'compact' = smaller/airier, 'spacious' = larger.
   * Default: 'comfortable'.
   */
  density?: 'compact' | 'comfortable' | 'spacious';
  /** Displays the timeline debug overlay. Default: false. */
  debug?: boolean;
  /** Playback speed (1 = normal). Default: 1. */
  speed?: number;
  /** Custom syntax highlighting (replaces Prism). */
  highlight?: Highlighter;
  /** Content rendered during SSR / before hydration (placeholder). */
  fallback?: ReactNode;
}
