import type { Relationship } from '../knowledge/types';

// Start with a readable teaching path. Side paths remain available on inspection,
// in a matching preset, and while a simulation traverses them.
const overviewEdges = new Set([
  'client-dns',
  'client-cdn',
  'cdn-waf',
  'waf-load-balancer',
  'load-balancer-api-gateway',
  'api-gateway-auth',
  'api-gateway-services',
  'services-cache',
  'services-database',
  'services-kafka',
  'kafka-workers',
  'workers-search',
  'workers-notifications',
  'services-storage',
  'services-realtime',
]);
const presetEdges: Record<string, string[]> = {
  chat: [
    'client-realtime',
    'realtime-cache',
    'realtime-database',
    'realtime-kafka',
    'workers-realtime',
    'realtime-notifications',
  ],
  video: ['cdn-storage', 'workers-storage'],
  analytics: ['database-kafka', 'workers-storage'],
  ecommerce: ['services-search', 'database-kafka'],
};
export function selectVisibleRelationships(
  edges: Relationship[],
  options: {
    depth: boolean;
    preset: string;
    selected: string | null;
    selectedRelationship?: string | null;
    telemetry: boolean;
    active: string[];
  },
): Relationship[] {
  return edges.filter((edge) => {
    if (edge.kind === 'telemetry') return options.telemetry || options.selected === 'observability';
    if (options.depth || options.active.includes(edge.id)) return true;
    if (options.selectedRelationship === edge.id) return true;
    if (edge.kind === 'cache fill') return false;
    if (options.selected && (edge.source === options.selected || edge.target === options.selected))
      return true;
    return overviewEdges.has(edge.id) || presetEdges[options.preset]?.includes(edge.id);
  });
}
