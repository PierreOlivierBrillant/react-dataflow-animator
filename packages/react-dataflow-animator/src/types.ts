import type { CSSProperties, ReactNode } from 'react';

/**
 * Types TypeScript de la spécification DataFlow.
 * Le JSON Schema (`schema.ts`, exposé par la page Doc API) est GÉNÉRÉ depuis ces types
 * via `ts-json-schema-generator` (script `generate:schema`). Ne pas éditer le schéma
 * manuellement — modifier ici puis régénérer.
 */

export type Direction =
  | 'left-to-right'
  | 'right-to-left'
  | 'top-to-bottom'
  | 'bottom-to-top'
  | 'circular';

/** Types de nœuds (apparence). Les flèches de décor vivent dans `connections`. */
export type NodeType =
  | 'desktop'
  | 'laptop'
  | 'client'
  | 'server'
  | 'database'
  | 'mobile'
  | 'user'
  | 'admin'
  | 'users';

export type PacketKind = 'http_packet' | 'sql_request' | 'sql_response';

/** Style de ligne (terminologie SVG/CSS). `full` est accepté en alias de `solid`. */
export type LineStyle = 'solid' | 'dotted' | 'dashed' | 'animated';

/** Modes de contenu pour `set_content` (action) et `content` (objet statique). */
export type ContentType = 'image' | 'text' | 'code';

/** Langages supportés par le moteur de coloration syntaxique (Prism). */
export type HighlightLanguage =
  | 'javascript'
  | 'js'
  | 'typescript'
  | 'ts'
  | 'json'
  | 'sql'
  | 'bash'
  | 'sh'
  | 'shell'
  | 'python'
  | 'py'
  | 'csharp'
  | 'cs'
  | 'html'
  | 'xml'
  | 'markup'
  | 'css'
  | 'jsx'
  | 'tsx'
  | 'http';

export interface ObjectContent {
  type?: ContentType;
  value?: string;
  /** Langage pour la coloration syntaxique. Valeurs reconnues : voir {@link HighlightLanguage}. */
  language?: HighlightLanguage | (string & {});
  /** (mode `text`) URL affichée dans la barre d'adresse de la fenêtre. */
  url?: string;
}

export interface Node {
  /** Identifiant unique du nœud (ex: 'serveur_web'). */
  id: string;
  type: NodeType;
  /** Label affiché en dessous du nœud. */
  text?: string;
  /**
   * Badge superposé : nom d'une techno connue (ex: 'react', 'postgres'),
   * nom d'une icône enregistrée, ou texte libre court (ex: 'v2', 'API').
   */
  icon?: string;
  /** Rangée/colonne de placement (entier positif). Défaut: 1. */
  lane?: number;
  /** (circular) Marque le nœud comme nœud central. Défaut: false. */
  main?: boolean;
  /**
   * Aligne ce nœud sur l'axe transverse d'un autre nœud (par ID) : utile pour
   * aligner deux nœuds de lanes différentes. Ignoré en disposition circular.
   */
  align_with?: string;
  /** URL rendant le nœud cliquable (ouvre dans un nouvel onglet). */
  url?: string;
  /** Contenu initial affiché dans le nœud (terminal de code, fenêtre, etc.). */
  content?: ObjectContent;
}

/** Lien/flèche permanent (décor), affiché dès l'initialisation. */
export interface Connection {
  /** Identifiant optionnel. */
  id?: string;
  /** ID du nœud source. */
  from: string;
  /** ID du nœud destination. */
  to: string;
  /** Style de la ligne. Défaut: 'solid'. */
  style?: LineStyle;
  /** Pointe de la flèche. Défaut: 'forward'. */
  arrow_head?: 'forward' | 'backward' | 'both' | 'none';
  /** Texte médian optionnel. */
  text?: string;
}

export interface PacketBody {
  type?: 'text' | 'image';
  /** Texte ou chemin d'image. */
  value?: string;
  /** Langage pour la coloration syntaxique du texte (optionnel). Valeurs reconnues : voir {@link HighlightLanguage}. */
  language?: HighlightLanguage | (string & {});
}

export interface PacketContent {
  /** En-tête visible dans le paquet (ex: 'GET /api'). */
  header?: string;
  body?: PacketBody;
}

export interface SqlResponseBody {
  type?: 'text' | 'table';
  /** Texte pur si type est 'text' */
  value?: string;
  /** Colonnes du tableau si type est 'table' */
  columns?: string[];
  /** Lignes de données si type est 'table' */
  rows_data?: (string | number)[][];
}

export interface SqlResponse {
  /** Nombre de lignes retournées. */
  rows?: number;
  /** En-tête optionnel visible dans le paquet. */
  header?: string;
  /** Corps de la réponse (texte pur ou tableau). */
  body?: SqlResponseBody;
}

export interface Packet {
  /** Identifiant unique du paquet. */
  id: string;
  kind: PacketKind;
  /** Requête textuelle (ex: pour sql_request). */
  request_content?: string;
  /** Réponse (pour sql_response). */
  response_content?: SqlResponse;
  packet_content?: PacketContent;
}

