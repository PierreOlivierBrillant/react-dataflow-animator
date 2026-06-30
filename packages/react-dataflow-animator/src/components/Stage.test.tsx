/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { Stage } from './Stage';
import { compile } from '../engine/compiler';
import { highlightCode } from '../highlight/highlight';
import type { DataFlowSpec } from '../types';

afterEach(cleanup);

// Mutable geometry: tests that need a different context
// can reassign `mockGeometry` before rendering.
let mockGeometry: Record<
  string,
  {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    labelH?: number;
    labelW?: number;
  }
> = {
  client: { id: 'client', x: 100, y: 300, width: 60, height: 60 },
  server: { id: 'server', x: 700, y: 300, width: 60, height: 60 },
};

vi.mock('../hooks/useStageGeometry', () => ({
  useStageGeometry: () => ({
    stageRef: { current: null },
    geometry: mockGeometry,
    aspect: 800 / 600,
    width: 800,
    height: 600,
    forceRemeasure: () => {},
  }),
}));

const BASE_NODES: DataFlowSpec['nodes'] = [
  { id: 'client', type: 'laptop', text: 'Client', lane: 1 },
  { id: 'server', type: 'server', text: 'Serveur', lane: 2 },
];

describe('Stage — rendu à t fixe', () => {
  it('rend un paquet pendant une action move', () => {
    const spec: DataFlowSpec = {
      nodes: BASE_NODES,
      packets: [
        { id: 'pkt', kind: 'http_packet', packet_content: { header: 'GET /' } },
      ],
      timeline: [
        {
          type: 'move',
          object: 'pkt',
          from: 'client',
          to: 'server',
          duration: 500,
        },
      ],
    };
    const { timeline } = compile(spec);
    // startMs=0, animStartMs=300, endMs=800, visibleUntilMs=1100
    // at t=400 the clip is animating (progress=0.2, opacity=1)
    const { container } = render(
      <Stage
        spec={spec}
        timeline={timeline}
        t={400}
        highlight={highlightCode}
      />
    );
    expect(container.querySelector('.rdfa-packet')).toBeTruthy();
  });

  it('rend une flèche animée pendant une action arrow', () => {
    const spec: DataFlowSpec = {
      nodes: BASE_NODES,
      packets: [],
      timeline: [
        { type: 'arrow', from: 'client', to: 'server', duration: 500 },
      ],
    };
    const { timeline } = compile(spec);
    // arrow clip: startMs=0, endMs=500, active at t=250 (progress=0.5)
    const { container } = render(
      <Stage
        spec={spec}
        timeline={timeline}
        t={250}
        highlight={highlightCode}
      />
    );
    // The SVG container still exists; the polyline confirms ArrowLine is mounted.
    expect(container.querySelector('.rdfa-arrow-svg')).toBeTruthy();
    expect(container.querySelector('.rdfa-arrow-line')).toBeTruthy();
  });

  it('rend une bulle de commentaire pendant une action comment', () => {
    const spec: DataFlowSpec = {
      nodes: BASE_NODES,
      packets: [],
      timeline: [
        {
          type: 'comment',
          object: 'server',
          text: 'Réponse reçue',
          duration: 500,
        },
      ],
    };
    const { timeline } = compile(spec);
    // comment clip active at t=250
    const { container } = render(
      <Stage
        spec={spec}
        timeline={timeline}
        t={250}
        highlight={highlightCode}
      />
    );
    const bubble = container.querySelector('.rdfa-comment');
    expect(bubble).toBeTruthy();
    expect(bubble!.textContent).toContain('Réponse reçue');
  });

  it('rend un commentaire omniscient (sans object) en haut du stage', () => {
    const spec: DataFlowSpec = {
      nodes: BASE_NODES,
      packets: [],
      timeline: [
        { type: 'comment', text: 'Étape 1 : connexion', duration: 500 },
      ],
    };
    const { timeline } = compile(spec);
    const { container } = render(
      <Stage
        spec={spec}
        timeline={timeline}
        t={250}
        highlight={highlightCode}
      />
    );
    const bubble = container.querySelector('.rdfa-comment--omniscient');
    expect(bubble).toBeTruthy();
    expect(bubble!.textContent).toContain('Étape 1 : connexion');
    // No bubble tail
    expect(bubble!.querySelector('.rdfa-comment-tail')).toBeNull();
  });

  it('rend le spinner pendant une action loading', () => {
    const spec: DataFlowSpec = {
      nodes: BASE_NODES,
      packets: [],
      timeline: [{ type: 'loading', object: 'server', duration: 500 }],
    };
    const { timeline } = compile(spec);
    // loading clip: startMs=0, endMs=500, active at t=250
    const { container } = render(
      <Stage
        spec={spec}
        timeline={timeline}
        t={250}
        highlight={highlightCode}
      />
    );
    expect(container.querySelector('.rdfa-spinner')).toBeTruthy();
  });

  it('cache un nœud avec visible:false sur le nœud statique (avant toute action)', () => {
    const spec: DataFlowSpec = {
      nodes: [
        { id: 'client', type: 'laptop', text: 'Client', lane: 1 },
        {
          id: 'server',
          type: 'server',
          text: 'Serveur',
          lane: 2,
          visible: false,
        },
      ],
      packets: [],
      timeline: [],
    };
    const { timeline } = compile(spec);
    const { container } = render(
      <Stage spec={spec} timeline={timeline} t={0} highlight={highlightCode} />
    );
    // client is visible, server should not be in the DOM
    const nodes = container.querySelectorAll('[data-node-id]');
    const ids = Array.from(nodes).map((n) => n.getAttribute('data-node-id'));
    expect(ids).toContain('client');
    expect(ids).not.toContain('server');
  });

  it('affiche un nœud caché après set_visible:true (transition terminée)', () => {
    const spec: DataFlowSpec = {
      nodes: [
        { id: 'client', type: 'laptop', lane: 1 },
        { id: 'server', type: 'server', lane: 2, visible: false },
      ],
      packets: [],
      timeline: [
        { type: 'set_visible', object: 'server', visible: true, duration: 300 },
      ],
    };
    const { timeline } = compile(spec);
    // set_visible startMs=0, endMs=300, durationMs=300.
    // At t=300 (= durationMs), progress=1 → nodeOpacity=1 → node visible.
    // evaluate() includes clips at t === visibleUntilMs (inclusive bound).
    const { container } = render(
      <Stage
        spec={spec}
        timeline={timeline}
        t={300}
        highlight={highlightCode}
      />
    );
    const ids = Array.from(container.querySelectorAll('[data-node-id]')).map(
      (n) => n.getAttribute('data-node-id')
    );
    expect(ids).toContain('server');
  });

  it('rend une zone englobant deux nœuds', () => {
    const spec: DataFlowSpec = {
      nodes: BASE_NODES,
      packets: [],
      zones: [{ id: 'z1', contains: ['client', 'server'], label: 'Réseau' }],
      timeline: [],
    };
    const { timeline } = compile(spec);
    const { container } = render(
      <Stage spec={spec} timeline={timeline} t={0} highlight={highlightCode} />
    );
    expect(container.querySelector('.rdfa-zone')).toBeTruthy();
    expect(container.querySelector('.rdfa-zone-label')?.textContent).toBe(
      'Réseau'
    );
  });

  it('applique la couleur personnalisée via la variable CSS', () => {
    const spec: DataFlowSpec = {
      nodes: BASE_NODES,
      packets: [],
      zones: [{ contains: ['client'], color: '#ff0000' }],
      timeline: [],
    };
    const { timeline } = compile(spec);
    const { container } = render(
      <Stage spec={spec} timeline={timeline} t={0} highlight={highlightCode} />
    );
    const zone = container.querySelector('.rdfa-zone') as HTMLElement;
    expect(zone).toBeTruthy();
    expect(zone.style.getPropertyValue('--rdfa-zone-color')).toBe('#ff0000');
  });

  it("rend deux zones dont une est imbriquee dans l'autre", () => {
    const spec: DataFlowSpec = {
      nodes: BASE_NODES,
      packets: [],
      zones: [
        { id: 'inner', contains: ['client'], label: 'Client' },
        { id: 'outer', contains: ['inner', 'server'], label: 'Tout' },
      ],
      timeline: [],
    };
    const { timeline } = compile(spec);
    const { container } = render(
      <Stage spec={spec} timeline={timeline} t={0} highlight={highlightCode} />
    );
    expect(container.querySelectorAll('.rdfa-zone').length).toBe(2);
  });

  it('zone : englobe le label large (labelW > width) dans la dimension horizontale', () => {
    // client: x=100, width=60 but labelW=200 → zone should extend from 0 to 200
    // (100-100 to 100+100) before padding (ZONE_PADDING=20).
    // With padding: left = 0-20 = -20, width = 200+40 = 240.
    mockGeometry = {
      client: {
        id: 'client',
        x: 100,
        y: 300,
        width: 60,
        height: 60,
        labelH: 16,
        labelW: 200,
      },
    };
    const spec: DataFlowSpec = {
      nodes: [{ id: 'client', type: 'laptop', text: 'Client', lane: 1 }],
      packets: [],
      zones: [{ contains: ['client'] }],
      timeline: [],
    };
    const { timeline } = compile(spec);
    const { container } = render(
      <Stage spec={spec} timeline={timeline} t={0} highlight={highlightCode} />
    );
    const zone = container.querySelector('.rdfa-zone') as HTMLElement;
    expect(zone).toBeTruthy();
    // left must account for label: 100 - 200/2 - 20 = -20
    expect(parseFloat(zone.style.left)).toBeCloseTo(-20, 0);
    // width must cover full label width: 200 + 2*20 = 240
    expect(parseFloat(zone.style.width)).toBeCloseTo(240, 0);
    // Resets default geometry for subsequent tests.
    mockGeometry = {
      client: { id: 'client', x: 100, y: 300, width: 60, height: 60 },
      server: { id: 'server', x: 700, y: 300, width: 60, height: 60 },
    };
  });

  it("n'affiche pas une zone dont les IDs sont tous inconnus", () => {
    const spec: DataFlowSpec = {
      nodes: BASE_NODES,
      packets: [],
      zones: [{ contains: ['inexistant'] }],
      timeline: [],
    };
    const { timeline } = compile(spec);
    const { container } = render(
      <Stage spec={spec} timeline={timeline} t={0} highlight={highlightCode} />
    );
    expect(container.querySelector('.rdfa-zone')).toBeNull();
  });

  it('cache un nœud après set_visible:false (transition terminée)', () => {
    const spec: DataFlowSpec = {
      nodes: [
        { id: 'client', type: 'laptop', lane: 1 },
        { id: 'server', type: 'server', lane: 2 },
      ],
      packets: [],
      timeline: [
        {
          type: 'set_visible',
          object: 'server',
          visible: false,
          duration: 300,
        },
      ],
    };
    const { timeline } = compile(spec);
    // At t=300 (= durationMs=endMs), progress=1 → opacity = 1-1 = 0 → node removed.
    const { container } = render(
      <Stage
        spec={spec}
        timeline={timeline}
        t={300}
        highlight={highlightCode}
      />
    );
    const ids = Array.from(container.querySelectorAll('[data-node-id]')).map(
      (n) => n.getAttribute('data-node-id')
    );
    expect(ids).not.toContain('server');
  });

  it('recolore un nœud via set_color (cross-fade color-mix, fin de transition)', () => {
    const spec: DataFlowSpec = {
      nodes: [
        { id: 'client', type: 'laptop', lane: 1 },
        { id: 'server', type: 'circle', lane: 2, background_color: 'crimson' },
      ],
      packets: [],
      timeline: [
        {
          type: 'set_color',
          object: 'server',
          background_color: '#1a1a1a',
          duration: 400,
        },
      ],
    };
    const { timeline } = compile(spec);
    // set_color startMs=0, endMs=400, durationMs=400. At t=400, progress=1 →
    // color-mix at 100% of the target, faded from the node's initial crimson.
    const { container } = render(
      <Stage
        spec={spec}
        timeline={timeline}
        t={400}
        highlight={highlightCode}
      />
    );
    const node = container.querySelector(
      '[data-node-id="server"]'
    ) as HTMLElement;
    const fill = node.style.getPropertyValue('--rdfa-fill');
    expect(fill).toContain('color-mix');
    expect(fill).toContain('crimson'); // cross-faded FROM the initial color
    expect(fill).toContain('#1a1a1a'); // ...TO the target
    expect(fill).toContain('100.00%'); // fully reached at end of transition
    // The pictogram tint badge is enabled by the override too.
    expect(node.classList.contains('rdfa-node--tinted')).toBe(true);
  });

  it('set_color sur un nœud sans couleur initiale : adoption directe (sans color-mix)', () => {
    const spec: DataFlowSpec = {
      nodes: [
        { id: 'client', type: 'laptop', lane: 1 },
        { id: 'server', type: 'circle', lane: 2 },
      ],
      packets: [],
      timeline: [
        {
          type: 'set_color',
          object: 'server',
          background_color: 'seagreen',
          duration: 400,
        },
      ],
    };
    const { timeline } = compile(spec);
    // No faithful "from": the override adopts the target directly rather than
    // inventing an origin color to mix from.
    const { container } = render(
      <Stage
        spec={spec}
        timeline={timeline}
        t={200}
        highlight={highlightCode}
      />
    );
    const node = container.querySelector(
      '[data-node-id="server"]'
    ) as HTMLElement;
    expect(node.style.getPropertyValue('--rdfa-fill')).toBe('seagreen');
  });

  it('set_color : avant le début de la transition, la couleur initiale tient', () => {
    const spec: DataFlowSpec = {
      nodes: [
        { id: 'client', type: 'laptop', lane: 1 },
        { id: 'server', type: 'circle', lane: 2, background_color: 'crimson' },
      ],
      packets: [],
      timeline: [
        { type: 'arrow', id: 'A', from: 'client', to: 'server', duration: 300 },
        {
          type: 'set_color',
          object: 'server',
          background_color: '#1a1a1a',
          duration: 400,
        },
      ],
    };
    const { timeline } = compile(spec);
    // At t=0 the set_color has not started: the node keeps its static crimson,
    // with no color-mix override yet.
    const { container } = render(
      <Stage spec={spec} timeline={timeline} t={0} highlight={highlightCode} />
    );
    const node = container.querySelector(
      '[data-node-id="server"]'
    ) as HTMLElement;
    expect(node.style.getPropertyValue('--rdfa-fill')).toBe('crimson');
  });

  it('mode arbre : dessine les arêtes parent→enfant et déplace les nœuds après une rotation', () => {
    // Geometry for the four tree nodes so edges (which need a size) render.
    mockGeometry = {
      g: { id: 'g', x: 400, y: 100, width: 40, height: 40 },
      p: { id: 'p', x: 200, y: 300, width: 40, height: 40 },
      u: { id: 'u', x: 600, y: 300, width: 40, height: 40 },
      n: { id: 'n', x: 100, y: 500, width: 40, height: 40 },
    };
    const spec: DataFlowSpec = {
      direction: 'tree',
      tree: {
        root: 'g',
        children: { g: { left: 'p', right: 'u' }, p: { left: 'n' } },
      },
      nodes: [
        { id: 'g', type: 'circle', body: '13' },
        { id: 'p', type: 'circle', body: '8' },
        { id: 'u', type: 'circle', body: '17' },
        { id: 'n', type: 'circle', body: '1' },
      ],
      packets: [],
      timeline: [
        {
          type: 'rotate_subtree',
          object: 'g',
          rotation: 'left',
          duration: 600,
        },
      ],
    };
    const { timeline } = compile(spec);

    // Before the rotation (t=0): all four nodes render and the three tree edges
    // are drawn (no spec.connections → every arrow line is a tree edge).
    const initial = render(
      <Stage spec={spec} timeline={timeline} t={0} highlight={highlightCode} />
    );
    const ids = Array.from(
      initial.container.querySelectorAll('[data-node-id]')
    ).map((n) => n.getAttribute('data-node-id'));
    expect(ids).toEqual(expect.arrayContaining(['g', 'p', 'u', 'n']));
    expect(initial.container.querySelectorAll('.rdfa-arrow-line').length).toBe(
      3
    );
    const topAt = (c: Element, id: string) =>
      parseFloat(
        (c.querySelector(`[data-node-id="${id}"]`) as HTMLElement).style.top
      );
    const uTop0 = topAt(initial.container, 'g'); // g is the root (top) initially
    const uTopRoot0 = topAt(initial.container, 'u');
    expect(uTop0).toBeLessThan(uTopRoot0); // g above u before the rotation
    cleanup();

    // After the left rotation around g (t = durationMs): u becomes the root and
    // rises above g — the nodes have glided to their new depths.
    const final = render(
      <Stage
        spec={spec}
        timeline={timeline}
        t={timeline.durationMs}
        highlight={highlightCode}
      />
    );
    expect(topAt(final.container, 'u')).toBeLessThan(
      topAt(final.container, 'g')
    );
  });
});
