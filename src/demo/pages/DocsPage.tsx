import { useEffect, useRef, useState } from 'react';
import { docPages, docPagesById } from '../docsContent';

interface TocEntry {
  id: string;
  text: string;
  level: number;
}

function buildGroups() {
  const groups: { name: string; pages: typeof docPages }[] = [];
  for (const page of docPages) {
    let group = groups.find((g) => g.name === page.group);
    if (!group) {
      group = { name: page.group, pages: [] };
      groups.push(group);
    }
    group.pages.push(page);
  }
  return groups;
}

export function DocsPage({ sectionId }: { sectionId?: string }) {
  const page = docPagesById[sectionId ?? ''] ?? docPages[0];
  const contentRef = useRef<HTMLDivElement>(null);
  const [toc, setToc] = useState<TocEntry[]>([]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const heads = el.querySelectorAll<HTMLElement>('h2[id], h3[id]');
    setToc(
      [...heads].map((h) => ({
        id: h.id,
        text: h.textContent ?? '',
        level: h.tagName === 'H3' ? 3 : 2,
      })),
    );
  }, [page.id]);

  const groups = buildGroups();

  return (
    <div className="docs">
      <aside className="docs-sidebar">
        {groups.map((group) => (
          <div key={group.name}>
            <div className="group">{group.name}</div>
            {group.pages.map((p) => (
              <a
                key={p.id}
                href={`#/docs/${p.id}`}
                className={p.id === page.id ? 'active' : ''}
              >
                {p.label}
              </a>
            ))}
          </div>
        ))}
      </aside>

      <article className="docs-content" ref={contentRef}>
        <h1>{page.title}</h1>
        {page.render()}
      </article>

      <nav className="toc">
        {toc.length > 0 ? <div className="toc-title">Sur cette page</div> : null}
        {toc.map((entry) => (
          <a
            key={entry.id}
            href={`#${entry.id}`}
            className={entry.level === 3 ? 'lvl-3' : ''}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(entry.id)?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            {entry.text}
          </a>
        ))}
      </nav>
    </div>
  );
}
