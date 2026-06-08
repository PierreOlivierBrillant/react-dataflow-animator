import { dataFlowSchema } from '../../lib';

interface SchemaNode {
  type?: string;
  description?: string;
  enum?: readonly string[];
  properties?: Record<string, SchemaNode>;
  items?: SchemaNode;
  required?: readonly string[];
  $ref?: string;
}

interface RootSchema extends SchemaNode {
  definitions?: Record<string, SchemaNode>;
}

const schema = dataFlowSchema as unknown as RootSchema;

function typeLabel(node: SchemaNode): string {
  if (node.$ref) return 'action';
  if (node.type === 'array') return `${node.items ? typeLabel(node.items) : 'any'}[]`;
  return node.type ?? 'object';
}

function PropList({ node }: { node: SchemaNode }) {
  const props = node.properties ?? {};
  const required = node.required ?? [];
  return (
    <div>
      {Object.entries(props).map(([name, prop]) => (
        <div className="api-prop" key={name}>
          <div>
            <span className="api-name">{name}</span>
            <span className="api-type">{typeLabel(prop)}</span>
            {required.includes(name) ? (
              <span className="api-required">requis</span>
            ) : null}
          </div>
          {prop.description ? <p className="api-desc">{prop.description}</p> : null}
          {prop.enum ? (
            <div>
              {prop.enum.map((value) => (
                <span className="api-enum" key={value}>
                  {value}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

interface Section {
  title: string;
  intro: string;
  node?: SchemaNode;
}

export function ApiDocsPage() {
  const sections: Section[] = [
    {
      title: 'DataFlowSpec (racine)',
      intro: 'L’objet principal passé au composant.',
      node: schema,
    },
    {
      title: 'Objet statique (static_objects[])',
      intro: 'Les composants fixes : serveurs, bases de données, clients, flèches de décor.',
      node: schema.properties?.static_objects?.items,
    },
    {
      title: 'Objet dynamique (dynamic_objects[])',
      intro: 'Les objets qui se déplacent : paquets HTTP, requêtes/réponses SQL.',
      node: schema.properties?.dynamic_objects?.items,
    },
    {
      title: 'Action (actions[])',
      intro: 'Les animations jouées séquentiellement (move, arrow, parallel, loading, set_content, comment).',
      node: schema.definitions?.action,
    },
  ];

  return (
    <div>
      <p className="demo-desc">
        Documentation générée automatiquement à partir du JSON Schema exporté
        (<code className="demo-inline">dataFlowSchema</code>).
      </p>
      {sections.map((section) => (
        <div className="demo-card" key={section.title}>
          <h2>{section.title}</h2>
          <p className="demo-desc">{section.intro}</p>
          {section.node ? <PropList node={section.node} /> : null}
        </div>
      ))}
    </div>
  );
}
