import type { Challenge, ChallengeCategory, ChallengeDifficulty, ChallengeMetric } from './types';
import { challengeActions } from './actions';

type Seed = Omit<
  Challenge,
  | 'before'
  | 'after'
  | 'partialAfter'
  | 'workload'
  | 'failureConditions'
  | 'interactionTargets'
  | 'observed'
> & {
  metrics: Array<[string, string, string, string?]>;
  workload?: Challenge['workload'];
  failureConditions?: string[];
  interactionTargets?: Challenge['interactionTargets'];
  observed?: string;
};
const metric = (label: string, value: string, tone: ChallengeMetric['tone']): ChallengeMetric => ({
  label,
  value,
  tone,
});
const challenge = (seed: Seed): Challenge => ({
  ...seed,
  observed:
    seed.observed || `${seed.symptoms[0]?.label || 'The bottleneck'} is still on the active path.`,
  interactionTargets:
    seed.interactionTargets ||
    [...new Set(seed.allowedActions.flatMap((id) => challengeActions[id].nodeIds))].map(
      (targetId) => ({
        targetId,
        targetType: 'node' as const,
        prompt: 'How would you change this part of the system?',
        actions: seed.allowedActions.filter((id) =>
          challengeActions[id].nodeIds.includes(targetId),
        ),
      }),
    ),
  workload: seed.workload || {},
  failureConditions: seed.failureConditions || [
    'The original bottleneck remains on the critical path.',
  ],
  before: seed.metrics.map(([label, before]) => metric(label, before, 'critical')),
  after: seed.metrics.map(([label, , after]) => metric(label, after, 'good')),
  partialAfter: seed.metrics.map(([label, before, , partial]) =>
    metric(label, partial || before, partial ? 'warning' : 'critical'),
  ),
});
const solution = (actions: string[], result: string, tradeoff: string) => ({
  actions,
  result,
  tradeoff,
});
const base = (
  id: string,
  title: string,
  difficulty: ChallengeDifficulty,
  category: ChallengeCategory,
  family: string,
  company: string,
  scenario: string,
  description: string,
  context: string,
  symptomNode: string,
  symptom: string,
) => ({
  id,
  title,
  difficulty,
  category,
  description,
  context,
  architecture: { family, company, scenario },
  symptoms: [{ nodeId: symptomNode, label: symptom }],
});

