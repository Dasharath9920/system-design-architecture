export interface TrafficLevel {
  id: string;
  label: string;
  /** Illustrative workload, not a capacity prediction or benchmark. */
  rps: number;
  description: string;
  effects: string[];
  serviceInstances: number;
  cacheHitRate: number;
  dbReplicas: number;
  queueDepth: number;
}

export const trafficLevels: TrafficLevel[] = [
  {
    id: 'quiet',
    label: 'Quiet',
    rps: 10,
    description:
      'A small workload. A simple deployment can be enough; redundancy depends on availability needs.',
    effects: [
      'One application instance handles this illustrative load.',
      'A single database can be a reasonable starting point.',
    ],
    serviceInstances: 1,
    cacheHitRate: 0.4,
    dbReplicas: 0,
    queueDepth: 0,
  },
  {
    id: 'steady',
    label: 'Steady',
    rps: 1_000,
    description:
      'Spread independent requests across application instances and cache repeated reads.',
    effects: [
      'Three service instances share requests.',
      'A warm cache reduces repeated database reads.',
      'A read replica can serve reads that tolerate replication lag.',
    ],
    serviceInstances: 3,
    cacheHitRate: 0.85,
    dbReplicas: 1,
    queueDepth: 12,
  },
  {
    id: 'surge',
    label: 'Surge',
    rps: 25_000,
    description:
      'A burst adds queueing and database pressure. Scaling helps only if downstream capacity is available.',
    effects: [
      'Autoscaling grows the pool to six service instances in this model.',
      'Backpressure and bounded queues protect dependencies.',
      'Coalesced cache fills prevent a miss storm.',
    ],
    serviceInstances: 6,
    cacheHitRate: 0.93,
    dbReplicas: 2,
    queueDepth: 340,
  },
  {
    id: 'global',
    label: 'Global',
    rps: 100_000,
    description:
      'Use regional routing and edge delivery. Partition data when measured limits justify the complexity.',
    effects: [
      'Regional pools bring compute closer to users.',
      'More stream partitions allow more parallel consumers.',
      'Data locality, cross-region lag, and failover become design constraints.',
    ],
    serviceInstances: 9,
    cacheHitRate: 0.97,
    dbReplicas: 3,
    queueDepth: 850,
  },
];

export interface TrafficImpact {
  databaseReadsPerSecond: number;
  healthyServiceInstances: number;
  queueDepth: number;
  cacheAvailable: boolean;
  note: string;
}

/** A deterministic read-heavy model; these values deliberately do not imply measured performance. */
export function getTrafficImpact(
  level: TrafficLevel,
  failedNodes: readonly string[],
): TrafficImpact {
  const failures = new Set(failedNodes);
  const cacheAvailable = !failures.has('cache');
  const databaseReadsPerSecond = Math.round(
    level.rps * (cacheAvailable ? 1 - level.cacheHitRate : 1),
  );
  return {
    databaseReadsPerSecond,
    healthyServiceInstances: Math.max(
      0,
      level.serviceInstances - (failures.has('services') ? 1 : 0),
    ),
    queueDepth:
      level.queueDepth +
      (failures.has('kafka') || failures.has('workers') ? Math.round(level.rps * 0.1) : 0),
    cacheAvailable,
    note: cacheAvailable
      ? 'Illustrative reads reaching the database after application cache lookups; CDN caching is excluded.'
      : 'Cache bypass sends every modeled read to the database. Apply limits and backpressure before it saturates.',
  };
}
