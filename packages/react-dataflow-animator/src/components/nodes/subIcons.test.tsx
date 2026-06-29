/** @vitest-environment jsdom */
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { getSubIcon } from './subIcons';

afterEach(cleanup);

// A known technology renders the react-icons icon with a <title> = passed name;
// the free text badge renders a <circle> + <text> without <title>.
function renderSubIcon(name: string) {
  return render(getSubIcon(name) as ReactElement);
}

describe('getSubIcon — icônes connues nouvellement câblées', () => {
  it.each([
    'oidc',
    'http',
    'dns',
    'kubernetes',
    'k8s',
    'google pay',
    'googlepay',
    'apple pay',
    'applepay',
    '5g',
    'wifi',
    'bluetooth',
    'bank',
    'banque',
    'piggybank',
    'visa',
    'mastercard',
  ])('résout « %s » vers une icône (pas une pastille de texte)', (name) => {
    const { container } = renderSubIcon(name);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    // Discriminator: react-icons places a <title> with the name; the badge does not.
    expect(svg?.querySelector('title')?.textContent).toBe(name);
    expect(svg?.querySelector('text')).toBeNull();
  });

  it('reste insensible à la casse', () => {
    const { container } = renderSubIcon('Kubernetes');
    expect(container.querySelector('svg title')?.textContent).toBe(
      'Kubernetes'
    );
  });
});
