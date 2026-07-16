# React DataFlow Animator

[![CI](https://github.com/PierreOlivierBrillant/react-dataflow-animator/actions/workflows/ci-cd.yml/badge.svg?branch=main)](https://github.com/PierreOlivierBrillant/react-dataflow-animator/actions/workflows/ci-cd.yml)
[![npm version](https://img.shields.io/npm/v/react-dataflow-animator.svg)](https://www.npmjs.com/package/react-dataflow-animator)
[![npm downloads](https://img.shields.io/npm/dm/react-dataflow-animator.svg)](https://www.npmjs.com/package/react-dataflow-animator)
[![bundle size](https://img.shields.io/bundlephobia/minzip/react-dataflow-animator)](https://bundlephobia.com/package/react-dataflow-animator)
[![license](https://img.shields.io/npm/l/react-dataflow-animator.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178c6)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-%3E%3D18-61dafb)](https://react.dev/)

React component that compiles a JSON specification into a deterministic and navigable dataflow animation (client/server, SQL queries, microservices...).

- No coordinates to provide — the engine places the nodes.
- Built-in player: play, pause, step navigation, fullscreen.
- SSR-safe, usable directly in Docusaurus, Next.js, Vite, etc.
- Built-in syntax highlighting (Prism, replaceable).

## Installation

```bash
npm install react-dataflow-animator
```

`react` and `react-dom` (≥ 18) are expected in `peerDependencies`.

## Usage

```tsx
import { DataFlowPlayer } from 'react-dataflow-animator';
import 'react-dataflow-animator/styles.css';

const spec = {
  direction: 'left-to-right',
  nodes: [
    { id: 'browser', type: 'laptop', text: 'Navigateur', lane: 1 },
    { id: 'api', type: 'server', text: 'API', lane: 2 },
    { id: 'db', type: 'database', text: 'PostgreSQL', lane: 3 },
  ],
  packets: [
    {
      id: 'req',
      kind: 'http_packet',
      packet_content: { header: 'GET /users' },
    },
    {
      id: 'sql',
      kind: 'sql_request',
      request_content: 'SELECT * FROM users',
    },
  ],
  timeline: [
    { type: 'move', object: 'req', from: 'browser', to: 'api' },
    { type: 'move', object: 'sql', from: 'api', to: 'db' },
  ],
};

export default function Example() {
  return <DataFlowPlayer spec={spec} />;
}
```

> **Memoize your spec.** If the spec is defined within a parent component's body
> (inline literal object or computed without `useMemo`), it receives a new identity
> on each render. The compiler then recompiles the entire timeline, and the DOM measurement
> (`useStageGeometry`) is needlessly invalidated. Define the spec outside the
> component, or protect it with `useMemo` / a stable value.

## One-page concepts

A **spec** describes three things:

1. **`nodes`** — the diagram nodes (servers, clients, databases...).
   Automatic placement according to `direction` (linear or `circular`) and `lane`.
2. **`packets`** — the payloads that will flow between nodes
   (HTTP packets, SQL requests/responses).
3. **`timeline`** — the chronology: `move`, `arrow`, `parallel`, `loading`,
   `set_content`, `comment`, `highlight`.

The engine compiles the spec into a deterministic chronology: the time `t` (ms)
is the single source of truth, which makes seek, step navigation,
and SSR trivial.

## Main props of `<DataFlowPlayer>`

| Prop         | Type                                       | Default         | Description                                                                            |
| ------------ | ------------------------------------------ | --------------- | -------------------------------------------------------------------------------------- |
| `spec`       | `DataFlowSpec`                             | —               | The specification to animate.                                                          |
| `height`     | `number \| string`                         | `420`           | Height of the stage.                                                                   |
| `autoPlay`   | `boolean`                                  | `false`         | Starts playback automatically.                                                         |
| `loop`       | `boolean`                                  | `false`         | Replays on loop at the end.                                                            |
| `controls`   | `boolean`                                  | `true`          | Displays the controls bar.                                                             |
| `exportable` | `boolean`                                  | `false`         | Button opening the JSON spec (copy / download).                                        |
| `theme`      | `PlayerTheme`                              | `'default'`     | Palette: `default`, `dots`, `blueprint`, `pcb`, `chalk`, `terminal`, `paper`, `neon`.  |
| `mode`       | `'light' \| 'dark' \| 'auto'`              | `'auto'`        | Variant of `theme`. `auto` follows `prefers-color-scheme` and a parent `[data-theme]`. |
| `density`    | `'compact' \| 'comfortable' \| 'spacious'` | `'comfortable'` | Visual scale.                                                                          |
| `speed`      | `number`                                   | `1`             | Playback speed.                                                                        |
| `highlight`  | `Highlighter`                              | Prism           | Override syntax highlighting.                                                          |
| `debug`      | `boolean`                                  | `false`         | Timeline debugging overlay.                                                            |

## Extensibility

```tsx
import { registerNodeIcon, registerSubIcon } from 'react-dataflow-animator';

registerNodeIcon('queue', <svg viewBox="0 0 24 24">{/* … */}</svg>);
registerSubIcon('kafka', <svg viewBox="0 0 24 24">{/* … */}</svg>);
```

A sub-icon can also be **free text** (`'v2'`, `'API'`, `'JWT'`),
automatically rendered in a badge.

> **Global registry.** `registerNodeIcon` and `registerSubIcon` mutate a module-level
> registry — shared across all player instances and across requests in an
> SSR environment. Call them **only once at application startup**
> (entry file, `_app.tsx`, `layout.tsx`...), never in a component body or
> a `useEffect`.

## Documentation

- **Documentation site** (demos, interactive playground, complete API reference)
  — deployed from [`apps/docs`](./apps/docs).
- **Functional specification**: [`docs/SPEC.md`](./docs/SPEC.md).
- **Internal architecture**: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).
- **JSON Schema**: exposed via the `dataFlowSchema` export.

## Repository structure

The project is an npm workspaces monorepo:

```text
packages/
  react-dataflow-animator/   the package published on npm
apps/
  docs/                      Docusaurus site (demos, playground, API doc)
docs/
  SPEC.md, ARCHITECTURE.md   internal references
```

To contribute or run locally: see [`CLAUDE.md`](./CLAUDE.md)
(quality commands to run before each commit).

## License

[MIT](./LICENSE)
