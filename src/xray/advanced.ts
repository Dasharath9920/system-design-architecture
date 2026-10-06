import { demo, edge as e, frame as f, layer, node as n } from './builders';
import type { XRayLayer } from './types';

export const advancedLayers: Record<string, XRayLayer[]> = {
  postgres: [
    layer(
      'indexes',
      'Choosing an index',
      'An index is an access method with a specific query contract.',
      [
        n(
          'btree',
          'B-tree',
          'Equality, ranges and ordered output.',
          'Traverse ordered pages to candidate tuple references.',
          'Write amplification and random heap fetches can outweigh a broad scan.',
          'btree',
        ),
        n(
          'hash',
          'Hash index',
          'Equality comparisons.',
          'Map hash codes to candidate tuples and recheck collisions.',
          'It cannot provide range order.',
        ),
        n(
          'gin',
          'GIN',
          'Values containing many searchable elements.',
          'Inverted entries connect array elements or lexemes to matching tuples.',
          'Many entries per value can make updates expensive.',
        ),
        n(
          'gist',
          'GiST',
          'Extensible search strategies.',
          'Operator classes define behavior such as spatial bounding-box search.',
          'Performance and semantics depend on the operator class.',
        ),
        n(
          'brin',
          'BRIN',
          'Summarize physically correlated ranges.',
          'Block-range summaries skip ranges that cannot match.',
          'Lossy summaries require rechecks and work poorly on uncorrelated data.',
        ),
      ],
      [],
      [
        demo('choose', 'Match query to index', [
          f(
            'Ordered lookup',
            'A user_id range can use a B-tree; an equality-only hash index cannot supply ordered range results.',
            ['btree'],
            { btree: 'WHERE user_id BETWEEN 10 AND 20' },
          ),
          f(
            'Contained elements',
            'An array containment or text-search workload may use an appropriate GIN operator class.',
            ['gin'],
            { gin: 'tags contains "database"' },
          ),
          f(
            'Spatial predicate',
            'An appropriate GiST operator class can support overlap or nearest-neighbor search.',
            ['gist'],
            { gist: 'nearby geometry candidates' },
          ),
          f(
            'Time-correlated storage',
            'BRIN can cheaply skip block ranges whose summaries exclude the requested time interval.',
            ['brin'],
            { brin: 'skip 90 of 100 illustrative ranges' },
          ),
        ]),
      ],
      'overview',
    ),
    layer(
      'locks',
      'Locks & deadlocks',
      'MVCC reduces read/write blocking; conflicting writers still coordinate.',
      [
        n(
          'a',
          'Transaction A',
          'Update two records.',
          'A locks X before requesting Y.',
          'A different lock order can create a cycle.',
        ),
        n(
          'x',
          'Row X',
          'Protect a conflicting update.',
          'One transaction holds the relevant row lock.',
          'Other writers may wait.',
        ),
        n(
          'b',
          'Transaction B',
          'Update the same records.',
          'B locks Y before requesting X.',
          'Transactions should acquire locks in a consistent order.',
        ),
        n(
          'y',
          'Row Y',
          'Coordinate updates to Y.',
          'A second lock completes the cycle.',
          'Long transactions hold contention longer.',
        ),
        n(
          'detector',
          'Deadlock detector',
          'Break a cyclic wait.',
          'Detect a deadlock and abort one transaction.',
          'The application must handle errors and retry a whole transaction safely.',
        ),
      ],
      [
        e('a', 'x', 'holds'),
        e('b', 'y', 'holds'),
        e('a', 'y', 'waits'),
        e('b', 'x', 'waits'),
        e('detector', 'b', 'abort one victim', 'control'),
      ],
      [
        demo(
          'deadlock',
          'Create a deadlock',
          [
            f('Different lock order', 'A locks X; B locks Y.', ['a', 'b'], {
              x: 'owned by A',
              y: 'owned by B',
            }),
            f('Cyclic wait', 'A needs Y and B needs X; neither can finish.', ['x', 'y'], {
              a: 'waiting for B',
              b: 'waiting for A',
            }),
            f(
              'Abort a victim',
              'The detector aborts one transaction. The surviving transaction can progress.',
              ['detector'],
              { b: 'aborted (illustrative victim)', a: 'can acquire Y' },
              ['b'],
            ),
            f(
              'Avoid repeat cycles',
              'Use consistent lock ordering and short transactions; retry with a bounded policy.',
              ['a'],
              { a: 'commit' },
            ),
          ],
          true,
        ),
      ],
      'mvcc',
    ),
  ],
  redis: [
    layer(
      'execution',
      'Commands & scripting',
      'Serialization gives atomic command boundaries, not unlimited execution capacity.',
      [
        n(
          'resp',
          'RESP / I/O',
          'Move commands across connections.',
          'Modern Redis versions can use I/O threads alongside background tasks.',
          'Version and configuration determine which work is threaded.',
        ),
        n(
          'loop',
          'Command execution',
          'Execute commands serially in the traditional main-thread model.',
          'The event loop dispatches commands against resident structures.',
          'A slow command or script delays unrelated clients.',
        ),
        n(
          'pipeline',
          'Pipeline',
          'Amortize network round trips.',
          'Send several commands without waiting after each one.',
          'Pipelining does not make the group atomic.',
        ),
        n(
          'transaction',
          'MULTI / EXEC',
          'Execute a queued group without interleaving.',
          'WATCH can provide optimistic checks before EXEC.',
          'Runtime command errors do not roll back already executed commands.',
        ),
        n(
          'script',
          'Lua / functions',
          'Run a server-side operation.',
          'A script/function can atomically combine supported Redis operations.',
          'Bound execution work and respect cluster key-slot constraints.',
        ),
      ],
      [
        e('resp', 'loop', 'dispatch'),
        e('pipeline', 'resp', 'batch'),
        e('transaction', 'loop', 'EXEC'),
        e('script', 'loop', 'execute'),
      ],
      [
        demo('pipeline', 'Pipeline vs transaction', [
          f(
            'Send a pipeline',
            'Three commands share fewer round trips; the network optimization alone promises no transaction boundary.',
            ['pipeline', 'resp'],
            { pipeline: 'GET A · INCR B · GET C' },
          ),
          f(
            'Execute commands',
            'Commands use the server’s execution model; expensive work can queue other callers.',
            ['loop'],
            { loop: 'serialized command work' },
          ),
          f(
            'Need atomic composition?',
            'Use suitable transaction or scripting semantics, and understand their error behavior.',
            ['transaction', 'script'],
            { transaction: 'queued commands run at EXEC', script: 'bounded atomic operation' },
          ),
        ]),
      ],
      'overview',
    ),
    layer(
      'streams',
      'Pub/Sub & Streams',
      'Transient broadcasting and retained event processing are different contracts.',
      [
        n(
          'publisher',
          'Publisher',
          'Produce an application message.',
          'Choose a channel broadcast or a stream append.',
          'A publisher must decide whether replay is required.',
        ),
        n(
          'pubsub',
          'Pub/Sub channel',
          'Deliver to current subscribers.',
          'Messages are not retained for disconnected subscribers.',
          'Redis Pub/Sub uses at-most-once delivery semantics.',
        ),
        n(
          'stream',
          'Stream',
          'Retain entries with IDs.',
          'XADD appends; trimming policies bound retained history.',
          'Retention and pending entries need operational care.',
        ),
        n(
          'group',
          'Consumer group',
          'Distribute stream work.',
          'Track pending deliveries and acknowledge with XACK.',
          'A failed consumer can leave pending entries needing reclaim.',
        ),
        n(
          'subscriber',
          'Application',
          'Process a delivery.',
          'Use idempotent effects when entries can be retried.',
          'ACK is a processing boundary chosen by the application.',
        ),
      ],
      [
        e('publisher', 'pubsub', 'publish', 'async'),
        e('publisher', 'stream', 'XADD', 'async'),
        e('pubsub', 'subscriber', 'live delivery', 'async'),
        e('stream', 'group', 'read', 'async'),
        e('group', 'subscriber', 'deliver', 'async'),
      ],
      [
        demo(
          'disconnect',
          'Disconnect a consumer',
          [
            f(
              'Consumer offline',
              'A channel broadcast has no replay log for this subscriber.',
              ['pubsub'],
              { pubsub: 'broadcast missed', subscriber: 'offline' },
              ['subscriber'],
            ),
            f(
              'Append to a stream',
              'The stream retains the entry subject to its trimming policy.',
              ['stream'],
              { stream: 'entry 42 retained' },
            ),
            f(
              'Resume stream work',
              'The group can process retained or reclaimed pending work; effects must tolerate repeats.',
              ['group', 'subscriber'],
              { subscriber: 'process entry 42 → XACK' },
            ),
          ],
          true,
        ),
      ],
      'overview',
    ),
  ],
  kafka: [
    layer(
      'transactions',
      'Processing semantics',
      'Kafka transactions can coordinate Kafka records and offsets; external effects need another boundary.',
      [
        n(
          'input',
          'Input partition',
          'Supply a retained record.',
          'The consumer reads offset 42.',
          'Delivery can repeat after failure.',
        ),
        n(
          'processor',
          'Processor',
          'Compute an output.',
          'Begin a transaction using a properly configured producer.',
          'Transaction timeout and identity management matter.',
        ),
        n(
          'output',
          'Output partition',
          'Receive transactional records.',
          'Records remain uncommitted until the transaction completes.',
          'read_uncommitted readers can observe records that later abort.',
        ),
        n(
          'offset',
          'Group offset',
          'Record consumed progress.',
          'Send the consumed next-offset into the same transaction.',
          'Committing it separately can create a loss or duplication gap.',
        ),
        n(
          'external',
          'External effect',
          'Update another system.',
          'A separate database or payment effect is outside this Kafka transaction.',
          'Use its own idempotency or transactional coordination.',
        ),
      ],
      [
        e('input', 'processor', 'offset 42'),
        e('processor', 'output', 'transactional write'),
        e('processor', 'offset', 'next offset 43'),
        e('processor', 'external', 'separate boundary'),
      ],
      [
        demo('atomic', 'Commit output and offset', [
          f(
            'Read input',
            'The processor reads offset 42 and starts a transaction.',
            ['input', 'processor'],
            { input: 'offset 42', processor: 'transaction open' },
          ),
          f(
            'Stage both changes',
            'The output record and next group offset participate in one Kafka transaction.',
            ['output', 'offset'],
            { output: 'uncommitted', offset: '43 staged' },
          ),
          f(
            'Commit',
            'read_committed consumers can read the committed output; the group offset advances atomically with it.',
            ['output', 'offset'],
            { output: 'committed', offset: '43 committed' },
          ),
          f(
            'Respect external boundaries',
            'A payment API is not covered by this commit. Repeating input must not charge twice.',
            ['external'],
            { external: 'separate idempotency key required' },
          ),
        ]),
      ],
      'overview',
    ),
  ],
};

const references: Record<string, [string, string][]> = {
  indexes: [['PostgreSQL index types', 'https://www.postgresql.org/docs/18/indexes-types.html']],
  locks: [
    ['PostgreSQL explicit locking', 'https://www.postgresql.org/docs/18/explicit-locking.html'],
  ],
  execution: [
    ['Redis transactions', 'https://redis.io/docs/latest/develop/using-commands/transactions/'],
    [
      'Redis execution latency',
      'https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/',
    ],
  ],
  streams: [
    ['Redis Pub/Sub', 'https://redis.io/docs/latest/develop/pubsub/'],
    ['Redis Streams', 'https://redis.io/docs/latest/develop/data-types/streams/'],
  ],
  transactions: [['Kafka delivery semantics', 'https://kafka.apache.org/41/design/design/']],
};
for (const layers of Object.values(advancedLayers))
  for (const item of layers)
    item.sources = (references[item.id] || []).map(([title, url]) => ({ title, url }));
