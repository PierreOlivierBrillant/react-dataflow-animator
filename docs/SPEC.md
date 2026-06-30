# Functional Specification — React DataFlow Animator

> Functional source of truth of the library. The complete **JSON Schema** (types,
> enumerations, default values) lives in the code: [`packages/react-dataflow-animator/src/schema.ts`](../packages/react-dataflow-animator/src/schema.ts)
> and feeds the "API Documentation" page of the site. The corresponding **TypeScript types**
> are in [`packages/react-dataflow-animator/src/types.ts`](../packages/react-dataflow-animator/src/types.ts).

## 1. Overview

The library exposes a React `<DataFlowPlayer spec={…} />` component that **compiles**
a JSON specification into a **deterministic animation** of data flows
(client/server/SQL...), encapsulated in a media player.

Core principle: time `t` (ms) is the single source of truth. The engine is a
**pure** function `evaluate(timeline, t) → visual state`; playback merely
advances `t` via `requestAnimationFrame`, and `seek` merely sets it. This makes
scrubbing, step navigation, and SSR trivial and deterministic.

> **Assumed divergence vs initial spec:** the sequencer does **not use GSAP**. A
> custom deterministic engine was chosen (total control over `seek`/steps/lifecycle,
> testability without DOM, light bundle, SSR-safe). The debugging overlay therefore
> inspects this internal timeline.

## 2. The player (DataFlowPlayer)

Displayed according to the `controls` prop (default: `true`):

- **Playback bar**: clickable timeline to jump to any instant.
- **Restart**: starts from the beginning and replays.
- **Play / Pause**.
- **Step navigation** (Previous / Next): navigates by "logical steps"
  (= root actions). "Next" plays until the end of the current step then
  stops; "Previous" goes back to the beginning of the step (then to the previous one).
- **Fullscreen** (Fullscreen API).
- **Debug** (`debug` prop): overlays inspecting the internal state of the timeline.

## 3. Spatial rendering engine (Layout Engine)

Positions nodes **without (x, y) coordinates as input**, using relative ratios to
the container (pure CSS placement). See [`packages/react-dataflow-animator/src/engine/layout.ts`](../packages/react-dataflow-animator/src/engine/layout.ts).

- **Linear grids** (`left-to-right`, `right-to-left`, `top-to-bottom`,
  `bottom-to-top`): `lane` = position along the flow; nodes of the same lane
  are distributed and centered on the transverse axis. Spacing proportional to the container.
- **Circular** (`circular`): the `is_main` node is placed at the center; the others are
  equidistant on a circle (trigonometry), ratio corrected to remain round.
