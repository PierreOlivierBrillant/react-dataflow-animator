import Link from '@docusaurus/Link';
import { FooterColumnItem, MultiColumnFooter } from '@docusaurus/theme-common';
import { FaGithub as Github } from 'react-icons/fa';
import { LogoText } from './LogoText';

export function CustomFooter({
  footerData,
}: {
  footerData: MultiColumnFooter;
}) {
  return (
    <footer className="relative py-12 w-full z-10 bg-[#000]/20 border-t border-white/5">
      <div className="max-w-6xl mx-auto px-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <LogoText logoSize={28} />
            <p className="text-xs leading-relaxed text-white/30 font-sans m-0 mt-3">
              Animations d'architecture
              <br />
              pilotées par JSON.
            </p>
          </div>
          {footerData.links.map((linkSection, index) => (
            <FooterLinkColumn key={index} section={linkSection} />
          ))}
        </div>
        {FooterCopyright({ copyright: footerData.copyright })}
      </div>
    </footer>
  );
}

function FooterLinkColumn({ section }: { section: FooterColumnItem }) {
  if (!('items' in section)) return null;

  const title =
    'title' in section && typeof section.title === 'string'
      ? section.title
      : '';

  return (
    <div>
      {title && (
        <p className="text-xs font-semibold mb-3 uppercase tracking-wider text-white/50 font-sans m-0">
          {title}
        </p>
      )}
      <ul className="flex flex-col gap-2 p-0 m-0 list-none">
        {section.items.map((item) => (
          <li key={item.label} className="m-0">
            <Link
              to={item.href || item.to || '#'}
              className="text-xs font-sans text-white/35 no-underline transition-colors hover:text-white/80 hover:no-underline"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FooterCopyright({ copyright }: { copyright?: string }) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-8 border-t border-white/5">
      <p className="text-xs m-0 text-white/20 font-sans">{copyright || ''}</p>
      <div className="flex items-center gap-4">
        <a
          href="https://github.com/PierreOlivierBrillant/react-dataflow-animator"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Dépôt GitHub du projet"
          className="text-white/20 hover:text-white/50 transition-colors no-underline"
        >
          <Github size={15} />
        </a>
      </div>
    </div>
  );
}
