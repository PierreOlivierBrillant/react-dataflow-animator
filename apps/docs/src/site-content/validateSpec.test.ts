import { describe, it, expect } from 'vitest';
import { validateSpec } from './validateSpec';
import { clientServer } from './demos/clientServer';

describe('validateSpec — validation de schéma', () => {
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

describe('validateSpec — validation des références croisées', () => {
  it('signale un ID dynamique inconnu dans move.object avec les IDs disponibles', () => {
    const spec = {
      ...clientServer,
      actions: [
        { action_type: 'move', object: 'ghost', from: 'browser', to: 'api' },
      ],
    };
    const errors = validateSpec(spec);
    const err = errors.find((e) => e.path === '/actions/0/object');
    expect(err).toBeDefined();
    expect(err!.message).toContain('"ghost"');
    expect(err!.message).toMatch(/IDs disponibles/);
    expect(err!.message).toContain('"req"');
  });

  it('signale un ID statique inconnu dans move.from avec les IDs disponibles', () => {
    const spec = {
      ...clientServer,
      actions: [
        { action_type: 'move', object: 'req', from: 'nowhere', to: 'api' },
      ],
    };
    const errors = validateSpec(spec);
    const err = errors.find((e) => e.path === '/actions/0/from');
    expect(err).toBeDefined();
    expect(err!.message).toContain('"nowhere"');
    expect(err!.message).toContain('"browser"');
  });

  it('signale un ID inconnu dans connections.from', () => {
    const spec = {
      ...clientServer,
      connections: [{ from: 'ghost', to: 'api' }],
    };
    const errors = validateSpec(spec);
    const err = errors.find((e) => e.path === '/connections/0/from');
    expect(err).toBeDefined();
    expect(err!.message).toContain('"ghost"');
    expect(err!.message).toContain('"browser"');
  });

  it("signale un wait_for qui pointe vers un ID d'action inexistant", () => {
    const spec = {
      ...clientServer,
      actions: [
        {
          action_type: 'move',
          object: 'req',
          from: 'browser',
          to: 'api',
          wait_for: 'no_such_action',
        },
      ],
    };
    const errors = validateSpec(spec);
    const err = errors.find((e) => e.path === '/actions/0/wait_for');
    expect(err).toBeDefined();
    expect(err!.message).toContain('"no_such_action"');
  });

  it('ne signale aucune erreur de référence pour la spec clientServer', () => {
    const refErrors = validateSpec(clientServer).filter((e) =>
      e.message.startsWith('ID inconnu')
    );
    expect(refErrors).toEqual([]);
  });
});
