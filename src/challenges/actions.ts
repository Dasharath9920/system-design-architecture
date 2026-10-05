import type { ChallengeAction } from './types';

const definitions: Array<[string, string, string, string[]]> = [
  [
    'add_load_balancer',
    'Add load balancer + instances',
    'Distribute requests across replaceable servers.',
    ['rw-service', 'rw-gateway'],
  ],
  [
    'add_read_replica',
    'Add read replica',
    'Route eligible reads away from the primary; accept replica lag.',
    [
      'rw-database',
      'rw-posts',
      'rw-metadata',
      'rw-idempotency',
      'rw-ledger',
      'rw-shard-a',
      'rw-shard-b',
    ],
  ],
  [
    'add_cache',
    'Add cache',
    'Reuse bounded-staleness results and reduce repeated source work.',
    ['rw-service', 'rw-database', 'rw-posts', 'rw-cache'],
  ],
  [
    'add_cdn',
    'Add CDN',
    'Serve cacheable bytes near users and shield the origin.',
    ['rw-client', 'rw-storage', 'rw-cdn'],
  ],
  [
    'make_async',
    'Move non-critical work async',
    'Acknowledge the critical transaction before background work.',
    ['rw-service', 'rw-events', 'rw-notify'],
  ],
  [
    'add_failover_replica',
    'Add replica + failover',
    'Maintain a fenced standby and route after promotion.',
    ['rw-database', 'rw-posts', 'rw-metadata', 'rw-idempotency', 'rw-ledger'],
  ],
  [
    'add_rate_limiter',
    'Add rate limiter',
    'Reject excess or abusive work before scarce dependencies.',
    ['rw-gateway', 'rw-service'],
  ],
  [
    'direct_upload',
    'Use signed direct upload',
    'Move bulk bytes directly between client and object storage.',
    ['rw-client', 'rw-storage', 'rw-service'],
  ],
  [
    'add_consumers',
    'Add consumers',
    'Increase parallel consumer throughput within partition limits.',
    ['rw-events', 'rw-workers', 'rw-fanout'],
  ],
  [
    'add_search_index',
    'Add search index',
    'Use an inverted index instead of large wildcard scans.',
    ['rw-service', 'rw-database', 'rw-shard-a'],
  ],
  [
    'request_coalescing',
    'Coalesce identical misses',
    'Allow one bounded origin load while waiters share the result.',
    ['rw-cache', 'rw-service'],
  ],
  [
    'stagger_ttl',
    'Stagger TTL + refresh ahead',
    'Spread expirations and refresh popular values before they go cold.',
    ['rw-cache'],
  ],
  [
    'local_hot_cache',
    'Replicate hot data locally',
    'Spread a hot working set across service-local caches.',
    ['rw-cache', 'rw-service'],
  ],
  [
    'split_hot_key',
    'Split the hot key',
    'Distribute one hot logical value across independently served keys.',
    ['rw-cache'],
  ],
  [
    'add_partitions',
    'Add stream partitions',
    'Increase maximum useful consumer-group parallelism.',
    ['rw-events'],
  ],
  [
    'sticky_read',
    'Use read-your-writes routing',
    'Read from the writer or wait for a consistency token.',
    ['rw-client', 'rw-service', 'rw-database'],
  ],
  [
    'hybrid_fanout',
    'Use hybrid fanout',
    'Precompute normal timelines and merge celebrity posts at read time.',
    ['rw-fanout', 'rw-events', 'rw-service'],
  ],
  [
    'connection_gateways',
    'Scale connection gateways',
    'Partition sessions and route by connection ownership.',
    ['rw-connection', 'rw-presence'],
  ],
  [
    'shard_index',
    'Shard the search index',
    'Search index partitions concurrently, then merge.',
    ['rw-service', 'rw-shard-a', 'rw-shard-b'],
  ],
  [
    'async_media',
    'Queue media processing',
    'Process thumbnails or transcodes after the upload commit.',
    ['rw-events', 'rw-workers', 'rw-storage'],
  ],
  [
    'load_shedding',
    'Enable load shedding',
    'Protect critical work by rejecting excess load within a budget.',
    ['rw-gateway', 'rw-service'],
  ],
  [
    'circuit_breaker',
    'Add circuit breaker',
    'Stop repeated calls to an unavailable dependency and probe recovery.',
    ['rw-service', 'rw-cache'],
  ],
  [
    'local_fallback_cache',
    'Add bounded local fallback',
    'Retain a small stale-safe set during shared-cache failure.',
    ['rw-service', 'rw-cache'],
  ],
  [
    'add_region',
    'Add replicated region + routing',
    'Route around regional failure under an explicit replication policy.',
    ['rw-infrastructure', 'rw-database'],
  ],
  [
    'idempotency_key',
    'Add idempotency key',
    'Bind retries to one durable business operation.',
    ['rw-idempotency', 'rw-service'],
  ],
  [
    'saga_compensation',
    'Add saga compensation',
    'Record workflow state and compensate completed steps.',
    ['rw-service', 'rw-payment', 'rw-inventory'],
  ],
  [
    'repartition_data',
    'Change partition key + reshard',
    'Spread the dominant write dimension and migrate ownership.',
    ['rw-database', 'rw-shard-a', 'rw-graph', 'rw-fanout'],
  ],
  [
    'conversation_ordering',
    'Partition by conversation',
    'Route one conversation to an ordered log with sequence IDs.',
    ['rw-service', 'rw-database', 'rw-events'],
  ],
  [
    'cdn_hierarchy',
    'Add hierarchical CDN fanout',
    'Warm regional and edge caches while shielding the live origin.',
    ['rw-cdn', 'rw-storage'],
  ],
  [
    'idempotent_consumer',
    'Make consumer idempotent',
    'Persist one stable event effect before acknowledging progress.',
    ['rw-events', 'rw-workers', 'rw-service'],
  ],
  [
    'geo_partition',
    'Add geospatial index + cells',
    'Partition fresh positions by bounded geographic cells.',
    ['rw-ingest', 'rw-geo', 'rw-match'],
  ],
  [
    'autoscale',
    'Enable bounded autoscaling',
    'Add capacity from saturation signals while protecting dependencies.',
    ['rw-service', 'rw-infrastructure'],
  ],
  [
    'retry_budget',
    'Add retry budget',
    'Retry transient work with backoff without multiplying overload.',
    ['rw-service', 'rw-gateway'],
  ],
];
export const challengeActions: Record<string, ChallengeAction> = Object.fromEntries(
  definitions.map(([id, label, summary, nodeIds]) => {
    const changeType: ChallengeAction['changeType'] = ['sticky_read'].includes(id)
      ? 'change-routing'
      : ['make_async', 'async_media', 'conversation_ordering'].includes(id)
        ? 'change-communication'
        : ['add_consumers', 'autoscale', 'connection_gateways', 'add_partitions'].includes(id)
          ? 'scale-component'
          : ['repartition_data', 'shard_index', 'geo_partition', 'hybrid_fanout'].includes(id)
            ? 'change-data'
            : ['add_failover_replica', 'circuit_breaker', 'retry_budget', 'load_shedding'].includes(
                  id,
                )
              ? 'change-failure'
              : [
                    'idempotency_key',
                    'idempotent_consumer',
                    'request_coalescing',
                    'stagger_ttl',
                    'split_hot_key',
                    'direct_upload',
                  ].includes(id)
                ? 'change-policy'
                : 'add-component';
    return [id, { id, label, summary, nodeIds, changeType }];
  }),
);
