import type { DataFlowSpec } from 'react-dataflow-animator';

/**
 * Pipeline CI/CD : du `git push` jusqu'au déploiement en production. Met en
 * scène une zone « Pipeline » regroupant les étapes automatisées, et plusieurs
 * `loading` (tests, build) pour matérialiser le temps de traitement.
 */
export const cicd: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [
    { id: 'dev', type: 'laptop', text: 'Développeur', icon: 'git', lane: 1 },
    { id: 'repo', type: 'server', text: 'Dépôt distant', icon: 'git', lane: 2 },
    { id: 'ci', type: 'server', text: 'Runner CI', icon: 'docker', lane: 3 },
    {
      id: 'registry',
      type: 'database',
      text: 'Registry d’images',
      icon: 'docker',
      lane: 4,
    },
    { id: 'prod', type: 'cloud', text: 'Production', icon: 'aws', lane: 5 },
  ],
  zones: [
    {
      contains: ['ci', 'registry'],
      color: '#7c3aed',
      label: 'Pipeline automatisé',
    },
  ],
  connections: [
    { from: 'dev', to: 'repo', style: 'dotted' },
    { from: 'repo', to: 'ci', style: 'dotted' },
    { from: 'ci', to: 'registry', style: 'dotted' },
    { from: 'registry', to: 'prod', style: 'dotted' },
  ],
  packets: [
    {
      id: 'push',
      kind: 'http_packet',
      packet_content: {
        header: 'git push',
        body: { type: 'text', value: 'feat: nouvelle page' },
      },
    },
    {
      id: 'hook',
      kind: 'http_packet',
      packet_content: {
        header: 'webhook',
        body: { type: 'text', value: 'push sur main' },
      },
    },
    {
      id: 'image',
      kind: 'http_packet',
      packet_content: {
        header: 'docker push',
        body: { type: 'text', value: 'app:1.4.0' },
      },
    },
    {
      id: 'deploy',
      kind: 'http_packet',
      packet_content: {
        header: 'déploiement',
        body: { type: 'text', value: 'pull app:1.4.0' },
      },
    },
  ],
  timeline: [
    {
      type: 'comment',
      object: 'dev',
      text: '1. Le développeur pousse sa branche',
      duration: 2000,
    },
    {
      type: 'set_content',
      object: 'dev',
      content: {
        type: 'code',
        language: 'bash',
        value: '$ git push origin main',
      },
      keep_until: 'hookstep',
    },
    { type: 'move', object: 'push', from: 'dev', to: 'repo', duration: 1300 },
    {
      type: 'comment',
      object: 'repo',
      text: '2. Le push sur main déclenche le pipeline (webhook)',
      duration: 2200,
    },
    {
      type: 'move',
      id: 'hookstep',
      object: 'hook',
      from: 'repo',
      to: 'ci',
      duration: 1300,
    },
    {
      type: 'comment',
      object: 'ci',
      text: '3. Le runner installe les dépendances et lance les tests',
      duration: 2400,
    },
    { type: 'loading', object: 'ci', duration: 1400 },
    {
      type: 'set_content',
      object: 'ci',
      content: {
        type: 'code',
        language: 'bash',
        value: '✓ 128 tests passés\n✓ build réussi',
      },
      keep_until: 'deploystep',
    },
    {
      type: 'comment',
      object: 'ci',
      text: '4. Build de l’image Docker, puis publication dans le registry',
      duration: 2400,
    },
    {
      type: 'move',
      object: 'image',
      from: 'ci',
      to: 'registry',
      duration: 1300,
    },
    {
      type: 'comment',
      object: 'registry',
      text: '5. Déploiement de la nouvelle image en production',
      duration: 2200,
    },
    {
      type: 'move',
      id: 'deploystep',
      object: 'deploy',
      from: 'registry',
      to: 'prod',
      duration: 1400,
    },
    { type: 'loading', id: 'rollout', object: 'prod', duration: 1200 },
    {
      type: 'comment',
      object: 'prod',
      text: 'Version 1.4.0 en ligne 🚀',
      duration: 2200,
      wait_for: 'rollout',
    },
    { type: 'wait', duration: 1200 },
  ],
};
