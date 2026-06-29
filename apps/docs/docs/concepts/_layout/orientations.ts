import { DataFlowSpec, Direction } from 'react-dataflow-animator';

export const orientationExample: (direction: Direction) => DataFlowSpec = (
  direction: Direction
) => ({
  direction: direction,
  nodes: [
    { id: 'a', type: 'server', text: 'A', lane: 1 },
    { id: 'b', type: 'server', text: 'B', lane: 2 },
    { id: 'c', type: 'server', text: 'C', lane: 3 },
  ],
  packets: [],
  connections: [
    { from: 'a', to: 'b', style: 'animated' },
    { from: 'b', to: 'c', style: 'animated' },
  ],
  timeline: [],
});

/**
 * Edge convergence (`merge_edges`): several clients pointing at one server.
 * `merge` toggles the server's `merge_edges` flag so the same spec renders
 * converged (default) or fanned out.
 */
export const mergeEdgesExample: (merge: boolean) => DataFlowSpec = (merge) => ({
  direction: 'left-to-right',
  nodes: [
    { id: 'c1', type: 'laptop', text: 'Client', lane: 1 },
    { id: 'c2', type: 'laptop', text: 'Client', lane: 1 },
    { id: 'c3', type: 'laptop', text: 'Client', lane: 1 },
    { id: 'c4', type: 'laptop', text: 'Client', lane: 1 },
    {
      id: 'srv',
      type: 'server',
      text: 'Server',
      icon: 'nginx',
      lane: 2,
      merge_edges: merge,
    },
  ],
  packets: [],
  connections: [
    { from: 'c1', to: 'srv', style: 'animated' },
    { from: 'c2', to: 'srv', style: 'animated' },
    { from: 'c3', to: 'srv', style: 'animated' },
    { from: 'c4', to: 'srv', style: 'animated' },
  ],
  timeline: [],
});

export const circularExample: DataFlowSpec = {
  direction: 'circular',
  nodes: [
    { id: 'a', type: 'server', text: 'A' },
    { id: 'b', type: 'server', text: 'B' },
    { id: 'c', type: 'server', text: 'C' },
    { id: 'd', type: 'server', text: 'D' },
    { id: 'e', type: 'server', text: 'E' },
    { id: 'main', type: 'server', text: 'Principal', main: true },
  ],
  packets: [],
  connections: [
    { from: 'a', to: 'main', style: 'animated' },
    { from: 'b', to: 'main', style: 'animated' },
    { from: 'c', to: 'main', style: 'animated' },
    { from: 'd', to: 'main', style: 'animated' },
    { from: 'e', to: 'main', style: 'animated' },
  ],
  timeline: [],
};

/** Exemple concret de la section « Mode circulaire » : un hub central. */
export const circularHubExample: DataFlowSpec = {
  direction: 'circular',
  nodes: [
    {
      id: 'gateway',
      type: 'server',
      text: 'Gateway',
      icon: 'nginx',
      main: true,
    },
    { id: 'auth', type: 'server', text: 'Auth', icon: 'dotnet' },
    { id: 'orders', type: 'server', text: 'Orders', icon: 'node' },
    { id: 'billing', type: 'server', text: 'Billing', icon: 'java' },
    { id: 'search', type: 'server', text: 'Search', icon: 'python' },
  ],
  packets: [],
  connections: [
    { from: 'auth', to: 'gateway', style: 'animated' },
    { from: 'orders', to: 'gateway', style: 'animated' },
    { from: 'billing', to: 'gateway', style: 'animated' },
    { from: 'search', to: 'gateway', style: 'animated' },
  ],
  timeline: [],
};
