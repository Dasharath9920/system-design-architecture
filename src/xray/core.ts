import { concept, demo, edge as e, frame as f, layer, node as n } from './builders';

const postgres = concept(
  {
    id: 'postgres',
    name: 'PostgreSQL',
    category: 'Relational database → implementation',
    summary: 'Follow a query from a connection to a visible, durable tuple.',
    role: 'Transactional source of truth with SQL and extensible indexes.',
    consistencyModel:
      'Read Committed takes a new snapshot per statement; Repeatable Read keeps a transaction snapshot. Serializable adds conflict detection and can require retries. Async standbys may lag.',
    scalingStrategies: [
      'Pool connections and reduce query work before adding servers.',
      'Read replicas offload eligible reads; partitioning prunes data but does not automatically distribute writes across machines.',
    ],
    failureModes: [
      {
        symptom: 'Requests wait for a connection.',
        cause: 'Concurrency exceeds the connection budget.',
        impact: 'Queueing spreads into application latency.',
        mitigation: 'Bound concurrency, pool connections, inspect long queries and lock waits.',
      },
      {
        symptom: 'A saved change appears to disappear.',
        cause: 'An immediate read reaches a lagging standby.',
        impact: 'The reader sees an older committed version.',
        mitigation: 'Read from the primary or wait for the required replay position.',
      },
    ],
    tradeoffs: [
      'Indexes accelerate selected reads but add write, WAL, and storage costs.',
      'Long snapshots retain old tuple versions and can delay vacuum cleanup.',
    ],
    alternatives: [
      'MySQL/InnoDB uses a clustered primary index and undo records; its internals differ.',
      'A key-value store can simplify predictable lookups but changes query and transaction capabilities.',
    ],
    whenToUse: 'Relational constraints, flexible queries, and transactional updates matter.',
    whenNotToUse:
      'Do not force large media bytes or a search-only workload into a relational query path.',
    misconceptions: [
      'MVCC does not remove all locks. Updates create new physical tuple versions; HOT may avoid new index entries when eligible.',
      'A replica is neither a backup nor a guarantee of fresh reads.',
    ],
    relatedConcepts: ['redis', 'search', 'multi-region'],
    sources: [
      { title: 'PostgreSQL 18 · MVCC', url: 'https://www.postgresql.org/docs/18/mvcc-intro.html' },
      { title: 'Write-ahead logging', url: 'https://www.postgresql.org/docs/18/wal-intro.html' },
      { title: 'Standby replication', url: 'https://www.postgresql.org/docs/18/warm-standby.html' },
      { title: 'Index types', url: 'https://www.postgresql.org/docs/18/indexes-types.html' },
    ],
    versionContext:
      'PostgreSQL 18; ordinary heap tables. Extensions and settings can change behavior.',
    implementationNotes:
      'RDS, Cloud SQL, and Azure Database automate operations; schema design, query budgets, and consistency choices still belong to the application team.',
  },
  [
    layer(
      'overview',
      'PostgreSQL',
      'Seven systems cooperate; open one to follow its mechanism.',
      [
        n(
          'client',
          'Client / pool',
          'Bound concurrent database work.',
          'A pool reuses server connections; a backend handles a session.',
          'Oversized pools amplify contention.',
          'query',
        ),
        n(
          'query',
          'Query path',
          'Turn SQL into a physical execution plan.',
          'Parse, rewrite, plan, then execute using statistics.',
          'Bad estimates can choose expensive plans.',
          'query',
        ),
        n(
          'memory',
          'Buffer manager',
          'Reuse database pages in shared memory.',
          'Reads consult shared buffers and the OS page cache before storage.',
          'Memory pressure raises I/O costs.',
          'query',
        ),
        n(
          'storage',
          'Heap & indexes',
          'Find candidate tuples and their data.',
          'Indexes refer to heap tuples; visibility still matters.',
          'More indexes make writes more expensive.',
          'btree',
        ),
        n(
          'mvcc',
          'MVCC & locks',
          'Isolate concurrent transactions.',
          'Snapshots select visible versions; locks coordinate conflicting writes.',
          'Old snapshots retain cleanup work.',
          'mvcc',
        ),
        n(
          'wal',
          'WAL & checkpoints',
          'Recover changes after a crash.',
          'Flush required WAL before the corresponding dirty data pages.',
          'Durability settings affect latency and loss risk.',
          'wal',
        ),
        n(
          'replication',
          'Replication',
          'Maintain standby copies.',
          'Physical standbys receive and replay WAL; logical replication publishes selected changes.',
          'Lag and failover require explicit policies.',
          'replication',
        ),
      ],
      [
        e('client', 'query', 'SQL'),
        e('query', 'memory', 'page request'),
        e('memory', 'storage', 'page read'),
        e('query', 'mvcc', 'visibility'),
        e('query', 'wal', 'write'),
        e('wal', 'replication', 'WAL stream', 'async'),
      ],
      [
        demo('query', 'Follow a query', [
          f('Acquire a connection', 'A bounded pool admits the request.', ['client'], {
            client: '1 connection',
          }),
          f(
            'Plan the lookup',
            'Statistics estimate selectivity before choosing an access path.',
            ['query'],
            { query: 'WHERE user_id = 48291' },
          ),
          f(
            'Read and check visibility',
            'An index locates a tuple; the snapshot decides whether it is visible.',
            ['memory', 'storage', 'mvcc'],
            { storage: 'candidate tuple', mvcc: 'visible to snapshot' },
          ),
          f('Return rows', 'The client receives visible result rows.', ['client'], {
            client: '1 row returned',
          }),
        ]),
      ],
    ),
    layer(
      'query',
      'Query path',
      'A plan is a cost estimate, not a promise about runtime.',
      [
        n(
          'pool',
          'Connection pool',
          'Limit simultaneous server work.',
          'Reuse connections; transaction pooling can constrain session features.',
          'Queueing is preferable to uncontrolled overload.',
        ),
        n(
          'parse',
          'Parser / rewrite',
          'Resolve SQL structure and references.',
          'Build a query tree and expand rules/views.',
          'Prepared plans can become poorly suited to changing parameters.',
        ),
        n(
          'plan',
          'Planner',
          'Choose an estimated low-cost plan.',
          'Statistics compare sequential, index and bitmap scans plus join strategies.',
          'Stale or correlated statistics can misestimate cardinality.',
        ),
        n(
          'execute',
          'Executor',
          'Run plan operators.',
          'Operators produce tuples; spills use temporary storage.',
          'Large sorts and joins consume memory and I/O.',
        ),
        n(
          'buffer',
          'Buffer cache',
          'Keep useful pages resident.',
          'Shared buffers and OS cache absorb repeated reads.',
          'A cold cache exposes storage latency.',
        ),
        n(
          'heap',
          'Index / heap',
          'Retrieve visible tuples.',
          'B-tree supports ordered lookups; GIN, GiST and BRIN serve other access patterns.',
          'Index-only scans still depend on visibility-map state.',
          'btree',
        ),
      ],
      [
        e('pool', 'parse', 'SQL'),
        e('parse', 'plan', 'query tree'),
        e('plan', 'execute', 'plan'),
        e('execute', 'buffer', 'pages'),
        e('buffer', 'heap', 'miss / lookup'),
      ],
      [
        demo('scan', 'Index vs sequential scan', [
          f(
            'Selective lookup',
            'A selective equality predicate can justify an index path.',
            ['plan'],
            { plan: 'estimate: 1 row' },
          ),
          f('Fetch a candidate', 'B-tree traversal locates a tuple reference.', ['heap'], {
            heap: 'few page accesses',
          }),
          f(
            'Broad predicate',
            'For many rows, sequential access can be cheaper than scattered heap fetches.',
            ['plan', 'buffer'],
            { plan: 'estimate: 80% of table', buffer: 'sequential scan' },
          ),
        ]),
      ],
      'overview',
    ),
    layer(
      'mvcc',
      'MVCC',
      'A Repeatable Read example: one snapshot, two physical versions.',
      [
        n(
          'a',
          'Transaction A',
          'Hold a consistent snapshot.',
          'Repeatable Read retains the transaction snapshot.',
          'Long-lived snapshots prevent reclaiming needed versions.',
        ),
        n(
          'b',
          'Transaction B',
          'Update the logical row.',
          'Create a new tuple version and mark the old version updated.',
          'Write conflicts still require locks.',
        ),
        n(
          'old',
          'Tuple v1',
          'Serve older snapshots.',
          'Visibility uses transaction IDs and snapshot information.',
          'Old versions occupy space until safe cleanup.',
        ),
        n(
          'new',
          'Tuple v2',
          'Serve eligible newer snapshots.',
          'Only committed versions visible to the snapshot qualify.',
          'A commit does not change an existing Repeatable Read snapshot.',
        ),
        n(
          'vacuum',
          'Vacuum',
          'Reclaim dead tuple space when safe.',
          'Remove versions no active snapshot needs and maintain visibility metadata.',
          'Autovacuum must keep up with churn.',
        ),
      ],
      [
        e('a', 'old', 'snapshot read'),
        e('b', 'new', 'update'),
        e('old', 'vacuum', 'safe cleanup', 'async'),
      ],
      [
        demo('snapshot', 'Show snapshot visibility', [
          f('A starts', 'A reads v1 under Repeatable Read.', ['a', 'old'], {
            a: 'snapshot S1',
            old: 'v1 visible',
          }),
          f(
            'B commits v2',
            'B writes a new physical tuple version; v1 remains for older snapshots.',
            ['b', 'new'],
            { new: 'v2 committed', old: 'v1 retained' },
          ),
          f(
            'A reads again',
            'A still sees v1; a new Read Committed statement after B commits can see v2.',
            ['a', 'old'],
            { a: 'still S1 → v1', new: 'new snapshot → v2' },
          ),
          f('A ends', 'Vacuum may reclaim v1 once no snapshot needs it.', ['vacuum'], {
            old: 'eligible for cleanup',
            new: 'v2 retained',
          }),
        ]),
      ],
      'overview',
    ),
    layer(
      'wal',
      'WAL & checkpoints',
      'Durability orders log flushes before data-page writes.',
      [
        n(
          'tx',
          'Transaction',
          'Change a row in memory.',
          'Generate WAL records describing changes.',
          'Concurrent writers can contend on hot rows.',
        ),
        n(
          'log',
          'WAL buffer',
          'Collect redo records.',
          'Append ordered records with log sequence numbers.',
          'Logging creates write amplification.',
        ),
        n(
          'disk',
          'Durable WAL',
          'Make recovery possible.',
          'With synchronous_commit=on, local WAL is flushed before normal commit acknowledgement.',
          'Remote durability requires additional replication settings.',
        ),
        n(
          'ack',
          'Commit ACK',
          'Tell the client the transaction committed.',
          'Acknowledgement follows the configured durability boundary.',
          'Asynchronous commit can lose recently acknowledged changes on crash.',
        ),
        n(
          'pages',
          'Dirty pages',
          'Persist updated data later.',
          'Background writing and checkpoints flush pages after their WAL.',
          'Checkpoint bursts can cause I/O pressure.',
        ),
      ],
      [
        e('tx', 'log', 'records'),
        e('log', 'disk', 'flush'),
        e('disk', 'ack', 'commit'),
        e('disk', 'pages', 'WAL-before-data', 'async'),
      ],
      [
        demo('commit', 'Show durable commit', [
          f('Modify buffers', 'The write changes memory and generates WAL.', ['tx', 'log'], {
            log: 'LSN 0/120',
            pages: 'dirty in memory',
          }),
          f('Flush WAL', 'The local commit record reaches durable storage.', ['disk'], {
            disk: 'flushed through 0/120',
          }),
          f('Acknowledge', 'Commit need not wait for every data page to be flushed.', ['ack'], {
            ack: 'COMMIT',
            pages: 'still dirty',
          }),
          f(
            'Checkpoint later',
            'Data pages are written; recovery work from this checkpoint is bounded.',
            ['pages'],
            { pages: 'persisted' },
          ),
        ]),
      ],
      'overview',
    ),
    layer(
      'replication',
      'Read replicas',
      'Receive, flush and replay are distinct positions.',
      [
        n(
          'write',
          'Writer',
          'Commit at the primary.',
          'Application writes go to the writable primary.',
          'Failover requires fencing the previous primary.',
        ),
        n(
          'primary',
          'Primary WAL',
          'Stream committed changes.',
          'WAL sender transmits log records to standbys.',
          'Replication slots can retain WAL until disk fills.',
        ),
        n(
          'receive',
          'Standby receive',
          'Receive and persist WAL.',
          'A receiver stores WAL before replay applies it.',
          'Received bytes do not imply query visibility.',
        ),
        n(
          'replay',
          'Standby replay',
          'Apply WAL to the standby.',
          'The replay position trails receive when application is slow.',
          'Long queries can conflict with replay.',
        ),
        n(
          'read',
          'Reader',
          'Choose a freshness boundary.',
          'Route read-your-writes to primary or gate on a required replay position.',
          'Waiting increases latency; primary reads consume primary capacity.',
        ),
      ],
      [
        e('write', 'primary', 'commit'),
        e('primary', 'receive', 'stream', 'async'),
        e('receive', 'replay', 'replay', 'async'),
        e('replay', 'read', 'replica read'),
        e('primary', 'read', 'fresh-read alternative'),
      ],
      [
        demo(
          'lag',
          'What if replica lags?',
          [
            f(
              'Write v2',
              'Primary acknowledges the commit before an asynchronous standby replays it.',
              ['write', 'primary'],
              { primary: 'v2 · LSN 120', replay: 'v1 · LSN 100' },
            ),
            f(
              'Immediate replica read',
              'The reader sees v1 even though the write succeeded.',
              ['read', 'replay'],
              { read: 'v1 — stale', replay: 'lag: 20 illustrative units' },
            ),
            f(
              'Choose read-your-writes',
              'Read from primary or wait for standby replay to reach LSN 120.',
              ['primary', 'read'],
              { read: 'v2 — required version' },
            ),
            f('Catch up', 'The standby becomes current after replay.', ['replay'], {
              replay: 'v2 · LSN 120',
            }),
          ],
          true,
        ),
      ],
      'overview',
    ),
    layer(
      'btree',
      'B-tree lookup',
      'Search user_id = 48291; comparisons prune the search space.',
      [
        n(
          'key',
          'Search key',
          'Identify an ordered value.',
          'Use an equality or range predicate compatible with the index.',
          'Nonselective predicates may favor a sequential scan.',
        ),
        n(
          'root',
          'Root page',
          'Choose a child range.',
          'Compare 48291 with separator 50000.',
          'High fanout limits tree height.',
        ),
        n(
          'branch',
          'Internal page',
          'Narrow the range.',
          '48291 lies between separators 48000 and 49000.',
          'Page splits add maintenance and WAL work.',
        ),
        n(
          'leaf',
          'Leaf page',
          'Find the index entry.',
          'Locate 48291 and its tuple reference.',
          'Duplicate values can refer to multiple tuples.',
        ),
        n(
          'heap',
          'Heap tuple',
          'Verify tuple visibility.',
          'Fetch the candidate tuple unless an eligible index-only scan can avoid it.',
          'The index lookup alone does not prove snapshot visibility.',
        ),
      ],
      [
        e('key', 'root', '48291'),
        e('root', 'branch', '< 50000'),
        e('branch', 'leaf', '[48000, 49000)'),
        e('leaf', 'heap', 'tuple reference'),
      ],
      [
        demo('lookup', 'Show B-tree lookup', [
          f('Compare at root', '48291 < 50000: choose the lower branch.', ['key', 'root'], {
            root: '48291 < 50000',
          }),
          f('Narrow the range', 'Choose the child covering [48000, 49000).', ['branch'], {
            branch: '48000 ≤ 48291 < 49000',
          }),
          f('Find a leaf entry', 'The leaf supplies the tuple location.', ['leaf'], {
            leaf: '48291 → (page 72, slot 4)',
          }),
          f(
            'Check visibility',
            'O(log n) tree traversal; heap fetches and cache state also affect cost.',
            ['heap'],
            { heap: 'visible row', root: 'O(log n) lookup' },
          ),
        ]),
      ],
      'overview',
    ),
  ],
);

