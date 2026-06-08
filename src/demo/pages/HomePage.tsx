import {
  FiClock,
  FiGrid,
  FiGitBranch,
  FiPlayCircle,
  FiBox,
  FiZap,
} from 'react-icons/fi';
import { DataFlowPlayer, highlightCode, type DataFlowSpec } from '../../lib';
import { demosById } from '../demos';

const features = [
  { Icon: FiClock, title: 'Déterministe & navigable', text: 'Le temps est l’unique source de vérité : seek, étapes et scrubbing fiables, sans GSAP.' },
  { Icon: FiGrid, title: 'Placement automatique', text: 'Grilles linéaires ou disposition circulaire — aucune coordonnée (x, y) à fournir.' },
  { Icon: FiGitBranch, title: 'Anti-collision', text: 'Les trajets bidirectionnels sont automatiquement séparés sur des voies parallèles.' },
  { Icon: FiPlayCircle, title: 'Lecteur intégré', text: 'Play/pause, navigation par étapes, timeline cliquable et plein écran.' },
  { Icon: FiBox, title: 'Prêt pour Docusaurus', text: 'SSR-safe, styles scopés, s’importe directement dans un fichier .mdx.' },
  { Icon: FiZap, title: 'Extensible', text: 'Icônes, sous-icônes et coloration syntaxique enfichables ; types TypeScript stricts.' },
];

const miniSpec: DataFlowSpec = {
  direction: 'left-to-right',
  static_objects: [
    { id: 'client', object_type: 'laptop', text: 'Client', subicon: 'react', lane: 1 },
    { id: 'api', object_type: 'server', text: 'API', subicon: 'node', lane: 2 },
    { id: 'db', object_type: 'database', text: 'BD', subicon: 'postgres', lane: 3 },
  ],
  dynamic_objects: [
    { id: 'q', object_type: 'http_packet', packet_content: { header: 'GET /data' } },
    { id: 'sql', object_type: 'sql_request', request_content: 'SELECT …' },
  ],
  actions: [
    { action_type: 'move', object: 'q', from: 'client', to: 'api' },
    { action_type: 'move', object: 'sql', from: 'api', to: 'db' },
    { action_type: 'loading', object: 'db', duration: 700 },
  ],
};

const miniCode = `<DataFlowPlayer spec={{
  direction: 'left-to-right',
  static_objects: [
    { id: 'client', object_type: 'laptop', text: 'Client', lane: 1 },
    { id: 'api', object_type: 'server', text: 'API', lane: 2 },
    { id: 'db', object_type: 'database', text: 'BD', lane: 3 },
  ],
  dynamic_objects: [
    { id: 'q', object_type: 'http_packet',
      packet_content: { header: 'GET /data' } },
  ],
  actions: [
    { action_type: 'move', object: 'q', from: 'client', to: 'api' },
    { action_type: 'loading', object: 'db' },
  ],
}} />`;

export function HomePage() {
  return (
    <div>
      <header className="hero">
        <span className="hero-badge">React 18/19 · npm · MIT</span>
        <h1>
          Anime tes <span className="grad">flux de données</span>
          <br /> à partir d’une simple spec JSON
        </h1>
        <p className="lead">
          Un composant React qui compile une description JSON en une animation
          déterministe et navigable — idéal pour illustrer des architectures dans
          tes cours et ta documentation.
        </p>
        <div className="hero-cta">
          <a className="btn btn-primary" href="#/demos">
            Explorer les démos
          </a>
          <a className="btn btn-secondary" href="#/docs">
            Lire la documentation
          </a>
        </div>
        <div className="hero-stage">
          <DataFlowPlayer
            spec={demosById.spa.spec}
            autoPlay
            loop
            controls={false}
            height={360}
          />
        </div>
      </header>

      <section className="container">
        <h2 className="section-title">Pourquoi DataFlow Animator ?</h2>
        <p className="section-sub">
          Tout ce qu’il faut pour des schémas animés clairs, sans bricoler du SVG à
          la main.
        </p>
        <div className="features">
          {features.map((f) => (
            <div className="feature" key={f.title}>
              <div className="feature-icon">
                <f.Icon size={20} />
              </div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container" style={{ paddingTop: 0 }}>
        <h2 className="section-title">Une spec → une animation</h2>
        <p className="section-sub">
          Tu décris les nœuds et les actions ; le moteur s’occupe du placement, du
          tracé et du timing.
        </p>
        <div className="home-split">
          <pre className="code rdfa-code">
            <code dangerouslySetInnerHTML={{ __html: highlightCode(miniCode, 'jsx') }} />
          </pre>
          <DataFlowPlayer spec={miniSpec} autoPlay loop controls={false} height={320} />
        </div>
      </section>
    </div>
  );
}
