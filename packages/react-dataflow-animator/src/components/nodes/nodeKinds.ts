import type { NodeType } from '../../types';

/**
 * Familles de nœuds par apparence — prédicats partagés par le rendu (`NodeView`,
 * `StaticNode`) et la galerie de la doc. Module sans composant : éviter de mêler
 * helpers et composants dans un même fichier (règle `react-refresh`).
 *
 * Source de vérité unique : ajouter un nouveau nœud « façon `simple_node` » à
 * {@link PANEL_NODE_TYPES} suffit à le faire rendre comme panneau partout et à
 * lui donner la classe `rdfa-node--panel`. De même, ajouter une forme à
 * {@link SHAPE_TYPES} la fait rendre par `ShapeNode` (classe `rdfa-node--shape`).
 */
const PANEL_NODE_TYPES = new Set<NodeType>(['simple_node', 'complex_node']);

export function isPanelNode(type: NodeType): boolean {
  return PANEL_NODE_TYPES.has(type);
}

/** Nœuds rendus comme une forme géométrique (qui peut contenir un court texte). */
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
