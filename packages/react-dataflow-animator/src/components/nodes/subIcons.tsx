import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import {
  SiReact,
  SiNodedotjs,
  SiExpress,
  SiPostgresql,
  SiMysql,
  SiMongodb,
  SiRedis,
  SiDotnet,
  SiSharp,
  SiPython,
  SiPhp,
  SiJavascript,
  SiTypescript,
  SiHtml5,
  SiCss,
  SiVuedotjs,
  SiAngular,
  SiGooglechrome,
  SiFirefoxbrowser,
  SiDocker,
  SiNginx,
  SiGraphql,
} from 'react-icons/si';
import { FaJava, FaAws, FaDatabase } from 'react-icons/fa';
import { DiMsqlServer } from 'react-icons/di';

/**
 * Sous-icônes technologiques (badge `subicon`), basées sur react-icons.
 * Extensible via `registerSubIcon`. Les couleurs sont choisies pour rester
 * lisibles sur fond clair comme sombre.
 */

interface IconDef {
  Icon: IconType;
  color: string;
}

const KNOWN: Record<string, IconDef> = {
  react: { Icon: SiReact, color: '#61DAFB' },
  node: { Icon: SiNodedotjs, color: '#5FA04E' },
  express: { Icon: SiExpress, color: '#64748b' },
  postgres: { Icon: SiPostgresql, color: '#4169E1' },
  postgresql: { Icon: SiPostgresql, color: '#4169E1' },
  mysql: { Icon: SiMysql, color: '#4479A1' },
  mongodb: { Icon: SiMongodb, color: '#47A248' },
  redis: { Icon: SiRedis, color: '#FF4438' },
  dotnet: { Icon: SiDotnet, color: '#8B5CF6' },
  csharp: { Icon: SiSharp, color: '#8B5CF6' },
  java: { Icon: FaJava, color: '#E76F00' },
  python: { Icon: SiPython, color: '#3776AB' },
  php: { Icon: SiPhp, color: '#8993BE' },
  javascript: { Icon: SiJavascript, color: '#E8C400' },
  typescript: { Icon: SiTypescript, color: '#3178C6' },
  html: { Icon: SiHtml5, color: '#E34F26' },
  css: { Icon: SiCss, color: '#1572B6' },
  vue: { Icon: SiVuedotjs, color: '#4FC08D' },
  angular: { Icon: SiAngular, color: '#DD0031' },
  chrome: { Icon: SiGooglechrome, color: '#4285F4' },
  firefox: { Icon: SiFirefoxbrowser, color: '#FF7139' },
  docker: { Icon: SiDocker, color: '#2496ED' },
  nginx: { Icon: SiNginx, color: '#009639' },
  graphql: { Icon: SiGraphql, color: '#E10098' },
  aws: { Icon: FaAws, color: '#FF9900' },
  mssql: { Icon: DiMsqlServer, color: '#CC2927' },
  db: { Icon: FaDatabase, color: '#FFD700' },
};

const custom: Record<string, ReactNode> = {};

/** Enregistre une sous-icône personnalisée (composant react-icons, SVG, image…). */
export function registerSubIcon(name: string, node: ReactNode): void {
  custom[name.toLowerCase()] = node;
}

/** Pastille de texte libre, pour les `subicon` qui ne sont pas des icônes connues. */
function renderText(text: string): ReactNode {
  const label = text.length > 4 ? text.slice(0, 4) : text;
  const fontSize =
    label.length >= 4
      ? 6
      : label.length === 3
        ? 7.5
        : label.length === 2
          ? 9
          : 12;
  return (
    <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#475569" />
      <text
        x="12"
        y="12"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="var(--rdfa-font)"
        fontWeight="700"
        fontSize={fontSize}
        fill="#ffffff"
      >
        {label}
      </text>
    </svg>
  );
}

/**
 * Résout un `subicon` : icône personnalisée enregistrée, sinon techno connue,
 * sinon pastille de texte libre (ex: 'v2', 'API', 'JWT').
 */
export function getSubIcon(name: string): ReactNode {
  const key = name.toLowerCase();
  if (custom[key]) return custom[key];
  const def = KNOWN[key];
  if (def) return <def.Icon color={def.color} title={name} />;
  return renderText(name);
}
