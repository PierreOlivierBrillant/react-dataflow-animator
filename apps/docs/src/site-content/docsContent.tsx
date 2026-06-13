/* eslint-disable react-refresh/only-export-components -- module de contenu (données + rendu), pas un module HMR */
import type { ReactNode } from 'react';
import Heading from '@theme/Heading';
import { DataFlowPlayer, dataFlowSchema } from 'react-dataflow-animator';
import { demosById } from './demos';

interface DocPage {
  id: string;
  label: string;
  group: string;
  title: string;
  render: () => ReactNode;
}

const install = `npm install react-dataflow-animator`;

const usage = `import { DataFlowPlayer } from 'react-dataflow-animator';
import 'react-dataflow-animator/styles.css';

<DataFlowPlayer spec={spec} />`;

// ---------------------------------------------------------------------------
// Référence API générée à partir du JSON Schema
// ---------------------------------------------------------------------------

interface SchemaNode {
  type?: string;
  const?: string;
  title?: string;
  description?: string;
  enum?: readonly string[];
  properties?: Record<string, SchemaNode>;
  items?: SchemaNode;
  required?: readonly string[];
  $ref?: string;
  allOf?: readonly SchemaNode[];
}

const defs = (
  dataFlowSchema as unknown as { definitions: Record<string, SchemaNode> }
).definitions;
const root = defs.DataFlowSpec;

function refName(ref: string): string {
  return ref.replace('#/definitions/', '');
}

function typeLabel(node: SchemaNode): string {
  if (node.$ref) {
    const target = defs[refName(node.$ref)];
    return target?.title ?? refName(node.$ref);
  }
  if (node.const) return `"${node.const}"`;
  if (node.enum) return 'enum';
  if (node.type === 'array')
    return `${node.items ? typeLabel(node.items) : 'any'}[]`;
  return node.type ?? 'object';
}

interface Row {
  name: string;
  node: SchemaNode;
  required: boolean;
}

/** Aplati les propriétés d'une définition (résout allOf = champs communs). */
function rowsOf(node: SchemaNode): Row[] {
  const required = new Set<string>(node.required ?? []);
  const collected: Record<string, SchemaNode> = {};
  for (const part of node.allOf ?? []) {
    const target = part.$ref ? defs[refName(part.$ref)] : part;
    Object.assign(collected, target?.properties);
    for (const r of target?.required ?? []) required.add(r);
  }
  Object.assign(collected, node.properties);
  return Object.entries(collected).map(([name, n]) => ({
    name,
    node: n,
    required: required.has(name),
  }));
}