- **Tree** (`tree`): a binary tree described by the `tree` root block (`root` +
  per-node `left`/`right` children). Each node is placed by its **in-order rank**
  (horizontal) and **depth** (vertical); the parent→child **edges are drawn
  automatically** from the block (no `connections`). The topology is the single
  source of truth for positions and edges, and can be restructured at runtime by
  the [`rotate_subtree` action](#5-animation-engine-and-actions) — a rotation
  preserves the in-order order, so only depths change and the nodes glide. `lane`
  and `align_with` are ignored.
- **`align_with`**: aligns a node on the transverse axis of another (vertical if the
  direction is horizontal) → align two nodes from different lanes.
- **Zones** (`zones` root array): background rectangles encompassing a
  group of nodes and/or other zones (`contains`), with optional `color` and `label`.
  Automatically sized (fixed point to handle nesting),
  rendered below arrows and nodes.

**Node types**: thirteen **pictograms** (`desktop`, `laptop`, `client`, `server`,
`database`, `mobile`, `user`, `admin`, `users`, `cloud`, `alice`, `bob`, `eve` — the
last three represent **named characters**: Alice (bun), Bob (cap),
Eve (headset, spy), useful for cryptography and network protocol diagrams), two **textual** nodes
(`simple_node` = text box without pictogram, `complex_node` = header + body like
an HTTP packet) and eight **geometric shapes** (`square`, `diamond`,
`circle`, `triangle`, `parallelogram`, `width_rectangle`, `height_rectangle`, `star`).
Each node can receive: a `text` (label), a `subicon` (known tech, registered icon
**or free text**), an `url` (making the node clickable), an
initial `content`, **colors** `background_color` / `border_color`, a
`rotation` (orientation in degrees), and `merge_edges` (edge convergence on its
faces — default `true`, see [§4](#4-routing-and-collision-prevention)).

**Rotation** (`rotation`, degrees, clockwise, default 0): orients the node's
**visual** (pictogram, shape or panel) without rotating its label (which stays
upright) nor its layout box — arrow anchoring is computed on the unrotated box, so
a rotated node connects exactly like a straight one. The orientation can be
**animated** at runtime via the [`rotate` action](#5-animation-engine-and-actions).

**Colors** (`background_color`, `border_color`, `text_color`): change the background,
border, and text of the node — fill/stroke of a shape, background/border of a
panel, badge + strokes of a pictogram, and color of the internal text. Each field
accepts a **predefined** CSS color (name: `tomato`, `steelblue`...) or an exact
**hexadecimal** value (`#3b82f6`). Automatic derivations (pure CSS, no JS,
valid for names as well as hex) when a `background_color` is provided without the
corresponding color: `border_color` → darkened background (`color-mix`); `text_color`
→ black or white depending on the background's luminance (`oklch(from …)`), for very strong
contrast. `text_color` applies **only if syntax highlighting is disabled**
(no `language`); otherwise the token colors take precedence. No effect when an
active `set_content` occupies the node.

**Textual nodes** (`simple_node`, `complex_node`): the content goes in `body`
(body) and, for `complex_node` only, `header` (header, separated from the body by a
line). The `language` field applies **syntax highlighting** to _all_ text areas
of the node (header + body). The `subicon` remains available; an active `set_content`
takes priority over the textual panel (just as it hides the pictogram).

These two types are **also valid packet kinds**: a packet declared with
`kind: 'simple_node'` or `kind: 'complex_node'` carries the same `body` / `header`
/ `language` fields and is rendered by the very same `NodePanel`, so a text box can
**travel** via a `move` action instead of being declared as an `http_packet`. The
moving wrapper drops its own box (`rdfa-packet--panel`) to avoid a box-in-a-box; the
panel is otherwise identical to the static node.

The node `subicon` likewise **doubles as a packet kind**: a packet declared with
`kind: 'subicon'` carries an `icon` field (same value space as the node `icon`:
known technology, registered icon, or short free text) and is resolved by the very
same `getSubIcon`, so a tech badge can **travel** on its own. The wrapper becomes a
round badge (`rdfa-packet--subicon`) — like the node's corner badge, but standalone
and larger.

**Geometric shapes** (`square`, `diamond`, `circle`, `triangle`, `parallelogram`,
`width_rectangle`, `height_rectangle`, `star`): an SVG shape drawn that can
contain a **short centered text** via `body` (`text` remains the label under the shape).
The shape expands to accommodate the text, but the latter is bounded (`max-width`)
and **cropped** (`overflow:hidden`) to never overflow the visible path — the `body`
is therefore intended for a brief label, not a paragraph. The `subicon` remains
available and an active `set_content` replaces the shape. All these families share
the same rendering path (`NodeView`): `isPanelNode`/`isShapeType` (`nodeKinds` module)
arbitrate panel/shape/pictogram.

**Responsive scaling**: a "cell" (smallest distance between two
nodes, in px) drives a global scale factor (`--rdfa-scale`: larger icons/fonts in
fullscreen, smaller if space is tight) and caps the width of
panels/packets (`--rdfa-maxw`) so they never overlap neighbors.

**Spacing & bounds**: for few lanes, nodes spread towards the edges to
use available space (maximum distance between them). No element goes outside the
canvas: panel width accounts for edges, and each node's position
is bounded according to its measured size (comments fall under the node if necessary).
The font of panels/comments follows the scale moderately (max ~1.15×) so as
not to overflow.

## 4. Routing and collision prevention

Connections are drawn between the actual `BoundingClientRect` of the nodes (measured
client-side). Arrows and packets stop at a **margin** of a few pixels from the
node (`NODE_GAP`). See [`packages/react-dataflow-animator/src/engine/geometry.ts`](../packages/react-dataflow-animator/src/engine/geometry.ts).

- **Bidirectional shifting (path shifting)**: the compiler scans the entire spec
  (permanent connections + `move`/`arrow` actions). If a segment A↔B is used in
  both directions, both paths are shifted perpendicularly (`SHIFT_RATIO` × node
  size); the sign depends on the alphabetical order of ids → two parallel
  lanes. The perpendicular is calculated in a canonical frame of reference to never
  overlap A→B and B→A.
- **Edge convergence vs fan-out (`merge_edges`)**: when several links attach to
  the **same face** of a node, they meet at a single anchor point by default
  (`merge_edges: true`) — a many-to-one flow converges instead of spreading
  out. A node with `merge_edges: false` **fans out** its links instead: each
  pair gets its own attachment point along the face, ordered by the other end's
  transverse position to reduce crossings (`PORT_SPACING`). The decision is
  per-node-face (a link converges at the end whose node merges) and is
  independent of the intra-pair spreading above, which always applies. See
  [`packages/react-dataflow-animator/src/engine/portOffsets.ts`](../packages/react-dataflow-animator/src/engine/portOffsets.ts).

## 5. Animation engine and actions

The timeline compiles an array of ordered actions. See
[`packages/react-dataflow-animator/src/engine/compiler.ts`](../packages/react-dataflow-animator/src/engine/compiler.ts).

1. **move**: moves a dynamic object (packet/request) from `from` to `to`;
   interpolation over `duration` ms; follows the shifted lane if bidirectional.
2. **arrow**: draws an SVG line between two nodes (progressive drawing `x2/y2`).
   Stroke styles `solid` / `dotted` / `dashed` / `animated` and path shape
   `path` (`bezier` by default, `simplebezier` / `straight` / `step` / `smoothstep`),
   optional middle text. **Permanent** arrows (decor) are declared in the
   `connections` root array (displayed from init).
3. **parallel**: encapsulates child actions executed at the same timestamp.
4. **loading**: spinner attached to a target node (simulates processing).
5. **set_content**: mutates the content of a node. Mode `code` (terminal + Prism highlighting,
   **without URL bar**; the code never wraps, its font
   adjusts to fit), or `text`/`image` (browser window with URL bar
   configurable via `content.url`).
6. **comment**: fading text bubble near a node (`object`).
7. **highlight**: highlights (pulsing halo) a static node or connection (by `object` = id).
8. **wait**: dead time — no clip emitted, the step simply occupies `duration` ms
   (default 1000) to freeze the image before the next step.
9. **set_visible**: shows or hides a static node (`object`) with a fade.
   The visibility state persists until the end of the chronology (or a
   contrary `set_visible`); complements the initial `visible` field of the nodes.
10. **set_color**: recolors a static node (`object`) at runtime — any of
    `background_color` / `border_color` / `text_color`, only the channels
    provided changing. Eased, **deterministic** cross-fade between the previous
    color and the new one (CSS `color-mix`, so it stays scrubbable both ways).
    Same value space and auto-derivations as the static node colors (a
    `background_color` without border/text derives a coordinated border and a
    high-contrast ink). Like `set_visible`, the reached color persists until the
    end of the chronology, and successive `set_color` on a node chain (each
    fades from the previous color). Core operation for recoloring visualizations
    (e.g. the red/black recoloring of a red-black tree).
11. **rotate**: animates the visual rotation of a node (`object`). Two mutually
    exclusive modes:
    - **target angle** `to` (degrees): a single _eased_ rotation. The start
      angle is the node's current rotation (its static `rotation`, or a previous
      `rotate`), so successive rotations chain in declaration order;
    - **continuous spin** `spin` (degrees per second, signed — positive turns
      clockwise, negative counter-clockwise): the node turns at a constant speed
      (_linear_, no easing). How long it spins reuses the usual timing fields —
      `duration` (spin that long, default 600 ms), `keep_until` (until another
      action starts), or `keep_until_end` (until the end of the chronology).

    `spin` takes precedence if both are given. Like `set_visible`, the angle
    reached when the rotation ends persists until the end of the chronology.
    Chaining after a spin is exact only in the `duration` mode (the stop angle of
    an open-ended `keep_until`/`keep_until_end` spin is not known at compile
    time, so a later `rotate` on that node resumes from the pre-spin angle).

12. **rotate_subtree**: restructures the binary `tree` (only in `direction: 'tree'`)
    with a left/right **tree rotation** around the pivot `object`, then animates
    the nodes gliding to their new depths while the edges re-route. The engine
    mutates the topology and recomputes BOTH positions and edges from that single
    model, so they can never disagree. A `left` rotation lifts the pivot's right
    child, `right` its left child (missing child → non-blocking warning).
    Successive `rotate_subtree` chain (each from the previous topology) — AVL
    double rotations `LR`/`RL` are just two in a row. A rotation preserves the
    in-order traversal, so horizontal slots are stable and only depths change.

## 6. Temporal lifecycle

- **`wait_for`**: the action starts at the **end** of the referenced action (by id).
  - _On a root action_ (directly in `timeline`): effective `startMs` =
    `max(ref.endMs, stepStart)`. `wait_for` can only **delay** the action,
    never make it start before the beginning of its own step. This bound prevents
    a wait_for to a very early action from producing a clip outside its step range
    (zero duration step, incorrect navigation).
  - _On a `parallel` child_: strict semantics — `startMs = ref.endMs`,
    without floor. The clip can then start before the beginning of the parallel block if the
    reference is earlier.
- **`keep_until`**: remains visible until the **beginning** of the targeted action.
- **Inter-step pause** (`STEP_GAP`): a short pause separates two root steps,
  so that the "Next" stop shows the "posed" step alone (without overlapping
  the appearance of the next one).
- **`keep_until_next`**: remains visible until the beginning of the next root step
  (thus across the pause). `wait` steps are **skipped** in this
  resolution: the posed content remains displayed during the dead time.
- **`keep_until_end`** (boolean): remains visible until the end of the chronology.
  Defaults: `move` → `false`; `arrow`/`comment`/`set_content` → `true`; `loading` → `false`.

## 7. Showcase site (GitHub Pages)

`apps/docs/` — Docusaurus site: **Home**, **Demos** (gallery),
**Playground** (live editor), **Documentation** (intro, concepts,
API reference generated from the JSON Schema). Built via
`npm run build:docs` and deployed on GitHub Pages by
`.github/workflows/ci-cd.yml`.

## 8. Implementation notes and evolutions

- **Textual** nodes `simple_node` / `complex_node`: text box (`body`, plus
  `header` for `complex_node`) instead of a pictogram, optional highlighting via
  `language` (applied to all areas). `complex_node` takes on the appearance of an
  HTTP packet. Rendered by `NodePanel` (see `components/nodes/StaticNode.tsx`).
- **Geometric shapes** (`square` ... `star`): SVG shape (`preserveAspectRatio="none"`,
  `non-scaling-stroke`) with a short centered `body`. Security margin by shape +
  `max-width` + `overflow:hidden` guarantee the text does not overflow the path.
  Rendered by `ShapeNode` via `NodeView`; the `isShapeType` predicate lives in
  `components/nodes/nodeKinds.ts` (single source of truth, like `isPanelNode`).
- **Node colors** (`background_color` / `border_color` / `text_color`): placed
  as CSS variables `--rdfa-fill` / `--rdfa-stroke` / `--rdfa-ink` on the root
  `.rdfa-node` (`nodeColors.ts`), read by the CSS of shapes/panels/pictograms with
  fallback to the theme. Auto derivations (pure CSS, SSR-safe, format independent):
  border = `color-mix(in srgb, <background>, #000 32%)`; text = `oklch(from var(--rdfa-fill)
clamp(0, (0.62 − l) × 1000, 1) 0 0)` (black/white according to luminance). `--rdfa-ink`
  is read **only outside code areas** (`:not(.rdfa-code)`): syntax highlighting
  takes precedence. A `background_color` on a pictogram adds a badge (`rdfa-node--tinted`).
- `is_navigable` has been **removed from the spec**: navigability is a `controls` prop.
- Decor arrows have migrated from `static_objects` to the `connections` root array.
- `comment` uses `object` (and no longer `next_to`) to target its node.
- `style`: SVG/CSS terminology `solid`/`dotted`/`dashed` (`full` tolerated as alias).
- `path`: shape of the path of an arrow/connection (`bezier` by default,
  `simplebezier`/`straight`/`step`/`smoothstep`) — orthogonal to `style`. The
  curvature only appears with a transverse offset; `move` packets
  follow the `bezier` path by default.
- `subicon` accepts **free text** in addition to icons (react-icons).
- `response_content.data` removed (never rendered); only `rows` is displayed.
- Actions modeled as **discriminated union** (TS + schema `oneOf`) → actual validation.
- **`language`: TS ↔ schema divergence (intentional).** The TypeScript type is
  `HighlightLanguage | (string & {})` — any string is valid at
  compile time so as not to break consumers. But the script
  `packages/react-dataflow-animator/scripts/schema-patches.mjs` removes the free
  `{type:string}` branch from the generated schema and keeps only the `$ref` to
  `HighlightLanguage`. Consequence: a language outside the enum passes the
  TypeScript compiler but is rejected by Ajv. This is intended: the schema is stricter
  than the types to preserve auto-completion and validation.
- A missing reference (missing required field, unknown `wait_for` id...) produces a
  **non-blocking warning** (visible with `debug`) rather than a crash.
- Syntax highlighting: **Prism** (dependency), replaceable via the `highlight` prop.
- **Scoped** styles under `.rdfa-` + CSS variables (light/dark themes, `theme` prop).
- **`auto` theme (default)**: follows `prefers-color-scheme` AND a `[data-theme]` ancestor
  (Docusaurus convention) → syncs with the host's theme toggle.
- Moving objects (packets) are rendered **in the foreground** (above
  `set_content` panels). `set_content` appears/disappears with a **fade**.
