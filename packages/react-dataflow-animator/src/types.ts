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

/**
 * Types de nœuds (apparence). Les flèches de décor vivent dans `connections`.
 *
 * Trois familles :
 * - **Pictogrammes** (`desktop` … `cloud`) : une icône SVG fixe.
 * - **Nœuds textuels** (`simple_node`, `complex_node`) : une boîte de texte
 *   (corps seul, ou en-tête + corps à la manière d'un paquet HTTP).
 * - **Formes géométriques** (`square` … `star`) : une forme dessinée qui peut
 *   contenir un court texte centré (champ `body`).
 */
export type NodeType =
  | 'desktop'
  | 'laptop'
  | 'client'
  | 'server'
  | 'database'
  | 'mobile'
  | 'user'
  | 'admin'
  | 'users'
  | 'cloud'
  | 'alice'
  | 'bob'
  | 'eve'
  | 'simple_node'
  | 'complex_node'
  | 'square'
  | 'diamond'
  | 'circle'
  | 'triangle'
  | 'parallelogram'
  | 'height_rectangle'
  | 'width_rectangle'
  | 'star';

export type PacketKind = 'http_packet' | 'sql_request' | 'sql_response';

/** Style de ligne (terminologie SVG/CSS). `full` est accepté en alias de `solid`. */
export type LineStyle = 'solid' | 'dotted' | 'dashed' | 'animated';

/** Modes de contenu pour `set_content` (action) et `content` (objet statique). */
export type ContentType = 'image' | 'text' | 'code' | 'table';

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
  /**
   * Mode d'affichage du contenu : `code` (terminal coloré), `text` (fenêtre type
   * navigateur), `image` (illustration) ou `table` (tableau de données).
   */
  type?: ContentType;
  /**
   * Contenu textuel selon `type` : code source (`code`), texte (`text`) ou
   * chemin/URL d'image (`image`).
   * @example "SELECT * FROM users;"
   */
  value?: string;
  /** Langage pour la coloration syntaxique. Valeurs reconnues : voir {@link HighlightLanguage}. */
  language?: HighlightLanguage | (string & {});
  /**
   * (mode `text`) URL affichée dans la barre d'adresse de la fenêtre.
   * @example "https://app.example.com/login"
   */
  url?: string;
  /**
   * (mode `table`) En-têtes de colonnes.
   * @example ["id", "email"]
   */
  columns?: string[];
  /**
   * (mode `table`) Lignes de données.
   * @example [[1, "alice@corp.io"], [2, "bob@corp.io"]]
   */
  rows_data?: (string | number)[][];
}

export interface Node {
  /** Identifiant unique du nœud (ex: 'serveur_web'). */
  id: string;
  /**
   * Apparence du nœud : pictogramme (serveur, client…), nœud textuel (panneau)
   * ou forme géométrique. Voir les aperçus de chaque valeur ci-contre.
   */
  type: NodeType;
  /**
   * Label affiché en dessous du nœud.
   * @example "Serveur web"
   */
  text?: string;
  /**
   * Visibilité initiale du nœud. Défaut: true.
   * Un nœud caché peut être affiché via l'action `set_visible`.
   */
  visible?: boolean;
  /**
   * Badge superposé : nom d'une techno connue (ex: 'react', 'postgres'),
   * nom d'une icône enregistrée, ou texte libre court (ex: 'v2', 'API').
   * @example "react"
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
  /**
   * URL rendant le nœud cliquable (ouvre dans un nouvel onglet).
   * @example "https://status.example.com"
   */
  url?: string;
  /**
   * Couleur de fond du nœud : remplissage des formes, fond des panneaux
   * (`simple_node`/`complex_node`), pastille derrière un pictogramme. Accepte une
   * couleur CSS **prédéfinie** (nom : `tomato`, `steelblue`, `teal`…) ou une valeur
   * **hexadécimale exacte** (`#3b82f6`). Sans effet sur un `set_content` actif.
   * @example "#3b82f6"
   */
  background_color?: string;
  /**
   * Couleur de la bordure / du trait du nœud (stroke des formes, bordure des
   * panneaux, couleur des traits d'un pictogramme). Même format que
   * `background_color`. Si `background_color` est défini mais pas `border_color`,
   * une bordure coordonnée (variante plus sombre du fond) est générée automatiquement.
   * @example "steelblue"
   */
  border_color?: string;
  /**
   * Couleur du texte affiché DANS le nœud (corps d'une forme, en-tête/corps d'un
   * panneau), **uniquement quand la coloration syntaxique est désactivée** (pas de
   * `language` : sinon les couleurs de la syntaxe priment). Même format que
   * `background_color` (nom prédéfini ou hex). Si elle n'est pas définie mais qu'un
   * `background_color` l'est, une couleur à très fort contraste avec le fond
   * (noir ou blanc) est choisie automatiquement.
   */
  text_color?: string;
  /** Contenu initial affiché dans le nœud (terminal de code, fenêtre, etc.). */
  content?: ObjectContent;
  /**
   * Texte affiché DANS le nœud, par opposition à `text` qui reste le label sous
   * le nœud. Pour `simple_node` / `complex_node` : corps du panneau (retours à
   * la ligne respectés, coloré selon `language` si fourni). Pour les formes
   * géométriques (`square` … `star`) : court texte centré dans la forme (gardez-le
   * bref pour qu'il ne déborde pas).
   * @example "Worker"
   */
  body?: string;
  /**
   * (`complex_node`) En-tête affiché au-dessus du `body`, séparé par un trait —
   * le nœud prend alors l'allure d'un paquet HTTP. Ignoré par `simple_node`.
   * Coloré selon `language` si fourni.
   * @example "POST /login"
   */
  header?: string;
  /**
   * (`simple_node` / `complex_node`) Langage de coloration syntaxique appliqué
   * à TOUTES les zones de texte du nœud (`header` et `body`). Valeurs reconnues :
   * voir {@link HighlightLanguage}.
   */
  language?: HighlightLanguage | (string & {});
}

