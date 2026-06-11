/**
 * JSON Schema (draft-07) de la spécification DataFlow.
 *
 * Source de vérité unique pour la documentation d'API générée et la validation.
 * Les actions sont modélisées en union discriminée (`oneOf` sur `action_type`).
 * Les types TypeScript correspondants vivent dans `types.ts`.
 */
export const dataFlowSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'DataFlowSpec',
  type: 'object',
  properties: {
    direction: {
      type: 'string',
      enum: [
        'left-to-right',
        'right-to-left',
        'top-to-bottom',
        'bottom-to-top',
        'circular',
      ],
      description:
        "Direction de placement automatique des objets statiques. (défaut: 'left-to-right')",
    },
    static_objects: {
      type: 'array',
      description: 'Les nœuds fixes (serveurs, bases de données, clients…).',
      items: { $ref: '#/definitions/staticObject' },
    },
    dynamic_objects: {
      type: 'array',
      description: 'Les objets qui se déplaceront (paquets HTTP, requêtes SQL).',
      items: { $ref: '#/definitions/dynamicObject' },
    },
    connections: {
      type: 'array',
      description: 'Flèches/liens permanents (décor) affichés dès l\'initialisation.',
      items: { $ref: '#/definitions/connection' },
    },
    actions: {
      type: 'array',
      description: 'La liste des animations à jouer séquentiellement.',
      items: { $ref: '#/definitions/action' },
    },
  },
  required: ['static_objects', 'dynamic_objects', 'actions'],
  definitions: {
    staticObject: {
      type: 'object',
      title: 'StaticObject',
      properties: {
        id: { type: 'string', description: "Identifiant unique (ex: 'serveur_web')." },
        object_type: {
          type: 'string',
          enum: [
            'desktop',
            'laptop',
            'client',
            'server',
            'database',
            'mobile',
            'user',
            'admin',
            'users',
          ],
          description: "Type du nœud (détermine son apparence).",
        },
        text: { type: 'string', description: "Label affiché sous le nœud." },
        subicon: {
          type: 'string',
          description:
            "Badge superposé : techno connue (ex: 'react', 'postgres'), icône enregistrée, ou texte libre (ex: 'v2').",
        },
        lane: {
          type: 'number',
          description: 'Rangée/colonne de placement (entier positif). (défaut: 1)',
        },
        is_main: {
          type: 'boolean',
          description: "(circular) Marque le nœud comme central. (défaut: false)",
        },
        align_with: {
          type: 'string',
          description:
            "Aligne ce nœud sur l'axe transverse d'un autre nœud (par ID), pour aligner deux lanes différentes.",
        },
        url: { type: 'string', description: 'Rend le nœud cliquable (nouvel onglet).' },
        content: { $ref: '#/definitions/content' },
      },
      required: ['id', 'object_type'],
    },
    connection: {
      type: 'object',
      title: 'Connection',
      description: 'Flèche permanente entre deux nœuds.',
      properties: {
        id: { type: 'string' },
        from: { type: 'string', description: "ID du nœud source." },
        to: { type: 'string', description: "ID du nœud destination." },
        style: { $ref: '#/definitions/lineStyle' },
        text: { type: 'string', description: 'Texte médian optionnel.' },
      },
      required: ['from', 'to'],
    },
    dynamicObject: {
      type: 'object',
      title: 'DynamicObject',
      properties: {
        id: { type: 'string', description: 'Identifiant unique du paquet.' },
        object_type: {
          type: 'string',
          enum: ['http_packet', 'sql_request', 'sql_response'],
          description: 'Type de paquet.',
        },
        request_content: {
          type: 'string',
          description: 'Requête textuelle (ex: pour sql_request).',
        },
        response_content: {
          type: 'object',
          description: 'Réponse (pour sql_response).',
          properties: {
            rows: { type: 'number', description: 'Nombre de lignes retournées.' },
          },
        },
        packet_content: {
          type: 'object',
          properties: {
            header: { type: 'string', description: "En-tête (ex: 'GET /api')." },
            body: {
              type: 'object',
              properties: {
                content_type: { type: 'string', enum: ['text', 'image'] },
                content: { type: 'string', description: "Texte ou chemin d'image." },
                language: { type: 'string', description: "Langage pour la coloration syntaxique du corps." },
              },
            },
          },
        },
      },
      required: ['id', 'object_type'],
    },
    content: {
      type: 'object',
      title: 'ObjectContent',
      properties: {
        content_type: { type: 'string', enum: ['image', 'text', 'code'] },
        content: { type: 'string' },
        language: {
          type: 'string',
          description: 'Langage pour la coloration syntaxique (ex: javascript, sql).',
        },
        url: {
          type: 'string',
          description: "(mode text) URL affichée dans la barre d'adresse.",
        },
      },
    },
    lineStyle: {
      type: 'string',
      enum: ['solid', 'dotted', 'dashed'],
      description: "Style de ligne. (défaut: 'solid'; 'full' accepté en alias)",
    },
    timing: {
      // Champs communs à toutes les actions (documentés une fois).
      type: 'object',
      properties: {
        id: { type: 'string', description: "ID pour wait_for / keep_until." },
        duration: {
          type: 'number',
          description: 'Durée en ms. (défaut: 500 ; 1200 pour loading)',
        },
        wait_for: {
          type: 'string',
          description: "Démarre à la fin de l'action référencée (par ID).",
        },
        keep_until: {
          type: 'string',
          description: "Reste visible jusqu'au début de l'action ciblée (par ID).",
        },
        keep_until_next: {
          type: 'boolean',
          description:
            "Reste visible jusqu'au début de l'étape racine suivante. Défaut: false pour move/loading, true pour arrow/comment/set_content.",
        },
        keep_until_end: {
          type: 'boolean',
          description: "Si vrai, reste visible jusqu'à la fin de la chronologie.",
        },
      },
    },
    action: {
      oneOf: [
        { $ref: '#/definitions/moveAction' },
        { $ref: '#/definitions/arrowAction' },
        { $ref: '#/definitions/parallelAction' },
        { $ref: '#/definitions/loadingAction' },
        { $ref: '#/definitions/setContentAction' },
        { $ref: '#/definitions/commentAction' },
        { $ref: '#/definitions/highlightAction' },
      ],
    },
    moveAction: {
      type: 'object',
      title: 'move',
      description: "Déplace un objet dynamique de `from` vers `to`.",
      allOf: [{ $ref: '#/definitions/timing' }],
      properties: {
        action_type: { const: 'move' },
        object: { type: 'string', description: "ID de l'objet dynamique." },
        from: { type: 'string', description: 'ID du nœud de départ.' },
        to: { type: 'string', description: "ID du nœud d'arrivée." },
      },
      required: ['action_type', 'object', 'from', 'to'],
    },
    arrowAction: {
      type: 'object',
      title: 'arrow',
      description: 'Trace une flèche animée entre deux nœuds.',
      allOf: [{ $ref: '#/definitions/timing' }],
      properties: {
        action_type: { const: 'arrow' },
        from: { type: 'string' },
        to: { type: 'string' },
        text: { type: 'string', description: 'Texte médian.' },
        style: { $ref: '#/definitions/lineStyle' },
      },
      required: ['action_type', 'from', 'to'],
    },
    parallelAction: {
      type: 'object',
      title: 'parallel',
      description: 'Exécute plusieurs actions au même instant.',
      allOf: [{ $ref: '#/definitions/timing' }],
      properties: {
        action_type: { const: 'parallel' },
        actions: {
          type: 'array',
          items: { $ref: '#/definitions/action' },
        },
      },
      required: ['action_type', 'actions'],
    },
    loadingAction: {
      type: 'object',
      title: 'loading',
      description: 'Affiche un spinner de chargement sur un nœud.',
      allOf: [{ $ref: '#/definitions/timing' }],
      properties: {
        action_type: { const: 'loading' },
        object: { type: 'string', description: 'ID du nœud cible.' },
      },
      required: ['action_type', 'object'],
    },
    setContentAction: {
      type: 'object',
      title: 'set_content',
      description: "Mute le contenu d'un nœud (code, texte, image).",
      allOf: [{ $ref: '#/definitions/timing' }],
      properties: {
        action_type: { const: 'set_content' },
        object: { type: 'string', description: 'ID du nœud muté.' },
        content: { $ref: '#/definitions/content' },
      },
      required: ['action_type', 'object', 'content'],
    },
    commentAction: {
      type: 'object',
      title: 'comment',
      description: 'Affiche une bulle de commentaire près d\'un nœud.',
      allOf: [{ $ref: '#/definitions/timing' }],
      properties: {
        action_type: { const: 'comment' },
        object: { type: 'string', description: 'ID du nœud de référence.' },
        text: { type: 'string', description: 'Texte du commentaire.' },
      },
      required: ['action_type', 'object', 'text'],
    },
    highlightAction: {
      type: 'object',
      title: 'highlight',
      description: 'Surligne un nœud statique ou une connexion (par ID).',
      allOf: [{ $ref: '#/definitions/timing' }],
      properties: {
        action_type: { const: 'highlight' },
        object: { type: 'string', description: "ID d'un nœud statique ou d'une connexion." },
      },
      required: ['action_type', 'object'],
    },
  },
} as const;

export type DataFlowSchema = typeof dataFlowSchema;
