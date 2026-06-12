/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { Stage } from './Stage';
import { compile } from '../engine/compiler';
import { highlightCode } from '../highlight/highlight';
import type { DataFlowSpec } from '../types';

afterEach(cleanup);

// Fournit une géométrie fixe pour découpler Stage de la mesure DOM réelle.
vi.mock('../hooks/useStageGeometry', () => ({
  useStageGeometry: () => ({
    stageRef: { current: null },
    geometry: {
      client: { id: 'client', x: 100, y: 300, width: 60, height: 60 },
      server: { id: 'server', x: 700, y: 300, width: 60, height: 60 },
    },
    aspect: 800 / 600,
    width: 800,
    height: 600,
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
    // à t=400 le clip est en animation (progress=0.2, opacity=1)
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
    // arrow clip : startMs=0, endMs=500, actif à t=250 (progress=0.5)
    const { container } = render(
      <Stage
        spec={spec}
        timeline={timeline}
        t={250}
        highlight={highlightCode}
      />
    );
    // Le SVG conteneur existe toujours ; la polyline confirme qu'ArrowLine est monté.
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
    // comment clip actif à t=250
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

  it('rend le spinner pendant une action loading', () => {
    const spec: DataFlowSpec = {
      nodes: BASE_NODES,
      packets: [],
      timeline: [{ type: 'loading', object: 'server', duration: 500 }],
    };
    const { timeline } = compile(spec);
    // loading clip : startMs=0, endMs=500, actif à t=250
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
    // client est visible, server ne doit pas être dans le DOM
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
    // À t=300 (= durationMs), progress=1 → nodeOpacity=1 → nœud visible.
    // evaluate() inclut les clips à t === visibleUntilMs (borne inclusive).
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
    // À t=300 (= durationMs=endMs), progress=1 → opacity = 1-1 = 0 → nœud retiré.
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
});