export type ActionType =
  | 'move'
  | 'arrow'
  | 'parallel'
  | 'loading'
  | 'set_content'
  | 'comment'
  | 'highlight';

/** Champs communs à toutes les actions (ordonnancement et cycle de vie). */
interface ActionBase {
  /** ID de l'action pour s'y référer (wait_for / keep_until). */
  id?: string;
  /**
   * Durée de l'animation en ms (défaut: 500, 1200 pour loading).
   * @minimum 1
   * @multipleOf 1
   */
  duration?: number;
  /** ID d'une autre action : démarre à la fin de celle-ci. */
  wait_for?: string;
  /** ID d'une action future : reste visible jusqu'à son démarrage. */
  keep_until?: string;
  /**
   * Reste visible jusqu'au début de l'étape racine suivante.
   * Défaut: false pour `move`/`loading`, true pour `arrow`/`comment`/`set_content`.
   */
  keep_until_next?: boolean;
  /** Si vrai, reste visible jusqu'à la fin de la chronologie. */
  keep_until_end?: boolean;
}

/** Déplace un paquet de `from` vers `to`. */
interface MoveAction extends ActionBase {
  type: 'move';
  /** ID du paquet à déplacer. */
  object: string;
  from: string;
  to: string;
}

/** Trace une flèche animée entre deux nœuds. */
interface ArrowAction extends ActionBase {
  type: 'arrow';
  from: string;
  to: string;
  text?: string;
  style?: LineStyle;
  arrow_head?: 'forward' | 'backward' | 'both' | 'none';
}

/** Exécute plusieurs actions au même instant. */
interface ParallelAction extends ActionBase {
  type: 'parallel';
  actions: Action[];
}

/** Affiche un spinner de chargement sur un nœud. */
interface LoadingAction extends ActionBase {
  type: 'loading';
  object: string;
}

/** Mute le contenu d'un nœud (code, texte, image). */
interface SetContentAction extends ActionBase {
  type: 'set_content';
  object: string;
  content: ObjectContent;
}

/** Affiche une bulle de commentaire près d'un nœud. */
interface CommentAction extends ActionBase {
  type: 'comment';
  /** ID du nœud près duquel afficher le commentaire. */
  object: string;
  text: string;
}

/** Surligne un nœud statique ou une connexion (par ID). */
interface HighlightAction extends ActionBase {
  type: 'highlight';
  /** ID d'un nœud statique OU d'une connexion à surligner. */
  object: string;
}

/** Union discriminée des actions (par `type`). */
export type Action =
  | MoveAction
  | ArrowAction
  | ParallelAction
  | LoadingAction
  | SetContentAction
  | CommentAction
  | HighlightAction;

export interface DataFlowSpec {
  /** Direction de placement automatique des nœuds. Défaut: 'left-to-right'. */
  direction?: Direction;
  nodes: Node[];
  packets: Packet[];
  /** Flèches/liens permanents (décor) affichés dès l'initialisation. */
  connections?: Connection[];
  timeline: Action[];
}

/** Fonction de coloration syntaxique : code source -> HTML. */
export type Highlighter = (code: string, language: string) => string;

export interface DataFlowPlayerProps {
  /** La spécification à animer. */
  spec: DataFlowSpec;
  /** Classe CSS additionnelle sur le conteneur racine. */
  className?: string;
  /** Styles inline sur le conteneur racine. */
  style?: CSSProperties;
  /** Hauteur de la scène (ex: 420, '60vh'). Défaut: 420. */
  height?: number | string;
  /** Démarre la lecture automatiquement. Défaut: false. */
  autoPlay?: boolean;
  /** Rejoue en boucle à la fin. Défaut: false. */
  loop?: boolean;
  /** Affiche les contrôles de navigation. Défaut: true. */
  controls?: boolean;
  /** Thème visuel. Défaut: 'auto'. */
  theme?: 'light' | 'dark' | 'auto';
  /**
   * Densité visuelle : ajuste la taille des éléments par rapport à l'espace
   * disponible. 'compact' = plus petit/aéré, 'spacious' = plus gros.
   * Défaut: 'comfortable'.
   */
  density?: 'compact' | 'comfortable' | 'spacious';
  /** Affiche l'overlay de debug de la timeline. Défaut: false. */
  debug?: boolean;
  /** Vitesse de lecture (1 = normal). Défaut: 1. */
  speed?: number;
  /** Coloration syntaxique personnalisée (remplace Prism). */
  highlight?: Highlighter;
  /** Contenu rendu pendant le SSR / avant hydratation (placeholder). */
  fallback?: ReactNode;
}

// ─── Aliases rétro-compatibles (supprimés en v2) ─────────────────────────────
/** @deprecated Utiliser {@link Node} à la place. */
export type StaticObject = Node;
/** @deprecated Utiliser {@link NodeType} à la place. */
export type StaticObjectType = NodeType;
/** @deprecated Utiliser {@link Packet} à la place. */
export type DynamicObject = Packet;
/** @deprecated Utiliser {@link PacketKind} à la place. */
export type DynamicObjectType = PacketKind;
