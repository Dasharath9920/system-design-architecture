import type { ScaleAction, ScaleScenario, ScaleStage } from './types';

const action = (
  id: string,
  label: string,
  outcome: ScaleAction['outcome'],
  explanation: string,
): ScaleAction => ({ id, label, outcome, explanation });

const stage = (
  id: string,
  label: string,
  users: number,
  title: string,
  lesson: string,
  options: {
    bottleneck?: ScaleStage['bottleneck'];
    actions?: ScaleAction[];
    requiredAction?: string;
    addedNodes?: string[];
    metrics?: ScaleStage['metrics'];
    insight?: string;
    tradeoff?: string;
  } = {},
): ScaleStage => ({
  id,
  label,
  users,
  title,
  lesson,
  actions: options.actions || [],
  addedNodes: options.addedNodes || [],
  metrics: options.metrics || [],
  ...options,
});

const baseAssumptions = {
  concurrency: 0.1,
  requestsPerSecond: 2,
  readRatio: 0.8,
  averageResponseKB: 6,
};

const generic: ScaleScenario = {
  id: 'generic-web',
  name: 'Generic Web App',
  description: 'Grow a simple request/response application from one server to global scale.',
  architectureFamily: 'web',
  assumptions: baseAssumptions,
  baseNodes: ['client', 'services', 'database'],
  stages: [
    stage('simple', '100', 100, 'Start simple', 'Do not over-engineer before measured limits.', {
      metrics: [
        { label: 'App CPU', before: '18%', after: '18%' },
        { label: 'DB CPU', before: '11%', after: '11%' },
        { label: 'P95 latency', before: '82 ms', after: '82 ms' },
      ],
    }),
    stage(
      'horizontal',
      '10K',
      10_000,
      'Application server saturation',
      'Horizontal scaling needs stateless application instances.',
      {
        bottleneck: {
          nodeId: 'services',
          type: 'APP SERVER BOTTLENECK',
          explanation: 'One application instance cannot process the estimated peak request rate.',
          signal: 'CPU 96% · P95 1.4s',
        },
        requiredAction: 'horizontal-scale',
        addedNodes: ['load-balancer'],
        actions: [
          action(
            'horizontal-scale',
            'Add app servers',
            'resolve',
            'A load balancer distributes requests across replaceable stateless instances.',
          ),
          action(
            'cache-early',
            'Add Redis',
            'partial',
            'Caching reduces repeated reads, but application CPU remains the primary limit.',
          ),
          action(
            'kafka-early',
            'Add Kafka',
            'premature',
            'A queue adds operational complexity without increasing synchronous request capacity.',
          ),
        ],
        metrics: [
          { label: 'App CPU', before: '96%', after: '42%' },
          { label: 'Instances', before: '1', after: '3' },
          { label: 'P95 latency', before: '1.4 s', after: '180 ms' },
        ],
        insight:
          'Independent stateless instances can be added or replaced behind one stable endpoint.',
        tradeoff: 'Sessions and durable state must live outside individual servers.',
      },
    ),
    stage(
      'reads',
      '100K',
      100_000,
      'Database read pressure',
      'Scaling the application tier moves pressure to its downstream database.',
      {
        bottleneck: {
          nodeId: 'database',
          type: 'DATABASE READ BOTTLENECK',
          explanation: 'Estimated reads exceed the primary database read capacity.',
          signal: '16K reads/s · CPU 94%',
        },
        requiredAction: 'read-replica',
        addedNodes: ['replication'],
        actions: [
          action(
            'read-replica',
            'Add read replica',
            'resolve',
            'Eligible reads move to a replica while writes remain on the primary.',
          ),
          action(
            'more-apps',
            'Add app servers',
            'partial',
            'More application capacity sends even more work to the saturated database.',
          ),
          action(
            'cdn-wrong',
            'Add CDN',
            'premature',
            'A CDN helps cacheable edge traffic, not dynamic database reads.',
          ),
        ],
        metrics: [
          { label: 'DB CPU', before: '94%', after: '54%' },
          { label: 'Primary reads', before: '16K/s', after: '5.4K/s' },
          { label: 'P95 latency', before: '1.1 s', after: '290 ms' },
        ],
        insight: 'Read replicas distribute eligible reads away from the write primary.',
        tradeoff: 'Replica reads can be stale because replication takes time.',
      },
    ),
    stage(
      'cache',
      '500K',
      500_000,
      'Repeated hot reads',
      'A cache is useful now because measured repetition makes database work avoidable.',
      {
        bottleneck: {
          nodeId: 'database',
          type: 'HOT READ BOTTLENECK',
          explanation: 'The same popular records are repeatedly fetched from durable storage.',
          signal: '80K reads/s · hot keys',
        },
        requiredAction: 'add-cache',
        addedNodes: ['cache'],
        actions: [
          action(
            'add-cache',
            'Add cache-aside',
            'resolve',
            'The first miss fills the cache; later hits avoid database work.',
          ),
          action(
            'more-replicas',
            'Add another replica',
            'partial',
            'A replica adds capacity, but repeated reads still consume database resources.',
          ),
          action(
            'queue-reads',
            'Add a queue',
            'premature',
            'Interactive reads cannot wait behind an asynchronous queue.',
          ),
        ],
        metrics: [
          { label: 'DB reads', before: '80K/s', after: '8K/s' },
          { label: 'Cache hit rate', before: '0%', after: '90%' },
          { label: 'P95 latency', before: '860 ms', after: '120 ms' },
        ],
        insight:
          'Cache-aside keeps durable truth in the database while serving repeated reads from memory.',
        tradeoff: 'Invalidation, hot keys, and stale values need explicit policies.',
      },
    ),
    stage(
      'edge',
      '1M',
      1_000_000,
      'Origin bandwidth pressure',
      'Static and media delivery belongs at the edge once origin bandwidth matters.',
      {
        bottleneck: {
          nodeId: 'services',
          type: 'ORIGIN BANDWIDTH BOTTLENECK',
          explanation: 'Cacheable assets still travel through the application origin.',
          signal: '1.2 GB/s origin',
        },
        requiredAction: 'add-cdn',
        addedNodes: ['cdn'],
        actions: [
          action(
            'add-cdn',
            'Add CDN',
            'resolve',
            'Edge hits serve cacheable content without reaching the origin.',
          ),
          action(
            'add-database',
            'Scale database',
            'partial',
            'Database capacity does not reduce static asset bandwidth.',
          ),
          action(
            'add-kafka',
            'Add Kafka',
            'premature',
            'A log does not shorten delivery of cacheable content.',
          ),
        ],
        metrics: [
          { label: 'Origin traffic', before: '1.2 GB/s', after: '170 MB/s' },
          { label: 'Edge hit rate', before: '0%', after: '86%' },
          { label: 'Asset P95', before: '740 ms', after: '95 ms' },
        ],
        insight: 'The first request can miss and fill the edge; later users receive a nearby hit.',
        tradeoff: 'Cache keys, freshness, and invalidation become part of correctness.',
      },
    ),
    stage(
      'async',
      '5M',
      5_000_000,
      'Slow background work',
      'User-facing requests should acknowledge before independent slow work completes.',
      {
        bottleneck: {
          nodeId: 'services',
          type: 'SYNCHRONOUS WORK BOTTLENECK',
          explanation: 'Notifications and media processing hold request workers open.',
          signal: '50K jobs/s · queueing',
        },
        requiredAction: 'add-workers',
        addedNodes: ['kafka', 'workers'],
        actions: [
          action(
            'add-workers',
            'Add queue + workers',
            'resolve',
            'Durable events decouple acknowledgement from retryable background processing.',
          ),
          action(
            'more-apps-async',
            'Add app servers',
            'partial',
            'More request workers postpone saturation but still block on slow jobs.',
          ),
          action(
            'add-cdn-async',
            'Expand CDN',
            'premature',
            'Edge delivery does not execute background business work.',
          ),
        ],
        metrics: [
          { label: 'Request P95', before: '2.2 s', after: '210 ms' },
          { label: 'Async throughput', before: '5K/s', after: '62K/s' },
          { label: 'Retry durability', before: 'none', after: 'retained' },
        ],
        insight: 'A durable queue absorbs bursts and lets consumers retry independently.',
        tradeoff: 'Handlers must tolerate duplicates and operators must monitor backlog.',
      },
    ),
    stage(
      'partition',
      '10M',
      10_000_000,
      'Single database write ceiling',
      'Partition only after one store becomes a measured limit.',
      {
        bottleneck: {
          nodeId: 'database',
          type: 'WRITE AND STORAGE BOTTLENECK',
          explanation: 'One database primary owns too much write traffic and data.',
          signal: '400K writes/s · 18 TB',
        },
        requiredAction: 'add-shards',
        addedNodes: ['sharding'],
        actions: [
          action(
            'add-shards',
            'Partition by user',
            'resolve',
            'A stable partition key distributes ownership and write load.',
          ),
          action(
            'cache-writes',
            'Add more cache',
            'partial',
            'Caching reads does not distribute durable write ownership.',
          ),
          action(
            'more-workers',
            'Add workers',
            'partial',
            'Workers can smooth writes but one database still owns the ceiling.',
          ),
        ],
        metrics: [
          { label: 'Write load', before: '400K/s primary', after: '~67K/s per shard' },
          { label: 'Data', before: '18 TB primary', after: '~3 TB per shard' },
          { label: 'DB CPU', before: '98%', after: '61%' },
        ],
        insight: 'Hashing a stable user key spreads point reads and writes across shard owners.',
        tradeoff: 'Cross-shard queries, transactions, and rebalancing become harder.',
      },
    ),
    stage(
      'global',
      '50M',
      50_000_000,
      'Regional latency and resilience',
      'Global scale needs explicit routing, ownership, replication, and failover.',
      {
        bottleneck: {
          nodeId: 'client',
          type: 'REGIONAL BOTTLENECK',
          explanation:
            'Distant users cross an ocean and one region remains a shared failure domain.',
          signal: 'P95 1.8s · one region',
        },
        requiredAction: 'multi-region',
        addedNodes: ['infrastructure', 'multi-region'],
        actions: [
          action(
            'multi-region',
            'Add regional isolation',
            'resolve',
            'Global routing sends users to a viable nearby region with explicit data replication.',
          ),
          action(
            'bigger-region',
            'Build a larger region',
            'partial',
            'More capacity in one region does not reduce distance or regional failure risk.',
          ),
          action(
            'more-shards-global',
            'Add more shards',
            'partial',
            'Shards increase data capacity but do not provide regional routing or isolation.',
          ),
        ],
        metrics: [
          { label: 'Global P95', before: '1.8 s', after: '240 ms' },
          { label: 'Regions', before: '1', after: '3 isolated' },
          { label: 'Failover', before: 'manual', after: 'health-routed' },
        ],
        insight:
          'Routing and regional isolation contain failures while serving users closer to home.',
        tradeoff: 'Cross-region consistency, ownership, and failback require deliberate design.',
      },
    ),
  ],
};