export const challenges: Challenge[] = [
  challenge({
    ...base(
      'single-server-overload',
      'Single Server Overload',
      'easy',
      'scaling',
      'commerce',
      'generic',
      'app-overload-challenge',
      'Traffic has outgrown one application instance.',
      '18K requests/sec · CPU-bound request work',
      'rw-service',
      'CPU 98% · requests queueing',
    ),
    workload: { trafficRps: 18000 },
    allowedActions: ['add_load_balancer', 'autoscale', 'add_read_replica'],
    validSolutions: [
      solution(
        ['add_load_balancer'],
        'Requests now spread across healthy instances.',
        'Horizontal scaling needs health checks, draining, and a stateless or externalized session model.',
      ),
    ],
    partialSolutions: [
      solution(
        ['autoscale'],
        'Capacity improves, but a single public instance is still a failure and routing boundary.',
        'Autoscaling works best behind a load balancer.',
      ),
    ],
    hints: [
      'Watch where requests wait before reaching data.',
      'The database is not saturated; application CPU is.',
      'Distribute requests across multiple service instances.',
    ],
    solutionExplanation:
      'A load balancer routes around saturated or unhealthy instances while the service scales horizontally.',
    keyIdea: 'Scale replaceable application instances horizontally behind health-aware routing.',
    metrics: [
      ['Service CPU', '98%', '54%', '71%'],
      ['P95 latency', '1.7 s', '240 ms', '610 ms'],
    ],
  }),
  challenge({
    ...base(
      'read-heavy-database',
      'Read-Heavy Database',
      'easy',
      'database',
      'social',
      'generic',
      'home-feed',
      'The primary database is overwhelmed by read traffic.',
      '12K requests/sec · 96% reads',
      'rw-posts',
      'READ CPU 94%',
    ),
    workload: { trafficRps: 12000, readRatio: 0.96, writeRatio: 0.04 },
    allowedActions: ['add_read_replica', 'add_cache', 'add_load_balancer'],
    validSolutions: [
      solution(
        ['add_read_replica'],
        'Eligible reads are distributed away from the primary.',
        'Replicas may lag; consistency-sensitive reads still need the writer.',
      ),
      solution(
        ['add_cache'],
        'Repeated bounded-staleness reads no longer reach the database.',
        'Invalidation and freshness policy become explicit design work.',
      ),
    ],
    partialSolutions: [],
    hints: [
      'Most time is spent on repeated reads.',
      'Writes are a small part of this workload.',
      'Distribute or avoid eligible reads.',
    ],
    solutionExplanation:
      'Read replicas add read capacity; caching can avoid repeated reads when freshness rules permit it.',
    keyIdea: 'Match the read-scaling technique to freshness and read-after-write requirements.',
    metrics: [
      ['DB CPU', '94%', '49%'],
      ['P95 latency', '1.4 s', '260 ms'],
    ],
  }),
  challenge({
    ...base(
      'static-assets-slow',
      'Static Assets Are Slow',
      'easy',
      'networking',
      'video',
      'generic',
      'playback',
      'Users far from the origin repeatedly fetch the same media bytes.',
      'Global users · 4 MB reusable segment',
      'rw-storage',
      'ORIGIN 820 ms',
    ),
    workload: { trafficRps: 9000, storageThroughput: 950 },
    allowedActions: ['add_cdn', 'make_async', 'add_read_replica'],
    validSolutions: [
      solution(
        ['add_cdn'],
        'A cold edge fills once; subsequent valid requests are edge hits.',
        'Cache invalidation, authorization, and regional fill behavior still need policy.',
      ),
    ],
    partialSolutions: [],
    hints: [
      'The bytes are reusable and geography dominates latency.',
      'Every user currently crosses the same long path.',
      'Place a cacheable delivery layer close to users.',
    ],
    solutionExplanation:
      'A CDN serves cacheable static content from nearby edges and reduces origin bandwidth.',
    keyIdea: 'Separate control-plane requests from cacheable bulk delivery.',
    metrics: [
      ['Media latency', '820 ms', '86 ms'],
      ['Origin traffic', '9K req/s', '640 req/s'],
    ],
  }),
  challenge({
    ...base(
      'repeated-query',
      'Repeated Expensive DB Query',
      'easy',
      'caching',
      'social',
      'generic',
      'home-feed',
      'The same expensive result is computed for nearly every request.',
      '8K requests/sec · identical popular query',
      'rw-posts',
      'QUERY 740 ms',
    ),
    workload: { trafficRps: 8000, readRatio: 0.99 },
    allowedActions: ['add_cache', 'add_read_replica', 'add_consumers'],
    validSolutions: [
      solution(
        ['add_cache'],
        'Reusable results are served from a bounded cache window.',
        'Invalidation and miss protection are now required.',
      ),
    ],
    partialSolutions: [
      solution(
        ['add_read_replica'],
        'Reads spread out, but the expensive query still runs thousands of times.',
        'More database capacity treats the symptom rather than eliminating duplicate work.',
      ),
    ],
    hints: [
      'The result changes less often than it is requested.',
      'Many callers ask for the same answer.',
      'Reuse the computed result with an explicit freshness limit.',
    ],
    solutionExplanation:
      'Cache-aside prevents repeated expensive computation while preserving the database as source of truth.',
    keyIdea: 'Cache repeated work when the freshness contract is clear.',
    metrics: [
      ['DB QPS', '8,000', '720', '3,900'],
      ['P95 latency', '940 ms', '130 ms', '510 ms'],
    ],
  }),
  challenge({
    ...base(
      'email-sync',
      'Email Makes Registration Slow',
      'easy',
      'messaging',
      'commerce',
      'generic',
      'place-order',
      'Registration waits for a non-critical email provider.',
      'Critical write 90 ms · email provider 1.3 s',
      'rw-service',
      'BLOCKING 1.3 s',
    ),
    workload: { trafficRps: 900 },
    allowedActions: ['make_async', 'add_load_balancer', 'retry_budget'],
    validSolutions: [
      solution(
        ['make_async'],
        'The durable registration commits before email delivery begins.',
        'Async delivery is retryable and may be delayed or duplicated.',
      ),
    ],
    partialSolutions: [
      solution(
        ['retry_budget'],
        'Retries are safer, but email still blocks the user response.',
        'Retry budgets do not remove failure coupling from the critical path.',
      ),
    ],
    hints: [
      'The account is durable before email delivery finishes.',
      'The user response does not require provider confirmation.',
      'Move the non-critical effect behind a durable queue.',
    ],
    solutionExplanation:
      'Publish durable background work after commit, then let workers retry independently.',
    keyIdea: 'Keep non-critical side effects off the synchronous user path.',
    metrics: [
      ['Registration P95', '1.6 s', '170 ms', '1.4 s'],
      ['Email failures affecting API', '8.2%', '0%', '3.1%'],
    ],
  }),
  challenge({
    ...base(
      'single-db-failure',
      'Single Database Failure',
      'easy',
      'reliability',
      'payments',
      'generic',
      'make-payment',
      'The only database becomes unavailable and writes stop.',
      'Primary unreachable · no promoted standby',
      'rw-idempotency',
      'WRITES UNAVAILABLE',
    ),
    workload: { trafficRps: 1200 },
    allowedActions: ['add_failover_replica', 'add_read_replica', 'retry_budget'],
    validSolutions: [
      solution(
        ['add_failover_replica'],
        'A fenced eligible standby is promoted and traffic reconnects.',
        'Recovery has an RTO; asynchronous replication can lose recent acknowledged writes.',
      ),
    ],
    partialSolutions: [
      solution(
        ['retry_budget'],
        'Clients retry safely for a while, but no database can accept the write.',
        'Retries buy time only when recovery exists.',
      ),
    ],
    hints: [
      'There is no writable copy after the failure.',
      'A read-only copy alone is insufficient.',
      'Plan promotion, fencing, and routing to a standby.',
    ],
    solutionExplanation:
      'A tested failover path needs replication, failure detection, fencing, promotion, and client reconnection.',
    keyIdea: 'High availability is an end-to-end recovery process, not merely a second copy.',
    metrics: [
      ['Write availability', '0%', '99.9% path restored', '0%'],
      ['Recovery time', 'Unbounded', '42 s', 'Unbounded'],
    ],
  }),
  challenge({
    ...base(
      'login-flood',
      'Too Many Login Attempts',
      'easy',
      'security',
      'chat',
      'generic',
      'send-message',
      'A login endpoint is flooded before expensive credential checks.',
      '42K attempts/sec · small attacker set',
      'rw-gateway',
      'AUTH CPU 100%',
    ),
    workload: { trafficRps: 42000 },
    allowedActions: ['add_rate_limiter', 'add_load_balancer', 'add_cache'],
    validSolutions: [
      solution(
        ['add_rate_limiter'],
        'Excess attempts are rejected before expensive authentication work.',
        'Limits need fair keys, distributed coordination, and careful failure behavior.',
      ),
    ],
    partialSolutions: [
      solution(
        ['add_load_balancer'],
        'More servers absorb traffic briefly, but abusive work still consumes the full auth path.',
        'Scaling does not replace abuse controls.',
      ),
    ],
    hints: [
      'The traffic is not all legitimate.',
      'The expensive work happens after the public boundary.',
      'Bound attempts before password verification.',
    ],
    solutionExplanation:
      'A rate limiter protects authentication capacity and reduces brute-force throughput.',
    keyIdea: 'Reject abusive work before it consumes scarce dependencies.',
    metrics: [
      ['Auth CPU', '100%', '47%', '82%'],
      ['Legitimate error rate', '31%', '1.2%', '12%'],
    ],
  }),
  challenge({
    ...base(
      'upload-timeout',
      'File Upload Times Out',
      'easy',
      'storage',
      'files',
      'generic',
      'upload-file',
      'Large file bytes are proxied through the application service.',
      '6 GB upload · 60 s gateway timeout',
      'rw-service',
      'PROXY SATURATED',
    ),
    workload: { trafficRps: 90, storageThroughput: 1400 },
    allowedActions: ['direct_upload', 'add_load_balancer', 'async_media'],
    validSolutions: [
      solution(
        ['direct_upload'],
        'The client uploads authorized chunks directly to durable storage.',
        'Signed URLs need narrow scope, expiry, integrity checks, and a separate metadata commit.',
      ),
    ],
    partialSolutions: [
      solution(
        ['add_load_balancer'],
        'More proxies add bandwidth, but the application remains in the heavy byte path.',
        'This scales an avoidable bottleneck.',
      ),
    ],
    hints: [
      'Control metadata is tiny; file bytes are not.',
      'The service need not inspect every byte in transit.',
      'Authorize the transfer, then upload directly to object storage.',
    ],
    solutionExplanation:
      'Signed direct upload removes application servers from the bulk data path.',
    keyIdea: 'Separate small control operations from large durable byte transfers.',
    metrics: [
      ['App egress', '11.2 GB/s', '80 MB/s', '6.1 GB/s'],
      ['Timeout rate', '24%', '0.6%', '11%'],
    ],
  }),
  challenge({
    ...base(
      'worker-backlog',
      'Worker Cannot Keep Up',
      'easy',
      'messaging',
      'chat',
      'generic',
      'group-message',
      'Queue depth grows because consumers process more slowly than producers.',
      'Produce 8K/s · consume 3K/s',
      'rw-events',
      '240K PENDING',
    ),
    workload: { trafficRps: 8000, queueDepth: 240000, consumerRate: 3000 },
    allowedActions: ['add_consumers', 'add_load_balancer', 'add_read_replica'],
    validSolutions: [
      solution(
        ['add_consumers'],
        'Additional consumers raise drain capacity above the producer rate.',
        'Useful parallelism remains bounded by partitions and downstream capacity.',
      ),
    ],
    partialSolutions: [],
    hints: [
      'The producer path remains healthy while pending work grows.',
      'Compare the arrival and consumption rates.',
      'Increase consumer parallelism within partition limits.',
    ],
    solutionExplanation:
      'Scale consumers when processing is parallelizable and downstream systems can accept the increased load.',
    keyIdea: 'Backlog drains only when sustained consumer throughput exceeds production.',
    metrics: [
      ['Queue depth', '240K rising', '38K falling'],
      ['Consumer throughput', '3K/s', '9K/s'],
    ],
  }),
  challenge({
    ...base(
      'slow-like-search',
      'Search Query Too Slow',
      'easy',
      'database',
      'search',
      'generic',
      'search-query',
      'Wildcard database scans slow as the corpus grows.',
      '180M rows · contains-text query',
      'rw-service',
      'SCAN 2.4 s',
    ),
    workload: { trafficRps: 3200, readRatio: 1 },
    allowedActions: ['add_search_index', 'add_read_replica', 'add_cache'],
    validSolutions: [
      solution(
        ['add_search_index'],
        'Queries use a partitioned inverted index and merge ranked candidates.',
        'Indexing is asynchronous; freshness and relevance require explicit design.',
      ),
    ],
    partialSolutions: [
      solution(
        ['add_cache'],
        'Popular repeated queries improve, but long-tail searches still scan.',
        'A cache does not replace a search access path.',
      ),
    ],
    hints: [
      'The access pattern is full-text retrieval, not key lookup.',
      'Replicas repeat the same expensive scan.',
      'Use an index designed for term-to-document lookup.',
    ],
    solutionExplanation:
      'A search index moves parsing and indexing off the query path and serves parallel term lookups.',
    keyIdea: 'Use purpose-built data structures for the dominant access pattern.',
    metrics: [
      ['Search P95', '2.4 s', '190 ms', '1.3 s'],
      ['Rows scanned/query', '180M', '14K', '71M'],
    ],
  }),

  challenge({
    ...base(
      'cache-stampede',
      'The Midnight Cache Stampede',
      'medium',
      'caching',
      'social',
      'generic',
      'home-feed',
      'A popular key expires and thousands of misses hit the database together.',
      '20K requests/sec · one key just expired',
      'rw-posts',
      'DB CPU 99%',
    ),
    workload: { trafficRps: 20000, readRatio: 0.99 },
    allowedActions: ['request_coalescing', 'stagger_ttl', 'add_read_replica', 'add_load_balancer'],
    validSolutions: [
      solution(
        ['request_coalescing'],
        'One bounded loader refreshes the value while waiters share its result.',
        'The lock needs a timeout and failure recovery.',
      ),
      solution(
        ['stagger_ttl'],
        'Refresh-ahead and jitter prevent synchronized expiration.',
        'Stale data may be served within the freshness budget.',
      ),
    ],
    partialSolutions: [
      solution(
        ['add_read_replica'],
        'Replica capacity absorbs part of the spike, but every miss still duplicates the origin query.',
        'This does not remove the stampede mechanism.',
      ),
    ],
    hints: [
      'Normal cache-hit traffic is healthy.',
      'The failure begins when many callers observe one miss.',
      'Coordinate or spread refresh of the popular key.',
    ],
    solutionExplanation:
      'Miss coalescing, TTL jitter, and refresh-ahead prevent synchronized origin work.',
    keyIdea: 'A cache needs protection for its cold and expired states.',
    metrics: [
      ['DB CPU', '99%', '43%', '76%'],
      ['Origin queries', '20K/s', '1–4/s', '7K/s'],
    ],
  }),
  challenge({
    ...base(
      'hot-cache-key',
      'One Key Is Melting the Cache',
      'medium',
      'caching',
      'social',
      'generic',
      'home-feed',
      'One cache key receives a disproportionate share of traffic.',
      '48K requests/sec · 61% to one key',
      'rw-cache',
      'HOT KEY 29K/s',
    ),
    workload: { trafficRps: 48000 },
    allowedActions: ['local_hot_cache', 'split_hot_key', 'add_read_replica', 'add_consumers'],
    validSolutions: [
      solution(
        ['local_hot_cache'],
        'The hot value is replicated across bounded service-local caches.',
        'Invalidation is more complex and staleness must be bounded.',
      ),
      solution(
        ['split_hot_key'],
        'The hot logical value is served through multiple independent keys.',
        'Aggregation and invalidation become more complex.',
      ),
    ],
    partialSolutions: [],
    hints: [
      'Overall cache capacity is available.',
      'Load is uneven across keys, not uniformly high.',
      'Replicate or safely split the hot value.',
    ],
    solutionExplanation:
      'Hot-key mitigation spreads one dominant key without scaling every unrelated key.',
    keyIdea: 'Partitioning helps only when the partition key distributes the real workload.',
    metrics: [
      ['Hottest node', '100%', '39%'],
      ['Cache P95', '880 ms', '74 ms'],
    ],
  }),
  challenge({
    ...base(
      'consumer-lag',
      'Kafka Consumer Lag',
      'medium',
      'streaming',
      'chat',
      'generic',
      'group-message',
      'Events arrive faster than the consumer group can process them.',
      '12 partitions · 18K produced/s · 7K consumed/s',
      'rw-events',
      '1.2M LAG',
    ),
    workload: { trafficRps: 18000, queueDepth: 1200000, consumerRate: 7000 },
    allowedActions: ['add_consumers', 'add_partitions', 'add_load_balancer', 'add_read_replica'],
    validSolutions: [
      solution(
        ['add_consumers'],
        'Consumers raise throughput while available partitions provide assignments.',
        'Downstream systems and partition ordering limit safe concurrency.',
      ),
    ],
    partialSolutions: [
      solution(
        ['add_partitions'],
        'More partitions create parallelism, but unchanged consumers do not use it.',
        'Partition count and consumer capacity must be planned together.',
      ),
    ],
    hints: [
      'The retained log is healthy; the group falls behind.',
      'Consumer parallelism cannot exceed useful partition assignments.',
      'Add processing capacity, and add partitions only when they are the limit.',
    ],
    solutionExplanation:
      'Consumer lag requires sustained processing throughput above production, with enough partitions to expose parallelism.',
    keyIdea: 'Consumer-group parallelism is bounded by partitions and downstream capacity.',
    metrics: [
      ['Consumer lag', '1.2M rising', '110K falling', '820K rising'],
      ['Consume rate', '7K/s', '21K/s', '7K/s'],
    ],
  }),
  challenge({
    ...base(
      'replica-lag',
      'I Saved It, Then It Disappeared',
      'medium',
      'consistency',
      'files',
      'generic',
      'stale-read-challenge',
      'A write is acknowledged, then an immediate replica read returns an older version.',
      'Async replica lag 1.4 s',
      'rw-metadata',
      'STALE VERSION',
    ),
    workload: { trafficRps: 6000, readRatio: 0.86 },
    observed: 'The write succeeded. The immediate read returned an older version.',
    allowedActions: ['sticky_read', 'add_read_replica', 'retry_budget'],
    interactionTargets: [
      {
        targetId: 'rw-metadata',
        targetType: 'node',
        prompt: 'How should an immediate read see the latest version?',
        actions: ['sticky_read', 'add_read_replica'],
      },
      {
        targetId: 'rw-gateway',
        targetType: 'node',
        prompt: 'How should this session route its read?',
        actions: ['sticky_read', 'retry_budget'],
      },
      {
        targetId: 'rw-gateway--rw-replica',
        targetType: 'edge',
        prompt: 'How should the immediate read be routed?',
        actions: ['sticky_read', 'add_read_replica'],
      },
    ],
    validSolutions: [
      solution(
        ['sticky_read'],
        'The client reads from the writer until its version token is visible elsewhere.',
        'Writer affinity reduces read distribution for the consistency window.',
      ),
    ],
    partialSolutions: [
      solution(
        ['add_read_replica'],
        'More replicas add read capacity but do not establish read-after-write consistency.',
        'Lag can differ across replicas.',
      ),
    ],
    hints: [
      'The write succeeds. Watch where the following read is served from.',
      'Inspect the metadata store and the immediate read path through the replica.',
      'Consider how a session can see its own latest write.',
    ],
    solutionExplanation:
      'Read-your-writes can use writer affinity, a consistency token, or waiting for a replica to reach a known position.',
    keyIdea:
      'Consistency guarantees must be chosen per access pattern, not assumed from replication.',
    metrics: [
      ['Stale reads', '8.4%', '0.1%', '8.1%'],
      ['Replica lag', '1.4 s', '1.4 s', '1.2 s'],
    ],
  }),
  challenge({
    ...base(
      'feed-fanout',
      'Social Feed Fanout',
      'medium',
      'messaging',
      'social',
      'generic',
      'celebrity-post',
      'Large accounts create excessive write amplification.',
      'Typical 600 followers · large account 4M',
      'rw-fanout',
      'QUEUE 3.8M',
    ),
    workload: { trafficRps: 11000, queueDepth: 3800000 },
    allowedActions: ['hybrid_fanout', 'add_consumers', 'add_partitions'],
    validSolutions: [
      solution(
        ['hybrid_fanout'],
        'Large-account posts move to read-time merge while normal accounts keep fast precomputed reads.',
        'Celebrity followers pay bounded read-time merge cost.',
      ),
    ],
    partialSolutions: [
      solution(
        ['add_consumers'],
        'Fanout drains faster, but work still grows linearly with the largest audience.',
        'Capacity delays the amplification cliff.',
      ),
    ],
    hints: [
      'The same strategy works for normal accounts but fails for extreme audiences.',
      'The write expands once per follower.',
      'Use different fanout strategies by audience size.',
    ],
    solutionExplanation:
      'Hybrid fanout contains extreme write amplification while retaining fast reads for ordinary accounts.',
    keyIdea: 'A skewed workload often needs a hybrid rather than one universal strategy.',
    metrics: [
      ['Fanout backlog', '3.8M', '180K', '1.9M'],
      ['Feed freshness', '14 min', '8 s', '4 min'],
    ],
  }),
  challenge({
    ...base(
      'checkout-chain',
      'Checkout Synchronous Chain',
      'medium',
      'reliability',
      'commerce',
      'generic',
      'place-order',
      'Checkout waits on notification and analytics after critical inventory and payment work.',
      'Four serial dependencies · one slow provider',
      'rw-service',
      'P95 2.3 s',
    ),
    workload: { trafficRps: 2800 },
    allowedActions: ['make_async', 'retry_budget', 'add_load_balancer'],
    validSolutions: [
      solution(
        ['make_async'],
        'The response waits only for critical inventory and payment state; side effects consume durable events.',
        'Async consumers need idempotency and observable retry handling.',
      ),
    ],
    partialSolutions: [
      solution(
        ['retry_budget'],
        'Retries are bounded, but optional dependencies still extend and couple the request.',
        'Bounded retries reduce amplification without shortening the dependency chain.',
      ),
    ],
    hints: [
      'Not every downstream result is required before confirmation.',
      'Notification and analytics can happen after durable order state.',
      'Split the critical synchronous path from retryable side effects.',
    ],
    solutionExplanation:
      'Keep consistency-critical steps synchronous and move independent side effects behind an outbox or durable stream.',
    keyIdea: 'Asynchrony is valuable when it removes non-critical failure coupling.',
    metrics: [
      ['Checkout P95', '2.3 s', '620 ms', '1.8 s'],
      ['Coupled dependencies', '4', '2', '4'],
    ],
  }),
  challenge({
    ...base(
      'websocket-overload',
      'WebSocket Server Overload',
      'medium',
      'real-time',
      'chat',
      'generic',
      'send-message',
      'One gateway owns too many persistent connections.',
      '1.8M active sockets · reconnect burst',
      'rw-connection',
      'CONNECTIONS 1.8M',
    ),
    workload: { activeConnections: 1800000 },
    allowedActions: ['connection_gateways', 'add_load_balancer', 'add_cache'],
    validSolutions: [
      solution(
        ['connection_gateways'],
        'Sessions spread across connection gateways and presence routes delivery to the owner.',
        'Connection draining, affinity, presence expiry, and reconnect storms need explicit handling.',
      ),
    ],
    partialSolutions: [
      solution(
        ['add_load_balancer'],
        'New connections distribute, but delivery still lacks ownership and session routing.',
        'Long-lived connections need more than request round-robin.',
      ),
    ],
    hints: [
      'These are long-lived sessions, not independent HTTP requests.',
      'A message must reach the gateway that owns the recipient socket.',
      'Scale gateways with connection ownership and presence routing.',
    ],
    solutionExplanation:
      'Connection gateways scale horizontally when session ownership and delivery routing are explicit.',
    keyIdea: 'Persistent connections turn routing into stateful ownership.',
    metrics: [
      ['Sockets/gateway', '1.8M', '210K', '730K'],
      ['Reconnect errors', '28%', '1.8%', '11%'],
    ],
  }),
  challenge({
    ...base(
      'search-shard-bottleneck',
      'Search Shard Bottleneck',
      'medium',
      'scaling',
      'search',
      'generic',
      'search-query',
      'One large index node cannot search the corpus within the latency budget.',
      '2.4B documents · 11K queries/sec',
      'rw-service',
      'INDEX CPU 100%',
    ),
    workload: { trafficRps: 11000, readRatio: 1 },
    allowedActions: ['shard_index', 'add_cache', 'add_load_balancer'],
    validSolutions: [
      solution(
        ['shard_index'],
        'The coordinator searches partitions concurrently and merges bounded candidates.',
        'Tail latency, partial results, and global scoring now require coordination.',
      ),
    ],
    partialSolutions: [
      solution(
        ['add_cache'],
        'Popular queries improve, but long-tail queries still hit the single index.',
        'Search query diversity limits cache coverage.',
      ),
    ],
    hints: [
      'The bottleneck is the searchable corpus on one node.',
      'Independent partitions can search at the same time.',
      'Shard the index and merge local top results.',
    ],
    solutionExplanation:
      'Index sharding bounds local work and parallelizes retrieval before a merge barrier.',
    keyIdea: 'Parallel fanout reduces serial work but makes tail latency part of the query budget.',
    metrics: [
      ['Search P95', '1.9 s', '240 ms', '970 ms'],
      ['Index CPU', '100%', '58%', '83%'],
    ],
  }),
  challenge({
    ...base(
      'image-processing-blocks',
      'Image Processing Blocks Upload',
      'medium',
      'storage',
      'video',
      'generic',
      'upload',
      'Users wait while thumbnails and transcodes complete inline.',
      '1.5 GB upload · 7 output variants',
      'rw-workers',
      'PROCESSING 94 s',
    ),
    workload: { trafficRps: 120, storageThroughput: 800 },
    allowedActions: ['async_media', 'direct_upload', 'add_load_balancer'],
    validSolutions: [
      solution(
        ['async_media'],
        'The upload commits durable metadata and processing continues through retryable workers.',
        'The product must expose processing state and make jobs idempotent.',
      ),
    ],
    partialSolutions: [
      solution(
        ['direct_upload'],
        'Upload bandwidth improves, but the user still waits for inline transformation.',
        'Direct upload solves transport, not processing coupling.',
      ),
    ],
    hints: [
      'The original bytes are already durable.',
      'Derived media does not need to exist before accepting the upload.',
      'Queue the transformation pipeline after commit.',
    ],
    solutionExplanation:
      'An asynchronous media pipeline acknowledges durable input before retryable transformation work finishes.',
    keyIdea: 'Separate durable acceptance from expensive derivative generation.',
    metrics: [
      ['Upload response', '94 s', '1.8 s', '61 s'],
      ['Timeout rate', '19%', '0.3%', '9%'],
    ],
  }),
  challenge({
    ...base(
      'global-api-burst',
      'Global API Burst',
      'medium',
      'scaling',
      'commerce',
      'generic',
      'search-product',
      'A sudden burst overwhelms the backend and creates a retry wave.',
      'Normal 9K/s · burst 95K/s',
      'rw-gateway',
      'ERROR RATE 37%',
    ),
    workload: { trafficRps: 95000 },
    allowedActions: ['load_shedding', 'autoscale', 'add_cache', 'add_load_balancer'],
    validSolutions: [
      solution(
        ['load_shedding'],
        'The gateway protects critical capacity and bounds queued work during the burst.',
        'Some requests are rejected; priorities and client retry guidance must be explicit.',
      ),
      solution(
        ['load_shedding', 'autoscale'],
        'Load shedding protects the ramp while bounded autoscaling adds capacity.',
        'Scaling speed and dependency ceilings still constrain recovery.',
      ),
    ],
    partialSolutions: [
      solution(
        ['autoscale'],
        'Capacity arrives, but the unbounded queue and retry wave overload dependencies during the ramp.',
        'Autoscaling reacts after load appears.',
      ),
    ],
    hints: [
      'Capacity cannot appear instantly.',
      'Queued and retried work amplifies the burst.',
      'Bound admitted work while capacity scales.',
    ],
    solutionExplanation:
      'Load shedding and rate limits protect the system during an autoscaling lag; caching may reduce repeat work.',
    keyIdea: 'Elasticity needs overload control during the time before new capacity is ready.',
    metrics: [
      ['Error rate', '37%', '3.4%', '17%'],
      ['Queued requests', '410K', '22K', '190K'],
    ],
  }),

  challenge({
    ...base(
      'celebrity-post',
      'The Celebrity Problem',
      'hard',
      'distributed-systems',
      'social',
      'instagram',
      'celebrity-post',
      'Naive fanout-on-write collapses when one account reaches an extreme audience.',
      'Normal accounts 600 followers · celebrity 100M',
      'rw-fanout',
      'WRITE AMPLIFICATION 100M',
    ),
    workload: { queueDepth: 100000000, trafficRps: 30000 },
    allowedActions: ['hybrid_fanout', 'add_consumers', 'add_partitions', 'repartition_data'],
    validSolutions: [
      solution(
        ['hybrid_fanout'],
        'Normal posts precompute timelines while celebrity posts merge at read time.',
        'Celebrity reads do extra bounded merge work and freshness paths differ.',
      ),
    ],
    partialSolutions: [
      solution(
        ['add_consumers', 'add_partitions'],
        'More parallelism delays collapse but preserves 100M writes per post.',
        'Infrastructure cannot remove fundamental write amplification.',
      ),
    ],
    hints: [
      'The workload distribution has an extreme tail.',
      'Adding workers does not change writes per follower.',
      'Use write fanout for normal accounts and read-time merge for extreme accounts.',
    ],
    solutionExplanation:
      'Hybrid fanout chooses strategy from audience size rather than forcing one model on a skewed workload.',
    keyIdea: 'Change the work performed, not only the amount of hardware performing it.',
    metrics: [
      ['Timeline writes/post', '100M', '≤ 1M', '100M'],
      ['Fanout lag', '42 min', '9 s', '11 min'],
    ],
  }),
  challenge({
    ...base(
      'cache-outage-cascade',
      'Cache Outage Cascade',
      'hard',
      'reliability',
      'social',
      'generic',
      'home-feed',
      'The shared cache fails and the full request rate falls through to the database.',
      '42K reads/sec · cache unavailable',
      'rw-posts',
      'DB CPU 100%',
    ),
    workload: { trafficRps: 42000, readRatio: 0.99 },
    allowedActions: [
      'circuit_breaker',
      'load_shedding',
      'local_fallback_cache',
      'add_read_replica',
    ],
    validSolutions: [
      solution(
        ['circuit_breaker', 'load_shedding'],
        'The service fails fast and admits only bounded origin traffic during recovery.',
        'Some requests degrade or fail; recovery must ramp gradually.',
      ),
      solution(
        ['local_fallback_cache', 'load_shedding'],
        'A bounded stale-safe set serves hot reads while origin admission remains capped.',
        'Local copies need a safe staleness policy and consume service memory.',
      ),
    ],
    partialSolutions: [
      solution(
        ['add_read_replica'],
        'Replica capacity delays database saturation, but all cache traffic still falls through.',
        'The amplification and recovery stampede remain.',
      ),
    ],
    hints: [
      'The database was sized for misses, not the full hit-path workload.',
      'Uncontrolled fallback turns a cache failure into a database failure.',
      'Bound origin admission and provide a deliberate degraded path.',
    ],
    solutionExplanation:
      'Circuit breaking, load shedding, stale-safe local fallback, and gradual recovery contain cache-outage amplification.',
    keyIdea: 'Fallback paths need their own capacity and failure policy.',
    metrics: [
      ['DB CPU', '100%', '63%', '91%'],
      ['Request success', '18%', '82% degraded', '43%'],
    ],
  }),
  challenge({
    ...base(
      'multi-region-failure',
      'Primary Region Failure',
      'hard',
      'reliability',
      'gaming',
      'generic',
      'join-match',
      'A primary region fails while authoritative state and clients are active.',
      'Region A unavailable · async cross-region state',
      'rw-infrastructure',
      'REGION OFFLINE',
    ),
    workload: { activeConnections: 740000 },
    allowedActions: ['add_region', 'retry_budget', 'autoscale'],
    validSolutions: [
      solution(
        ['add_region'],
        'Global routing shifts to a replicated region under the selected recovery policy.',
        'RPO, RTO, conflict policy, capacity headroom, and fencing remain explicit trade-offs.',
      ),
    ],
    partialSolutions: [
      solution(
        ['retry_budget'],
        'Clients retry, but no alternate region can serve authoritative work.',
        'Retries cannot create a recovery target.',
      ),
    ],
    hints: [
      'Compute and routing are both inside the failed boundary.',
      'Recovery needs capacity and data outside that boundary.',
      'Pair global routing with a tested regional replication and failover policy.',
    ],
    solutionExplanation:
      'Multi-region failover combines failure detection, traffic routing, replicated state, fencing, and capacity.',
    keyIdea: 'RPO and RTO are architectural choices with consistency and cost consequences.',
    metrics: [
      ['Service availability', '7%', '96% restored', '12%'],
      ['Recovery time', 'Unbounded', '4 min', 'Unbounded'],
    ],
  }),
  challenge({
    ...base(
      'payment-duplication',
      'Payment Executes Twice',
      'hard',
      'consistency',
      'payments',
      'stripe',
      'make-payment',
      'A client times out, retries, and creates a second financial effect.',
      'Processor accepted first attempt · reply lost',
      'rw-idempotency',
      '2 AUTHORIZATIONS',
    ),
    workload: { trafficRps: 2600 },
    allowedActions: ['idempotency_key', 'retry_budget', 'add_load_balancer'],
    validSolutions: [
      solution(
        ['idempotency_key'],
        'Both requests resolve to one durable payment operation and stable result.',
        'Key scope, parameter matching, retention, and concurrent claims must be correct.',
      ),
    ],
    partialSolutions: [
      solution(
        ['retry_budget'],
        'Fewer retries reduce duplicates but cannot establish one logical effect.',
        'A single retry can still duplicate money movement.',
      ),
    ],
    hints: [
      'The first attempt may have succeeded despite the timeout.',
      'Network timeout is an unknown outcome, not a failure.',
      'Bind all retries to one durable operation identity.',
    ],
    solutionExplanation:
      'An idempotency key claims one operation before external effects and replays its recorded result.',
    keyIdea: 'Uncertain outcomes require reconciliation and stable operation identity.',
    metrics: [
      ['Duplicate charge risk', 'High', 'Bounded to one effect', 'Reduced only'],
      ['Authorizations/request', 'Up to 2', 'Exactly one logical', 'Up to 2'],
    ],
  }),
  challenge({
    ...base(
      'order-partial-failure',
      'Order Partial Failure',
      'hard',
      'consistency',
      'commerce',
      'amazon',
      'place-order',
      'Payment succeeds but inventory reservation fails.',
      'Two independent transactional boundaries',
      'rw-payment',
      'PAID · NOT RESERVED',
    ),
    workload: { trafficRps: 5100 },
    allowedActions: ['saga_compensation', 'make_async', 'retry_budget'],
    validSolutions: [
      solution(
        ['saga_compensation'],
        'Workflow state records the rejection and compensates the captured payment.',
        'Compensation is a new business action, not a database rollback; it can also fail and retry.',
      ),
    ],
    partialSolutions: [
      solution(
        ['retry_budget'],
        'Inventory retries are bounded, but the successful payment remains unresolved.',
        'Retries need a terminal recovery or compensation path.',
      ),
    ],
    hints: [
      'No transaction spans both services.',
      'The earlier successful effect cannot be rolled back atomically.',
      'Persist workflow state and perform an explicit compensating action.',
    ],
    solutionExplanation:
      'A saga makes partial progress visible and drives idempotent compensation or recovery.',
    keyIdea:
      'Distributed workflows resolve partial failure through durable state and business compensation.',
    metrics: [
      ['Orphaned payments', '2.8%', '0.04% pending recovery', '1.9%'],
      ['Unresolved orders', '14K', '190', '8K'],
    ],
  }),
  challenge({
    ...base(
      'shard-hotspot',
      'Shard Hotspot',
      'hard',
      'database',
      'chat',
      'generic',
      'group-message',
      'A partition key sends most writes to one shard.',
      'One global channel · 38% of all messages',
      'rw-database',
      'HOT PARTITION 100%',
    ),
    workload: { trafficRps: 86000, writeRatio: 0.91 },
    allowedActions: ['repartition_data', 'add_read_replica', 'add_consumers'],
    validSolutions: [
      solution(
        ['repartition_data'],
        'A new key spreads dominant writes while preserving conversation ordering boundaries.',
        'Migration, routing versions, rebalancing, and cross-partition reads add complexity.',
      ),
    ],
    partialSolutions: [
      solution(
        ['add_read_replica'],
        'Read capacity increases, but the single write owner remains saturated.',
        'Replicas do not scale a hot write partition.',
      ),
    ],
    hints: [
      'Total cluster capacity is available; one owner is not.',
      'The current key follows the skewed workload dimension.',
      'Choose a distribution key and migration strategy that spreads writes.',
    ],
    solutionExplanation:
      'Hot partitions require revisiting key design and safely migrating ownership, not simply adding unrelated nodes.',
    keyIdea: 'Sharding scales only when keys distribute the real write workload.',
    metrics: [
      ['Hottest shard CPU', '100%', '61%', '100%'],
      ['Write P95', '2.8 s', '310 ms', '2.6 s'],
    ],
  }),
  challenge({
    ...base(
      'global-chat-ordering',
      'Global Chat Ordering',
      'hard',
      'consistency',
      'chat',
      'discord',
      'group-message',
      'Messages enter through several regions and appear in different orders.',
      '3 regions · concurrent senders',
      'rw-service',
      'ORDER DIVERGED',
    ),
    workload: { trafficRps: 74000, activeConnections: 4200000 },
    allowedActions: ['conversation_ordering', 'add_region', 'idempotent_consumer'],
    validSolutions: [
      solution(
        ['conversation_ordering'],
        'Each conversation has one ordered partition and monotonic sequence while regions route to its owner.',
        'Global ordering is avoided; owner placement and failover affect latency and availability.',
      ),
    ],
    partialSolutions: [
      solution(
        ['add_region'],
        'More regions reduce network latency but increase concurrent ordering paths.',
        'Replication alone does not define order.',
      ),
    ],
    hints: [
      'The product needs order within a conversation, not across every conversation.',
      'Arrival time differs by region.',
      'Partition by conversation and assign sequence at one ordered boundary.',
    ],
    solutionExplanation:
      'Per-conversation partitioning provides useful ordering without the cost and availability loss of a global total order.',
    keyIdea: 'Scope consistency guarantees to the smallest domain that needs them.',
    metrics: [
      ['Out-of-order messages', '6.7%', '0.03%', '7.2%'],
      ['Cross-region coordination', 'Undefined', 'Per conversation', 'Undefined'],
    ],
  }),
  challenge({
    ...base(
      'livestream-explosion',
      'Livestream Traffic Explosion',
      'hard',
      'streaming',
      'video',
      'generic',
      'playback',
      'Millions of viewers join at once and request the same live segments from origin.',
      '2.5M concurrent viewers · event begins now',
      'rw-storage',
      'ORIGIN EGRESS 100%',
    ),
    workload: { trafficRps: 2500000, storageThroughput: 98000 },
    allowedActions: ['cdn_hierarchy', 'add_cdn', 'autoscale', 'load_shedding'],
    validSolutions: [
      solution(
        ['cdn_hierarchy'],
        'Regional shields and edge caches fan segments out while origin serves bounded fills.',
        'Low-latency live caching needs short TTLs, cache-key discipline, and pre-warming.',
      ),
    ],
    partialSolutions: [
      solution(
        ['add_cdn'],
        'Edge delivery helps, but uncoordinated cold fills still stampede the origin at event start.',
        'A shield hierarchy and warming plan are needed at this scale.',
      ),
    ],
    hints: [
      'Nearly every viewer requests identical segment bytes.',
      'The dangerous moment is synchronized cold start.',
      'Use hierarchical cache fill, regional shields, and pre-warming.',
    ],
    solutionExplanation:
      'A CDN hierarchy collapses millions of identical viewer fetches into bounded origin fills.',
    keyIdea:
      'At extreme fanout, cache topology and warm-up behavior matter as much as having a CDN.',
    metrics: [
      ['Origin requests', '2.5M/s', '1.8K/s', '190K/s'],
      ['Playback errors', '44%', '1.6%', '13%'],
    ],
  }),
  challenge({
    ...base(
      'event-duplication',
      'Event Processed Twice',
      'hard',
      'distributed-systems',
      'payments',
      'generic',
      'capture',
      'A consumer completes its effect but crashes before acknowledging the event.',
      'At-least-once delivery · redelivery after lease expiry',
      'rw-events',
      'DUPLICATE EFFECT',
    ),
    workload: { trafficRps: 12000 },
    allowedActions: ['idempotent_consumer', 'idempotency_key', 'retry_budget'],
    validSolutions: [
      solution(
        ['idempotent_consumer'],
        'Redelivery finds the previously applied effect and advances safely.',
        'Deduplication state needs atomicity, retention, and a stable event identity.',
      ),
    ],
    partialSolutions: [
      solution(
        ['retry_budget'],
        'Redelivery frequency drops, but one replay can still duplicate the effect.',
        'Retries are expected under at-least-once delivery.',
      ),
    ],
    hints: [
      'The broker is correctly redelivering unacknowledged work.',
      'The crash happened between effect and acknowledgment.',
      'Make the consumer effect safe to apply more than once.',
    ],
    solutionExplanation:
      'Idempotent consumers derive or record one stable effect for each event before acknowledging progress.',
    keyIdea: 'At-least-once delivery moves exactly-once business behavior into the consumer.',
    metrics: [
      ['Duplicate effects', '1.9%', '0.002%', '0.8%'],
      ['Events lost', '0', '0', '0'],
    ],
  }),
  challenge({
    ...base(
      'ride-matching-scale',
      'Ride Matching at Scale',
      'hard',
      'real-time',
      'ride',
      'uber',
      'request-ride',
      'Naive database scans cannot match riders against frequently moving drivers.',
      '320K location updates/sec · 46K requests/sec',
      'rw-geo',
      'QUERY 4.8 s',
    ),
    workload: { trafficRps: 46000, writeRatio: 0.87 },
    allowedActions: ['geo_partition', 'repartition_data', 'add_read_replica', 'add_cache'],
    validSolutions: [
      solution(
        ['geo_partition'],
        'Fresh driver positions update bounded spatial cells and matching searches nearby cells.',
        'Cell boundaries, movement, expiry, hot downtown zones, and exact assignment still need handling.',
      ),
    ],
    partialSolutions: [
      solution(
        ['add_read_replica'],
        'Scans spread across copies but remain too expensive and positions can be stale.',
        'Generic replication does not create a spatial access path.',
      ),
    ],
    hints: [
      'The query is spatial and the data changes continuously.',
      'Scanning all drivers grows with the city, not the search radius.',
      'Index expiring positions into bounded geographic cells.',
    ],
    solutionExplanation:
      'A geospatial index bounds candidate discovery; durable trip assignment remains a separate consistency boundary.',
    keyIdea:
      'Use a fast, expiring spatial index for discovery and a transactional store for ownership.',
    metrics: [
      ['Candidate lookup', '4.8 s', '72 ms', '2.1 s'],
      ['Rows scanned', '2.2M', '340', '1.1M'],
    ],
  }),
];

export const challengeCounts = challenges.reduce(
  (counts, item) => ({ ...counts, [item.difficulty]: counts[item.difficulty] + 1 }),
  { easy: 0, medium: 0, hard: 0 },
);
