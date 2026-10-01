import type { ArchitecturePreset } from '../knowledge/types';

const entryPath = ['client', 'dns', 'cdn', 'waf', 'load-balancer', 'api-gateway'];
const operations = ['observability', 'infrastructure'];

/** Presets are different views of one knowledge graph, not separate diagrams. */
export const presets: ArchitecturePreset[] = [
  {
    id: 'production',
    name: 'Production system',
    description: 'The big picture. Follow a request from the edge to data, events, and delivery.',
    icon: 'globe',
    nodes: [
      ...entryPath,
      'auth',
      'services',
      'cache',
      'database',
      'storage',
      'kafka',
      'workers',
      'search',
      'realtime',
      'notifications',
      ...operations,
    ],
  },
  {
    id: 'ecommerce',
    name: 'E-commerce',
    description:
      'A storefront with product search, cached reads, durable orders, and asynchronous fulfillment.',
    icon: 'layers',
    nodes: [
      ...entryPath,
      'auth',
      'services',
      'cache',
      'database',
      'storage',
      'kafka',
      'workers',
      'search',
      'notifications',
      ...operations,
    ],
  },
  {
    id: 'chat',
    name: 'Real-time chat',
    description:
      'Persistent connections, message history, presence, fanout, and offline push delivery.',
    icon: 'message-circle',
    nodes: [
      ...entryPath,
      'auth',
      'services',
      'cache',
      'database',
      'kafka',
      'workers',
      'realtime',
      'notifications',
      ...operations,
    ],
  },
  {
    id: 'video',
    name: 'Video streaming',
    description:
      'Serve video segments from the edge while APIs manage playback and workers prepare media.',
    icon: 'radio',
    nodes: [
      ...entryPath,
      'auth',
      'services',
      'cache',
      'database',
      'storage',
      'kafka',
      'workers',
      'search',
      ...operations,
    ],
  },
  {
    id: 'url-shortener',
    name: 'URL shortener',
    description:
      'A read-heavy redirect path: short keys, hot cache entries, durable mappings, and click events.',
    icon: 'route',
    nodes: [...entryPath, 'services', 'cache', 'database', 'kafka', ...operations],
  },
  {
    id: 'analytics',
    name: 'Analytics pipeline',
    description:
      'Collect events, process streams, and serve derived views alongside durable source data.',
    icon: 'activity',
    nodes: [
      ...entryPath,
      'auth',
      'services',
      'cache',
      'database',
      'storage',
      'kafka',
      'workers',
      'search',
      ...operations,
    ],
  },
];

export function getPreset(id: string): ArchitecturePreset {
  return presets.find((preset) => preset.id === id) ?? presets[0];
}