/** Région rectangulaire englobant un groupe de nœuds et/ou d'autres zones. */
export interface Zone {
  /** Identifiant optionnel (requis pour être référencé dans le `contains` d'une autre zone). */
  id?: string;
  /** IDs des nœuds et/ou des zones englobés. */
  contains: string[];
  /** Couleur CSS de la bordure et du fond semi-transparent. */
  color?: string;
  /** Label affiché en haut à gauche de la zone. */
  label?: string;
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
  /**
   * Texte médian optionnel.
   * @example "HTTPS"
   */
  text?: string;
}

export interface PacketBody {
  type?: 'text' | 'image';
  /**
   * Texte ou chemin d'image.
   * @example "{ \"token\": \"abc123\" }"
   */
  value?: string;
  /** Langage pour la coloration syntaxique du texte (optionnel). Valeurs reconnues : voir {@link HighlightLanguage}. */
  language?: HighlightLanguage | (string & {});
}

export interface PacketContent {
  /**
   * En-tête visible dans le paquet (ex: 'GET /api').
   * @example "GET /api/users"
   */
  header?: string;
  body?: PacketBody;
}

export interface SqlResponseBody {
  type?: 'text' | 'table';
  /** Texte pur si type est 'text' */
  value?: string;
  /**
   * Colonnes du tableau si type est 'table'
   * @example ["id", "name"]
   */
  columns?: string[];
  /**
   * Lignes de données si type est 'table'
   * @example [[1, "Alice"], [2, "Bob"]]
   */
  rows_data?: (string | number)[][];
}

export interface SqlResponse {
  /**
   * Nombre de lignes retournées.
   * @example 42
   */
  rows?: number;
  /** En-tête optionnel visible dans le paquet. */
  header?: string;
  /** Corps de la réponse (texte pur ou tableau). */
  body?: SqlResponseBody;
}

export interface Packet {
  /** Identifiant unique du paquet. */
  id: string;
  /**
   * Catégorie du paquet, qui fixe son apparence et le contenu attendu :
   * `http_packet` (en-tête + corps via `packet_content`), `sql_request` (requête
   * textuelle via `request_content`), `sql_response` (réponse via `response_content`).
   */
  kind: PacketKind;
  /**
   * Requête textuelle (ex: pour sql_request).
   * @example "SELECT * FROM users WHERE id = 42"
   */
  request_content?: string;
  /** Contenu d'un `sql_response` : nombre de lignes, en-tête et corps (texte ou tableau). */
  response_content?: SqlResponse;
  /** Contenu d'un `http_packet` : en-tête (ex. 'GET /api') et corps optionnel. */
  packet_content?: PacketContent;
}

