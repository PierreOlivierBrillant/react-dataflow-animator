import type { DataFlowSpec } from 'react-dataflow-animator';

/**
 * Démo de l'anti-collision (référencée par la page « Connexions &
 * anti-collision »). Le segment App ↔ BD est emprunté dans les deux sens en
 * même temps : le moteur décale automatiquement les deux trajets sur des voies
 * parallèles plutôt que de les superposer.
 */
export const collision: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [
    { id: 'app', type: 'server', text: 'Application', icon: 'node', lane: 1 },
    {
      id: 'db',
      type: 'database',
      text: 'Base de données',
      icon: 'postgres',
      lane: 2,
    },
  ],
  connections: [{ from: 'app', to: 'db', arrow_head: 'both', style: 'dashed' }],
  packets: [
    {
      id: 'write',
      kind: 'sql_request',
      request_content: 'INSERT INTO events …',
    },
    {
      id: 'ack',
      kind: 'sql_response',
      response_content: { rows: 1, header: '1 ligne insérée' },
    },
    {
      id: 'read',
      kind: 'sql_request',
      request_content: 'SELECT * FROM events',
    },
    {
      id: 'rows',
      kind: 'sql_response',
      response_content: { rows: 42, header: '42 lignes' },
    },
  ],
  timeline: [
    {
      type: 'comment',
      text: 'Du trafic circule dans les deux sens sur la même liaison App ↔ BD, en même temps.',
      duration: 2800,
    },
    {
      type: 'parallel',
      duration: 1800,
      actions: [
        { type: 'move', object: 'write', from: 'app', to: 'db' },
        { type: 'move', object: 'read', from: 'db', to: 'app' },
      ],
    },
    {
      type: 'comment',
      text: 'Les deux paquets ne se chevauchent pas : ils empruntent des voies parallèles décalées.',
      duration: 2800,
    },
    {
      type: 'parallel',
      duration: 1800,
      actions: [
        { type: 'move', object: 'ack', from: 'db', to: 'app' },
        { type: 'move', object: 'rows', from: 'app', to: 'db' },
      ],
    },
    {
      type: 'comment',
      text: 'Le sens du décalage est déterministe (ordre des identifiants), donc stable au scrubbing.',
      duration: 2800,
    },
    {
      type: 'parallel',
      duration: 1400,
      actions: [
        {
          type: 'arrow',
          from: 'app',
          to: 'db',
          text: 'écriture',
          style: 'solid',
          keep_until_end: true,
        },
        {
          type: 'arrow',
          from: 'db',
          to: 'app',
          text: 'lecture',
          style: 'solid',
          keep_until_end: true,
        },
      ],
    },
    { type: 'wait', duration: 1400 },
  ],
};
