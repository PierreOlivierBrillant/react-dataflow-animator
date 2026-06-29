import type { CSSProperties, ReactNode } from 'react';

/**
 * TypeScript types of the DataFlow specification.
 * The JSON Schema (`schema.ts`, exposed by the API Doc page) is GENERATED from these types
 * via `ts-json-schema-generator` (`generate:schema` script). Do not edit the schema
 * manually — modify here then regenerate.
 */

export type Direction =
  | 'left-to-right'
  | 'right-to-left'
  | 'top-to-bottom'
  | 'bottom-to-top'
  | 'circular';

/**
 * Node types (appearance). Decor arrows live in `connections`.
 *
 * Three families:
 * - **Pictograms** (`desktop` … `cloud`): a fixed SVG icon.
 * - **Text nodes** (`simple_node`, `complex_node`): a text box
 *   (body only, or header + body like an HTTP packet).
 * - **Geometric shapes** (`square` … `star`): a drawn shape that can
 *   contain short centered text (`body` field).
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

/** Line style (SVG/CSS terminology). `full` is accepted as an alias for `solid`. */
export type LineStyle = 'solid' | 'dotted' | 'dashed' | 'animated';

/**
 * Shape of the arrow / connection path — orthogonal to {@link LineStyle},
 * which only sets the stroke pattern (solid, dotted…). Default: 'bezier'.
 *
 * - `bezier`: smooth S curve, handles along the dominant axis (default);
 * - `simplebezier`: same idea, more subtle curvature;
 * - `straight`: direct segment (bypasses sandwiched labels);
 * - `step`: orthogonal path with right angles;
 * - `smoothstep`: orthogonal path with rounded angles.
 *
 * On two perfectly aligned nodes (same row/column), all shapes
 * merge into a straight line: curvature only appears in the presence of a
 * transverse offset (different lanes, fan-out, bidirectional tracks).
 */
export type PathShape =
  | 'bezier'
  | 'simplebezier'
  | 'straight'
  | 'step'
  | 'smoothstep';

/** Content modes for `set_content` (action) and `content` (static object). */
export type ContentType = 'image' | 'text' | 'code' | 'table';

/** Languages supported by the syntax highlighting engine (Prism). */
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
   * Content display mode: `code` (colored terminal), `text` (browser-like
   * window), `image` (illustration) or `table` (data table).
   */
  type?: ContentType;
  /**
   * Textual content according to `type`: source code (`code`), text (`text`) or
   * image path/URL (`image`).
   * @example "SELECT * FROM users;"
   */
  value?: string;
  /** Language for syntax highlighting. Recognized values: see {@link HighlightLanguage}. */
  language?: HighlightLanguage | (string & {});
  /**
   * (`text` mode) URL displayed in the window's address bar.
   * @example "https://app.example.com/login"
   */
  url?: string;
  /**
   * (`table` mode) Column headers.
   * @example ["id", "email"]
   */
  columns?: string[];
  /**
   * (`table` mode) Data rows.
   * @example [[1, "alice@corp.io"], [2, "bob@corp.io"]]
   */
  rows_data?: (string | number)[][];
}

