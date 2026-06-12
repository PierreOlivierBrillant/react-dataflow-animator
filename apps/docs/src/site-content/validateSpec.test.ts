import { describe, it, expect } from 'vitest';
import { validateSpec } from './validateSpec';
import { clientServer } from './demos/clientServer';

describe('validateSpec', () => {
  it('retourne un tableau vide pour une spec valide', () => {
    expect(validateSpec(clientServer)).toEqual([]);
  });

  it('signale un action_type inconnu avec la liste des valeurs acceptées', () => {
    const spec = {
      ...clientServer,
      actions: [
        { action_type: 'mov', object: 'req', from: 'browser', to: 'api' },
      ],
    };
    const errors = validateSpec(spec);
    expect(errors.length).toBeGreaterThan(0);
    const err = errors.find((e) => e.path.includes('action_type'));
    expect(err).toBeDefined();
    // Le message doit lister les valeurs acceptées (ex: "move", "arrow", …)
    expect(err!.message).toMatch(/valeurs acceptées/);
    expect(err!.message).toContain('"move"');
  });

  it('signale un object_type invalide avec la liste des valeurs acceptées', () => {
    const spec = {
      ...clientServer,
      static_objects: [{ id: 'x', object_type: 'pc', lane: 1 }],
    };
    const errors = validateSpec(spec);
    const err = errors.find((e) => e.path.includes('object_type'));
    expect(err).toBeDefined();
    expect(err!.message).toMatch(/valeurs acceptées/);
    expect(err!.message).toContain('"laptop"');
  });

  it('signale un champ required manquant avec le nom du champ', () => {
    const spec = {
      ...clientServer,
      static_objects: [{ object_type: 'laptop', lane: 1 }],
    };
    const errors = validateSpec(spec);
    const err = errors.find((e) => e.path.startsWith('/static_objects'));
    expect(err).toBeDefined();
    expect(err!.message).toContain('"id"');
  });

  it('signale un type incorrect avec le type attendu', () => {
    const spec = {
      ...clientServer,
      static_objects: [{ id: 'x', object_type: 'laptop', lane: '1' }],
    };
    const errors = validateSpec(spec);
    const err = errors.find(
      (e) => e.path.includes('/static_objects') && e.path.includes('lane')
    );
    expect(err).toBeDefined();
    expect(err!.message).toMatch(/type incorrect/);
    expect(err!.message).toContain('number');
  });
});