export type ActionType =
  | 'move'
  | 'arrow'
  | 'parallel'
  | 'loading'
  | 'set_content'
  | 'comment'
  | 'highlight'
  | 'set_visible'
  | 'wait';

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
  /** ID d'une autre action : cette action démarre à la fin de celle-ci. */
  wait_for?: string;
  /** ID d'une action future : cette action reste visible jusqu'à son démarrage. */
  keep_until?: string;
  /**
   * Reste visible jusqu'au début de l'étape racine suivante.
   * Défaut: false pour `move`/`loading`, true pour `arrow`/`comment`/`set_content`.
   */
  keep_until_next?: boolean;
  /** Si vrai, reste visible jusqu'à la fin de la chronologie. */
  keep_until_end?: boolean;
  /**
   * Décalage de départ en ms, ajouté après la résolution de `wait_for` et le
   * clamp de l'étape. Principalement utile dans un bloc `parallel` pour décaler
   * des actions les unes par rapport aux autres (animations en séquence décalée).
   * S'applique aussi à une action `parallel` entière pour retarder tout le groupe.
   * @minimum 0
   * @multipleOf 1
   */
  delay_ms?: number;
  /**
   * Durée du fondu d'apparition en ms. Défaut: période de maintien de départ
   * pour `move` (300 ms), 250 ms pour les autres actions. 0 = apparition instantanée.
   * @minimum 0
   * @multipleOf 1
   */
  fade_in_ms?: number;
  /**
   * Durée du fondu de disparition en ms. Défaut: 250. 0 = disparition instantanée.
   * Sans effet si `keep_until_end` est vrai.
   * @minimum 0
   * @multipleOf 1
   */
  fade_out_ms?: number;
}

/** Déplace un paquet de `from` vers `to`. */
interface MoveAction extends ActionBase {
  type: 'move';
  /** ID du paquet (déclaré dans `packets`) à déplacer. */
  object: string;
  /** ID du nœud de départ. */
  from: string;
  /** ID du nœud d'arrivée. */
  to: string;
}

/** Trace une flèche animée entre deux nœuds. */
interface ArrowAction extends ActionBase {
  type: 'arrow';
  /** ID du nœud de départ de la flèche. */
  from: string;
  /** ID du nœud d'arrivée de la flèche. */
  to: string;
  /** Libellé affiché au milieu de la flèche. */
  text?: string;
  /** Style de ligne : plein, pointillé, tirets ou animé. Défaut: 'solid'. */
  style?: LineStyle;
  /** Côté(s) où dessiner la pointe de la flèche. Défaut: 'forward'. */
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

/** Affiche une bulle de commentaire près d'un nœud, ou en haut du stage si `object` est omis. */
interface CommentAction extends ActionBase {
  type: 'comment';
  /** ID du nœud près duquel afficher le commentaire. Omis = commentaire omniscient (haut du stage). */
  object?: string;
  /** @example "Le serveur valide le token" */
  text: string;
}

/** Surligne un nœud statique ou une connexion (par ID). */
interface HighlightAction extends ActionBase {
  type: 'highlight';
  /** ID d'un nœud statique OU d'une connexion à surligner. */
  object: string;
}

/** Affiche ou cache un nœud statique avec un fondu. */
interface SetVisibleAction extends ActionBase {
  type: 'set_visible';
  /** ID du nœud à afficher ou cacher. */
  object: string;
  /** true = afficher, false = cacher. */
  visible: boolean;
}

/**
 * Temps mort : rien ne se passe pendant `duration` ms (défaut: 1000). Ne produit
 * aucun clip ; insère simplement une pause entre deux étapes (les éléments
 * maintenus via `keep_until_next` restent affichés pendant l'attente).
 */
interface WaitAction extends ActionBase {
  type: 'wait';
}

/** Union discriminée des actions (par `type`). */
export type Action =
  | MoveAction
  | ArrowAction
  | ParallelAction
  | LoadingAction
  | SetContentAction
  | CommentAction
  | HighlightAction
  | SetVisibleAction
  | WaitAction;

export interface DataFlowSpec {
  /**
   * Sens de placement automatique des nœuds (aucune coordonnée à fournir).
   * Défaut: 'left-to-right'.
   */
  direction?: Direction;
  /**
   * Éléments fixes de la scène (serveurs, clients, bases…). Ils forment le décor
   * permanent et sont placés automatiquement selon `direction` et leur `lane`.
   */
  nodes: Node[];
  /**
   * Éléments mobiles (requêtes, réponses, messages). Déclarés ici, puis déplacés
   * d'un nœud à l'autre par une action `move` de la `timeline`.
   */
  packets: Packet[];
  /** Flèches/liens permanents (décor) affichés dès l'initialisation. */
  connections?: Connection[];
  /** Régions rectangulaires affichées en arrière-plan autour d'un groupe de nœuds. */
  zones?: Zone[];
  /**
   * Scénario animé : liste ordonnée d'actions (déplacements, flèches, commentaires…)
   * jouées séquentiellement. Chaque action racine devient une étape navigable.
   */
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
  /**
   * Ajoute un bouton dans la barre de contrôles qui ouvre la spécification JSON
   * (colorée) dans une fenêtre, avec copie dans le presse-papier et
   * téléchargement en fichier `.json`. Sans effet si `controls` est false.
   * Défaut: false.
   */
  exportable?: boolean;
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
