import type { Relationship } from '../knowledge/types';
import type { ScaleScenario, ScaleWorkload } from './types';

export function estimateWorkload(scenario: ScaleScenario, users: number): ScaleWorkload {
  const activeUsers = Math.round(users * scenario.assumptions.concurrency);
  const requestsPerSecond = Math.round(activeUsers * scenario.assumptions.requestsPerSecond);
  const readsPerSecond = Math.round(requestsPerSecond * scenario.assumptions.readRatio);
  const writesPerSecond = requestsPerSecond - readsPerSecond;
  const bandwidthMBps = Math.round(
    (requestsPerSecond * scenario.assumptions.averageResponseKB) / 1024,
  );
  return { users, activeUsers, requestsPerSecond, readsPerSecond, writesPerSecond, bandwidthMBps };
}

export function architectureNodes(scenario: ScaleScenario, stageIndex: number): string[] {
  return [
    ...new Set([
      ...scenario.baseNodes,
      ...scenario.stages.slice(1, stageIndex + 1).flatMap((stage) => stage.addedNodes),
    ]),
  ];
}

const edge = (
  source: string,
  target: string,
  label: string,
  kind: Relationship['kind'] = 'request',
): Relationship => ({
  id: `scale-${source}-${target}-${kind.replaceAll(' ', '-')}`,
  source,
  target,
  kind,
  label,
  description: `${label} in the current simulated scale architecture.`,
});

export function architectureEdges(nodes: string[]): Relationship[] {
  const visible = new Set(nodes);
  const result: Relationship[] = [];
  const has = (id: string) => visible.has(id);
  const add = (source: string, target: string, label: string, kind?: Relationship['kind']) => {
    if (has(source) && has(target)) result.push(edge(source, target, label, kind));
  };

  const entry = has('multi-region')
    ? 'multi-region'
    : has('cdn')
      ? 'cdn'
      : has('load-balancer')
        ? 'load-balancer'
        : has('realtime')
          ? 'realtime'
          : 'services';
  add('client', entry, has('multi-region') ? 'nearest healthy region' : 'request');
  if (has('multi-region')) {
    const next = has('cdn')
      ? 'cdn'
      : has('load-balancer')
        ? 'load-balancer'
        : has('realtime')
          ? 'realtime'
          : 'services';
    add('multi-region', next, 'regional route');
  }
  if (has('cdn')) add('cdn', has('load-balancer') ? 'load-balancer' : 'services', 'edge miss');
  if (has('load-balancer'))
    add(
      'load-balancer',
      has('realtime') && !has('services') ? 'realtime' : 'services',
      'distribute',
    );
  if (has('realtime') && has('services')) add('realtime', 'services', 'route message');

  const application = has('services') ? 'services' : has('realtime') ? 'realtime' : null;
  if (application) {
    if (has('cache')) {
      add(application, 'cache', 'cache lookup', 'cache lookup');
      if (has('database')) add('cache', 'database', 'miss / fill', 'cache fill');
    } else if (has('database')) add(application, 'database', 'read / write', 'read');
    add(application, 'storage', 'object access', 'read');
    add(application, 'search', 'rank / search', 'read');
    add(application, 'kafka', 'publish event', 'publish');
    if (has('workers') && !has('kafka')) add(application, 'workers', 'background job', 'event');
  }
  add('kafka', 'workers', 'consume', 'consume');
  add('database', 'replication', 'replicate', 'replication');
  add('database', 'sharding', 'partition by key', 'synchronization');
  if (has('infrastructure') && has('multi-region'))
    add('infrastructure', 'multi-region', 'regional capacity', 'failover');
  return result;
}

export function compactNumber(value: number): string {
  return Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}
