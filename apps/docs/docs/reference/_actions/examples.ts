import { DataFlowSpec } from 'react-dataflow-animator';

/** `move`: a packet travels from one node to another (appearance + arrival). */
export const moveExample: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [
    { id: 'browser', type: 'laptop', text: 'Browser', icon: 'chrome', lane: 1 },
    { id: 'api', type: 'server', text: 'API', icon: 'node', lane: 2 },
  ],
  packets: [
    {
      id: 'req',
      kind: 'http_packet',
      packet_content: { header: 'GET /users' },
    },
  ],
  timeline: [
    { type: 'move', object: 'req', from: 'browser', to: 'api', duration: 700 },
  ],
};

/** `arrow`: an animated arrow is drawn progressively between two nodes. */
export const arrowExample: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [
    { id: 'client', type: 'laptop', text: 'Client', lane: 1 },
    { id: 'server', type: 'server', text: 'Server', lane: 2 },
  ],
  packets: [],
  timeline: [
    {
      type: 'arrow',
      from: 'client',
      to: 'server',
      style: 'animated',
      arrow_head: 'forward',
      text: 'request',
      duration: 800,
    },
  ],
};

/** `parallel`: a `move` and an `arrow` of different types fire at the same instant. */
export const parallelExample: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [
    { id: 'a', type: 'laptop', text: 'Client', lane: 1 },
    { id: 'b', type: 'server', text: 'API', lane: 2 },
    { id: 'c', type: 'server', text: 'Worker', lane: 1 },
    { id: 'd', type: 'database', text: 'Queue', icon: 'redis', lane: 2 },
  ],
  packets: [
    { id: 'p1', kind: 'http_packet', packet_content: { header: 'POST /job' } },
  ],
  timeline: [
    {
      type: 'parallel',
      actions: [
        { type: 'move', object: 'p1', from: 'a', to: 'b', duration: 800 },
        {
          type: 'arrow',
          from: 'c',
          to: 'd',
          style: 'animated',
          arrow_head: 'forward',
          text: 'enqueue',
          duration: 800,
        },
      ],
    },
  ],
};

/** `loading`: a spinner runs on the database while it "processes" the query. */
export const loadingExample: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [
    { id: 'api', type: 'server', text: 'API', icon: 'node', lane: 1 },
    { id: 'db', type: 'database', text: 'Database', icon: 'postgres', lane: 2 },
  ],
  packets: [
    { id: 'q', kind: 'sql_request', request_content: 'SELECT * FROM users' },
    {
      id: 'rows',
      kind: 'sql_response',
      response_content: { header: '42 rows' },
    },
  ],
  timeline: [
    {
      id: 'send',
      type: 'move',
      object: 'q',
      from: 'api',
      to: 'db',
      duration: 600,
    },
    {
      type: 'loading',
      id: 'work',
      object: 'db',
      duration: 1200,
      wait_for: 'send',
    },
    {
      type: 'move',
      object: 'rows',
      from: 'db',
      to: 'api',
      duration: 600,
      wait_for: 'work',
    },
  ],
};

/** `set_content`: the three content modes (`code`, `text`, `table`) shown in turn. */
export const setContentExample: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [
    { id: 'editor', type: 'laptop', text: 'Editor', lane: 1 },
    { id: 'browser', type: 'laptop', text: 'Browser', icon: 'chrome', lane: 2 },
    { id: 'admin', type: 'server', text: 'Admin', lane: 3 },
  ],
  packets: [],
  timeline: [
    {
      type: 'set_content',
      object: 'editor',
      content: {
        type: 'code',
        language: 'javascript',
        value: 'const add = (a, b) => a + b;',
      },
      keep_until_end: true,
    },
    {
      type: 'set_content',
      object: 'browser',
      content: { type: 'text', url: 'example.com/users', value: 'Alice\nBob' },
      keep_until_end: true,
    },
    {
      type: 'set_content',
      object: 'admin',
      content: {
        type: 'table',
        columns: ['id', 'name'],
        rows_data: [
          [1, 'Alice'],
          [2, 'Bob'],
        ],
      },
      keep_until_end: true,
    },
  ],
};

/** `comment`: an omniscient bubble (no `object`) then bubbles attached to nodes. */
export const commentExample: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [
    { id: 'user', type: 'user', text: 'User', lane: 1 },
    { id: 'app', type: 'server', text: 'App', lane: 2 },
  ],
  packets: [],
  timeline: [
    { type: 'comment', text: 'Step 1 — Sign in', duration: 1000 },
    {
      type: 'comment',
      object: 'user',
      text: 'The user clicks "Log in"',
      duration: 1000,
    },
    {
      type: 'comment',
      object: 'app',
      text: 'Session created ✓',
      keep_until_end: true,
    },
  ],
};

/** `set_visible`: a node declared `visible: false` is revealed mid-timeline. */
export const setVisibleExample: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [
    { id: 'app', type: 'server', text: 'App', lane: 1 },
    {
      id: 'cache',
      type: 'database',
      text: 'Cache',
      icon: 'redis',
      lane: 2,
      visible: false,
    },
  ],
  packets: [],
  timeline: [
    { type: 'comment', text: 'No cache yet', duration: 1000 },
    { type: 'set_visible', object: 'cache', visible: true },
    {
      type: 'comment',
      object: 'cache',
      text: 'Redis cache added',
      keep_until_end: true,
    },
  ],
};

/** `rotate`: chained rotations toward absolute angles; the label stays upright. */
export const rotateExample: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [{ id: 'gear', type: 'star', text: 'gear', body: '⚙', lane: 1 }],
  packets: [],
  timeline: [
    { type: 'rotate', object: 'gear', to: 90, duration: 600 },
    { type: 'rotate', object: 'gear', to: 360, duration: 800 },
  ],
};

/** `highlight`: a pulsing halo on a static node, then on a permanent connection. */
export const highlightExample: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [
    { id: 'api', type: 'server', text: 'API', lane: 1 },
    { id: 'db', type: 'database', text: 'Database', icon: 'postgres', lane: 2 },
  ],
  connections: [
    { id: 'link', from: 'api', to: 'db', style: 'dashed', arrow_head: 'both' },
  ],
  packets: [],
  timeline: [
    { type: 'highlight', object: 'db', duration: 800 },
    { type: 'highlight', object: 'link', duration: 800 },
  ],
};
