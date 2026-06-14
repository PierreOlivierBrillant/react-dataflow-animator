import type { DataFlowSpec } from 'react-dataflow-animator';

/**
 * Déploiement Kubernetes : de `kubectl apply` jusqu'au pod en cours d'exécution.
 * Une zone englobe les composants du plan de contrôle et du nœud. Met en avant
 * le rôle pivot de l'API Server et le découplage scheduler / kubelet.
 */
export const kubernetes: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [
    { id: 'cli', type: 'laptop', text: 'kubectl', lane: 1 },
    { id: 'api', type: 'server', text: 'API Server', icon: 'k8s', lane: 2 },
    { id: 'etcd', type: 'database', text: 'etcd', icon: 'db', lane: 3 },
    { id: 'sched', type: 'server', text: 'Scheduler', lane: 3 },
    { id: 'kubelet', type: 'server', text: 'Kubelet', lane: 4 },
    { id: 'pod', type: 'server', text: 'Pod', icon: 'docker', lane: 5 },
  ],
  zones: [
    {
      id: 'cp',
      contains: ['api', 'etcd', 'sched'],
      color: '#2563eb',
      label: 'Plan de contrôle',
    },
    { contains: ['kubelet', 'pod'], color: '#16a34a', label: 'Nœud de calcul' },
  ],
  connections: [
    { from: 'cli', to: 'api', style: 'dotted' },
    { from: 'api', to: 'etcd', style: 'dotted' },
    { from: 'api', to: 'sched', style: 'dotted' },
    { from: 'api', to: 'kubelet', style: 'dotted' },
    { from: 'kubelet', to: 'pod', style: 'dotted' },
  ],
  packets: [
    {
      id: 'apply',
      kind: 'http_packet',
      packet_content: {
        header: 'apply Deployment',
        body: { type: 'text', value: 'replicas: 1' },
      },
    },
    {
      id: 'persist',
      kind: 'http_packet',
      packet_content: {
        header: 'write',
        body: { type: 'text', value: 'spec désirée' },
      },
    },
    {
      id: 'watch',
      kind: 'http_packet',
      packet_content: { header: 'pod non assigné' },
    },
    {
      id: 'bind',
      kind: 'http_packet',
      packet_content: { header: 'bind → nœud A' },
    },
    {
      id: 'create',
      kind: 'http_packet',
      packet_content: {
        header: 'créer le conteneur',
        body: { type: 'text', value: 'image app:1.4.0' },
      },
    },
  ],
  timeline: [
    {
      type: 'comment',
      object: 'cli',
      text: '1. On déclare l’état désiré : kubectl apply -f deploy.yaml',
      duration: 2400,
    },
    {
      type: 'set_content',
      object: 'cli',
      content: {
        type: 'code',
        language: 'bash',
        value: '$ kubectl apply -f deploy.yaml',
      },
      keep_until: 'sch',
    },
    { type: 'move', object: 'apply', from: 'cli', to: 'api', duration: 1300 },
    {
      type: 'comment',
      object: 'api',
      text: '2. L’API Server valide et persiste l’état désiré dans etcd',
      duration: 2400,
    },
    {
      type: 'move',
      object: 'persist',
      from: 'api',
      to: 'etcd',
      duration: 1200,
    },
    {
      type: 'comment',
      object: 'sched',
      text: '3. Le scheduler repère un pod sans nœud et lui en choisit un',
      duration: 2600,
    },
    {
      type: 'move',
      id: 'sch',
      object: 'watch',
      from: 'api',
      to: 'sched',
      duration: 1200,
    },
    { type: 'loading', id: 'decide', object: 'sched', duration: 1000 },
    {
      type: 'move',
      object: 'bind',
      from: 'sched',
      to: 'api',
      duration: 1200,
      wait_for: 'decide',
    },
    {
      type: 'comment',
      object: 'kubelet',
      text: '4. Le kubelet du nœud choisi reçoit l’ordre et lance le conteneur',
      duration: 2600,
    },
    {
      type: 'move',
      object: 'create',
      from: 'api',
      to: 'kubelet',
      duration: 1300,
    },
    {
      type: 'move',
      object: 'create',
      from: 'kubelet',
      to: 'pod',
      duration: 1100,
    },
    { type: 'loading', id: 'boot', object: 'pod', duration: 1200 },
    {
      type: 'set_content',
      object: 'pod',
      content: { type: 'text', value: '🟢 Running' },
      keep_until_end: true,
      wait_for: 'boot',
    },
    {
      type: 'comment',
      object: 'pod',
      text: 'Pod en cours d’exécution — état désiré atteint ✅',
      duration: 2200,
    },
    { type: 'wait', duration: 1200 },
  ],
};
