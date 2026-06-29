import Heading from '@theme/Heading';
import Link from '@docusaurus/Link';
import { DataFlowPlayer } from 'react-dataflow-animator';
import { demosById } from './demos';
import { useTranslation } from '../i18n';

// Contenu de /docs/intro rendu côté client à partir du dictionnaire i18n.
// Les `id` d'ancres sont fixes (indépendants de la langue) pour garder des
// liens profonds stables d'une locale à l'autre.
export function IntroDoc() {
  const { intro } = useTranslation();

  return (
    <>
      <div className="docs-lead">
        <p>
          <code>react-dataflow-animator</code>
          {intro.leadPost}
        </p>
      </div>

      <Heading as="h2" id="overview">
        {intro.overviewTitle}
      </Heading>
      <p>{intro.overviewIntro}</p>
      <ul>
        {intro.overviewItems.map((item) => (
          <li key={item.strong}>
            {item.pre}
            <strong>{item.strong}</strong>
            {item.post}
          </li>
        ))}
      </ul>
      <p>{intro.overviewOutro}</p>

      <DataFlowPlayer theme="auto" spec={demosById.clientServer.spec} />

      <Heading as="h2" id="principles">
        {intro.principlesTitle}
      </Heading>
      <ul>
        {intro.principles.map((principle) => (
          <li key={principle.strong}>
            <strong>{principle.strong}</strong>
            {principle.rest}
          </li>
        ))}
      </ul>

      <Heading as="h2" id="further">
        {intro.furtherTitle}
      </Heading>
      <ul>
        {intro.furtherItems.map((item) => (
          <li key={item.to}>
            <Link to={item.to}>{item.label}</Link>
            {item.desc}
          </li>
        ))}
      </ul>
    </>
  );
}