function PropsTable({ node }: { node: SchemaNode }) {
  const rows = rowsOf(node);
  return (
    <table className="api-table">
      <thead>
        <tr>
          <th>Propriété</th>
          <th>Type</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const enumValues = row.node.$ref
            ? defs[refName(row.node.$ref)]?.enum
            : row.node.enum;
          return (
            <tr key={row.name}>
              <td className="name">
                {row.name}
                {row.required ? <span className="api-req"> *</span> : null}
              </td>
              <td>
                <span className="api-type">{typeLabel(row.node)}</span>
              </td>
              <td>
                {row.node.description ?? ''}
                {enumValues ? (
                  <div>
                    {enumValues.map((v) => (
                      <span className="api-enum" key={v}>
                        {v}
                      </span>
                    ))}
                  </div>
                ) : null}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const ACTION_DEFS = [
  'MoveAction',
  'ArrowAction',
  'ParallelAction',
  'LoadingAction',
  'SetContentAction',
  'CommentAction',
  'HighlightAction',
] as const;

/** Discriminant `type` affiché pour une action (fallback : nom de la définition). */
function actionTypeLabel(key: (typeof ACTION_DEFS)[number]): string {
  return defs[key].properties?.['type']?.const ?? key;
}

export function ApiReference() {
  return (
    <>
      <Heading as="h2" id="api-dataflowspec">
        DataFlowSpec (racine)
      </Heading>
      <PropsTable node={root} />

      <Heading as="h2" id="api-node">
        Node
      </Heading>
      <p>
        Un nœud (serveur, base, client…). Placé automatiquement selon
        `direction`/`lane`.
      </p>
      <PropsTable node={defs.Node} />

      <Heading as="h2" id="api-connection">
        Connection
      </Heading>
      <p>Flèche permanente (décor) entre deux nœuds.</p>
      <PropsTable node={defs.Connection} />

      <Heading as="h2" id="api-packet">
        Packet
      </Heading>
      <p>Un paquet déplaçable, référencé par une action `move`.</p>
      <PropsTable node={defs.Packet} />

      <Heading as="h2" id="api-content">
        ObjectContent
      </Heading>
      <PropsTable node={defs.ObjectContent} />

      <Heading as="h2" id="api-actions">
        Actions
      </Heading>
      <p>
        Union discriminée sur <code className="inline">type</code>. Tous les
        types partagent les champs de timing (<code className="inline">id</code>
        , <code className="inline">duration</code>,{' '}
        <code className="inline">wait_for</code>,{' '}
        <code className="inline">keep_until</code>,{' '}
        <code className="inline">keep_until_next</code>).
      </p>
      {ACTION_DEFS.map((key) => {
        const node = defs[key];
        return (
          <div key={key}>
            <Heading as="h3" id={`api-${key}`}>
              {actionTypeLabel(key)}
            </Heading>
            {node.description ? <p>{node.description}</p> : null}
            <PropsTable node={node} />
          </div>
        );
      })}
    </>
  );
}

interface TocItem {
  readonly value: string;
  readonly id: string;
  readonly level: number;
}

/**
 * Table des matières de la page « Référence API ». Ses titres sont rendus par
 * <ApiReference/> en JSX, donc invisibles pour le générateur de TOC de
 * Docusaurus (qui ne lit que les titres Markdown du source MDX). On la fournit
 * explicitement : `api.mdx` la réexporte en `toc`, et Docusaurus respecte un
 * export `toc` manuel sans l'écraser. La partie « actions » dérive des mêmes
 * `ACTION_DEFS` que le rendu pour ne pas se désynchroniser.
 */
export const apiReferenceToc: TocItem[] = [
  { value: 'DataFlowSpec (racine)', id: 'api-dataflowspec', level: 2 },
  { value: 'Node', id: 'api-node', level: 2 },
  { value: 'Connection', id: 'api-connection', level: 2 },
  { value: 'Packet', id: 'api-packet', level: 2 },
  { value: 'ObjectContent', id: 'api-content', level: 2 },
  { value: 'Actions', id: 'api-actions', level: 2 },
  ...ACTION_DEFS.map((key) => ({
    value: actionTypeLabel(key),
    id: `api-${key}`,
    level: 3,
  })),
];

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

export const docPages: DocPage[] = [
  {
    id: 'introduction',
    label: 'Introduction',
    group: 'Démarrer',
    title: 'Introduction',
    render: () => (
      <>
        <p className="docs-lead">
          React DataFlow Animator compile une spécification JSON en une
          animation déterministe et navigable de flux de données.
        </p>
        <h2 id="apercu">Aperçu</h2>
        <p>
          Tu décris des <strong>nœuds</strong> (statiques), des{' '}
          <strong>paquets</strong> (dynamiques) et une liste d’
          <strong>actions</strong>. Le moteur place les nœuds, trace les
          connexions et joue les actions sur une chronologie.
        </p>
        <DataFlowPlayer theme="auto" spec={demosById.clientServer.spec} />
        <h2 id="principes">Principes</h2>
        <ul>
          <li>
            Le temps est l’unique source de vérité (moteur déterministe, sans
            GSAP).
          </li>
          <li>Aucune coordonnée à fournir : placement automatique.</li>
          <li>SSR-safe : s’intègre directement dans Docusaurus.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'installation',
    label: 'Installation',
    group: 'Démarrer',
    title: 'Installation',
    render: () => (
      <>
        <p className="docs-lead">
          React 18 ou 19 est requis (peer dependency).
        </p>
        <h2 id="npm">Installation npm</h2>
        <pre className="code">{install}</pre>
        <h2 id="utilisation">Utilisation</h2>
        <pre className="code">{usage}</pre>
        <h2 id="docusaurus">Docusaurus</h2>
        <p>
          Le composant est SSR-safe. Importe le CSS une fois (par ex. dans{' '}
          <code className="inline">src/css/custom.css</code>) puis utilise{' '}
          <code className="inline">&lt;DataFlowPlayer /&gt;</code> dans
          n’importe quel fichier <code className="inline">.mdx</code>.
        </p>
      </>
    ),
  },
  {
    id: 'layout',
    label: 'Disposition',
    group: 'Concepts',
    title: 'Disposition (layout)',
    render: () => (
      <>
        <p className="docs-lead">
          Les nœuds sont placés sans coordonnées, via{' '}
          <code className="inline">direction</code> et{' '}
          <code className="inline">lane</code>.
        </p>
        <h2 id="lanes">Grilles & lanes</h2>
        <p>
          En <code className="inline">left-to-right</code>,{' '}
          <code className="inline">lane</code> est la colonne (la position le
          long du flux) ; plusieurs nœuds d’une même lane sont empilés sur l’axe
          transverse. Les directions{' '}
          <code className="inline">right-to-left</code>,{' '}
          <code className="inline">top-to-bottom</code> et{' '}
          <code className="inline">bottom-to-top</code> inversent/échangent les
          axes.
        </p>
        <h2 id="alignement">Alignement entre lanes</h2>
        <p>
          <code className="inline">align_with</code> aligne un nœud sur l’axe
          transverse d’un autre (vertical si la direction est horizontale) —
          utile pour aligner deux nœuds de lanes différentes qui ne tomberaient
          pas naturellement en face l’un de l’autre.
        </p>
        <h2 id="circular">Disposition circulaire</h2>
        <p>
          En <code className="inline">circular</code>, le nœud{' '}
          <code className="inline">main</code> est au centre et les autres sont
          répartis sur un cercle.
        </p>
        <DataFlowPlayer theme="auto" spec={demosById.circular.spec} />
      </>
    ),
  },
  {
    id: 'timeline',
    label: 'Timeline & étapes',
    group: 'Concepts',
    title: 'Timeline & navigation par étapes',
    render: () => (
      <>
        <p className="docs-lead">
          Les actions racines sont jouées séquentiellement ; chacune devient une
          étape logique.
        </p>
        <h2 id="arrets">Points d’arrêt</h2>
        <p>
          La navigation Précédent/Suivant s’arrête sur des{' '}
          <strong>points d’arrêt</strong> (marques de la timeline). Un{' '}
          <code className="inline">move</code> en produit deux : à l’apparition
          du paquet et à son arrivée.
        </p>
        <h2 id="pause">Pause entre étapes</h2>
        <p>
          Une courte pause sépare deux étapes pour que chaque arrêt montre
          l’étape « posée » seule, sans chevaucher l’apparition de la suivante.
        </p>
        <h2 id="wait-for">Synchronisation (wait_for)</h2>
        <p>
          Une action peut démarrer à la <em>fin</em> d’une autre via{' '}
          <code className="inline">wait_for</code> (par ID), pour des séquences
          asynchrones (ex: attendre la fin d’un{' '}
          <code className="inline">loading</code>).
        </p>
      </>
    ),
  },
  {
    id: 'lifecycle',
    label: 'Cycle de vie',
    group: 'Concepts',
    title: 'Cycle de vie des éléments',
    render: () => (
      <>
        <p className="docs-lead">
          Par défaut, un élément temporaire disparaît à la fin de son animation.
          Deux mécanismes prolongent sa visibilité.
        </p>
        <h2 id="keep-until-next">keep_until_next</h2>
        <p>
          Maintient l’élément visible jusqu’au{' '}
          <strong>début de l’étape racine suivante</strong> (donc à travers la
          pause inter-étapes). Valeurs par défaut :
        </p>
        <ul>
          <li>
            <code className="inline">false</code> pour{' '}
            <code className="inline">move</code> et{' '}
            <code className="inline">loading</code> ;
          </li>
          <li>
            <code className="inline">true</code> pour{' '}
            <code className="inline">arrow</code>,{' '}
            <code className="inline">comment</code> et{' '}
            <code className="inline">set_content</code>.
          </li>
        </ul>
        <p>On peut toujours forcer la valeur explicitement dans l’action.</p>
        <h2 id="keep-until">keep_until</h2>
        <p>
          Maintient l’élément visible jusqu’au <strong>début</strong> de
          l’action ciblée (par ID) — utile pour garder une flèche ou un bloc de
          code à l’écran sur plusieurs étapes.
        </p>
        <h2 id="keep-until-end">keep_until_end</h2>
        <p>
          Booléen : maintient l’élément visible jusqu’à la <strong>fin</strong>{' '}
          de la chronologie.
        </p>
      </>
    ),
  },
  {
    id: 'collision',
    label: 'Connexions & anti-collision',
    group: 'Concepts',
    title: 'Connexions & anti-collision',
    render: () => (
      <>
        <p className="docs-lead">
          Les flèches permanentes (décor) vivent dans le tableau racine{' '}
          <code className="inline">connections</code>.
        </p>
        <h2 id="path-shifting">Voies parallèles</h2>
        <p>
          Quand un segment A↔B est emprunté dans les deux sens (flèches ou
          paquets), le moteur décale automatiquement les trajets sur des voies
          parallèles pour éviter la superposition.
        </p>
        <DataFlowPlayer theme="auto" spec={demosById.collision.spec} />
      </>
    ),
  },
  {
    id: 'actions',
    label: 'Types d’actions',
    group: 'Référence',
    title: 'Types d’actions',
    render: () => (
      <>
        <p className="docs-lead">Les six actions disponibles.</p>
        <ul>
          <li>
            <strong>move</strong> — déplace un objet dynamique de{' '}
            <code className="inline">from</code> vers{' '}
            <code className="inline">to</code>.
          </li>
          <li>
            <strong>arrow</strong> — trace une flèche animée (styles{' '}
            <code className="inline">solid</code>/
            <code className="inline">dotted</code>/
            <code className="inline">dashed</code>).
          </li>
          <li>
            <strong>parallel</strong> — exécute plusieurs actions au même
            instant.
          </li>
          <li>
            <strong>loading</strong> — spinner de chargement sur un nœud.
          </li>
          <li>
            <strong>set_content</strong> — mute le contenu d’un nœud (code,
            texte, image).
          </li>
          <li>
            <strong>comment</strong> — bulle de texte près d’un nœud.
          </li>
          <li>
            <strong>highlight</strong> — surligne un nœud statique ou une
            connexion (par ID).
          </li>
        </ul>
        <p>
          Voir la <a href="#/docs/api">référence API</a> pour les champs
          détaillés de chaque action.
        </p>
      </>
    ),
  },
  {
    id: 'api',
    label: 'Référence API',
    group: 'Référence',
    title: 'Référence API',
    render: () => <ApiReference />,
  },
];

export const docPagesById = Object.fromEntries(docPages.map((p) => [p.id, p]));
