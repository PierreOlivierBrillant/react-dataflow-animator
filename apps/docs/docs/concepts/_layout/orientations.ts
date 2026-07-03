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

/**
 * Tree mode: a binary tree laid out by in-order rank (horizontal) and depth
 * (vertical). The parent→child edges are drawn automatically from the `tree`
 * block — no `connections`. Keys (in `body`) are language-invariant.
 */
export const treeExample: DataFlowSpec = {
  direction: 'tree',
  tree: {
    root: '8',
    children: {
      '8': { left: '3', right: '13' },
      '3': { left: '1', right: '6' },
      '13': { right: '17' },
    },
  },
  nodes: [
    { id: '8', type: 'circle', body: '8' },
    { id: '3', type: 'circle', body: '3' },
    { id: '13', type: 'circle', body: '13' },
    { id: '1', type: 'circle', body: '1' },
    { id: '6', type: 'circle', body: '6' },
    { id: '17', type: 'circle', body: '17' },
  ],
  packets: [],
  timeline: [],
};

/**
 * Graph mode: an arbitrary weighted graph. Nodes carry NO coordinates — the
 * engine auto-places them to minimize edge crossings. Edges are ordinary
 * `connections` — undirected (`arrow_head: 'none'`), straight, and weighted
 * through `text`. Keys (`body`) and weights are language-invariant.
 */
export const graphExample: DataFlowSpec = {
  direction: 'graph',
  nodes: [
    { id: 'A', type: 'circle', body: 'A' },
    { id: 'B', type: 'circle', body: 'B' },
    { id: 'C', type: 'circle', body: 'C' },
    { id: 'D', type: 'circle', body: 'D' },
  ],
  packets: [],
  connections: [
    { from: 'A', to: 'B', text: '7', path: 'straight', arrow_head: 'none' },
    { from: 'A', to: 'C', text: '2', path: 'straight', arrow_head: 'none' },
    { from: 'B', to: 'C', text: '3', path: 'straight', arrow_head: 'none' },
    { from: 'B', to: 'D', text: '4', path: 'straight', arrow_head: 'none' },
    { from: 'C', to: 'D', text: '6', path: 'straight', arrow_head: 'none' },
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
