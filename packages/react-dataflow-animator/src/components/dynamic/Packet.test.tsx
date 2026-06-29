/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { Packet } from './Packet';
import type { Packet as PacketSpec } from '../../types';

afterEach(cleanup);

function renderPacket(object: PacketSpec) {
  return render(<Packet object={object} x={0} y={0} />);
}

describe('Packet — rendu des paquets mobiles', () => {
  it('http_packet : enveloppe classique, pas de panneau de nœud', () => {
    const { container } = renderPacket({
      id: 'p',
      kind: 'http_packet',
      packet_content: { header: 'GET /api' },
    });
    expect(container.querySelector('.rdfa-packet-header')?.textContent).toBe(
      'GET /api'
    );
    // No node panel, and the wrapper keeps its own box (no panel modifier).
    expect(container.querySelector('.rdfa-node-panel')).toBeNull();
    expect(container.querySelector('.rdfa-packet--panel')).toBeNull();
  });

  it('complex_node : voyage en réutilisant le NodePanel (en-tête + corps)', () => {
    const { container } = renderPacket({
      id: 'p',
      kind: 'complex_node',
      header: 'POST /login',
      body: '{ "user": "alice" }',
    });
    // Reuses the static node panel, not the http packet markup.
    expect(container.querySelector('.rdfa-node-panel--complex')).toBeTruthy();
    expect(
      container.querySelector('.rdfa-node-panel-header')?.textContent
    ).toBe('POST /login');
    expect(container.querySelector('.rdfa-node-panel-body')?.textContent).toBe(
      '{ "user": "alice" }'
    );
    // Wrapper strips its own box so only the panel box shows.
    expect(container.querySelector('.rdfa-packet--panel')).toBeTruthy();
  });

  it('simple_node : panneau corps seul, sans en-tête', () => {
    const { container } = renderPacket({
      id: 'p',
      kind: 'simple_node',
      header: 'ignoré',
      body: 'Worker',
    });
    expect(container.querySelector('.rdfa-node-panel-body')?.textContent).toBe(
      'Worker'
    );
    // `simple_node` ignores `header` (only `complex_node` shows it).
    expect(container.querySelector('.rdfa-node-panel-header')).toBeNull();
    expect(container.querySelector('.rdfa-packet--panel')).toBeTruthy();
  });
});
