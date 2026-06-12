// Point d'entrée de la librairie publiée sur npm.
//
// N'oubliez pas d'importer la feuille de styles dans votre application :
//   import 'react-dataflow-animator/styles.css';

export { DataFlowPlayer } from './DataFlowPlayer';

// Types de la spécification et des props.
export type {
  DataFlowSpec,
  DataFlowPlayerProps,
  Node,
  Connection,
  Packet,
  Action,
  ActionType,
  ObjectContent,
  PacketContent,
  PacketBody,
  SqlResponse,
  Direction,
  NodeType,
  PacketKind,
  LineStyle,
  ContentType,
  Highlighter,
  HighlightLanguage,
  // Aliases rétro-compatibles (supprimés en v2)
  StaticObject,
  StaticObjectType,
  DynamicObject,
  DynamicObjectType,
} from './types';

// JSON Schema (pour la doc d'API / la validation).
export { dataFlowSchema } from './schema';
export type { DataFlowSchema } from './schema';

// Extensibilité : enregistrer ses propres icônes.
export { registerNodeIcon, getNodeIcon } from './components/nodes/nodeIcons';
export { registerSubIcon, getSubIcon } from './components/nodes/subIcons';

// Coloration syntaxique par défaut (réutilisable / remplaçable).
export { highlightCode, escapeHtml } from './highlight/highlight';

// Moteur (API avancée : compilation et évaluation de la timeline).
export { compile, collectBidirectional, shiftFor } from './engine/compiler';
export type { CompileResult } from './engine/compiler';
export {
  evaluate,
  stepIndexAt,
  nextStop,
  prevStop,
  EMPTY_TIMELINE,
} from './engine/timeline';
export type {
  Timeline,
  Clip,
  ClipKind,
  Step,
  ActiveClip,
  MoveClip,
  ArrowClip,
  LoadingClip,
  SetContentClip,
  CommentClip,
  HighlightClip,
} from './engine/timeline';
export { computeLayout } from './engine/layout';
export type { LayoutMap, NodePlacement } from './engine/layout';
export type { GeometryMap, NodeGeom } from './engine/geometry';
export { useClock } from './hooks/useClock';
export type { Clock } from './hooks/useClock';