function specializedScenario(
  id: string,
  name: string,
  description: string,
  baseNodes: string[],
  assumptions: Partial<ScaleScenario['assumptions']>,
  stages: Array<{
    label: string;
    users: number;
    title: string;
    lesson: string;
    focus: string;
    signal: string;
    fix: string;
    fixLabel: string;
    adds: string[];
  }>,
): ScaleScenario {
  return {
    id,
    name,
    description,
    architectureFamily: id,
    assumptions: { ...baseAssumptions, ...assumptions },
    baseNodes,
    stages: [
      stage(
        'simple',
        '100',
        100,
        'Start simple',
        'Use the smallest architecture that meets today’s constraints.',
        {
          metrics: [
            { label: 'Peak load', before: 'healthy', after: 'healthy' },
            { label: 'P95 latency', before: '85 ms', after: '85 ms' },
          ],
        },
      ),
      ...stages.map((item, index) =>
        stage(`stage-${index + 1}`, item.label, item.users, item.title, item.lesson, {
          bottleneck: {
            nodeId: item.focus,
            type: item.title.toUpperCase(),
            explanation: item.lesson,
            signal: item.signal,
          },
          requiredAction: item.fix,
          addedNodes: item.adds,
          actions: [
            action(item.fix, item.fixLabel, 'resolve', item.lesson),
            action(
              `${item.fix}-partial`,
              'Add application capacity',
              'partial',
              'This changes capacity, but the highlighted dependency remains the limiting resource.',
            ),
            action(
              `${item.fix}-early`,
              'Add another data tool',
              'premature',
              'It adds complexity without addressing the active constraint.',
            ),
          ],
          metrics: [
            { label: 'Bottleneck load', before: '96%', after: '56%' },
            { label: 'P95 latency', before: '1.3 s', after: '220 ms' },
            { label: 'Capacity margin', before: '0%', after: '35%' },
          ],
          insight: item.lesson,
          tradeoff:
            'The new component adds an operational dependency that must be observed and tested.',
        }),
      ),
    ],
  };
}

