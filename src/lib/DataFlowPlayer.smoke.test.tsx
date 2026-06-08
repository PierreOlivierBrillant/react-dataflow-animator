/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { DataFlowPlayer } from './DataFlowPlayer';
import type { DataFlowSpec } from './types';

afterEach(cleanup);

const spec: DataFlowSpec = {
  direction: 'left-to-right',
  static_objects: [
    { id: 'editor', object_type: 'laptop', text: 'IDE', subicon: 'typescript', lane: 1 },
    { id: 'server', object_type: 'server', text: 'Serveur', subicon: 'node', lane: 2 },
  ],
  dynamic_objects: [{ id: 'd', object_type: 'http_packet', packet_content: { header: 'GET /' } }],
  actions: [
    {
      action_type: 'set_content',
      object: 'editor',
      content: { content_type: 'code', language: 'javascript', content: 'const add = (a, b) => a + b;' },
    },
    { action_type: 'move', object: 'd', from: 'editor', to: 'server', duration: 600 },
  ],
};

describe('DataFlowPlayer (montage réel)', () => {
  it('rend les nœuds, les contrôles et le contenu coloré sans planter', () => {
    const { container } = render(<DataFlowPlayer spec={spec} />);

    // Nœuds + labels.
    expect(screen.getByText('IDE')).toBeTruthy();
    expect(screen.getByText('Serveur')).toBeTruthy();

    // Contrôles (is_navigable).
    expect(screen.getByLabelText('Lecture')).toBeTruthy();
    expect(screen.getByLabelText('Étape suivante')).toBeTruthy();

    // set_content actif à t=0 -> terminal de code avec coloration Prism.
    expect(container.querySelector('.rdfa-terminal')).toBeTruthy();
    expect(container.querySelector('.rdfa-code .token')).toBeTruthy();
  });

  it('respecte controls=false', () => {
    const { container } = render(<DataFlowPlayer spec={spec} controls={false} />);
    expect(container.querySelector('.rdfa-controls')).toBeNull();
  });
});
