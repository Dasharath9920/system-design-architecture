import { demo, edge, frame, layer, node } from './builders';
import type { XRayLayer } from './types';

/** Small behavior traces: ordered decisions, not claims about physical topology. */
type Mechanism = {
  id: string;
  name: string;
  owner: string;
  cost: string;
  stages: [string, string, string][];
};
export const mechanisms: Mechanism[] = [
  {
    id: 'consistent-hashing',
    name: 'Consistent hashing',
    owner: 'load-balancer',
    cost: 'Virtual nodes improve balance but do not fix a single hot key.',
    stages: [
      [
        'Place nodes',
        'A=20 · B=60 · C=90',
        'Place illustrative virtual-node tokens on a ring from 0 to 99.',
      ],
      ['Hash key', 'hash(k)=42', 'Locate the key clockwise from its token.'],
      ['Choose owner', '42 → B at 60', 'B is the first node clockwise after 42.'],
      [
        'Add a node',
        'D at 50 → key moves to D',
        'Only keys in the newly owned interval move; other intervals retain owners.',
      ],
    ],
  },
  {
    id: 'rendezvous',
    name: 'Rendezvous hashing',
    owner: 'load-balancer',
    cost: 'A straightforward lookup scores every candidate; weighted variants require careful scoring.',
    stages: [
      [
        'Score pairs',
        'H(k,A)=12 · H(k,B)=87 · H(k,C)=43',
        'Compute a deterministic score for each key/node pair. These scores are illustrative.',
      ],
      ['Choose maximum', 'owner = B', 'All clients with the same membership and scoring agree.'],
      [
        'Remove B',
        'A=12 · C=43 → C',
        'Only keys whose winning node disappeared must choose a new winner.',
      ],
    ],
  },
  {
    id: 'lsm',
    name: 'LSM tree',
    owner: 'postgres',
    cost: 'This is a storage alternative, not PostgreSQL’s default heap/B-tree engine. Compaction amplifies writes.',
    stages: [
      [
        'Log write',
        'WAL: k=2',
        'Log the write under the durability policy before acknowledging it.',
      ],
      ['Update memtable', 'k → 2', 'Keep recent writes in a sorted in-memory structure.'],
      ['Flush', 'immutable SSTable', 'Flush an immutable sorted table when the memtable fills.'],
      [
        'Read newest value',
        'memtable + candidate tables',
        'Resolve versions across levels; Bloom filters can skip definite misses.',
      ],
      [
        'Compact',
        'merge tables; retire old versions',
        'Merge overlapping runs and reclaim obsolete values when retention rules allow.',
      ],
    ],
  },
  {
    id: 'bloom',
    name: 'Bloom filter',
    owner: 'search',
    cost: 'False positives are possible; ordinary Bloom filters do not support deletion safely.',
    stages: [
      [
        'Insert key',
        'bits 1, 4, 7 → 1',
        'Hash a stored key with several functions and set their bit positions.',
      ],
      [
        'Query absent key',
        'bits 2, 4, 7; bit 2 = 0',
        'One zero proves the key was not inserted into this filter.',
      ],
      [
        'Query possible key',
        'bits 1, 4, 7 all = 1',
        'All ones mean possibly present; verify in the backing store.',
      ],
      [
        'Interpret result',
        'no false negatives under valid use',
        'The guarantee assumes correctly maintained bits and hashes; saturation raises false-positive probability.',
      ],
    ],
  },
  {
    id: 'lru',
    name: 'LRU',
    owner: 'redis',
    cost: 'Exact LRU requires recency bookkeeping; Redis uses an approximation.',
    stages: [
      ['Initial order', 'MRU [A, B, C] LRU', 'Capacity is three entries.'],
      ['Read C', 'MRU [C, A, B] LRU', 'An exact LRU moves the accessed entry to the front.'],
      [
        'Insert D',
        '[D, C, A]; evict B',
        'Evict the least recently used entry when capacity is exceeded.',
      ],
    ],
  },
  {
    id: 'lfu',
    name: 'LFU',
    owner: 'redis',
    cost: 'Frequency needs decay or old popularity can dominate forever; implementations use approximate counters.',
    stages: [
      ['Count access', 'A=8 · B=2 · C=1', 'Track recent or decayed access frequency.'],
      ['Insert D', 'evict C', 'Choose a lowest-frequency candidate; ties need a policy.'],
      [
        'Age counters',
        'old popularity decays',
        'Decay allows a changing workload to replace formerly popular keys.',
      ],
    ],
  },
  {
    id: 'token-bucket',
    name: 'Token bucket',
    owner: 'rate-limiter',
    cost: 'Distributed enforcement needs atomic accounting; local buckets multiply the total allowance.',
    stages: [
      ['Refill', 'capacity 3 · rate 1/s', 'Accumulate tokens up to the configured capacity.'],
      ['Admit burst', '3 arrivals → 0 tokens', 'Each accepted request spends one token.'],
      [
        'Reject excess',
        '4th request → reject',
        'An empty bucket rejects or delays work according to policy.',
      ],
      ['Recover', '1 second → 1 token', 'A later request can consume newly accrued capacity.'],
    ],
  },
  {
    id: 'leaky-bucket',
    name: 'Leaky bucket',
    owner: 'rate-limiter',
    cost: 'A bounded queue smooths output but introduces waiting and overflow loss/rejection.',
    stages: [
      [
        'Burst arrives',
        'queue [A,B,C]',
        'This queue-based form accepts work into a bounded buffer.',
      ],
      ['Drain steadily', 'A at t=0; B at t=1', 'A fixed drain rate smooths execution.'],
      [
        'Overflow',
        'capacity 3; 4th waiting job rejected',
        'The buffer cannot absorb an unbounded burst.',
      ],
      ['Catch up', 'C at t=2', 'Waiting time grows with queue depth.'],
    ],
  },
  {
    id: 'fixed-window',
    name: 'Fixed window',
    owner: 'rate-limiter',
    cost: 'Two full allowances can arrive around the boundary of adjacent windows.',
    stages: [
      [
        'Count first window',
        'limit 3 per second',
        'Increment a counter in the current time window.',
      ],
      ['End-window burst', '3 requests at t=0.99', 'All three fit the first window.'],
      [
        'Reset',
        '3 requests at t=1.01',
        'The second window admits three more: six arrive within 20ms.',
      ],
    ],
  },
  {
    id: 'sliding-window',
    name: 'Sliding window log',
    owner: 'rate-limiter',
    cost: 'Exact timestamp logs require memory and atomic pruning/counting.',
    stages: [
      ['Record arrivals', '[0.1, 0.4, 0.9]', 'Keep timestamps within the last one second.'],
      [
        'New arrival at 1.0',
        '3 recent arrivals → reject',
        'No boundary reset discards those recent events.',
      ],
      ['New arrival at 1.2', 'prune 0.1; admit 1.2', 'The remaining log is [0.4,0.9,1.2].'],
    ],
  },
  {
    id: 'sliding-counter',
    name: 'Sliding window counter',
    owner: 'rate-limiter',
    cost: 'Weighted windows approximate an exact rolling log and can over- or under-estimate bursty traffic.',
    stages: [
      [
        'Keep two counters',
        'previous=8 · current=2',
        'Maintain the previous and current fixed-window counts.',
      ],
      [
        'Weight history',
        '25% elapsed → 8×0.75 + 2 = 8',
        'Approximate the recent window from overlap.',
      ],
      [
        'Admit under limit',
        'limit 10 → admit one',
        'Atomic updates prevent concurrent callers from all seeing the same spare capacity.',
      ],
    ],
  },
  {
    id: 'raft',
    name: 'Raft',
    owner: 'kafka',
    cost: 'A majority must communicate; partitions can stop progress. This simplified trace omits membership changes.',
    stages: [
      [
        'Election timeout',
        'term 7 · candidate A',
        'A follower times out and requests votes with its log information.',
      ],
      [
        'Majority votes',
        'A + B = 2/3',
        'At most one vote per term and log-freshness rules constrain election.',
      ],
      ['Replicate entry', 'term 7 · index 42', 'The leader sends the entry to followers.'],
      [
        'Commit current-term entry',
        'A and B stored index 42',
        'A majority can commit the current-term entry; applications execute committed entries in order.',
      ],
      [
        'Minority isolated',
        'C alone cannot commit',
        'C must wait for communication or rejoin a viable majority.',
      ],
    ],
  },
  {
    id: 'leader-election',
    name: 'Leader election',
    owner: 'kafka',
    cost: 'Failure detection can be wrong; safe authority needs epochs, leases or consensus plus fencing.',
    stages: [
      ['Lose heartbeat', 'A unreachable', 'A might be partitioned rather than dead.'],
      ['Obtain authority', 'B wins term 8', 'A coordination protocol authorizes a successor.'],
      [
        'Fence old leader',
        'reject term 7 writes',
        'Storage or downstream resources must reject stale authority.',
      ],
      ['Resume', 'B writes with term 8', 'Promotion without fencing risks two active writers.'],
    ],
  },
  {
    id: 'quorum',
    name: 'Quorum',
    owner: 'multi-region',
    cost: 'R+W>N gives intersecting sets, not automatic linearizability in every quorum store.',
    stages: [
      ['Replicate', 'N=3: A, B, C', 'Choose write and read acknowledgement requirements.'],
      [
        'Write',
        'W=2: A and B store v2',
        'A successful write reaches two replicas under this example policy.',
      ],
      [
        'Read',
        'R=2: B and C respond',
        'The sets intersect at B; version reconciliation must choose correctly.',
      ],
      [
        'Partition',
        'only C reachable',
        'R=2 and W=2 cannot complete on the isolated single replica.',
      ],
    ],
  },
  {
    id: 'gossip',
    name: 'Gossip',
    owner: 'redis',
    cost: 'Dissemination is eventually convergent, not an instantaneous agreement or failure oracle.',
    stages: [
      ['Observe', 'A suspects D', 'A local failure detector observes missed responses.'],
      ['Exchange', 'A → B; B → C', 'Periodic peer exchanges spread membership information.'],
      ['Merge', 'C learns suspicion', 'Versioning and protocol rules merge updates.'],
      [
        'Recheck',
        'D may recover',
        'Suspicion needs confirmation appropriate to the system; gossip alone is not consensus.',
      ],
    ],
  },
  {
    id: 'merkle',
    name: 'Merkle tree',
    owner: 'object-storage',
    cost: 'Hashes locate differing ranges but do not choose which version is authoritative.',
    stages: [
      ['Hash leaves', 'A: [h1,h2,h3,h4]', 'Hash data blocks and then parent hash pairs.'],
      ['Compare roots', 'root A ≠ root B', 'A mismatch proves some covered data differs.'],
      [
        'Descend mismatch',
        'left equal; right differs',
        'Compare child hashes only in the differing subtree.',
      ],
      [
        'Repair leaf',
        'block 3 differs',
        'Transfer and reconcile the differing block under the system’s version policy.',
      ],
    ],
  },
  {
    id: 'circuit-breaker',
    name: 'Circuit breaker',
    owner: 'gateway',
    cost: 'Thresholds and recovery probes can reject work during transient errors; breakers do not replace deadlines.',
    stages: [
      ['Closed', 'requests pass', 'Observe a bounded error/latency window.'],
      [
        'Open',
        'failure threshold exceeded',
        'Fail quickly rather than pile work onto an unhealthy dependency.',
      ],
      [
        'Half-open',
        'allow a limited probe',
        'After a cooldown, test recovery with bounded concurrency.',
      ],
      ['Recover', 'probe succeeds → closed', 'Failure would reopen the breaker instead.'],
    ],
  },
  {
    id: 'backoff',
    name: 'Exponential backoff + jitter',
    owner: 'websocket',
    cost: 'Retry budgets and deadlines limit amplification; non-idempotent operations need safety before retries.',
    stages: [
      [
        'Failure',
        'attempt 1 times out',
        'A timeout does not reveal whether the remote effect happened.',
      ],
      [
        'Sample delay',
        'U(0, 200ms) → 73ms',
        'Full jitter chooses a random wait under the exponential cap.',
      ],
      [
        'Increase cap',
        'U(0, 400ms) → 281ms',
        'Different clients spread their retries rather than synchronize.',
      ],
      [
        'Bound attempts',
        'deadline or budget exhausted → stop',
        'Cap both delay and total work; surface failure instead of retrying forever.',
      ],
    ],
  },
  {
    id: 'retry',
    name: 'Retry',
    owner: 'queue',
    cost: 'Retries across multiple service layers multiply load and can repeat non-idempotent effects.',
    stages: [
      [
        'Classify',
        'transient timeout',
        'Distinguish transient errors from invalid requests and permanent rejection.',
      ],
      [
        'Preserve identity',
        'operation id = order42',
        'Reuse the same idempotency identity for one logical operation.',
      ],
      [
        'Wait',
        'bounded backoff with jitter',
        'Respect server retry hints and the end-to-end deadline.',
      ],
      [
        'Retry or stop',
        'attempt budget 3',
        'A bounded retry policy includes an explicit terminal failure path.',
      ],
    ],
  },
  {
    id: 'idempotency',
    name: 'Idempotency',
    owner: 'queue',
    cost: 'Store keys long enough, bind them to parameters, and atomically coordinate the record with the effect.',
    stages: [
      [
        'Receive operation',
        'key=pay42; amount=20',
        'Identify one logical operation across attempts.',
      ],
      [
        'Apply atomically',
        'record pay42 + effect committed',
        'Within a suitable transaction, persist both result and effect.',
      ],
      ['Response lost', 'client sees timeout', 'The server may already have committed.'],
      [
        'Repeat same key',
        'return stored result; no second effect',
        'Reject reuse with different parameters; external side effects require their own atomic boundary.',
      ],
    ],
  },
  {
    id: 'deduplication',
    name: 'Deduplication',
    owner: 'queue',
    cost: 'A bounded history only deduplicates within its retention window; check-then-act alone has a race.',
    stages: [
      [
        'Identify message',
        'event id = 42',
        'Stable producer identities allow consumers to recognize repeats.',
      ],
      [
        'Claim atomically',
        'unique event42 insert succeeds',
        'Use uniqueness or another atomic claim with effect processing.',
      ],
      [
        'Duplicate arrives',
        'unique event42 insert conflicts',
        'Return the prior result or skip already committed work.',
      ],
      [
        'Expire history',
        'retention ≥ retry/replay horizon',
        'Very old replays outside the window may no longer be recognized.',
      ],
    ],
  },
  {
    id: 'hash-partitioning',
    name: 'Hash partitioning',
    owner: 'redis',
    cost: 'Hashing spreads distinct keys, not a single hot key; simple modulo mapping moves many keys when N changes.',
    stages: [
      [
        'Choose key',
        'user42',
        'Select a high-cardinality routing key matching the access pattern.',
      ],
      ['Hash', 'illustrative hash=17', 'A stable hash gives the same value across routers.'],
      ['Map to shard', '17 mod 3 = 2', 'Route to shard 2 for this three-shard example.'],
      ['Add shard', '17 mod 4 = 1', 'Naive modulo changes ownership; migration needs a plan.'],
    ],
  },
  {
    id: 'range-partitioning',
    name: 'Range partitioning',
    owner: 'postgres',
    cost: 'Range queries become local, but append-heavy timestamps can overload the newest range.',
    stages: [
      [
        'Define bounds',
        'A:[0,100) B:[100,200) C:[200,300)',
        'Maintain a directory of non-overlapping ranges.',
      ],
      ['Route key', '142 → B', 'Choose the interval containing the key.'],
      ['Range scan', '[90,120) → A + B', 'Cross-boundary scans contact more than one partition.'],
      [
        'Split hot range',
        'B → [100,150), [150,200)',
        'Update routing and move data while preserving ownership correctness.',
      ],
    ],
  },
];

