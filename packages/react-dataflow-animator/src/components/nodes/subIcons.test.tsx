/** @vitest-environment jsdom */
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { getSubIcon } from './subIcons';

afterEach(cleanup);

// Une techno connue rend l'icône react-icons avec un <title> = nom passé ;
// la pastille de texte libre, elle, rend un <circle> + <text> sans <title>.
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
    // Discriminant : react-icons place un <title> avec le nom ; la pastille non.
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
