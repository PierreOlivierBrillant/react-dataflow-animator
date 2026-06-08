import { useEffect, useState } from 'react';

export interface Route {
  page: 'home' | 'demos' | 'playground' | 'docs';
  /** Segment optionnel (id de démo, id de section de doc…). */
  param?: string;
}

function parse(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/';
  const segments = path.split('/').filter(Boolean); // ['docs','installation']
  const [head, param] = segments;
  switch (head) {
    case 'demos':
      return { page: 'demos' };
    case 'playground':
      return { page: 'playground', param };
    case 'docs':
      return { page: 'docs', param };
    default:
      return { page: 'home' };
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() =>
    parse(typeof window !== 'undefined' ? window.location.hash : ''),
  );
  useEffect(() => {
    const onChange = () => {
      setRoute(parse(window.location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function navigate(to: string): void {
  window.location.hash = to;
}
