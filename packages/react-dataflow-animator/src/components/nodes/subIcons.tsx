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
  SiGo,
  SiRuby,
  SiRubyonrails,
  SiLinux,
  SiApple,
  SiNextdotjs,
  SiVercel,
  SiDigitalocean,
  SiGit,
  SiRust,
  SiKubernetes,
  SiOpenid,
  SiGooglepay,
  SiApplepay,
  SiVisa,
  SiMastercard,
  SiBluetooth,
  SiFirebase,
} from 'react-icons/si';
import {
  FaJava,
  FaAws,
  FaDatabase,
  FaWindows,
  FaPiggyBank,
} from 'react-icons/fa';
import { DiMsqlServer } from 'react-icons/di';
import { VscAzure } from 'react-icons/vsc';
import { MdHttp, MdDns, Md5G, MdWifi } from 'react-icons/md';
import { TbApi } from 'react-icons/tb';

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
  '5g': { Icon: Md5G, color: '#64748b' },
  angular: { Icon: SiAngular, color: '#DD0031' },
  api: { Icon: TbApi, color: '#64748b' },
  apple: { Icon: SiApple, color: '#A2AAAD' },
  'apple pay': { Icon: SiApplepay, color: '#A2AAAD' },
  applepay: { Icon: SiApplepay, color: '#A2AAAD' },
  aws: { Icon: FaAws, color: '#FF9900' },
  azure: { Icon: VscAzure, color: '#0078D4' },
  bank: { Icon: FaPiggyBank, color: '#EC4899' },
  banque: { Icon: FaPiggyBank, color: '#EC4899' },
  bluetooth: { Icon: SiBluetooth, color: '#0082FC' },
  chrome: { Icon: SiGooglechrome, color: '#4285F4' },
  csharp: { Icon: SiSharp, color: '#8B5CF6' },
  css: { Icon: SiCss, color: '#1572B6' },
  db: { Icon: FaDatabase, color: '#FFD700' },
  digitalocean: { Icon: SiDigitalocean, color: '#0080FF' },
  dns: { Icon: MdDns, color: '#64748b' },
  docker: { Icon: SiDocker, color: '#2496ED' },
  dotnet: { Icon: SiDotnet, color: '#8B5CF6' },
  express: { Icon: SiExpress, color: '#64748b' },
  firebase: { Icon: SiFirebase, color: '#FFCA28' },
  firefox: { Icon: SiFirefoxbrowser, color: '#FF7139' },
  git: { Icon: SiGit, color: '#F05032' },
  go: { Icon: SiGo, color: '#00ADD8' },
  'google pay': { Icon: SiGooglepay, color: '#4285F4' },
  googlepay: { Icon: SiGooglepay, color: '#4285F4' },
  gpay: { Icon: SiGooglepay, color: '#4285F4' },
  graphql: { Icon: SiGraphql, color: '#E10098' },
  html: { Icon: SiHtml5, color: '#E34F26' },
  http: { Icon: MdHttp, color: '#64748b' },
  java: { Icon: FaJava, color: '#E76F00' },
  javascript: { Icon: SiJavascript, color: '#E8C400' },
  k8s: { Icon: SiKubernetes, color: '#326CE5' },
  kubernetes: { Icon: SiKubernetes, color: '#326CE5' },
  linux: { Icon: SiLinux, color: '#FCC624' },
  mastercard: { Icon: SiMastercard, color: '#EB001B' },
  mongodb: { Icon: SiMongodb, color: '#47A248' },
  mssql: { Icon: DiMsqlServer, color: '#CC2927' },
  mysql: { Icon: SiMysql, color: '#4479A1' },
  next: { Icon: SiNextdotjs, color: '#64748b' },
  nextjs: { Icon: SiNextdotjs, color: '#64748b' },
  nginx: { Icon: SiNginx, color: '#009639' },
  node: { Icon: SiNodedotjs, color: '#5FA04E' },
  oidc: { Icon: SiOpenid, color: '#F78C40' },
  openid: { Icon: SiOpenid, color: '#F78C40' },
  php: { Icon: SiPhp, color: '#8993BE' },
  piggybank: { Icon: FaPiggyBank, color: '#EC4899' },
  postgres: { Icon: SiPostgresql, color: '#4169E1' },
  postgresql: { Icon: SiPostgresql, color: '#4169E1' },
  python: { Icon: SiPython, color: '#3776AB' },
  rails: { Icon: SiRubyonrails, color: '#D30001' },
  react: { Icon: SiReact, color: '#61DAFB' },
  redis: { Icon: SiRedis, color: '#FF4438' },
  ruby: { Icon: SiRuby, color: '#CC342D' },
  rubyonrails: { Icon: SiRubyonrails, color: '#D30001' },
  rust: { Icon: SiRust, color: '#DEA584' },
  typescript: { Icon: SiTypescript, color: '#3178C6' },
  vercel: { Icon: SiVercel, color: '#64748b' },
  visa: { Icon: SiVisa, color: '#1434CB' },
  vue: { Icon: SiVuedotjs, color: '#4FC08D' },
  wifi: { Icon: MdWifi, color: '#64748b' },
  windows: { Icon: FaWindows, color: '#00A4EF' },
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
