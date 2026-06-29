import type { NodeType } from '../../types';

/**
 * Node families by appearance — predicates shared by rendering (`NodeView`,
 * `StaticNode`) and the doc gallery. Component-less module: avoids mixing
 * helpers and components in the same file (`react-refresh` rule).
 *
 * Single source of truth: adding a new `simple_node`-like node to
 * {@link PANEL_NODE_TYPES} is enough to render it as a panel everywhere and
 * give it the `rdfa-node--panel` class. Similarly, adding a shape to
 * {@link SHAPE_TYPES} renders it with `ShapeNode` (`rdfa-node--shape` class).
 */
const PANEL_NODE_TYPES = [
  'simple_node',
  'complex_node',
] as const satisfies readonly NodeType[];

const PANEL_TYPE_SET: ReadonlySet<string> = new Set(PANEL_NODE_TYPES);

/**
 * Accepts a `string` (not only {@link NodeType}) because the panel literals are
 * shared with `PacketKind`: a `simple_node` / `complex_node` packet reuses this
 * same predicate to render through `NodePanel`.
 */
export function isPanelNode(type: string): boolean {
  return PANEL_TYPE_SET.has(type);
}

/** Nodes rendered as a geometric shape (which can contain a short text). */
export const SHAPE_TYPES = [
  'square',
  'diamond',
  'circle',
  'triangle',
  'parallelogram',
  'height_rectangle',
  'width_rectangle',
  'star',
] as const satisfies readonly NodeType[];

export type ShapeType = (typeof SHAPE_TYPES)[number];

const SHAPE_TYPE_SET: ReadonlySet<NodeType> = new Set(SHAPE_TYPES);

export function isShapeType(type: NodeType): type is ShapeType {
  return SHAPE_TYPE_SET.has(type);
}
