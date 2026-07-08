/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { StaticNode } from './StaticNode';
import { NodeView } from './NodeView';
import { highlightCode } from '../../highlight/highlight';
import type { Node } from '../../types';

afterEach(cleanup);

const placement = { cx: 0.5, cy: 0.5 };

function renderNode(object: Node) {
  return render(
    <StaticNode
      object={object}
      placement={placement}
      highlight={highlightCode}
    />
  );
}

describe('composants électriques', () => {
  it('rend un pictogramme électrique comme icône SVG', () => {
    const { container } = render(
      <NodeView node={{ id: 'r1', type: 'resistor' }} />
    );
    expect(container.querySelector('.rdfa-node-icon svg')).toBeTruthy();
    expect(container.querySelector('.rdfa-node-panel')).toBeNull();
  });

  it('value + unit forment le libellé (sans texte)', () => {
    const { container } = renderNode({
      id: 'r1',
      type: 'resistor',
      value: '10',
      unit: 'kΩ',
    });
    expect(container.querySelector('.rdfa-node-label')?.textContent).toBe(
      '10 kΩ'
    );
  });

  it('text et value sont combinés dans le libellé', () => {
    const { container } = renderNode({
      id: 'r1',
      type: 'resistor',
      text: 'R1',
      value: 10,
      unit: 'kΩ',
    });
    expect(container.querySelector('.rdfa-node-label')?.textContent).toBe(
      'R1 · 10 kΩ'
    );
  });

  it("l'interrupteur ouvert et fermé produisent des leviers différents", () => {
    const open = render(
      <NodeView node={{ id: 'sw', type: 'switch' }} closed={0} />
    );
    const openPaths = Array.from(open.container.querySelectorAll('path')).map(
      (p) => p.getAttribute('d')
    );
    cleanup();
    const closed = render(
      <NodeView node={{ id: 'sw', type: 'switch' }} closed={1} />
    );
    const closedPaths = Array.from(
      closed.container.querySelectorAll('path')
    ).map((p) => p.getAttribute('d'));
    // The lever path (last) differs between the two contact states.
    expect(openPaths).not.toEqual(closedPaths);
  });

  it('un signal rend un pad avec la valeur du bit, sans badge d’angle', () => {
    const { container } = renderNode({
      id: 'A',
      type: 'signal',
      text: 'A',
      icon: '1',
    });
    const pad = container.querySelector('.rdfa-signal');
    expect(pad).toBeTruthy();
    expect(container.querySelector('.rdfa-signal-value')?.textContent).toBe(
      '1'
    );
    expect(container.querySelector('.rdfa-node-badge')).toBeNull();
  });

  it('le push_button lit son état closed statique', () => {
    const { container } = renderNode({
      id: 'pb',
      type: 'push_button',
      closed: true,
    });
    expect(container.querySelector('.rdfa-node-icon svg')).toBeTruthy();
  });
});
