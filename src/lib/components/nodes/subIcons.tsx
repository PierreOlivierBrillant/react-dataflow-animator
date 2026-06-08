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
import { FaJava, FaAws, FaQuestion } from 'react-icons/fa';

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
  dotnet: { Icon: SiDotnet, color: '#512BD4' },
  csharp: { Icon: SiSharp, color: '#512BD4' },
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
};

const custom: Record<string, ReactNode> = {};

/** Enregistre une sous-icône personnalisée (composant react-icons, SVG, image…). */
export function registerSubIcon(name: string, node: ReactNode): void {
  custom[name.toLowerCase()] = node;
}

export function getSubIcon(name: string): ReactNode {
  const key = name.toLowerCase();
  if (custom[key]) return custom[key];
  const def = KNOWN[key] ?? { Icon: FaQuestion, color: '#64748b' };
  const Icon = def.Icon;
  return <Icon color={def.color} title={name} />;
}