const social = specializedScenario(
  'social-feed',
  'Social Feed',
  'Evolve reads, ranking, fanout, and partitioned feed storage.',
  ['client', 'services', 'database'],
  { readRatio: 0.92, averageResponseKB: 18 },
  [
    {
      label: '10K',
      users: 10_000,
      title: 'Repeated feed reads',
      lesson: 'Cache popular feed pages and objects when repetition becomes measurable.',
      focus: 'database',
      signal: '7.4K reads/s',
      fix: 'social-cache',
      fixLabel: 'Add feed cache',
      adds: ['cache'],
    },
    {
      label: '100K',
      users: 100_000,
      title: 'Ranking work',
      lesson: 'Separate feed ranking from generic request handling.',
      focus: 'services',
      signal: 'CPU 95% · ranking',
      fix: 'ranking-service',
      fixLabel: 'Add ranking service',
      adds: ['search'],
    },
    {
      label: '1M',
      users: 1_000_000,
      title: 'Fanout latency',
      lesson: 'Move independent fanout work behind durable events and workers.',
      focus: 'services',
      signal: 'fanout P95 2.1s',
      fix: 'fanout-workers',
      fixLabel: 'Add fanout workers',
      adds: ['kafka', 'workers'],
    },
    {
      label: '10M',
      users: 10_000_000,
      title: 'Feed storage ceiling',
      lesson: 'Partition feed ownership by a stable user key.',
      focus: 'database',
      signal: '11 TB · hot primary',
      fix: 'feed-shards',
      fixLabel: 'Shard by user',
      adds: ['sharding'],
    },
    {
      label: '100M',
      users: 100_000_000,
      title: 'Global feed latency',
      lesson: 'Use regional routing and explicit replicated data ownership.',
      focus: 'client',
      signal: 'P95 1.9s',
      fix: 'feed-regions',
      fixLabel: 'Add regional isolation',
      adds: ['infrastructure', 'multi-region'],
    },
  ],
);

