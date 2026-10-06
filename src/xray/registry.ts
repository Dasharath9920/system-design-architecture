export const xrayCatalog = [
  {
    id: 'postgres',
    name: 'PostgreSQL',
    category: 'Database',
    aliases: [
      'postgresql',
      'postgres',
      'database',
      'relational-db',
      'read-replicas',
      'replication',
    ],
    topics: {
      query: 'Query planner, buffer cache, index scan, connection pool',
      mvcc: 'MVCC, snapshots, vacuum, tuple visibility, locks',
      wal: 'WAL, durability, checkpoint, transaction commit',
      replication: 'Read replicas, replication slots, replica lag',
      btree: 'B-tree, B+tree, index lookup, page split',
      indexes: 'Index types, GIN, GiST, BRIN, hash index',
      locks: 'Row locks, deadlocks, lock ordering',
    },
  },
  {
    id: 'redis',
    name: 'Redis',
    category: 'Cache',
    aliases: ['cache', 'redis', 'redis-cluster', 'distributed-cache', 'elasticache'],
    topics: {
      routing: 'Hash slots, CRC16, Redis Cluster, sharding',
      memory: 'LRU, LFU, eviction, TTL, hot keys, data structures',
      persistence: 'AOF, RDB, Redis persistence',
      replication: 'Redis replication, failover',
      patterns:
        'Cache aside, read through, write through, write behind, refresh ahead, cache stampede',
      execution: 'RESP, pipelining, MULTI EXEC, Lua, scripting, threading',
      streams: 'Redis Streams, Pub/Sub, XACK, pending entries',
    },
  },
  {
    id: 'kafka',
    name: 'Kafka',
    category: 'Event streaming',
    aliases: ['kafka', 'apache-kafka', 'event-streaming', 'events', 'streaming', 'msk'],
    topics: {
      partitions: 'Kafka partitions, offsets, partition routing, append log',
      consumers: 'Consumer groups, consumer lag, rebalance, log compaction',
      replication: 'Kafka ISR, acks, KRaft, broker failure, exactly-once',
      transactions: 'Kafka transactions, transactional processing, external effects',
    },
  },
  {
    id: 'load-balancer',
    name: 'Load Balancer',
    category: 'Traffic',
    aliases: ['load-balancer', 'load-balancing', 'nginx', 'haproxy', 'alb', 'nlb'],
    topics: {
      routing: 'L4, L7, round robin, least connections, health checks, connection draining',
    },
  },
  {
    id: 'cdn',
    name: 'CDN',
    category: 'Edge',
    aliases: ['cdn', 'edge', 'cloudfront', 'cloudflare', 'fastly'],
    topics: { caching: 'Cache-Control, ETag, TTL, invalidation, origin shielding' },
  },
  {
    id: 'dns',
    name: 'DNS',
    category: 'Network',
    aliases: ['dns', 'route53', 'route-53'],
    topics: {
      resolution: 'Recursive resolver, root, TLD, authoritative, DNSSEC, negative caching',
    },
  },
  {
    id: 'gateway',
    name: 'API Gateway',
    category: 'Traffic',
    aliases: ['api-gateway', 'gateway', 'kong'],
    topics: { pipeline: 'Authentication, routing, quotas, reverse proxy, service mesh' },
  },
  {
    id: 'queue',
    name: 'Message Queue',
    category: 'Messaging',
    aliases: ['queue', 'message-queue', 'sqs', 'rabbitmq', 'workers', 'background-workers'],
    topics: {
      delivery: 'Visibility timeout, retry, acknowledgement, dead letter queue, backpressure',
    },
  },
  {
    id: 'search',
    name: 'Search',
    category: 'Derived data',
    aliases: ['search', 'search-index', 'elasticsearch', 'opensearch'],
    topics: { indexing: 'Inverted index, analyzer, BM25, shards, refresh, segments' },
  },
  {
    id: 'object-storage',
    name: 'Object Storage',
    category: 'Storage',
    aliases: ['object-storage', 's3', 'storage', 'blob-storage', 'gcs'],
    topics: {
      upload: 'Multipart upload, checksum, bucket, object key, versioning, erasure coding',
    },
  },
  {
    id: 'websocket',
    name: 'WebSocket',
    category: 'Realtime',
    aliases: ['websocket', 'websockets', 'realtime', 'realtime-gateway'],
    topics: { connections: 'HTTP upgrade, heartbeat, fanout, reconnect, SSE, long polling' },
  },
  {
    id: 'kubernetes',
    name: 'Kubernetes',
    category: 'Infrastructure',
    aliases: ['kubernetes', 'k8s', 'infrastructure', 'eks', 'gke', 'aks'],
    topics: { reconciliation: 'Pod, scheduler, kubelet, etcd, HPA, readiness, control loop' },
  },
  {
    id: 'rate-limiter',
    name: 'Rate Limiter',
    category: 'Protection',
    aliases: ['rate-limiter', 'rate-limiting'],
    topics: { bucket: 'Token bucket, leaky bucket, fixed window, sliding window' },
  },
  {
    id: 'auth',
    name: 'Authentication',
    category: 'Identity',
    aliases: ['auth', 'identity', 'authentication', 'oauth', 'oidc', 'jwt'],
    topics: { identity: 'OAuth, OIDC, PKCE, JWT, sessions, authorization, mTLS' },
  },
  {
    id: 'multi-region',
    name: 'Multi-region',
    category: 'Resilience',
    aliases: ['multi-region', 'global-load-balancer', 'geo-replication'],
    topics: { regions: 'Active passive, active active, RPO, RTO, CAP, PACELC, consistency' },
  },
] as const;
export type XRayId = (typeof xrayCatalog)[number]['id'];
export function matchXRay(id: string, label = ''): XRayId | undefined {
  if (/mysql|innodb|cassandra|dynamo|mongo|spanner|cockroach/i.test(`${id} ${label}`))
    return undefined;
  const exact = xrayCatalog.find((item) => (item.aliases as readonly string[]).includes(id));
  if (exact) return exact.id;
  const text = `${id} ${label}`.toLowerCase().replace(/[_-]/g, ' ');
  // An explicitly named implementation must not be presented as another product.
  return xrayCatalog.find((item) =>
    item.aliases.some((alias) => text.includes(alias.replace(/-/g, ' '))),
  )?.id;
}
export interface XRaySearchResult {
  id: XRayId;
  layer: string;
  name: string;
  context: string;
}
const mechanismIndex: [XRayId, string, string][] = [
  ['load-balancer', 'consistent-hashing', 'Consistent hashing'],
  ['load-balancer', 'rendezvous', 'Rendezvous hashing'],
  ['postgres', 'lsm', 'LSM tree (storage alternative)'],
  ['search', 'bloom', 'Bloom filter'],
  ['redis', 'lru', 'LRU'],
  ['redis', 'lfu', 'LFU'],
  ['rate-limiter', 'token-bucket', 'Token bucket'],
  ['rate-limiter', 'leaky-bucket', 'Leaky bucket'],
  ['rate-limiter', 'fixed-window', 'Fixed window'],
  ['rate-limiter', 'sliding-window', 'Sliding window log'],
  ['rate-limiter', 'sliding-counter', 'Sliding window counter'],
  ['kafka', 'raft', 'Raft'],
  ['kafka', 'leader-election', 'Leader election'],
  ['multi-region', 'quorum', 'Quorum'],
  ['redis', 'gossip', 'Gossip'],
  ['object-storage', 'merkle', 'Merkle tree'],
  ['gateway', 'circuit-breaker', 'Circuit breaker'],
  ['websocket', 'backoff', 'Exponential backoff + jitter'],
  ['queue', 'retry', 'Retry'],
  ['queue', 'idempotency', 'Idempotency'],
  ['queue', 'deduplication', 'Deduplication'],
  ['redis', 'hash-partitioning', 'Hash partitioning'],
  ['postgres', 'range-partitioning', 'Range partitioning'],
];
export function searchXRay(query: string): XRaySearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const algorithms = mechanismIndex
    .filter(([, , name]) => name.toLowerCase().includes(q))
    .map(([id, layer, name]) => ({ id, layer, name, context: 'Algorithms / behavior' }));
  return [
    ...algorithms,
    ...xrayCatalog.flatMap((item) => {
      const topics = Object.entries(item.topics).filter(([, words]) =>
        `${item.name} ${words}`.toLowerCase().includes(q),
      );
      return topics.map(([layer, words]) => ({
        id: item.id,
        layer,
        name: words.split(', ')[0],
        context: `${item.category} / ${item.name}`,
      }));
    }),
  ].slice(0, 5);
}
export async function loadXRay(id: XRayId) {
  const { mechanismLayers } = await import('./mechanisms');
  let result;
  if (id === 'postgres' || id === 'redis' || id === 'kafka') {
    const m = await import('./core');
    const { advancedLayers } = await import('./advanced');
    result = {
      ...m.coreConcepts[id],
      layers: {
        ...m.coreConcepts[id].layers,
        ...Object.fromEntries((advancedLayers[id] || []).map((l) => [l.id, l])),
      },
    };
  } else {
    const m = await import('./systems');
    result = m.systemConcepts[id];
  }
  return {
    ...result,
    layers: { ...result.layers, ...Object.fromEntries(mechanismLayers(id).map((l) => [l.id, l])) },
  };
}
