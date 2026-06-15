import { describe, expect, it } from 'vitest';
import { nodeTint } from './nodeColors';
import type { Node } from '../../types';

const node = (extra: Partial<Node>): Node => ({
  id: 'n',
  type: 'square',
  ...extra,
});

// nodeTint renvoie un objet CSSProperties ; on lit les custom properties par clé.
const vars = (n: Node) => nodeTint(n) as Record<string, string | undefined>;

describe('nodeTint — variables de teinte des nœuds', () => {
  it('aucune couleur : aucune variable posée', () => {
    expect(nodeTint(node({}))).toEqual({});
  });

  it('background_color seul : pose --rdfa-fill et dérive une bordure complémentaire', () => {
    const v = vars(node({ background_color: '#3b82f6' }));
    expect(v['--rdfa-fill']).toBe('#3b82f6');
    // Bordure auto = fond assombri via color-mix (CSS pur, gère noms + hex).
    expect(v['--rdfa-stroke']).toBe('color-mix(in srgb, #3b82f6, #000 32%)');
  });

  it('couleur prédéfinie (nom) : acceptée telle quelle dans le color-mix', () => {
    const v = vars(node({ background_color: 'steelblue' }));
    expect(v['--rdfa-fill']).toBe('steelblue');
    expect(v['--rdfa-stroke']).toBe('color-mix(in srgb, steelblue, #000 32%)');
  });

  it('border_color seul : pose --rdfa-stroke, pas de --rdfa-fill', () => {
    const v = vars(node({ border_color: 'tomato' }));
    expect(v['--rdfa-fill']).toBeUndefined();
    expect(v['--rdfa-stroke']).toBe('tomato');
  });

  it('les deux fournis : border_color explicite prime (pas de dérivation)', () => {
    const v = vars(node({ background_color: '#fff', border_color: '#000' }));
    expect(v['--rdfa-fill']).toBe('#fff');
    expect(v['--rdfa-stroke']).toBe('#000');
  });

  it('text_color explicite : pose --rdfa-ink tel quel', () => {
    const v = vars(node({ text_color: 'rebeccapurple' }));
    expect(v['--rdfa-ink']).toBe('rebeccapurple');
    // text_color seul ne crée pas de fond ni de bordure.
    expect(v['--rdfa-fill']).toBeUndefined();
    expect(v['--rdfa-stroke']).toBeUndefined();
  });

  it('text_color absent + background : --rdfa-ink auto-contrasté (oklch)', () => {
    const v = vars(node({ background_color: '#1e3a8a' }));
    expect(v['--rdfa-ink']).toContain('oklch(from var(--rdfa-fill)');
  });

  it('text_color explicite prime sur l’auto-contraste même avec un fond', () => {
    const v = vars(
      node({ background_color: '#1e3a8a', text_color: '#fde68a' })
    );
    expect(v['--rdfa-ink']).toBe('#fde68a');
  });

  it('aucune couleur : pas de --rdfa-ink (texte du thème)', () => {
    expect(vars(node({}))['--rdfa-ink']).toBeUndefined();
  });
});