export interface Node {
  /** Unique node identifier (e.g., 'web_server'). */
  id: string;
  /**
   * Node appearance: pictogram (server, client…), text node (panel)
   * or geometric shape. See previews of each value.
   */
  type: NodeType;
  /**
   * Label displayed below the node.
   * @example "Web server"
   */
  text?: string;
  /**
   * Initial visibility of the node. Default: true.
   * A hidden node can be displayed via the `set_visible` action.
   */
  visible?: boolean;
  /**
   * Overlaid badge: name of a known technology (e.g., 'react', 'postgres'),
   * name of a registered icon, or short free text (e.g., 'v2', 'API').
   * @example "react"
   */
  icon?: string;
  /** Placement row/column (positive integer). Default: 1. */
  lane?: number;
  /** (circular) Marks the node as a central node. Default: false. */
  main?: boolean;
  /**
   * Aligns this node on the transverse axis of another node (by ID): useful for
   * aligning two nodes from different lanes. Ignored in circular layout.
   */
  align_with?: string;
  /**
   * URL making the node clickable (opens in a new tab).
   * @example "https://status.example.com"
   */
  url?: string;
  /**
   * Background color of the node: shape fill, panel background
   * (`simple_node`/`complex_node`), pill behind a pictogram. Accepts a
   * **predefined** CSS color (name: `tomato`, `steelblue`, `teal`…) or an
   * **exact hex** value (`#3b82f6`). No effect on an active `set_content`.
   * @example "#3b82f6"
   */
  background_color?: string;
  /**
   * Node border / stroke color (shape stroke, panel borders,
   * stroke color of a pictogram). Same format as `background_color`.
   * If `background_color` is defined but not `border_color`,
   * a coordinated border (darker variant of the background) is automatically generated.
   * @example "steelblue"
   */
  border_color?: string;
  /**
   * Color of the text displayed IN the node (shape body, panel header/body),
   * **only when syntax highlighting is disabled** (no `language`: otherwise
   * syntax colors take precedence). Same format as `background_color` (predefined
   * name or hex). If not defined but a `background_color` is, a high-contrast
   * color with the background (black or white) is automatically chosen.
   */
  text_color?: string;
  /** Initial content displayed in the node (code terminal, window, etc.). */
  content?: ObjectContent;
  /**
   * Text displayed IN the node, as opposed to `text` which remains the label below
   * the node. For `simple_node` / `complex_node`: panel body (line breaks
   * respected, colored according to `language` if provided). For geometric
   * shapes (`square` … `star`): short centered text in the shape (keep it
   * brief so it doesn't overflow).
   * @example "Worker"
   */
  body?: string;
  /**
   * (`complex_node`) Header displayed above the `body`, separated by a line —
   * the node then looks like an HTTP packet. Ignored by `simple_node`.
   * Colored according to `language` if provided.
   * @example "POST /login"
   */
  header?: string;
  /**
   * (`simple_node` / `complex_node`) Syntax highlighting language applied
   * to ALL text areas of the node (`header` and `body`). Recognized values:
   * see {@link HighlightLanguage}.
   */
  language?: HighlightLanguage | (string & {});
  /**
   * Clockwise rotation of the node visual, in degrees. The label below the
   * node stays upright and arrow anchoring is unchanged (the layout box is not
   * rotated). Can be animated with the `rotate` action. Default: 0.
   * @example 45
   */
  rotation?: number;
}

/** Rectangular region enclosing a group of nodes and/or other zones. */
export interface Zone {
  /** Optional identifier (required to be referenced in the `contains` of another zone). */
  id?: string;
  /** IDs of the enclosed nodes and/or zones. */
  contains: string[];
  /** CSS color of the border and semi-transparent background. */
  color?: string;
  /** Label displayed at the top left of the zone. */
  label?: string;
}

/** Permanent link/arrow (decor), displayed upon initialization. */
export interface Connection {
  /** Optional identifier. */
  id?: string;
  /** Source node ID. */
  from: string;
  /** Destination node ID. */
  to: string;
  /** Line style. Default: 'solid'. */
  style?: LineStyle;
  /** Shape of the link path. Default: 'bezier'. See {@link PathShape}. */
  path?: PathShape;
  /** Arrow head. Default: 'forward'. */
  arrow_head?: 'forward' | 'backward' | 'both' | 'none';
  /**
   * Optional median text.
   * @example "HTTPS"
   */
  text?: string;
}

export interface PacketBody {
  type?: 'text' | 'image';
  /**
   * Text or image path.
   * @example "{ \"token\": \"abc123\" }"
   */
  value?: string;
  /** Language for text syntax highlighting (optional). Recognized values: see {@link HighlightLanguage}. */
  language?: HighlightLanguage | (string & {});
}

export interface PacketContent {
  /**
   * Header visible in the packet (e.g., 'GET /api').
   * @example "GET /api/users"
   */
  header?: string;
  body?: PacketBody;
}

export interface SqlResponseBody {
  type?: 'text' | 'table';
  /** Pure text if type is 'text' */
  value?: string;
  /**
   * Table columns if type is 'table'
   * @example ["id", "name"]
   */
  columns?: string[];
  /**
   * Data rows if type is 'table'
   * @example [[1, "Alice"], [2, "Bob"]]
   */
  rows_data?: (string | number)[][];
}