const redis = concept(
  {
    id: 'redis',
    name: 'Redis',
    category: 'Cache / data structure server → implementation',
    summary: 'Route a key, execute a command, and follow its memory and durability boundaries.',
    role: 'Low-latency operations on in-memory data structures.',
    consistencyModel:
      'Primary command execution is traditionally serialized. Replication is asynchronous; failover can lose acknowledged writes. Cluster multi-key operations generally require the same hash slot.',
    scalingStrategies: [
      'Partition keys across Cluster slots; mitigate hot keys separately.',
      'Pipeline commands to reduce round trips; bound big keys, scripts and slow commands.',
    ],
    failureModes: [
      {
        symptom: 'Tail latency rises across many keys.',
        cause: 'A large operation or hot key monopolizes a node.',
        impact: 'Unrelated commands queue behind it.',
        mitigation:
          'Split oversized work, bound scripts, coalesce requests and distribute hot-key reads carefully.',
      },
      {
        symptom: 'A write disappears after promotion.',
        cause: 'The primary failed before async replication caught up.',
        impact: 'Acknowledged state may be lost.',
        mitigation:
          'Choose durability and replication acknowledgements deliberately; WAIT does not make Redis strongly consistent.',
      },
    ],
    tradeoffs: [
      'A cache introduces invalidation, memory cost, and a second freshness boundary.',
      'Persistence and replication reduce different risks; neither makes every failover lossless.',
    ],
    alternatives: [
      'In-process caching avoids a network hop but duplicates state.',
      'Memcached provides a smaller cache-focused feature set.',
    ],
    whenToUse:
      'Repeated expensive reads or atomic data-structure operations justify memory and operational cost.',
    whenNotToUse: 'Do not add a cache before measuring reuse and deciding acceptable staleness.',
    misconceptions: [
      'Redis is not simply “single-threaded”: traditional command execution is serialized, while modern versions use threads for I/O and background work.',
      'Redis Pub/Sub is ephemeral; Streams retain entries and support consumer groups. Neither is merely a cache.',
    ],
    relatedConcepts: ['postgres', 'rate-limiter', 'kafka'],
    sources: [
      {
        title: 'Redis Cluster specification',
        url: 'https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/',
      },
      {
        title: 'Latency and execution model',
        url: 'https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/',
      },
      { title: 'Key eviction', url: 'https://redis.io/docs/latest/develop/reference/eviction/' },
      {
        title: 'Redis persistence',
        url: 'https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/',
      },
    ],
    versionContext:
      'Redis Open Source; command execution and I/O threading depend on version and configuration.',
    implementationNotes:
      'Managed Redis services differ in failover, durability and supported features. These diagrams illustrate OSS concepts, not a provider’s private topology.',
  },
  [
    layer(
      'overview',
      'Redis',
      'A data structure server; caching is one use of it.',
      [
        n(
          'client',
          'Client / RESP',
          'Send structured commands.',
          'RESP encodes requests and responses; pipelining reduces round trips.',
          'Pipelines are not transactions.',
        ),
        n(
          'router',
          'Cluster routing',
          'Send each key to its owner.',
          'CRC16 and optional hash tags map keys into 16,384 slots.',
          'Cross-slot operations are constrained.',
          'routing',
        ),
        n(
          'memory',
          'Memory & commands',
          'Execute operations on resident data.',
          'Strings, hashes, sets, sorted sets and streams serve different access patterns.',
          'Slow commands and scripts delay other work.',
          'memory',
        ),
        n(
          'persistence',
          'Persistence',
          'Recover data after restart.',
          'AOF records writes; RDB captures point-in-time snapshots.',
          'Fsync frequency trades latency against loss exposure.',
          'persistence',
        ),
        n(
          'replication',
          'Replication',
          'Keep a promotable copy.',
          'Primary sends an asynchronous replication stream.',
          'An ACK can precede replica receipt.',
          'replication',
        ),
        n(
          'cache',
          'Cache patterns',
          'Reduce repeated origin work.',
          'Choose an explicit population and invalidation strategy.',
          'Low hit rate can add cost without benefit.',
          'patterns',
        ),
      ],
      [
        e('client', 'router', 'key'),
        e('router', 'memory', 'command'),
        e('memory', 'persistence', 'write', 'async'),
        e('memory', 'replication', 'stream', 'async'),
        e('cache', 'client', 'GET / SET'),
      ],
      [
        demo('hit', 'Cache hit / miss', [
          f('GET profile:42', 'The client asks for a value.', ['client', 'router'], {
            client: 'GET profile:42',
          }),
          f('Cache hit', 'A resident unexpired value returns without the database.', ['memory'], {
            memory: 'HIT → v2',
          }),
          f(
            'Cache miss',
            'If absent, the application loads its source of truth then sets a bounded TTL.',
            ['cache'],
            { cache: 'MISS → origin → SET EX 60' },
          ),
        ]),
      ],
    ),
    layer(
      'routing',
      'Cluster routing',
      'Slots are assigned to primaries; this is not a generic consistent-hash ring.',
      [
        n(
          'key',
          'Client key',
          'Select the partition.',
          'Hash the key or its non-empty {...} tag.',
          'A tag co-locates keys but can create a hotspot.',
        ),
        n(
          'slots',
          'Hash slot map',
          'Locate the owning primary.',
          'CRC16(key) mod 16384; cluster-aware clients cache ownership.',
          'MOVED updates routing; ASK handles migration.',
        ),
        n(
          's1',
          'Shard 1 primary',
          'Own slots 0–5460.',
          'Execute commands for this slot range.',
          'An uneven key workload can saturate one shard.',
        ),
        n(
          's2',
          'Shard 2 primary',
          'Own slots 5461–10922.',
          'The example key maps into this range.',
          'More shards do not split a single hot key.',
        ),
        n(
          's3',
          'Shard 3 primary',
          'Own slots 10923–16383.',
          'Serve an independent subset of keys.',
          'Resharding moves slots and consumes bandwidth.',
        ),
        n(
          'replica',
          'Shard 2 replica',
          'Copy shard 2 asynchronously.',
          'Receive the primary replication stream.',
          'Replica reads may be stale.',
        ),
      ],
      [
        e('key', 'slots', 'CRC16'),
        e('slots', 's1', '0–5460'),
        e('slots', 's2', '5461–10922'),
        e('slots', 's3', '10923–16383'),
        e('s2', 'replica', 'replicate', 'async'),
      ],
      [
        demo('slot', 'Show slot routing', [
          f('Hash the key', 'CRC16("foo") mod 16384 = 12182.', ['key', 'slots'], {
            key: 'foo',
            slots: 'slot 12182',
          }),
          f('Choose the owner', '12182 is in the third primary’s assigned range.', ['s3'], {
            s3: 'owner of slot 12182',
            s1: 'not involved',
            s2: 'not involved',
          }),
          f(
            'Execute on owner',
            'The client sends the command directly; stale maps receive a redirect.',
            ['s3', 'key'],
            { key: 'GET foo → Shard 3', s3: 'command executed' },
          ),
        ]),
      ],
      'overview',
    ),
    layer(
      'memory',
      'Memory & eviction',
      'Expiration removes stale keys; eviction manages the memory budget.',
      [
        n(
          'budget',
          'Memory budget',
          'Bound resident data.',
          'maxmemory and policy govern admission under pressure.',
          'Fragmentation and buffers add overhead.',
        ),
        n(
          'a',
          'Key A',
          'A recently used key.',
          'Access metadata informs approximate LRU.',
          'Recent does not imply frequent.',
        ),
        n(
          'b',
          'Key B',
          'A frequently used key.',
          'LFU tracks approximate frequency with decay.',
          'Historical popularity may outlive demand.',
        ),
        n(
          'c',
          'Key C',
          'An old, rarely used key.',
          'A sampled eviction candidate under applicable policy.',
          'Redis approximates LRU/LFU; it does not sort every key globally.',
        ),
        n(
          'ttl',
          'Expiration',
          'Make values unavailable after TTL.',
          'Passive access checks and active expiry reclaim expired keys.',
          'TTL expiry is not a substitute for all invalidation.',
        ),
      ],
      [
        e('budget', 'a', 'sample'),
        e('budget', 'b', 'sample'),
        e('budget', 'c', 'sample'),
        e('ttl', 'budget', 'reclaim', 'async'),
      ],
      [
        demo('lru', 'Show LRU eviction', [
          f('Memory pressure', 'A new key would exceed the memory budget.', ['budget'], {
            budget: '100 / 100 illustrative units',
            a: 'used 1s ago',
            b: 'used 8s ago',
            c: 'used 90s ago',
          }),
          f(
            'Sample candidates',
            'Approximate LRU chooses an older candidate from its sample.',
            ['c'],
            { c: 'eviction candidate' },
          ),
          f(
            'Admit new data',
            'Eviction frees memory; the evicted value will miss next time.',
            ['budget', 'c'],
            { c: 'evicted', budget: 'space for new key' },
          ),
        ]),
        demo('lfu', 'Show LFU eviction', [
          f(
            'Compare popularity',
            'Frequency decays so old popularity does not persist forever.',
            ['a', 'b', 'c'],
            { a: '2 recent hits', b: '80 recent hits', c: '1 recent hit' },
          ),
          f(
            'Evict low frequency',
            'The approximate LFU policy favors retaining frequently used values.',
            ['c'],
            { c: 'evicted', b: 'retained' },
          ),
        ]),
      ],
      'overview',
    ),
    layer(
      'persistence',
      'Persistence',
      'AOF and snapshots offer different recovery points.',
      [
        n(
          'cmd',
          'Write command',
          'Modify in-memory state.',
          'An accepted command changes the dataset.',
          'Memory alone is lost on restart.',
        ),
        n(
          'aof',
          'AOF buffer',
          'Record write operations.',
          'Append operations for later replay.',
          'A growing log needs rewrite work.',
        ),
        n(
          'sync',
          'AOF fsync',
          'Set a local durability boundary.',
          'always, everysec and OS-managed flushing differ.',
          'everysec can lose roughly the latest second; delays can extend exposure.',
        ),
        n(
          'rdb',
          'RDB snapshot',
          'Capture a point-in-time dataset.',
          'Background snapshotting uses fork and copy-on-write.',
          'Fork pauses and copy-on-write memory cost matter.',
        ),
        n(
          'restart',
          'Recovery',
          'Reconstruct the dataset.',
          'Load the configured persistence data.',
          'Recovery time grows with dataset and replay volume.',
        ),
      ],
      [
        e('cmd', 'aof', 'append'),
        e('aof', 'sync', 'flush', 'async'),
        e('cmd', 'rdb', 'snapshot', 'async'),
        e('sync', 'restart', 'replay'),
        e('rdb', 'restart', 'load'),
      ],
      [
        demo('aof', 'Show persistence boundary', [
          f(
            'Command completes',
            'Data is in memory; an everysec policy can acknowledge before fsync.',
            ['cmd', 'aof'],
            { cmd: 'SET x 2 → OK', aof: 'buffered' },
          ),
          f('Flush later', 'The local persistence boundary advances.', ['sync'], {
            sync: 'fsync complete',
          }),
          f(
            'Restart',
            'Recovery rebuilds state up to the available persisted records.',
            ['restart'],
            { restart: 'x = 2 if record persisted' },
          ),
        ]),
      ],
      'overview',
    ),
    layer(
      'replication',
      'Replication & failover',
      'Promotion changes ownership, but cannot recreate missing writes.',
      [
        n(
          'client',
          'Client',
          'Write to a primary.',
          'Cluster-aware routing follows ownership changes.',
          'Retries need operation-aware handling.',
        ),
        n(
          'primary',
          'Primary',
          'Execute and stream writes.',
          'Replication is asynchronous by default.',
          'Acknowledged writes can be absent on replicas.',
        ),
        n(
          'replica',
          'Replica',
          'Maintain a promotable copy.',
          'Apply the received replication stream.',
          'Eligibility and replication freshness affect promotion.',
        ),
        n(
          'votes',
          'Cluster majority',
          'Authorize a failover.',
          'Eligible replicas seek votes from primary nodes.',
          'A minority cannot safely assume ownership.',
          'routing',
          'control',
        ),
        n(
          'route',
          'New slot owner',
          'Resume requests after promotion.',
          'Clients refresh their slot map.',
          'Availability pauses and write loss remain possible.',
        ),
      ],
      [
        e('client', 'primary', 'write'),
        e('primary', 'replica', 'async copy', 'async'),
        e('votes', 'replica', 'authorize', 'control'),
        e('replica', 'route', 'promote', 'control'),
        e('client', 'route', 'retry'),
      ],
      [
        demo(
          'fail',
          'Kill primary',
          [
            f('Write acknowledged', 'Primary has v2 while replica still has v1.', ['primary'], {
              primary: 'v2 → ACK',
              replica: 'v1',
            }),
            f(
              'Primary fails',
              'The last write had not reached the replica.',
              ['primary'],
              { primary: 'unreachable', replica: 'v1' },
              ['primary'],
            ),
            f(
              'Eligible replica wins votes',
              'A reachable majority can authorize promotion; this is not instantaneous.',
              ['votes', 'replica'],
              { replica: 'promoted with v1' },
              ['primary'],
            ),
            f(
              'Client reroutes',
              'Service resumes, but the acknowledged v2 may be lost.',
              ['client', 'route'],
              { route: 'new owner → v1', client: 'refresh slot map' },
              ['primary'],
            ),
          ],
          true,
        ),
      ],
      'overview',
    ),
    layer(
      'patterns',
      'Cache patterns',
      'The application owns the consistency contract.',
      [
        n(
          'app',
          'Application',
          'Choose the read/write policy.',
          'Cache-aside loads on misses; read-through delegates loading to a cache abstraction.',
          'Multiple writers complicate invalidation.',
        ),
        n(
          'cache',
          'Cache',
          'Reuse bounded-staleness values.',
          'TTL, invalidation and refresh-ahead bound reuse.',
          'Expiry storms can synchronize misses.',
        ),
        n(
          'db',
          'Source of truth',
          'Keep authoritative records.',
          'Write-through updates the origin before acknowledging its chosen boundary.',
          'Write-through adds origin latency.',
        ),
        n(
          'pending',
          'Write-behind buffer',
          'Defer origin persistence.',
          'Coalesce or queue writes for later storage.',
          'Buffer loss can lose acknowledged writes.',
        ),
        n(
          'coalesce',
          'Request coalescing',
          'Collapse simultaneous misses.',
          'One loader fills the key while others wait or serve permitted stale data.',
          'Coordination needs timeouts and failure recovery.',
        ),
      ],
      [
        e('app', 'cache', 'lookup'),
        e('cache', 'coalesce', 'miss'),
        e('coalesce', 'db', 'load'),
        e('db', 'cache', 'fill'),
        e('cache', 'pending', 'write behind', 'async'),
        e('pending', 'db', 'persist', 'async'),
      ],
      [
        demo('miss', 'What if the cache misses?', [
          f('Simultaneous miss', 'Many callers need the same expired key.', ['app', 'cache'], {
            app: '100 readers',
            cache: 'MISS',
          }),
          f(
            'Coalesce work',
            'One loader reads the origin; jittered expiry avoids synchronized reloads.',
            ['coalesce', 'db'],
            { coalesce: '1 loader · 99 waiters', db: '1 lookup' },
          ),
          f(
            'Fill and release',
            'All waiters receive the loaded value under the stated freshness policy.',
            ['cache', 'app'],
            { cache: 'v2 · TTL 60s', app: '100 responses' },
          ),
        ]),
      ],
      'overview',
    ),
  ],
);

