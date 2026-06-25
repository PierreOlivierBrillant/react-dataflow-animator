/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DataFlowPlayer } from './DataFlowPlayer';
import type { DataFlowSpec } from './types';

afterEach(cleanup);

const spec: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [
    {
      id: 'editor',
      type: 'laptop',
      text: 'IDE',
      icon: 'typescript',
      lane: 1,
    },
    {
      id: 'server',
      type: 'server',
      text: 'Serveur',
      icon: 'node',
      lane: 2,
    },
  ],
  packets: [
    {
      id: 'd',
      kind: 'http_packet',
      packet_content: { header: 'GET /' },
    },
  ],
  timeline: [
    {
      type: 'set_content',
      object: 'editor',
      content: {
        type: 'code',
        language: 'javascript',
        value: 'const add = (a, b) => a + b;',
      },
    },
    {
      type: 'move',
      object: 'd',
      from: 'editor',
      to: 'server',
      duration: 600,
    },
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
    const { container } = render(
      <DataFlowPlayer spec={spec} controls={false} />
    );
    expect(container.querySelector('.rdfa-controls')).toBeNull();
  });

  it('n’affiche pas le bouton JSON par défaut', () => {
    render(<DataFlowPlayer spec={spec} />);
    expect(screen.queryByLabelText('Spécification JSON')).toBeNull();
  });

  it('ouvre la fenêtre JSON colorée quand exportable', () => {
    render(<DataFlowPlayer spec={spec} exportable />);
    fireEvent.click(screen.getByLabelText('Spécification JSON'));
    const dialog = screen.getByRole('dialog');
    // JSON présent et colorisé (tokens Prism) dans la fenêtre.
    const code = dialog.querySelector('.rdfa-dialog-code');
    expect(code?.textContent).toContain('"nodes"');
    expect(code?.querySelector('.token')).toBeTruthy();
  });
});