export interface SqlResponse {
  /**
   * Number of rows returned.
   * @example 42
   */
  rows?: number;
  /** Optional header visible in the packet. */
  header?: string;
  /** Response body (pure text or table). */
  body?: SqlResponseBody;
}

export interface Packet {
  /** Unique identifier of the packet. */
  id: string;
  /**
   * Packet category, which sets its appearance and expected content:
   * `http_packet` (header + body via `packet_content`), `sql_request` (textual
   * request via `request_content`), `sql_response` (response via `response_content`).
   */
  kind: PacketKind;
  /**
   * Textual request (e.g., for sql_request).
   * @example "SELECT * FROM users WHERE id = 42"
   */
  request_content?: string;
  /** Content of a `sql_response`: number of rows, header and body (text or table). */
  response_content?: SqlResponse;
  /** Content of an `http_packet`: header (e.g., 'GET /api') and optional body. */
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
  | 'rotate'
  | 'wait';

/** Common fields to all actions (sequencing and lifecycle). */
interface ActionBase {
  /** Action ID to refer to it (wait_for / keep_until). */
  id?: string;
  /**
   * Animation duration in ms (default: 500, 1200 for loading).
   * @minimum 1
   * @multipleOf 1
   */
  duration?: number;
  /** ID of another action: this action starts at the end of that one. */
  wait_for?: string;
  /** ID of a future action: this action remains visible until its start. */
  keep_until?: string;
  /**
   * Remains visible until the start of the next root step.
   * Default: false for `move`/`loading`, true for `arrow`/`comment`/`set_content`.
   */
  keep_until_next?: boolean;
  /** If true, remains visible until the end of the timeline. */
  keep_until_end?: boolean;
  /**
   * Start offset in ms, added after resolving `wait_for` and the
   * step clamp. Mainly useful in a `parallel` block to stagger
   * actions against each other (staggered sequence animations).
   * Also applies to an entire `parallel` action to delay the whole group.
   * @minimum 0
   * @multipleOf 1
   */
  delay_ms?: number;
  /**
   * Fade-in duration in ms. Default: initial hold period
   * for `move` (300 ms), 250 ms for other actions. 0 = instant appearance.
   * @minimum 0
   * @multipleOf 1
   */
  fade_in_ms?: number;
  /**
   * Fade-out duration in ms. Default: 250. 0 = instant disappearance.
   * No effect if `keep_until_end` is true.
   * @minimum 0
   * @multipleOf 1
   */
  fade_out_ms?: number;
}

/** Moves a packet from `from` to `to`. */
interface MoveAction extends ActionBase {
  type: 'move';
  /** ID of the packet (declared in `packets`) to move. */
  object: string;
  /** Start node ID. */
  from: string;
  /** Arrival node ID. */
  to: string;
}

/** Draws an animated arrow between two nodes. */
interface ArrowAction extends ActionBase {
  type: 'arrow';
  /** Start node ID of the arrow. */
  from: string;
  /** Arrival node ID of the arrow. */
  to: string;
  /** Label displayed in the middle of the arrow. */
  text?: string;
  /** Line style: solid, dotted, dashed or animated. Default: 'solid'. */
  style?: LineStyle;
  /** Path shape: bezier, simplebezier, straight, step, smoothstep. Default: 'bezier'. */
  path?: PathShape;
  /** Side(s) where to draw the arrow head. Default: 'forward'. */
  arrow_head?: 'forward' | 'backward' | 'both' | 'none';
}

/** Executes multiple actions at the same time. */
interface ParallelAction extends ActionBase {
  type: 'parallel';
  actions: Action[];
}

/** Displays a loading spinner on a node. */
interface LoadingAction extends ActionBase {
  type: 'loading';
  object: string;
}

/** Mutates the content of a node (code, text, image). */
interface SetContentAction extends ActionBase {
  type: 'set_content';
  object: string;
  content: ObjectContent;
}

/** Displays a comment bubble near a node, or at the top of the stage if `object` is omitted. */
interface CommentAction extends ActionBase {
  type: 'comment';
  /** ID of the node near which to display the comment. Omitted = omniscient comment (top of the stage). */
  object?: string;
  /** @example "Le serveur valide le token" */
  text: string;
}

/** Highlights a static node or a connection (by ID). */
interface HighlightAction extends ActionBase {
  type: 'highlight';
  /** ID of a static node OR a connection to highlight. */
  object: string;
}

/** Shows or hides a static node with a fade. */
interface SetVisibleAction extends ActionBase {
  type: 'set_visible';
  /** ID of the node to show or hide. */
  object: string;
  /** true = show, false = hide. */
  visible: boolean;
}

/**
 * Animates the visual rotation of a node toward an absolute angle.
 * The starting angle is the node's current rotation (its static `rotation`,
 * or the target of a previous `rotate`). Only the visual rotates; the label
 * stays upright. The final angle persists until the end of the timeline.
 */
interface RotateAction extends ActionBase {
  type: 'rotate';
  /** ID of the node to rotate. */
  object: string;
  /**
   * Target angle in degrees (absolute, clockwise).
   * @example 90
   */
  to: number;
}

/**
 * Dead time: nothing happens for `duration` ms (default: 1000). Does not produce
 * any clip; simply inserts a pause between two steps (elements
 * maintained via `keep_until_next` remain displayed during the wait).
 */
interface WaitAction extends ActionBase {
  type: 'wait';
}

/** Discriminated union of actions (by `type`). */
export type Action =
  | MoveAction
  | ArrowAction
  | ParallelAction
  | LoadingAction
  | SetContentAction
  | CommentAction
  | HighlightAction
  | SetVisibleAction
  | RotateAction
  | WaitAction;

export interface DataFlowSpec {
  /**
   * Automatic node placement direction (no coordinates to provide).
   * Default: 'left-to-right'.
   */
  direction?: Direction;
  /**
   * Fixed elements of the scene (servers, clients, databases…). They form the permanent
   * decor and are placed automatically according to `direction` and their `lane`.
   */
  nodes: Node[];
  /**
   * Mobile elements (requests, responses, messages). Declared here, then moved
   * from one node to another by a `move` action in the `timeline`.
   */
  packets: Packet[];
  /** Permanent arrows/links (decor) displayed upon initialization. */
  connections?: Connection[];
  /** Rectangular regions displayed in the background around a group of nodes. */
  zones?: Zone[];
  /**
   * Animated scenario: ordered list of actions (moves, arrows, comments…)
   * played sequentially. Each root action becomes a navigable step.
   */
  timeline: Action[];
}

/** Syntax highlighting function: source code -> HTML. */
export type Highlighter = (code: string, language: string) => string;

export interface DataFlowPlayerProps {
  /** The specification to animate. */
  spec: DataFlowSpec;
  /** Additional CSS class on the root container. */
  className?: string;
  /** Inline styles on the root container. */
  style?: CSSProperties;
  /** Scene height (e.g., 420, '60vh'). Default: 420. */
  height?: number | string;
  /** Starts playback automatically. Default: false. */
  autoPlay?: boolean;
  /** Replays in a loop at the end. Default: false. */
  loop?: boolean;
  /** Displays navigation controls. Default: true. */
  controls?: boolean;
  /**
   * Adds a button in the controls bar that opens the JSON specification
   * (colored) in a window, with copy to clipboard and
   * download as a `.json` file. No effect if `controls` is false.
   * Default: false.
   */
  exportable?: boolean;
  /** Visual theme. Default: 'auto'. */
  theme?: 'light' | 'dark' | 'auto';
  /**
   * Visual density: adjusts the size of elements relative to the available
   * space. 'compact' = smaller/airier, 'spacious' = larger.
   * Default: 'comfortable'.
   */
  density?: 'compact' | 'comfortable' | 'spacious';
  /** Displays the timeline debug overlay. Default: false. */
  debug?: boolean;
  /** Playback speed (1 = normal). Default: 1. */
  speed?: number;
  /** Custom syntax highlighting (replaces Prism). */
  highlight?: Highlighter;
  /** Content rendered during SSR / before hydration (placeholder). */
  fallback?: ReactNode;
}

// ─── Backward-compatible aliases (removed in v2) ─────────────────────────────
/** @deprecated Use {@link Node} instead. */
export type StaticObject = Node;
/** @deprecated Use {@link NodeType} instead. */
export type StaticObjectType = NodeType;
/** @deprecated Use {@link Packet} instead. */
export type DynamicObject = Packet;
/** @deprecated Use {@link PacketKind} instead. */
export type DynamicObjectType = PacketKind;
