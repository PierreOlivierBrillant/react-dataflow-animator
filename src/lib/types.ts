import type { CSSProperties, ReactNode } from 'react';

/**
 * Types TypeScript de la spécification DataFlow.
 * Ils reflètent le JSON schema exposé dans `schema.ts` (utilisé par la page Doc API).
 */

export type Direction =
  | 'left-to-right'
  | 'right-to-left'
  | 'top-to-bottom'
  | 'bottom-to-top'
  | 'circular';

export type StaticObjectType =
  | 'desktop'
  | 'laptop'
  | 'client'
  | 'server'
  | 'database'
  | 'mobile'
  | 'user'
  | 'admin'
  | 'users'
  | 'arrow';

export type DynamicObjectType = 'http_packet' | 'sql_request' | 'sql_response';

export type LineStyle = 'full' | 'dotted' | 'dashed';

/** Modes de contenu pour `set_content` (action) et `content` (objet statique). */
export type ContentType = 'image' | 'text' | 'code';

export interface ObjectContent {
  content_type?: ContentType;
  content?: string;
  /** Langage pour la coloration syntaxique (ex: javascript, json, sql). */
  language?: string;
}

export interface StaticObject {
  /** Identifiant unique de l'objet (ex: 'serveur_web'). */
  id: string;
  object_type: StaticObjectType;
  /** Label affiché en dessous de l'objet. */
  text?: string;
  /** (arrow) ID de l'objet source. */
  from?: string;
  /** (arrow) ID de l'objet destination. */
  to?: string;
  /** (arrow) Style de la ligne. */
  style?: LineStyle;
  /** Nom de l'icône de la technologie (ex: 'react', 'postgres', 'dotnet'). */
  subicon?: string;
  /** Rangée/colonne de placement (entier positif). Défaut: 1. */
  lane?: number;
  /** (circular) Marque l'objet comme nœud central. Défaut: false. */
  is_main?: boolean;
  /** URL rendant le nœud cliquable (ouvre dans un nouvel onglet). */
  url?: string;
  /** Contenu initial affiché dans le nœud (terminal de code, fenêtre, etc.). */
  content?: ObjectContent;
}

export interface PacketBody {
  content_type?: 'text' | 'image';
  /** Texte ou chemin d'image. */
  content?: string;
}

export interface PacketContent {
  /** En-tête visible dans le paquet (ex: 'GET /api'). */
  header?: string;
  body?: PacketBody;
}

export interface SqlResponse {
  /** Nombre de lignes retournées. */
  rows?: number;
  /** Les données retournées. */
  data?: unknown;
}

export interface DynamicObject {
  /** Identifiant unique du paquet. */
  id: string;
  object_type: DynamicObjectType;
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
  | 'comment';

export interface Action {
  /** ID de l'action pour s'y référer (wait_for / keep_until). */
  id?: string;
  action_type: ActionType;
  /** (move/loading/set_content) ID de l'objet concerné. */
  object?: string;
  /** (move/arrow) ID de l'objet statique de départ. */
  from?: string;
  /** (move/arrow) ID de l'objet statique d'arrivée. */
  to?: string;
  /** Durée de l'animation en millisecondes. Défaut: 500. */
  duration?: number;
  /** (arrow/comment) Texte à afficher. */
  text?: string;
  /** (arrow) Style de la ligne. */
  style?: LineStyle;
  /** (comment) ID de l'objet statique près duquel afficher le commentaire. */
  next_to?: string;
  /** (set_content) Contenu à injecter dans le nœud. */
  content?: ObjectContent;
  /** ID d'une autre action : démarre à la fin de celle-ci. */
  wait_for?: string;
  /** ID d'une action future : reste visible jusqu'à son démarrage. */
  keep_until?: string;
  /** Reste visible jusqu'à l'étape racine suivante. */
  keep_until_next?: boolean;
  /** (parallel) Actions à exécuter simultanément. */
  actions?: Action[];
}

export interface DataFlowSpec {
  /** Affiche les contrôles de navigation du lecteur. Défaut: false. */
  is_navigable?: boolean;
  /** Direction de placement automatique des objets statiques. Défaut: 'left-to-right'. */
  direction?: Direction;
  static_objects: StaticObject[];
  dynamic_objects: DynamicObject[];
  actions: Action[];
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
  /**
   * Force l'affichage des contrôles. Si non défini, suit `spec.is_navigable`.
   */
  controls?: boolean;
  /** Thème visuel. Défaut: 'auto'. */
  theme?: 'light' | 'dark' | 'auto';
  /** Affiche l'overlay de debug de la timeline. Défaut: false. */
  debug?: boolean;
  /** Vitesse de lecture (1 = normal). Défaut: 1. */
  speed?: number;
  /** Coloration syntaxique personnalisée (remplace Prism). */
  highlight?: Highlighter;
  /** Contenu rendu pendant le SSR / avant hydratation (placeholder). */
  fallback?: ReactNode;
}