const messaging = specializedScenario(
  'messaging',
  'Messaging',
  'Scale persistent connections, routing, presence, and message storage.',
  ['client', 'realtime', 'database'],
  { requestsPerSecond: 1.2, readRatio: 0.55, averageResponseKB: 2 },
  [
    {
      label: '10K',
      users: 10_000,
      title: 'Gateway connection ceiling',
      lesson: 'Spread persistent connections across multiple gateways.',
      focus: 'realtime',
      signal: '95% connections',
      fix: 'gateway-fleet',
      fixLabel: 'Add gateway fleet',
      adds: ['load-balancer'],
    },
    {
      label: '100K',
      users: 100_000,
      title: 'Message routing pressure',
      lesson: 'Route sessions through a dedicated stateless messaging tier.',
      focus: 'realtime',
      signal: 'routing CPU 94%',
      fix: 'message-router',
      fixLabel: 'Add message routing',
      adds: ['services'],
    },
    {
      label: '1M',
      users: 1_000_000,
      title: 'Message storage ceiling',
      lesson: 'Partition conversations by a stable conversation key.',
      focus: 'database',
      signal: '180K writes/s',
      fix: 'message-shards',
      fixLabel: 'Partition messages',
      adds: ['sharding'],
    },
    {
      label: '10M',
      users: 10_000_000,
      title: 'Presence and fanout backlog',
      lesson: 'Durable streams decouple delivery fanout and presence updates.',
      focus: 'services',
      signal: '2.4M pending',
      fix: 'message-stream',
      fixLabel: 'Add event streaming',
      adds: ['kafka', 'workers', 'cache'],
    },
    {
      label: '100M',
      users: 100_000_000,
      title: 'Cross-region delivery',
      lesson: 'Route connections regionally and define message ownership and replication.',
      focus: 'client',
      signal: 'WAN P95 1.6s',
      fix: 'message-regions',
      fixLabel: 'Add regional routing',
      adds: ['infrastructure', 'multi-region'],
    },
  ],
);

