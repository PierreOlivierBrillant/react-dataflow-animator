import { DataFlowSpec, LineStyle } from 'react-dataflow-animator';

/** Un même lien décliné dans chaque style de ligne. */
export const lineStyleExample: (style: LineStyle) => DataFlowSpec = (
  style
) => ({
  direction: 'left-to-right',
  nodes: [
    { id: 'a', type: 'server', text: 'A', lane: 1 },
    { id: 'b', type: 'server', text: 'B', lane: 2 },
  ],
  packets: [],
  connections: [{ from: 'a', to: 'b', style, text: style }],
  timeline: [],
});

/** Les quatre valeurs de `arrow_head` sur des liens parallèles. */
export const arrowHeadExample: DataFlowSpec = {
  direction: 'top-to-bottom',
  nodes: [
    { id: 'src', type: 'client', text: 'Source', lane: 1 },
    { id: 'fwd', type: 'server', text: 'forward', lane: 2 },
    { id: 'back', type: 'server', text: 'backward', lane: 2 },
    { id: 'both', type: 'server', text: 'both', lane: 2 },
    { id: 'none', type: 'server', text: 'none', lane: 2 },
  ],
  packets: [],
  connections: [
    { from: 'src', to: 'fwd', arrow_head: 'forward' },
    { from: 'src', to: 'back', arrow_head: 'backward' },
    { from: 'src', to: 'both', arrow_head: 'both' },
    { from: 'src', to: 'none', arrow_head: 'none' },
  ],
  timeline: [],
};

/** Deux zones colorées et labellisées (frontend / backend). */
export const zonesExample: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [
    {
      id: 'browser',
      type: 'laptop',
      text: 'Navigateur',
      icon: 'chrome',
      lane: 1,
    },
    { id: 'api', type: 'server', text: 'API', icon: 'node', lane: 2 },
    { id: 'db', type: 'database', text: 'DB', icon: 'postgres', lane: 3 },
  ],
  packets: [],
  connections: [
    { from: 'browser', to: 'api', style: 'dashed' },
    { from: 'api', to: 'db', style: 'dashed' },
  ],
  zones: [
    { contains: ['browser'], label: 'Client', color: '#3b82f6' },
    { contains: ['api', 'db'], label: 'Infrastructure', color: '#22c55e' },
  ],
  timeline: [],
};

/** Zone imbriquée : une zone qui contient une autre zone (par `id`). */
export const nestedZonesExample: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [
    { id: 'gw', type: 'server', text: 'Gateway', icon: 'nginx', lane: 1 },
    { id: 'svc', type: 'server', text: 'Service', icon: 'dotnet', lane: 2 },
    { id: 'data', type: 'database', text: 'DB', icon: 'mssql', lane: 3 },
  ],
  packets: [],
  zones: [
    {
      id: 'core',
      contains: ['svc', 'data'],
      label: 'Coeur métier',
      color: '#a855f7',
    },
    // Une zone qui englobe la gateway ET la zone `core`.
    { contains: ['gw', 'core'], label: 'Cluster', color: '#64748b' },
  ],
  timeline: [],
};
