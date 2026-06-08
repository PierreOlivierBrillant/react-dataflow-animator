/**
 * JSON Schema (draft-07) de la spécification DataFlow.
 *
 * Source de vérité unique pour :
 *  - la documentation d'API générée automatiquement (site vitrine, onglet « API ») ;
 *  - la validation légère / l'auto-complétion côté éditeur.
 *
 * Les types TypeScript correspondants vivent dans `types.ts`.
 */
export const dataFlowSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'DataFlowSpec',
  type: 'object',
  properties: {
    is_navigable: {
      type: 'boolean',
      description:
        'Si vrai, affiche les contrôles de navigation dans le lecteur (Play/Pause, Précédent, Suivant, Barre de progression). (défaut: false)',
    },
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
        "Direction générale de l'architecture pour le placement automatique des objets statiques. (défaut: 'left-to-right')",
    },
    static_objects: {
      type: 'array',
      description:
        'Les composants architecturaux fixes (serveurs, bases de données, clients).',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: "Identifiant unique de l'objet (ex: 'serveur_web').",
          },
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
              'arrow',
            ],
            description: "Type de l'objet qui détermine son apparence.",
          },
          text: { type: 'string', description: "Label affiché en dessous de l'objet." },
          from: { type: 'string', description: "(Pour arrow) ID de l'objet source." },
          to: { type: 'string', description: "(Pour arrow) ID de l'objet destination." },
          style: {
            type: 'string',
            enum: ['full', 'dotted', 'dashed'],
            description: '(Pour arrow) Style de la ligne.',
          },
          subicon: {
            type: 'string',
            description:
              "Nom de l'icône de la technologie (ex: 'react', 'postgres', 'dotnet', 'chrome', 'node').",
          },
          lane: {
            type: 'number',
            description:
              'Rangée ou colonne sur laquelle placer l\'objet (entier positif, ex: 1, 2, 3). (défaut: 1)',
          },
          is_main: {
            type: 'boolean',
            description:
              "Si direction est 'circular', marque l'objet comme étant le nœud central. (défaut: false)",
          },
          url: {
            type: 'string',
            description:
              'URL rendant le nœud cliquable (ouvre dans un nouvel onglet).',
          },
          content: {
            type: 'object',
            description: 'Contenu initial affiché dans le nœud.',
            properties: {
              content_type: {
                type: 'string',
                enum: ['image', 'text', 'code'],
              },
              content: { type: 'string' },
              language: {
                type: 'string',
                description:
                  'Langage pour la coloration syntaxique (ex: javascript, json, sql).',
              },
            },
          },
        },
        required: ['id', 'object_type'],
      },
    },
    dynamic_objects: {
      type: 'array',
      description: 'Les objets qui se déplaceront (paquets HTTP, requêtes SQL).',
      items: {
        type: 'object',
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
            description: 'Réponse (pour sql_response)',
            properties: {
              rows: { type: 'number', description: 'Nombre de lignes retournées' },
              data: { type: 'object', description: 'Les données retournées' },
            },
          },
          packet_content: {
            type: 'object',
            properties: {
              header: {
                type: 'string',
                description: "En-tête visible dans le paquet (ex: 'GET /api').",
              },
              body: {
                type: 'object',
                properties: {
                  content_type: {
                    type: 'string',
                    enum: ['text', 'image'],
                    description: 'Type de contenu du body.',
                  },
                  content: {
                    type: 'string',
                    description: "Texte ou chemin d'image.",
                  },
                },
              },
            },
          },
        },
        required: ['id', 'object_type'],
      },
    },
    actions: {
      type: 'array',
      description: 'La liste des animations à jouer séquentiellement.',
      items: { $ref: '#/definitions/action' },
    },
  },
  required: ['static_objects', 'dynamic_objects', 'actions'],
  definitions: {
    action: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description:
            "ID de l'action pour s'y référer plus tard (ex: avec 'wait_for' ou 'keep_until').",
        },
        action_type: {
          type: 'string',
          enum: ['move', 'arrow', 'parallel', 'loading', 'set_content', 'comment'],
          description: "Type d'action.",
        },
        object: {
          type: 'string',
          description: "(Pour move/loading/set_content) L'ID de l'objet.",
        },
        from: {
          type: 'string',
          description: "(Pour move/arrow) L'ID de l'objet statique de départ.",
        },
        to: {
          type: 'string',
          description: "(Pour move/arrow) L'ID de l'objet statique d'arrivée.",
        },
        duration: {
          type: 'number',
          description: "Durée de l'animation en millisecondes (défaut: 500).",
        },
        text: { type: 'string', description: '(Pour arrow/comment) Texte à afficher.' },
        style: {
          type: 'string',
          enum: ['full', 'dotted', 'dashed'],
          description: '(Pour arrow) Style de la ligne.',
        },
        next_to: {
          type: 'string',
          description:
            "(Pour comment) L'ID de l'objet statique près duquel afficher le commentaire.",
        },
        content: {
          type: 'object',
          description: '(Pour set_content)',
          properties: {
            content_type: { type: 'string', enum: ['image', 'text', 'code'] },
            content: { type: 'string' },
            language: {
              type: 'string',
              description:
                'Langage pour la coloration syntaxique (ex: javascript, json, sql).',
            },
          },
        },
        wait_for: {
          type: 'string',
          description:
            "L'ID d'une autre action. Cette action ne commencera qu'après la fin de l'action spécifiée.",
        },
        keep_until: {
          type: 'string',
          description:
            "L'ID d'une action future. L'élément restera visible jusqu'au début de cette action.",
        },
        keep_until_next: {
          type: 'boolean',
          description:
            "Si vrai, l'élément reste visible jusqu'à l'étape racine suivante de la chronologie. (défaut: false pour 'move', true pour 'arrow' et 'comment')",
        },
        actions: {
          type: 'array',
          description: '(Pour parallel) Liste d\'actions à exécuter en même temps.',
          items: { $ref: '#/definitions/action' },
        },
      },
      required: ['action_type'],
    },
  },
} as const;

export type DataFlowSchema = typeof dataFlowSchema;
