import type { ReactNode } from 'react';
import type { NodeType } from '../../types';

/**
 * Node icons registry (by `type`). Inline SVG, using `currentColor`
 * (color follows the theme). Extensible via `registerNodeIcon`.
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
};

const fallback = svg(<rect x="4" y="4" width="16" height="16" rx="2" />);

/** Registers/overwrites the icon for a node type (extensibility). */
export function registerNodeIcon(type: string, node: ReactNode): void {
  (icons as Record<string, ReactNode>)[type] = node;
}

export function getNodeIcon(type: NodeType): ReactNode {
  return icons[type] ?? fallback;
}
