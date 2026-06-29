# Architecture

Internal reference for the development and extension of the library.
See also [SPEC.md](./SPEC.md) (functional specification).

## Key decisions

1. **Custom deterministic engine (no GSAP).** Core = pure function
   `evaluate(timeline, t)`. Advantages: mastered seek / steps / lifecycle,
   tests without DOM, light bundle, SSR-safe.
2. **Compiler → IR → runtime separation.** `compile(spec)` produces a
   `Timeline` (dated clips + steps + duration), independent of the DOM. Rendering
   resolves geometry from actual measurements at render time.
3. **Monorepo npm workspaces.** The published library (`packages/react-dataflow-animator`)
   is isolated from the documentation site (`apps/docs`). The site consumes the
   lib as a workspace dependency.
4. **Scoped CSS** (`.rdfa-`) + CSS variables, compiled into `dist/style.css`.
   No CSS framework imposed on the consumer.
5. **SSR-safe**: no DOM access during rendering (measurement and clock in
   effects).
6. **Extensible registries** (node icons, sub-icons, highlighter).

## Rendering pipeline

```text
spec ──compile()──▶ Timeline (clips, steps, durationMs)   [pure, no DOM]
                          │
useClock (rAF) ──▶ t ─────┤
                          ▼
            Stage: evaluate(timeline, t) ──▶ active clips (+ progress)
                          │
   layout (CSS ratios) + geometry (measured BoundingClientRects)
                          ▼
        nodes / arrows / packets / spinners / contents / comments
```

## Monorepo structure

```text
packages/
  react-dataflow-animator/          the published npm package
    src/
      DataFlowPlayer.tsx            root component
      index.ts                      public exports
      types.ts                      TS types of the spec and props
      schema.ts                     JSON Schema (feeds the API doc)
      engine/
        compiler.ts                 spec.actions → Timeline
        timeline.ts                 IR + evaluate (pure) + navigation
        layout.ts                   node placement (lanes / circular)
        geometry.ts                 connection points + routing
      hooks/
        useClock.ts                 rAF clock (play/pause/seek/playTo)
        useStageGeometry.ts         DOM measurement + ResizeObserver
      highlight/
        highlight.ts                Prism wrapper (replaceable)
      components/
        Stage.tsx                   rendering orchestration
        Controls.tsx                controls bar
        nodes/                      StaticNode + icon registries
        dynamic/                    Packet, ArrowLine, ContentPanel
      styles/
        dataflow.css                scoped .rdfa- styles
apps/
  docs/                             Docusaurus site
    docs/                           MDX content (intro, concepts, reference)
    src/                            React components of the site
      site-content/demos/           demos importable in the lib
docs/
  SPEC.md, ARCHITECTURE.md          internal references
```

## Adding a new component

### New action type

1. Add the type in `types.ts` (`ActionType`) and the enum in `schema.ts`.
2. Add a clip variant in `engine/timeline.ts` (`Clip` union)
   with its `keep_until_next` default and its default duration in
   `engine/compiler.ts`, and a `case` in `compileAction`.
3. Render the clip in `components/Stage.tsx` (`active` filter on `kind`).
4. `.rdfa-…` styles in `styles/dataflow.css`. Test in
   `engine/compiler.test.ts`.

### New node type or new sub-icon

- `registerNodeIcon(type, svg)` / `registerSubIcon(name, svg)` at
  runtime;
- or enrich `nodeIcons.tsx` / `subIcons.tsx` directly in the lib.

## Build and publication

Everything starts from the root via npm workspaces:

```bash
npm run build       # full build (lib then site)
npm run build:lib   # only the npm package
npm run build:docs  # only the site
```

The package build:

- `tsc -b`: typecheck;
- `vite build`: ESM bundle + `style.css`;
- `tsc -p tsconfig.dts.json`: `.d.ts` declarations.

Result in `packages/react-dataflow-animator/dist/`: `index.js`,
`index.d.ts`, `style.css`. The `exports` field of `package.json` exposes them
under `react-dataflow-animator` and `react-dataflow-animator/styles.css`.

`react` and `react-dom` are in `peerDependencies` (externalized from the bundle).

## Tests and quality

| Command (root)          | Effect                                    |
| ----------------------- | ----------------------------------------- |
| `npm run lint`          | Lint workspaces that expose a lint script |
| `npm run format:check`  | Checks Prettier formatting                |
| `npm run format:write`  | Applies Prettier                          |
| `npm test`              | vitest tests of the lib                   |
| `npm run test:coverage` | Tests + coverage report                   |
| `npm run deadcode`      | knip — dead code detection                |
| `npm run build`         | Full build (lib + docs)                   |

On the package side, two vitest configurations coexist: `vitest.config.ts`
(unit, under `src/**/*.test.{ts,tsx}`) and `vitest.integration.config.ts`
(integration tests on demos).

## Deployment

`.github/workflows/ci-cd.yml` lints + tests on every push / PR, then
builds and deploys the Docusaurus site on GitHub Pages on the `main` branch.
The npm publication of the lib remains manual.
