import { DataFlowSpec } from 'react-dataflow-animator';

/**
 * Cycle de vie complet d'une notification push : comment l'appareil d'Alice
 * fait connaître son adresse de livraison (le token FCM), puis comment un
 * message envoyé par Bob est acheminé jusqu'à elle, même si son application
 * est fermée.
 */
export const pushNotifications: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [
    {
      id: 'bob_device',
      type: 'bob',
      text: 'Bob (expéditeur)',
      lane: 1,
    },
    {
      id: 'alice_device',
      type: 'alice',
      text: 'Alice (destinataire)',
      lane: 3,
    },
    {
      id: 'app_server',
      type: 'server',
      text: "Serveur d'application",
      icon: 'api',
      lane: 2,
      background_color: '#3b82f6',
    },
    {
      id: 'token_db',
      type: 'database',
      text: 'BD des tokens',
      icon: 'postgres',
      lane: 2,
      align_with: 'bob_device',
    },
    {
      id: 'fcm',
      type: 'cloud',
      text: 'Serveur FCM (Firebase)',
      icon: 'firebase',
      lane: 2,
      align_with: 'alice_device',
      background_color: '#f59e0b',
    },
  ],
  packets: [
    {
      id: 'register_token',
      kind: 'http_packet',
      packet_content: {
        header: 'POST /api/devices',
        body: {
          type: 'text',
          value: '{\n  "userId": "alice",\n  "fcmToken": "dQw4-eY1...kZ9"\n}',
          language: 'json',
        },
      },
    },
    {
      id: 'store_token',
      kind: 'sql_request',
      request_content:
        "INSERT INTO device_tokens (user_id, token)\nVALUES ('alice', 'dQw4-eY1...kZ9');",
    },
    {
      id: 'send_message',
      kind: 'http_packet',
      packet_content: {
        header: 'POST /api/messages',
        body: {
          type: 'text',
          value: '{\n  "to": "alice",\n  "text": "Salut Alice !"\n}',
          language: 'json',
        },
      },
    },
    {
      id: 'lookup_token',
      kind: 'sql_request',
      request_content:
        "SELECT token FROM device_tokens\nWHERE user_id = 'alice';",
    },
    {
      id: 'token_result',
      kind: 'sql_response',
      response_content: {
        rows: 1,
        header: '1 ligne',
        body: {
          type: 'table',
          columns: ['token'],
          rows_data: [['dQw4-eY1...kZ9']],
        },
      },
    },
    {
      id: 'fcm_request',
      kind: 'http_packet',
      packet_content: {
        header: 'POST fcm/send',
        body: {
          type: 'text',
          value:
            '{\n  "token": "dQw4-eY1...kZ9",\n  "notification": {\n    "title": "Bob",\n    "body": "Salut Alice !"\n  }\n}',
          language: 'json',
        },
      },
    },
    {
      id: 'push_notification',
      kind: 'http_packet',
      packet_content: {
        header: 'Push (data)',
        body: {
          type: 'text',
          value: '🔔 Bob : Salut Alice !',
        },
      },
    },
  ],
  connections: [
    { from: 'bob_device', to: 'app_server', style: 'solid', text: 'HTTPS' },
    { from: 'app_server', to: 'token_db', style: 'solid', text: 'SQL' },
    { from: 'app_server', to: 'fcm', style: 'solid', text: 'HTTPS' },
    { from: 'fcm', to: 'alice_device', style: 'dashed', text: 'push' },
    {
      from: 'alice_device',
      to: 'app_server',
      style: 'dotted',
      arrow_head: 'forward',
      text: 'enregistrement',
    },
  ],
  zones: [
    {
      id: 'zone_backend',
      contains: ['app_server', 'token_db', 'fcm'],
      color: 'steelblue',
      label: 'Infrastructure',
    },
  ],
  timeline: [
    {
      type: 'comment',
      text: "Phase 1 — Enregistrement du token. Avant tout, l'appareil d'Alice doit faire connaître son token FCM au serveur d'application.",
    },
    {
      type: 'comment',
      object: 'alice_device',
      text: "Au démarrage de l'app, Alice obtient un token unique auprès de FCM.",
    },
    {
      type: 'move',
      object: 'register_token',
      from: 'alice_device',
      to: 'app_server',
      duration: 1400,
    },
    {
      type: 'comment',
      object: 'app_server',
      text: "Le serveur reçoit le token et l'associe à l'utilisateur 'alice'.",
    },
    {
      type: 'move',
      object: 'store_token',
      from: 'app_server',
      to: 'token_db',
      duration: 1200,
    },
    {
      type: 'loading',
      object: 'token_db',
      duration: 900,
    },
    {
      type: 'comment',
      object: 'token_db',
      text: 'Le token est désormais stocké de façon persistante, prêt à être utilisé.',
    },
    {
      type: 'comment',
      text: 'Phase 2 — Bob envoie un message à Alice.',
    },
    {
      type: 'move',
      object: 'send_message',
      from: 'bob_device',
      to: 'app_server',
      duration: 1400,
    },
    {
      type: 'comment',
      object: 'app_server',
      text: "Le serveur doit retrouver le token de l'appareil d'Alice pour la joindre.",
    },
    {
      type: 'move',
      object: 'lookup_token',
      from: 'app_server',
      to: 'token_db',
      duration: 1200,
    },
    {
      type: 'loading',
      object: 'token_db',
      duration: 800,
    },
    {
      type: 'move',
      object: 'token_result',
      from: 'token_db',
      to: 'app_server',
      duration: 1200,
    },
    {
      type: 'comment',
      object: 'app_server',
      text: 'Avec le token en main, le serveur prépare la requête vers FCM.',
    },
    {
      type: 'comment',
      text: 'Phase 3 — Acheminement via le serveur FCM.',
    },
    {
      type: 'move',
      object: 'fcm_request',
      from: 'app_server',
      to: 'fcm',
      duration: 1400,
    },
    {
      type: 'loading',
      object: 'fcm',
      duration: 900,
    },
    {
      type: 'comment',
      object: 'fcm',
      text: "FCM identifie l'appareil grâce au token et pousse la notification — même si l'app d'Alice est fermée.",
    },
    {
      type: 'move',
      object: 'push_notification',
      from: 'fcm',
      to: 'alice_device',
      duration: 1600,
    },
    {
      type: 'comment',
      object: 'alice_device',
      text: 'Alice reçoit la notification : « 🔔 Bob : Salut Alice ! »',
    },
  ],
};