const video = specializedScenario(
  'video-streaming',
  'Video Streaming',
  'Scale object delivery, transcoding, origin protection, and regions.',
  ['client', 'services', 'storage'],
  { requestsPerSecond: 0.35, readRatio: 0.98, averageResponseKB: 1400 },
  [
    {
      label: '10K',
      users: 10_000,
      title: 'Origin bandwidth pressure',
      lesson: 'Move cacheable video segments close to viewers through a CDN.',
      focus: 'storage',
      signal: '4.9 GB/s origin',
      fix: 'video-cdn',
      fixLabel: 'Add CDN',
      adds: ['cdn'],
    },
    {
      label: '100K',
      users: 100_000,
      title: 'Transcoding backlog',
      lesson: 'Queue encoding work and scale independent transcoding workers.',
      focus: 'services',
      signal: '18K jobs pending',
      fix: 'transcode-workers',
      fixLabel: 'Add transcoding workers',
      adds: ['kafka', 'workers'],
    },
    {
      label: '1M',
      users: 1_000_000,
      title: 'Origin miss amplification',
      lesson: 'Add a shield tier so simultaneous misses collapse before object storage.',
      focus: 'storage',
      signal: 'origin CPU 93%',
      fix: 'origin-shield',
      fixLabel: 'Add origin shield',
      adds: ['cache'],
    },
    {
      label: '10M',
      users: 10_000_000,
      title: 'Regional delivery latency',
      lesson: 'Regionalize origins and route viewers toward healthy nearby delivery capacity.',
      focus: 'client',
      signal: 'startup P95 2.0s',
      fix: 'video-regions',
      fixLabel: 'Add regional delivery',
      adds: ['infrastructure', 'multi-region'],
    },
  ],
);

const ecommerce = specializedScenario(
  'ecommerce',
  'E-commerce',
  'Scale catalog reads, orders, inventory coordination, and regional traffic.',
  ['client', 'services', 'database'],
  { readRatio: 0.88, averageResponseKB: 12 },
  [
    {
      label: '10K',
      users: 10_000,
      title: 'Application saturation',
      lesson: 'Use a load balancer and stateless application fleet.',
      focus: 'services',
      signal: 'CPU 97%',
      fix: 'commerce-fleet',
      fixLabel: 'Add app fleet',
      adds: ['load-balancer'],
    },
    {
      label: '100K',
      users: 100_000,
      title: 'Catalog read pressure',
      lesson: 'Cache popular catalog objects and use a search index for discovery.',
      focus: 'database',
      signal: '17K reads/s',
      fix: 'catalog-cache',
      fixLabel: 'Add catalog cache',
      adds: ['cache', 'search'],
    },
    {
      label: '1M',
      users: 1_000_000,
      title: 'Order and inventory coupling',
      lesson: 'Separate durable order flow from catalog request handling.',
      focus: 'services',
      signal: 'checkout P95 1.7s',
      fix: 'order-separation',
      fixLabel: 'Separate order flow',
      adds: ['workers'],
    },
    {
      label: '10M',
      users: 10_000_000,
      title: 'Fulfillment backlog',
      lesson: 'Publish durable order events for retryable downstream fulfillment.',
      focus: 'workers',
      signal: '640K pending',
      fix: 'order-events',
      fixLabel: 'Add order events',
      adds: ['kafka'],
    },
    {
      label: '100M',
      users: 100_000_000,
      title: 'Regional checkout risk',
      lesson: 'Route regionally while keeping explicit inventory and order ownership.',
      focus: 'client',
      signal: 'one region · P95 2.2s',
      fix: 'commerce-regions',
      fixLabel: 'Add regional isolation',
      adds: ['sharding', 'infrastructure', 'multi-region'],
    },
  ],
);

export const scaleScenarios: ScaleScenario[] = [generic, social, messaging, video, ecommerce];

export function getScaleScenario(id: string): ScaleScenario {
  return scaleScenarios.find((scenario) => scenario.id === id) || scaleScenarios[0];
}