const kafka = concept(
  {
    id: 'kafka',
    name: 'Kafka',
    category: 'Event streaming → implementation',
    summary: 'An ordered log per partition, shared by independent consumer groups.',
    role: 'Retain and replay events while decoupling producers from consumers.',
    consistencyModel:
      'Ordering is per partition. acks=all waits for the current ISR, subject to min.insync.replicas. Transactions can atomically commit Kafka output and offsets; external effects require their own coordination.',
    scalingStrategies: [
      'Increase partitions for parallelism, considering ordering and rebalance cost.',
      'Batch and compress producer records; monitor per-partition throughput and consumer lag.',
    ],
    failureModes: [
      {
        symptom: 'Lag grows on one partition.',
        cause: 'Its consumer stalls or receives a hot-key workload.',
        impact: 'Events wait even if other consumers are idle.',
        mitigation:
          'Fix processing capacity, key distribution and downstream limits; more consumers than partitions cannot help.',
      },
      {
        symptom: 'Writes fail after broker loss.',
        cause: 'Too few in-sync replicas remain for the configured minimum.',
        impact: 'Availability is reduced to protect the requested durability boundary.',
        mitigation: 'Restore replica health and capacity; do not casually weaken acknowledgements.',
      },
    ],
    tradeoffs: [
      'Replay and retention consume storage; ordering is not global.',
      'Partition count affects concurrency, metadata overhead and key placement.',
    ],
    alternatives: [
      'RabbitMQ emphasizes exchange-based routing and acknowledgements.',
      'SQS is a managed work-queue abstraction with different ordering and delivery choices.',
    ],
    whenToUse: 'Independent consumers need durable replay, streams, and partitioned throughput.',
    whenNotToUse:
      'A simple synchronous action or small work queue may not justify a streaming platform.',
    misconceptions: [
      'Kafka is not simply a queue: consumers track positions in a retained log.',
      'Idempotent producers prevent certain retry duplicates in Kafka, not duplicate business effects in arbitrary external systems.',
    ],
    relatedConcepts: ['queue', 'redis', 'multi-region'],
    sources: [
      { title: 'Kafka 4.1 design', url: 'https://kafka.apache.org/41/design/design/' },
      { title: 'KRaft controller quorum', url: 'https://kafka.apache.org/41/operations/kraft/' },
      {
        title: 'Producer configuration',
        url: 'https://kafka.apache.org/41/configuration/producer-configs/',
      },
    ],
    versionContext: 'Kafka 4.x KRaft architecture; older ZooKeeper deployments differ.',
    implementationNotes:
      'Schema Registry is a separate schema-management component, not the partition log. Managed offerings add operational responsibilities and constraints.',
  },
  [
    layer(
      'overview',
      'Kafka',
      'Data flows through brokers; KRaft manages cluster metadata.',
      [
        n(
          'producer',
          'Producer',
          'Append events.',
          'Batch and optionally compress records.',
          'Buffering trades latency for throughput.',
        ),
        n(
          'partitioner',
          'Partitioner',
          'Choose a topic partition.',
          'Keys typically determine placement; custom partitioners can differ.',
          'Hot keys create hot partitions.',
          'partitions',
        ),
        n(
          'log',
          'Partition log',
          'Retain ordered records.',
          'Each partition has an ordered sequence of offsets.',
          'There is no order across all partitions.',
          'partitions',
        ),
        n(
          'replicas',
          'ISR / replicas',
          'Copy partition data.',
          'Followers replicate the leader; ISR tracks eligible in-sync replicas.',
          'A lagging replica can leave the ISR.',
          'replication',
        ),
        n(
          'consumers',
          'Consumer groups',
          'Read independently.',
          'Within a group, a partition is assigned to at most one active consumer.',
          'Useful group parallelism is bounded by partition count.',
          'consumers',
        ),
        n(
          'controller',
          'KRaft controllers',
          'Manage metadata.',
          'A controller quorum replicates metadata using Raft.',
          'This quorum is distinct from each partition’s ISR.',
          'replication',
          'control',
        ),
      ],
      [
        e('producer', 'partitioner', 'record'),
        e('partitioner', 'log', 'append'),
        e('log', 'replicas', 'replicate', 'async'),
        e('log', 'consumers', 'fetch'),
        e('controller', 'log', 'leadership metadata', 'control'),
      ],
      [
        demo('append', 'Follow an event', [
          f('Producer batches', 'Several records share a network request.', ['producer'], {
            producer: 'key=user42 · event=updated',
          }),
          f(
            'Choose partition',
            'The teaching partitioner maps this key to P1.',
            ['partitioner', 'log'],
            { log: 'P1 · offset 42' },
          ),
          f(
            'Replicate and acknowledge',
            'acks=all waits for ISR replication and requires the configured minimum ISR.',
            ['replicas'],
            { replicas: 'ISR caught up' },
          ),
          f(
            'Groups fetch independently',
            'Offsets belong to each group, not a global dequeue pointer.',
            ['consumers'],
            { consumers: 'Group A: 43 · Group B: 39' },
          ),
        ]),
      ],
    ),
    layer(
      'partitions',
      'Partitions & offsets',
      'An offset is a position inside one partition.',
      [
        n(
          'producer',
          'Producer key',
          'Keep related records together.',
          'A stable key and partitioner select a partition.',
          'Changing partition count can change key placement.',
        ),
        n(
          'p0',
          'Partition 0',
          'Independent ordered log.',
          'Append records at increasing offsets.',
          'No relative ordering with P1 or P2.',
        ),
        n(
          'p1',
          'Partition 1',
          'Own the example key.',
          'Append user42 at illustrative offset 42.',
          'Offset sequences can have gaps after compaction.',
        ),
        n(
          'p2',
          'Partition 2',
          'Another concurrency lane.',
          'Serve different key ranges or hashes.',
          'Poor key distribution wastes capacity.',
        ),
        n(
          'retention',
          'Retention / compaction',
          'Bound retained history.',
          'Time/size retention deletes segments; compaction eventually retains latest values per key.',
          'Compaction is not immediate and tombstones have retention rules.',
        ),
      ],
      [
        e('producer', 'p0', 'route'),
        e('producer', 'p1', 'user42'),
        e('producer', 'p2', 'route'),
        e('p1', 'retention', 'segment lifecycle', 'async'),
      ],
      [
        demo('route', 'Show partition routing', [
          f('Stable key', 'The example partitioner selects P1.', ['producer'], {
            producer: 'user42 → P1',
          }),
          f('Append', 'The leader appends at the next offset for P1.', ['p1'], {
            p0: '… 17, 18',
            p1: '… 40, 41, 42',
            p2: '… 80, 81',
          }),
          f(
            'A second record',
            'The same key keeps its partition while mapping remains unchanged.',
            ['p1'],
            { p1: '… 41, 42, 43' },
          ),
          f('Retain for replay', 'Reading does not remove the record.', ['retention'], {
            retention: 'retention policy decides deletion',
          }),
        ]),
      ],
      'overview',
    ),
    layer(
      'consumers',
      'Consumer groups',
      'Three partitions mean at most three useful consumers in this group.',
      [
        n(
          'p0',
          'P0',
          'A separate log.',
          'Its assigned consumer fetches in offset order.',
          'Processing must preserve required order.',
        ),
        n(
          'p1',
          'P1',
          'The busy partition.',
          'Records remain retained while its consumer is paused.',
          'Lag is a position gap, not necessarily elapsed time.',
        ),
        n(
          'p2',
          'P2',
          'An independent log.',
          'Another consumer can progress independently.',
          'One healthy partition does not clear another’s backlog.',
        ),
        n(
          'a',
          'Consumer A',
          'Read P0.',
          'Commit the next position after processing.',
          'Crash before commit can replay processed records.',
        ),
        n(
          'b',
          'Consumer B',
          'Read P1.',
          'Processing pace must match incoming work.',
          'A stalled downstream dependency increases lag.',
        ),
        n(
          'c',
          'Consumer C',
          'Read P2.',
          'Own a partition assignment in Group A.',
          'Rebalances move assignments and may interrupt progress.',
        ),
        n(
          'extra',
          'Consumer D',
          'Wait for an assignment.',
          'With all three partitions assigned, the extra group member is idle.',
          'Adding consumers alone cannot split a partition.',
        ),
      ],
      [e('p0', 'a', 'Group A'), e('p1', 'b', 'Group A'), e('p2', 'c', 'Group A')],
      [
        demo(
          'lag',
          'Pause a consumer',
          [
            f('Balanced group', 'Three consumers each own a partition.', ['a', 'b', 'c'], {
              a: 'P0 → next 101',
              b: 'P1 → next 101',
              c: 'P2 → next 101',
              extra: 'idle',
            }),
            f(
              'B stops processing',
              'P1 advances while B stays at offset 101.',
              ['p1', 'b'],
              { p1: 'log end: 121', b: 'next: 101 · lag: 20' },
              ['b'],
            ),
            f(
              'Add consumer D',
              'Four consumers cannot create a fourth partition. A rebalance may transfer P1, but one member remains idle.',
              ['extra'],
              { extra: 'no extra partition', b: 'processing bottleneck remains' },
            ),
            f(
              'Recover processing',
              'After fixing the blocker, P1 drains; commit after processing to avoid skipping work.',
              ['b'],
              { b: 'next: 121 · lag: 0' },
            ),
          ],
          true,
        ),
      ],
      'overview',
    ),
    layer(
      'replication',
      'ISR & KRaft',
      'Partition replication and metadata consensus solve different problems.',
      [
        n(
          'leader',
          'Partition leader',
          'Accept writes and serve the log.',
          'Followers fetch from this broker.',
          'Leader loss requires an eligible replacement.',
        ),
        n(
          'r1',
          'In-sync replica A',
          'Keep up with the leader.',
          'Membership reflects replication progress under configured criteria.',
          'ISR membership can change.',
        ),
        n(
          'r2',
          'In-sync replica B',
          'Another eligible copy.',
          'acks=all waits for current ISR acknowledgements.',
          'min.insync.replicas gates acceptance; it is not the replication factor.',
        ),
        n(
          'producer',
          'Producer ACK',
          'Observe the durability boundary.',
          'Retries plus idempotence reduce duplicate log appends.',
          'External effects still need idempotency or transactions.',
        ),
        n(
          'quorum',
          'KRaft quorum',
          'Agree on cluster metadata.',
          'Controllers maintain a Raft metadata log and elect an active controller.',
          'Controller majority is separate from data-partition ISR.',
          'raft',
          'control',
        ),
      ],
      [
        e('leader', 'r1', 'replicate', 'async'),
        e('leader', 'r2', 'replicate', 'async'),
        e('r1', 'producer', 'acks=all'),
        e('r2', 'producer', 'acks=all'),
        e('quorum', 'leader', 'leadership', 'control'),
      ],
      [
        demo(
          'broker',
          'Lose the leader',
          [
            f(
              'Healthy ISR',
              'Three replicas are in sync; min.insync.replicas is two.',
              ['leader', 'r1', 'r2'],
              { leader: 'ISR={L,A,B}', producer: 'acks=all' },
            ),
            f(
              'Leader fails',
              'A controller chooses an eligible new leader under the configured policy.',
              ['quorum', 'leader'],
              { leader: 'unreachable' },
              ['leader'],
            ),
            f(
              'Follower promoted',
              'Two in-sync copies remain, so writes can meet this example minimum.',
              ['r1', 'r2'],
              { r1: 'new leader', producer: 'metadata refresh + retry' },
              ['leader'],
            ),
            f(
              'Another replica fails',
              'With only one in sync, min ISR two rejects writes. Durability policy reduces availability.',
              ['producer', 'r2'],
              { producer: 'not enough replicas' },
              ['leader', 'r2'],
            ),
          ],
          true,
        ),
      ],
      'overview',
    ),
  ],
);
export const coreConcepts = { postgres, redis, kafka };