export function mechanismLayers(owner: string): XRayLayer[] {
  const shared: Record<string, string[]> = {
    kubernetes: ['raft'],
    gateway: ['token-bucket', 'backoff'],
    queue: ['backoff'],
    'rate-limiter': ['backoff'],
    'multi-region': ['quorum'],
  };
  return mechanisms
    .filter((m) => m.owner === owner || shared[owner]?.includes(m.id))
    .map((m) => ({
      ...layer(
        m.id,
        m.name,
        'Behavior trace · illustrative values, explicit decision boundaries',
        m.stages.map(([name, value, how], i) => node(`s${i}`, name, value, how, m.cost)),
        m.stages.slice(1).map((_, i) => edge(`s${i}`, `s${i + 1}`, 'then')),
        [
          demo(
            'trace',
            `Show ${m.name}`,
            m.stages.map(([name, value, how], i) =>
              frame(
                name,
                how,
                [`s${i}`],
                Object.fromEntries(
                  m.stages.slice(0, i + 1).map((s, j) => [`s${j}`, j === i ? value : s[1]]),
                ),
              ),
            ),
          ),
        ],
        'overview',
      ),
      scope: m.cost,
      sources: mechanismSources[m.id] || [],
    }));
}

const source = (title: string, url: string) => ({ title, url });
const mechanismSources: Record<string, { title: string; url: string }[]> = {
  'consistent-hashing': [
    source(
      'NGINX upstream hashing',
      'https://nginx.org/en/docs/http/ngx_http_upstream_module.html#hash',
    ),
  ],
  rendezvous: [
    source(
      'HRW / rendezvous hashing paper',
      'https://www.eecs.umich.edu/techreports/cse/96/CSE-TR-316-96.pdf',
    ),
  ],
  lsm: [source('RocksDB overview', 'https://github.com/facebook/rocksdb/wiki/RocksDB-Overview')],
  bloom: [
    source(
      'RocksDB Bloom filters',
      'https://github.com/facebook/rocksdb/wiki/RocksDB-Bloom-Filter',
    ),
  ],
  lru: [
    source('Redis eviction policies', 'https://redis.io/docs/latest/develop/reference/eviction/'),
  ],
  lfu: [
    source('Redis eviction policies', 'https://redis.io/docs/latest/develop/reference/eviction/'),
  ],
  'token-bucket': [
    source('Token bucket · RFC 3290 appendix A', 'https://www.rfc-editor.org/rfc/rfc3290'),
  ],
  'leaky-bucket': [
    source('Leaky bucket · RFC 3290 appendix A', 'https://www.rfc-editor.org/rfc/rfc3290'),
  ],
  'fixed-window': [source('Redis counter pattern', 'https://redis.io/docs/latest/commands/incr/')],
  'sliding-window': [
    source('Redis sorted sets', 'https://redis.io/docs/latest/develop/data-types/sorted-sets/'),
  ],
  'sliding-counter': [
    source(
      'Cloudflare sliding-window implementation',
      'https://blog.cloudflare.com/counting-things-a-lot-of-different-things/',
    ),
  ],
  raft: [source('Raft paper', 'https://raft.github.io/raft.pdf')],
  'leader-election': [source('Raft paper', 'https://raft.github.io/raft.pdf')],
  quorum: [
    source(
      'Dynamo paper · quorum trade-offs',
      'https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf',
    ),
  ],
  gossip: [
    source(
      'Redis Cluster gossip',
      'https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/',
    ),
  ],
  merkle: [
    source(
      'Dynamo anti-entropy trees',
      'https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf',
    ),
  ],
  'circuit-breaker': [
    source(
      'Azure circuit breaker pattern',
      'https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker',
    ),
  ],
  backoff: [
    source(
      'AWS Builders Library · backoff and jitter',
      'https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/',
    ),
  ],
  retry: [
    source(
      'AWS Builders Library · retry safety',
      'https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/',
    ),
  ],
  idempotency: [
    source(
      'AWS Builders Library · idempotency',
      'https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/',
    ),
  ],
  deduplication: [
    source('Kafka design · delivery semantics', 'https://kafka.apache.org/41/design/design/'),
  ],
  'hash-partitioning': [
    source('PostgreSQL partitioning', 'https://www.postgresql.org/docs/18/ddl-partitioning.html'),
  ],
  'range-partitioning': [
    source('PostgreSQL partitioning', 'https://www.postgresql.org/docs/18/ddl-partitioning.html'),
  ],
};
