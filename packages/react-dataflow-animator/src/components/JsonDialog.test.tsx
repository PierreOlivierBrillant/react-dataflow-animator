/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { JsonDialog, type JsonDialogProps } from './JsonDialog';

afterEach(cleanup);

const identity = (code: string) => code;

function setup(overrides: Partial<JsonDialogProps> = {}) {
  const props: JsonDialogProps = {
    json: '{"a":1}',
    highlight: identity,
    onCopy: vi.fn().mockResolvedValue(undefined),
    onDownload: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(<JsonDialog {...props} />);
  return props;
}

describe('JsonDialog', () => {
  it('affiche le JSON fourni', () => {
    setup({ json: '{"a":1}' });
    expect(screen.getByText('{"a":1}')).toBeTruthy();
  });

  it('applique la coloration syntaxique en langage json', () => {
    const highlight = vi.fn(() => '<span class="token property">"a"</span>');
    setup({ highlight });
    expect(highlight).toHaveBeenCalledWith('{"a":1}', 'json');
    expect(document.querySelector('.rdfa-dialog-code .token')).toBeTruthy();
  });

  it('copie puis affiche un retour transitoire', async () => {
    const onCopy = vi.fn().mockResolvedValue(undefined);
    setup({ onCopy });
    fireEvent.click(screen.getByLabelText('Copier'));
    expect(onCopy).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByLabelText('Copié')).toBeTruthy());
  });

  it('télécharge le JSON', () => {
    const onDownload = vi.fn();
    setup({ onDownload });
    fireEvent.click(screen.getByLabelText('Télécharger le JSON'));
    expect(onDownload).toHaveBeenCalled();
  });

  it('ferme via le bouton et via le backdrop', () => {
    const onClose = vi.fn();
    setup({ onClose });
    fireEvent.click(screen.getByLabelText('Fermer'));
    fireEvent.click(screen.getByLabelText('Fermer la fenêtre'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('reste silencieux si la copie échoue', async () => {
    const onCopy = vi.fn().mockRejectedValue(new Error('denied'));
    setup({ onCopy });
    fireEvent.click(screen.getByLabelText('Copier'));
    await waitFor(() => expect(onCopy).toHaveBeenCalled());
    expect(screen.queryByLabelText('Copié')).toBeNull();
  });
});
