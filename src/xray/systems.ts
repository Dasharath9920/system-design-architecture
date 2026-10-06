import { concept, demo, edge as e, frame as f, layer, node as n } from './builders';
import type { XRayConcept, XRayLayer } from './types';

type SystemSpec = {
  id: string;
  name: string;
  category: string;
  topic: string;
  summary: string;
  consistency: string;
  scale: string;
  cost: string;
  avoid: string;
  alternative: string;
  misconception: string;
  failure: [string, string, string, string];
  source: [string, string];
  scope: string;
  related: string[];
  graph: XRayLayer;
};
const specs: SystemSpec[] = [
  {
    id: 'load-balancer',
    name: 'Load Balancer',
    category: 'Traffic distribution',
    topic: 'routing',
    summary: 'Choose a healthy target for each connection or request.',
    consistency:
      'Health state is an observation with detection delay; it is not a proof that the next request will succeed.',
    scale:
      'Scale the balancer and backends independently; externalize sessions before relying on redistribution.',
    cost: 'Extra hops, connection state and imperfect health signals.',
    avoid:
      'A single small service may need only a simple reverse proxy; do not add global routing without a regional requirement.',
    alternative:
      'DNS routing chooses addresses; a reverse proxy mediates requests; an API gateway adds API policies.',
    misconception:
      'L4 typically routes transport connections; L7 can inspect application requests. TLS termination and supported algorithms vary.',
    failure: [
      'Requests fail on one instance.',
      'A backend crashed before health detection converged.',
      'Some in-flight work fails.',
      'Remove it after thresholds, drain healthy removals, and retry only safe operations.',
    ],
    source: [
      'AWS ALB as an L7 example',
      'https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html',
    ],
    scope:
      'Generic model; provider fail-open behavior and protocol support vary. The demo assumes two healthy targets remain.',
    related: ['gateway', 'dns', 'multi-region'],
    graph: layer(
      'routing',
      'Routing & health',
      'Routing decisions and health checks run on different paths.',
      [
        n(
          'client',
          'Client',
          'Send a request.',
          'Connect to the balancer address.',
          'Long-lived connections can skew load.',
        ),
        n(
          'router',
          'Router',
          'Pick an eligible target.',
          'Round robin cycles; least connections observes active connections; weights express capacity.',
          'Connection count is only a proxy for work.',
          'consistent-hashing',
        ),
        n(
          'a',
          'Instance A',
          'Serve work.',
          'Keep request handlers and readiness responsive.',
          'A live process can still be unable to serve.',
        ),
        n(
          'b',
          'Instance B',
          'Serve independent work.',
          'Accept requests when eligible.',
          'Sticky sessions limit redistribution.',
        ),
        n(
          'c',
          'Instance C',
          'Provide spare capacity.',
          'Share the workload after failures.',
          'Survivors need enough capacity.',
        ),
        n(
          'health',
          'Health checks',
          'Maintain an eligible set.',
          'Thresholded probes remove failed targets; draining lets in-flight work finish.',
          'Probes introduce detection delay.',
          undefined,
          'control',
        ),
      ],
      [
        e('client', 'router', 'request'),
        e('router', 'a', 'route'),
        e('router', 'b', 'route'),
        e('router', 'c', 'route'),
        e('health', 'router', 'eligible set', 'control'),
      ],
      [
        demo('rr', 'Round robin', [
          f('Request 1', 'The next eligible target is A.', ['router', 'a'], { a: 'request 1' }),
          f('Request 2', 'Advance to B.', ['router', 'b'], { b: 'request 2' }),
          f(
            'Request 3',
            'Advance to C. Equal requests need not cost equal work.',
            ['router', 'c'],
            { c: 'request 3' },
          ),
        ]),
        demo('least', 'Least connections', [
          f('Observe load', 'A has more active connections; B has fewer.', ['router'], {
            a: '8 connections',
            b: '2 connections',
            c: '5 connections',
          }),
          f(
            'Choose B',
            'The algorithm sends new work to B; connection duration may not predict CPU cost.',
            ['b'],
            { b: '3 connections' },
          ),
        ]),
        demo(
          'fail',
          'Kill one server',
          [
            f(
              'B fails',
              'Traffic can still arrive before detection.',
              ['b'],
              { b: 'unreachable' },
              ['b'],
            ),
            f(
              'Probe threshold crossed',
              'The eligible set excludes B.',
              ['health', 'router'],
              { router: 'eligible: A, C' },
              ['b'],
            ),
            f(
              'Next request goes to C',
              'No new work routes to B under this policy. In-flight requests may have failed.',
              ['c'],
              { c: 'new request', b: 'removed' },
              ['b'],
            ),
          ],
          true,
        ),
      ],
    ),
  },
  {
    id: 'cdn',
    name: 'CDN',
    category: 'HTTP edge caching',
    topic: 'caching',
    summary: 'Serve reusable content near users and reduce origin traffic.',
    consistency:
      'Freshness follows HTTP directives and invalidation behavior; cache entries can differ across edges.',
    scale:
      'Use an appropriate cache key, origin shielding and request coalescing. Range requests help large media delivery.',
    cost: 'Invalidation delay, egress cost and cache-key correctness.',
    avoid:
      'Do not cache personalized responses as public content or assume every request is reusable.',
    alternative: 'A regional reverse-proxy cache trades global reach for simpler operation.',
    misconception:
      'The selected edge is not always geographically nearest. Anycast, DNS, peering and capacity affect routing.',
    failure: [
      'Origin traffic spikes.',
      'Many edge entries expire or miss together.',
      'Origin latency and errors rise.',
      'Use shielding, collapsed forwarding and carefully scoped stale serving.',
    ],
    source: ['HTTP caching · RFC 9111', 'https://www.rfc-editor.org/rfc/rfc9111'],
    scope: 'Generic HTTP model; edge hierarchy, invalidation and signed-URL features vary by CDN.',
    related: ['dns', 'redis', 'object-storage'],
    graph: layer(
      'caching',
      'Edge cache',
      'A hit shortens the path; a miss reaches a deeper source.',
      [
        n(
          'user',
          'User',
          'Request content.',
          'Send a URL with relevant request headers.',
          'Personalization changes cacheability.',
        ),
        n(
          'edge',
          'Edge cache',
          'Reuse a fresh response.',
          'Match a cache key and evaluate Cache-Control / Vary.',
          'A wrong key can leak or mix content.',
        ),
        n(
          'shield',
          'Origin shield',
          'Collapse regional misses.',
          'A shared cache reduces duplicate origin fetches.',
          'Another hop on misses.',
        ),
        n(
          'origin',
          'Origin',
          'Provide authoritative bytes.',
          'Return cache directives and validators such as ETag.',
          'Origin must survive unavoidable misses.',
        ),
        n(
          'validator',
          'Revalidation',
          'Check whether bytes changed.',
          'If-None-Match can return 304; stale-while-revalidate is policy-dependent.',
          'Revalidation still contacts upstream.',
        ),
      ],
      [
        e('user', 'edge', 'GET'),
        e('edge', 'shield', 'miss'),
        e('shield', 'origin', 'miss'),
        e('edge', 'validator', 'expired'),
        e('validator', 'origin', 'conditional GET'),
      ],
      [
        demo('hit', 'Cache hit', [
          f('Fresh entry', 'The URL and cache key match a reusable response.', ['user', 'edge'], {
            edge: 'age 10s / TTL 60s',
          }),
          f('Return at edge', 'The origin receives no request.', ['edge', 'user'], {
            user: '200 · cached bytes',
            origin: 'not contacted',
          }),
        ]),
        demo(
          'miss',
          'What if edge misses?',
          [
            f('Cold edge', 'No reusable local entry exists.', ['edge'], { edge: 'MISS' }),
            f('Shield misses too', 'Forward a bounded request to origin.', ['shield', 'origin'], {
              shield: 'MISS',
              origin: 'fetch object',
            }),
            f('Fill caches', 'Cache only if response policy permits.', ['shield', 'edge'], {
              edge: '200 · fresh',
              shield: 'stored',
            }),
          ],
          true,
        ),
      ],
    ),
  },
  {
    id: 'dns',
    name: 'DNS',
    category: 'Name resolution',
    topic: 'resolution',
    summary: 'Resolve a name using caches and delegated authority.',
    consistency:
      'TTL bounds cache reuse, not global instantaneous convergence. Negative answers can also be cached.',
    scale: 'Recursive caches amortize lookups; authoritative infrastructure often uses Anycast.',
    cost: 'Cached answers delay changes; DNS-based traffic shifts are not instantaneous.',
    avoid: 'Do not use DNS alone for per-request authorization or instant failover.',
    alternative:
      'A service registry can provide application-aware discovery inside a controlled environment.',
    misconception: 'The root → TLD → authority chain is not repeated for every HTTP request.',
    failure: [
      'Some users reach an old address.',
      'Their resolver still holds a valid cached answer.',
      'Traffic migration converges gradually.',
      'Plan TTL changes early and keep old targets serving during transition.',
    ],
    source: ['DNS concepts · RFC 1034', 'https://www.rfc-editor.org/rfc/rfc1034'],
    scope:
      'Simplified recursive resolution. DNSSEC authenticates DNS data, not application content or DNS query confidentiality.',
    related: ['cdn', 'load-balancer', 'multi-region'],
    graph: layer(
      'resolution',
      'Resolver chain',
      'A cold recursive lookup follows referrals; a warm one reuses cache.',
      [
        n(
          'browser',
          'Browser / OS',
          'Start with a local cache.',
          'A stub asks its configured recursive resolver if needed.',
          'Local caching varies by client.',
        ),
        n(
          'resolver',
          'Recursive resolver',
          'Find and cache the answer.',
          'Performs iterative queries on the client’s behalf.',
          'Cache poisoning defenses and validation matter.',
        ),
        n(
          'root',
          'Root server',
          'Refer to the TLD.',
          'Returns delegation information for .com in this example.',
          'It does not host every domain’s address.',
        ),
        n(
          'tld',
          'TLD authority',
          'Refer to the domain authority.',
          'Returns NS delegation for example.com.',
          'Delegation errors break resolution.',
        ),
        n(
          'authority',
          'Authoritative server',
          'Answer for the zone.',
          'A/AAAA map addresses; CNAME aliases; MX, TXT and NS have distinct roles.',
          'Incorrect records propagate into caches.',
        ),
      ],
      [
        e('browser', 'resolver', 'recursive query'),
        e('resolver', 'root', 'iterative query'),
        e('root', 'resolver', 'TLD referral'),
        e('resolver', 'tld', 'query TLD'),
        e('tld', 'resolver', 'NS referral'),
        e('resolver', 'authority', 'query authority'),
        e('authority', 'resolver', 'answer + TTL'),
      ],
      [
        demo('cold', 'Cold lookup', [
          f('No cache entry', 'The resolver begins delegation lookup.', ['browser', 'resolver'], {
            resolver: 'www.example.com A',
          }),
          f('Root referral', 'The root points to .com authority.', ['root'], { root: 'ask .com' }),
          f('TLD referral', 'The TLD points to example.com authority.', ['tld'], {
            tld: 'ask authoritative NS',
          }),
          f(
            'Answer and cache',
            'The authority returns an address with TTL.',
            ['authority', 'resolver'],
            { resolver: '192.0.2.10 · TTL 300s' },
          ),
          f(
            'Next lookup',
            'The cached answer avoids the upstream chain until expiry.',
            ['browser', 'resolver'],
            { resolver: 'cache HIT', root: 'not contacted', tld: 'not contacted' },
          ),
        ]),
      ],
    ),
  },
  {
    id: 'gateway',
    name: 'API Gateway',
    category: 'API boundary',
    topic: 'pipeline',
    summary: 'Apply shared API policies before forwarding to services.',
    consistency:
      'Authorization data and distributed quota state can be cached or stale; each policy needs a boundary.',
    scale:
      'Scale stateless routing horizontally and isolate expensive authentication or aggregation dependencies.',
    cost: 'Central policy failures can affect many APIs; transformations and fanout add latency.',
    avoid:
      'A simple internal service may only need a reverse proxy; avoid putting business transactions into gateway rules.',
    alternative:
      'Load balancers distribute traffic; service meshes manage service-to-service policies; responsibilities can overlap.',
    misconception:
      'An API gateway, load balancer and reverse proxy are overlapping roles, not interchangeable feature checklists.',
    failure: [
      'Many APIs become slow together.',
      'A shared policy service stalls.',
      'The gateway becomes a broad dependency.',
      'Bound timeouts, cache safe metadata and choose explicit fail-open or fail-closed behavior.',
    ],
    source: [
      'API Gateway service scope example',
      'https://docs.aws.amazon.com/apigateway/latest/developerguide/welcome.html',
    ],
    scope:
      'Conceptual pipeline; plugins, TLS termination and policy ordering depend on the implementation.',
    related: ['auth', 'rate-limiter', 'load-balancer'],
    graph: layer(
      'pipeline',
      'Policy pipeline',
      'Each policy consumes part of the request latency budget.',
      [
        n(
          'request',
          'Request / TLS',
          'Accept a public API call.',
          'Terminate TLS where configured and validate request shape.',
          'Termination defines a trust boundary.',
        ),
        n(
          'identity',
          'Identity policy',
          'Authenticate credentials.',
          'Validate tokens or consult an identity service.',
          'Authentication alone does not authorize an action.',
        ),
        n(
          'quota',
          'Rate / quota',
          'Bound admitted work.',
          'Apply per-client limits and reject excess requests.',
          'Distributed counters trade exactness for latency.',
          'token-bucket',
        ),
        n(
          'route',
          'Route / transform',
          'Select the upstream API.',
          'Match version and path; translate only supported protocol semantics.',
          'Transformations can obscure debugging.',
        ),
        n(
          'service',
          'Resource service',
          'Enforce domain authorization.',
          'Process the operation with request context.',
          'Sensitive authorization cannot rely on routing alone.',
        ),
        n(
          'observe',
          'Telemetry',
          'Trace the boundary.',
          'Record timing, request IDs and safe metadata.',
          'Avoid secrets and high-cardinality overload.',
          undefined,
          'control',
        ),
      ],
      [
        e('request', 'identity', 'credentials'),
        e('identity', 'quota', 'authenticated'),
        e('quota', 'route', 'admit'),
        e('route', 'service', 'forward'),
        e('service', 'observe', 'trace', 'async'),
      ],
      [
        demo('api', 'Follow an API call', [
          f(
            'Validate identity',
            'Credentials establish a caller, not blanket access.',
            ['identity'],
            { identity: 'subject=user42' },
          ),
          f('Admit work', 'The request consumes available quota.', ['quota'], {
            quota: 'remaining: 9',
          }),
          f(
            'Authorize resource access',
            'The service checks the requested object and action.',
            ['route', 'service'],
            { route: '/v2/orders', service: 'owner match → 200' },
          ),
        ]),
        demo(
          'deny',
          'Exceed quota',
          [
            f('Budget exhausted', 'No capacity remains in this client’s policy.', ['quota'], {
              quota: 'remaining: 0',
            }),
            f(
              'Reject before service',
              'Return 429 with policy-appropriate retry information.',
              ['request', 'quota'],
              { request: '429 Too Many Requests', service: 'not called' },
            ),
          ],
          true,
        ),
      ],
    ),
  },
  {
    id: 'queue',
    name: 'Message Queue',
    category: 'Asynchronous work',
    topic: 'delivery',
    summary: 'Buffer work until a consumer can process and acknowledge it.',
    consistency:
      'This demo uses at-least-once delivery and a visibility lease. Ordering and acknowledgement models differ by product.',
    scale:
      'Scale workers within ordering limits; bound retries and monitor age of oldest work, not just depth.',
    cost: 'Duplicate delivery, delayed completion and operational retry state.',
    avoid:
      'Do not make users wait for a queue when a small synchronous transaction needs an immediate result.',
    alternative:
      'RabbitMQ uses exchanges and explicit ACKs; SQS uses visibility and deletion; Kafka retains a replayable log.',
    misconception:
      'Acknowledging before durable processing can lose work; processing before ACK can repeat effects after a crash.',
    failure: [
      'A job runs twice.',
      'The worker completed its effect but died before acknowledgement.',
      'The message is redelivered.',
      'Use an idempotency key with atomic effect recording and bounded retries.',
    ],
    source: [
      'SQS visibility timeout example',
      'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html',
    ],
    scope: 'Lease-based queue teaching model, not universal RabbitMQ or NATS behavior.',
    related: ['kafka', 'redis', 'gateway'],
    graph: layer(
      'delivery',
      'Delivery & retry',
      'Receiving is not the same as successfully processing.',
      [
        n(
          'producer',
          'Producer',
          'Submit durable work.',
          'Enqueue an operation with an identity.',
          'Producer retries can create duplicates.',
        ),
        n(
          'queue',
          'Queue',
          'Retain pending work.',
          'Store available and leased messages.',
          'Backlogs can exceed useful completion deadlines.',
        ),
        n(
          'worker',
          'Worker',
          'Execute the operation.',
          'Acquire a message and process within its lease.',
          'Slow jobs need lease extension or bounded restart.',
        ),
        n(
          'effect',
          'Effect / dedupe',
          'Make retries safe.',
          'Atomically record the operation ID with its effect where possible.',
          'Retention of dedupe records must cover retry windows.',
          'idempotency',
        ),
        n(
          'ack',
          'ACK / delete',
          'Finish delivery bookkeeping.',
          'Acknowledge only after the required durable effect.',
          'A crash between effect and ACK causes replay.',
        ),
        n(
          'dlq',
          'Dead-letter queue',
          'Isolate repeatedly failing work.',
          'Route after a bounded retry policy.',
          'A DLQ needs inspection and safe redrive.',
        ),
      ],
      [
        e('producer', 'queue', 'enqueue', 'async'),
        e('queue', 'worker', 'lease'),
        e('worker', 'effect', 'process'),
        e('effect', 'ack', 'success'),
        e('ack', 'queue', 'remove'),
        e('queue', 'dlq', 'retry budget exceeded', 'async'),
      ],
      [
        demo(
          'retry',
          'Crash before ACK',
          [
            f('Receive job', 'The queue leases job 42 to a worker.', ['queue', 'worker'], {
              queue: 'job42 invisible',
              worker: 'lease: 30s',
            }),
            f('Apply effect', 'The effect and idempotency record commit.', ['effect'], {
              effect: 'job42 → done',
            }),
            f('Worker crashes', 'No ACK reaches the queue.', ['worker'], { worker: 'stopped' }, [
              'worker',
            ]),
            f(
              'Lease expires',
              'Another worker receives job42 and finds it already done.',
              ['queue', 'effect'],
              { effect: 'dedupe HIT → no second effect' },
            ),
            f('Acknowledge', 'The repeated delivery safely finishes.', ['ack'], {
              ack: 'delete job42',
            }),
          ],
          true,
        ),
      ],
    ),
  },
  {
    id: 'search',
    name: 'Elasticsearch / OpenSearch',
    category: 'Derived search index',
    topic: 'indexing',
    summary: 'Transform documents into searchable terms and merge ranked shard results.',
    consistency:
      'Indexing acknowledgement and search visibility differ; refresh makes new segments searchable.',
    scale:
      'Choose shard sizes deliberately; replicas add read capacity, while aggregations and hot shards can dominate cost.',
    cost: 'Write amplification from segments/merges, relevance tuning and an additional freshness boundary.',
    avoid: 'Do not treat a derived search index as your transactional source of truth by default.',
    alternative: 'Database full-text search may be sufficient for a smaller workload.',
    misconception:
      'A successful indexing response does not necessarily mean the document is immediately visible to search.',
    failure: [
      'A newly saved document is missing in search.',
      'The index has not refreshed, or ingestion is delayed.',
      'Search trails the source of truth.',
      'Expose the freshness boundary; use deliberate refresh policies rather than forcing every write to refresh.',
    ],
    source: [
      'Elastic near real-time search',
      'https://www.elastic.co/docs/manage-data/data-store/near-real-time-search',
    ],
    scope: 'Lucene-style conceptual model; Elasticsearch and OpenSearch versions and APIs differ.',
    related: ['postgres', 'kafka', 'object-storage'],
    graph: layer(
      'indexing',
      'Index & query',
      'Text analysis defines what a search can match.',
      [
        n(
          'doc',
          'Source document',
          'Supply authoritative input.',
          'CDC or ingestion sends a document version.',
          'Ingestion retries need version-aware handling.',
        ),
        n(
          'analyzer',
          'Analyzer',
          'Produce normalized tokens.',
          'Tokenizers and filters differ for text; keyword fields retain exact values.',
          'Wrong analysis cannot be fixed solely at query time.',
        ),
        n(
          'index',
          'Inverted index',
          'Map terms to documents.',
          'Postings associate tokens with matching document IDs.',
          'Mappings and term cardinality affect memory.',
        ),
        n(
          'refresh',
          'Refresh / segments',
          'Publish searchable state.',
          'Refresh exposes segments; background merging consolidates them.',
          'Frequent refresh trades throughput for freshness.',
        ),
        n(
          'shards',
          'Shard search',
          'Evaluate and rank locally.',
          'BM25-style ranking uses term statistics; queries fan out.',
          'Broad aggregations can be expensive.',
        ),
        n(
          'merge',
          'Coordinator',
          'Merge shard results.',
          'Combine top hits and aggregation partials.',
          'Fanout tail latency can dominate.',
        ),
      ],
      [
        e('doc', 'analyzer', 'index'),
        e('analyzer', 'index', 'tokens'),
        e('index', 'refresh', 'publish', 'async'),
        e('refresh', 'shards', 'visible'),
        e('shards', 'merge', 'top hits'),
      ],
      [
        demo('index', 'Index then search', [
          f(
            'Analyze',
            'A simple example analyzer lowercases and splits words.',
            ['doc', 'analyzer'],
            { doc: '"Fast red fox"', analyzer: 'fast · red · fox' },
          ),
          f('Build postings', 'Each term points to document 42.', ['index'], {
            index: 'fox → [42, 77]',
          }),
          f('Refresh', 'The new segment becomes searchable.', ['refresh'], {
            refresh: 'doc42 now visible',
          }),
          f(
            'Fan out and merge',
            'Each shard returns local candidates; the coordinator merges ranked hits.',
            ['shards', 'merge'],
            { shards: 'query: fox', merge: 'ranked docs: 42, 77' },
          ),
        ]),
      ],
    ),
  },
  {
    id: 'object-storage',
    name: 'Object Storage',
    category: 'Durable bytes',
    topic: 'upload',
    summary: 'Store named blobs behind an object API.',
    consistency:
      'Read, listing and cross-region replication guarantees are service-specific; modern S3 has strong per-object read-after-write, but cross-region copies are asynchronous.',
    scale:
      'Parallel multipart uploads, range reads, lifecycle policies and CDN delivery address different bottlenecks.',
    cost: 'Request and transfer costs, whole-object semantics and lifecycle complexity.',
    avoid: 'Do not assume a POSIX filesystem, block device, or low-latency row-update interface.',
    alternative:
      'Block storage exposes addressable blocks; file storage exposes paths and file operations.',
    misconception:
      'Multipart ETags are not universally the MD5 of the complete object. Use documented checksum facilities.',
    failure: [
      'An upload stalls after most bytes succeeded.',
      'One part failed or the client abandoned completion.',
      'Incomplete parts remain without a completed object.',
      'Retry only failed parts and expire abandoned uploads.',
    ],
    source: [
      'S3 multipart upload example',
      'https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html',
    ],
    scope:
      'Generic object model with S3 multipart examples. Physical replication and erasure coding vary by storage class and provider.',
    related: ['cdn', 'postgres', 'multi-region'],
    graph: layer(
      'upload',
      'Multipart upload',
      'The object appears through a completion operation, not individual part writes.',
      [
        n(
          'client',
          'Uploader',
          'Send a large file.',
          'Obtain scoped credentials or a signed URL.',
          'Signed URLs are bearer capabilities until expiry.',
        ),
        n(
          'key',
          'Bucket / key',
          'Name and authorize the object.',
          'A key identifies bytes and metadata within a namespace.',
          'Key naming does not imply real directories.',
        ),
        n(
          'parts',
          'Parts',
          'Transfer independently.',
          'Upload numbered parts concurrently and retry failures.',
          'Abandoned parts need cleanup.',
        ),
        n(
          'check',
          'Checksums',
          'Detect corruption.',
          'Validate documented per-part or whole-object checksums.',
          'Integrity checks do not provide authorization.',
        ),
        n(
          'object',
          'Completed object',
          'Publish the assembled bytes.',
          'Complete the upload using the part manifest.',
          'Versioning and lifecycle rules affect retained copies.',
        ),
        n(
          'durability',
          'Storage redundancy',
          'Survive storage failures.',
          'Providers use replication or erasure coding according to product/class.',
          'Durability is distinct from availability and backup.',
          undefined,
          'control',
        ),
      ],
      [
        e('client', 'key', 'authorize'),
        e('key', 'parts', 'upload ID'),
        e('parts', 'check', 'verify'),
        e('check', 'object', 'complete'),
        e('object', 'durability', 'protect', 'async'),
      ],
      [
        demo(
          'parts',
          'Retry a failed part',
          [
            f('Split upload', 'Three illustrative parts can upload independently.', ['parts'], {
              parts: '1 ✓ · 2 × · 3 ✓',
            }),
            f('Retry part 2', 'Successful parts do not need retransmission.', ['client', 'parts'], {
              parts: '1 ✓ · 2 ✓ · 3 ✓',
            }),
            f(
              'Verify and complete',
              'A valid manifest publishes the assembled object.',
              ['check', 'object'],
              { check: 'checksums valid', object: 'video/42 available' },
            ),
          ],
          true,
        ),
      ],
    ),
  },
  {
    id: 'websocket',
    name: 'WebSocket Gateway',
    category: 'Persistent connections',
    topic: 'connections',
    summary: 'Maintain bidirectional connections and route messages to live sessions.',
    consistency:
      'Transport ordering applies within a connection. Reconnects need application-level replay, sequencing and deduplication.',
    scale:
      'Shard connections across gateways; use shared routing or pub/sub for cross-gateway fanout.',
    cost: 'Connection memory, heartbeat traffic, backpressure and reconnect storms.',
    avoid:
      'One-way updates may fit SSE; real-time peer media typically needs WebRTC rather than a WebSocket data path.',
    alternative:
      'SSE streams server-to-client over HTTP; long polling periodically replaces a waiting request.',
    misconception:
      'A persistent connection does not guarantee durable delivery or exactly-once application effects.',
    failure: [
      'Clients reconnect simultaneously.',
      'A gateway or network path failed.',
      'Authentication and connection setup surge.',
      'Use capped backoff with jitter, session resumption and bounded replay.',
    ],
    source: ['WebSocket protocol · RFC 6455', 'https://www.rfc-editor.org/rfc/rfc6455'],
    scope:
      'HTTP/1.1 Upgrade handshake shown. HTTP/2 and HTTP/3 WebSocket bootstrapping use different mechanisms.',
    related: ['redis', 'queue', 'auth'],
    graph: layer(
      'connections',
      'Connection lifecycle',
      'Delivery state belongs above the transport.',
      [
        n(
          'client',
          'Client',
          'Open a duplex channel.',
          'Perform the handshake then exchange frames.',
          'Mobile links can disappear without a close frame.',
        ),
        n(
          'gateway',
          'Gateway',
          'Own the socket.',
          'Track authenticated sessions and ping/pong liveness.',
          'A socket consumes memory even while idle.',
        ),
        n(
          'routing',
          'Session directory',
          'Find the owning gateway.',
          'Map users or sessions to active connections.',
          'Presence is inherently delayed by detection.',
        ),
        n(
          'pubsub',
          'Cross-gateway bus',
          'Fan out to remote sessions.',
          'Publish to the gateway owning each destination.',
          'Ephemeral buses need a separate recovery path.',
        ),
        n(
          'recipient',
          'Recipient',
          'Receive and acknowledge at app level.',
          'Use sequence IDs to detect gaps and request replay.',
          'A transport send does not prove app processing.',
        ),
      ],
      [
        e('client', 'gateway', 'frames'),
        e('gateway', 'routing', 'lookup'),
        e('gateway', 'pubsub', 'publish', 'async'),
        e('pubsub', 'recipient', 'deliver', 'async'),
      ],
      [
        demo('message', 'Send a message', [
          f(
            'Handshake',
            'HTTP/1.1 Upgrade establishes a WebSocket connection.',
            ['client', 'gateway'],
            { gateway: '101 Switching Protocols' },
          ),
          f('Route', 'The session directory identifies the recipient’s gateway.', ['routing'], {
            routing: 'user77 → gateway B',
          }),
          f('Fan out', 'The bus reaches the owning gateway.', ['pubsub', 'recipient'], {
            recipient: 'message seq=42',
          }),
          f(
            'Application ACK',
            'The application confirms its chosen processing boundary.',
            ['recipient'],
            { recipient: 'last seen seq=42' },
          ),
        ]),
        demo(
          'reconnect',
          'Lose the connection',
          [
            f(
              'Heartbeat expires',
              'The socket is considered unavailable after a timeout.',
              ['gateway'],
              { gateway: 'session unavailable' },
              ['gateway'],
            ),
            f(
              'Reconnect with jitter',
              'Clients spread retry times to avoid a synchronized surge.',
              ['client'],
              { client: 'retry after 0.8s (example)' },
            ),
            f(
              'Resume from position',
              'The application requests missing messages from durable history if provided.',
              ['recipient'],
              { recipient: 'replay after seq=42' },
            ),
          ],
          true,
        ),
      ],
    ),
  },
  {
    id: 'kubernetes',
    name: 'Kubernetes',
    category: 'Orchestration → implementation',
    topic: 'reconciliation',
    summary: 'Controllers continually reconcile actual resources with desired state.',
    consistency:
      'The API persists cluster state in etcd; controllers and watches converge asynchronously. A successful API write does not mean a workload is ready.',
    scale:
      'Use resource requests, workload-aware HPA signals and sufficient node capacity; autoscaling has delay.',
    cost: 'Control-plane operations, networking, upgrades and scheduling complexity.',
    avoid:
      'A small application may be easier to run on a managed application platform or a few VMs.',
    alternative:
      'Managed containers simplify infrastructure choices; VMs provide direct control with fewer orchestration abstractions.',
    misconception:
      'Kubernetes does not make an application highly available automatically. Replicas, probes, storage and failure domains still matter.',
    failure: [
      'Requests hit restarting pods.',
      'Readiness or resource configuration is wrong.',
      'Capacity oscillates and clients see errors.',
      'Separate readiness from liveness, set realistic resources and investigate the crash cause.',
    ],
    source: ['Kubernetes architecture', 'https://kubernetes.io/docs/concepts/architecture/'],
    scope:
      'Core Kubernetes control loop. Networking, runtime, storage and managed-control-plane details vary.',
    related: ['load-balancer', 'multi-region', 'gateway'],
    graph: layer(
      'reconciliation',
      'Reconciliation loop',
      'Desired state and observed state are continuously compared.',
      [
        n(
          'api',
          'API server',
          'Validate and expose cluster state.',
          'Clients and controllers use the API.',
          'Admission and API saturation affect changes.',
          undefined,
          'control',
        ),
        n(
          'etcd',
          'etcd',
          'Persist cluster metadata.',
          'A consensus-backed key-value store holds API state.',
          'Backups and quorum health are operational requirements.',
          'raft',
          'control',
        ),
        n(
          'controller',
          'Controllers',
          'Drive desired replicas.',
          'Deployment and ReplicaSet controllers create missing Pods.',
          'Convergence takes time.',
          undefined,
          'control',
        ),
        n(
          'scheduler',
          'Scheduler',
          'Place unscheduled Pods.',
          'Match requests, constraints and available nodes.',
          'Insufficient capacity leaves Pods Pending.',
          undefined,
          'control',
        ),
        n(
          'kubelet',
          'Kubelet / runtime',
          'Run assigned Pods.',
          'The kubelet asks the runtime to start containers and runs probes.',
          'Crash loops are symptoms, not automatic fixes.',
        ),
        n(
          'service',
          'Service / endpoints',
          'Route to ready Pods.',
          'Readiness influences endpoint eligibility.',
          'Existing connections and propagation delay still matter.',
        ),
      ],
      [
        e('api', 'etcd', 'persist', 'control'),
        e('api', 'controller', 'watch', 'control'),
        e('controller', 'api', 'create Pod', 'control'),
        e('api', 'scheduler', 'watch pending Pods', 'control'),
        e('scheduler', 'api', 'bind Pod', 'control'),
        e('api', 'kubelet', 'watch assignment', 'control'),
        e('kubelet', 'service', 'ready endpoint', 'control'),
      ],
      [
        demo(
          'pod',
          'What if a Pod disappears?',
          [
            f(
              'Desired replicas: 3',
              'The API records desired state; only two Pods remain.',
              ['api', 'controller'],
              { controller: 'desired 3 · observed 2' },
            ),
            f(
              'Create replacement',
              'The controller creates a Pod; the scheduler finds a feasible node.',
              ['controller', 'scheduler'],
              { scheduler: 'node B selected' },
            ),
            f(
              'Start containers',
              'The kubelet reconciles the assignment through its runtime.',
              ['kubelet'],
              { kubelet: 'container starting' },
            ),
            f(
              'Readiness succeeds',
              'Only now does the Pod become eligible for Service traffic.',
              ['service'],
              { service: '3 ready endpoints' },
            ),
          ],
          true,
        ),
      ],
    ),
  },
  {
    id: 'rate-limiter',
    name: 'Rate Limiter',
    category: 'Admission control',
    topic: 'bucket',
    summary: 'Protect a shared resource by bounding admitted work.',
    consistency:
      'A distributed global limit needs atomic coordination; local or sharded limits trade precision for availability and latency.',
    scale:
      'Separate per-user, per-tenant and global budgets. Bound coordination latency and define failure behavior.',
    cost: 'Rejected work, clock assumptions and central counter hot spots.',
    avoid: 'Rate limits cannot replace capacity planning, concurrency limits or abuse detection.',
    alternative:
      'Concurrency limits cap work in flight; queues smooth bursts but add waiting time.',
    misconception:
      'Token buckets allow bounded bursts. A fixed window can allow a double burst at its boundary.',
    failure: [
      'Users exceed the intended global budget.',
      'Independent replicas each admit a full local allowance.',
      'Aggregate load exceeds capacity.',
      'Coordinate counters or explicitly divide/lease the global budget.',
    ],
    source: [
      'Redis INCR counter and rate-limiter pattern',
      'https://redis.io/docs/latest/commands/incr/',
    ],
    scope:
      'Illustrative algorithms, not a benchmark. Distributed implementations need atomic updates and deliberate clock handling.',
    related: ['redis', 'gateway', 'load-balancer'],
    graph: layer(
      'bucket',
      'Admission decision',
      'Inspect the token budget before accepting each arrival.',
      [
        n(
          'request',
          'Arrivals',
          'Offer work.',
          'Requests arrive at uneven intervals.',
          'Bursts can exceed average capacity.',
        ),
        n(
          'clock',
          'Refill clock',
          'Accrue allowed capacity.',
          'Elapsed time adds tokens up to a cap.',
          'Clock skew matters across servers.',
        ),
        n(
          'bucket',
          'Token bucket',
          'Allow bounded bursts.',
          'Spend one token per accepted request; reject when empty.',
          'Large caps permit larger bursts.',
          'token-bucket',
        ),
        n(
          'accept',
          'Accept',
          'Consume protected capacity.',
          'Only admitted work reaches the service.',
          'Accepted concurrency may still need a separate bound.',
        ),
        n(
          'reject',
          'Reject / retry',
          'Signal that the budget is exhausted.',
          'Return a suitable error and retry guidance.',
          'Synchronized retries amplify overload.',
          'backoff',
        ),
      ],
      [
        e('request', 'bucket', 'arrival'),
        e('clock', 'bucket', 'refill', 'control'),
        e('bucket', 'accept', 'token available'),
        e('bucket', 'reject', 'empty'),
      ],
      [
        demo('burst', 'Burst through a bucket', [
          f(
            'Initial capacity',
            'Capacity is three tokens; refill is one token per second.',
            ['bucket'],
            { bucket: '● ● ● · 3/3' },
          ),
          f(
            'Three arrivals',
            'Each accepted request consumes a token.',
            ['request', 'accept', 'bucket'],
            { bucket: '0/3', accept: '3 accepted' },
          ),
          f('Fourth arrival', 'No token remains; the request is rejected.', ['reject'], {
            reject: '429 · retry later',
            bucket: '0/3',
          }),
          f(
            'One second later',
            'One token accrues, allowing one more request.',
            ['clock', 'bucket'],
            { bucket: '● ○ ○ · 1/3' },
          ),
        ]),
      ],
    ),
  },
  {
    id: 'auth',
    name: 'Authentication & Authorization',
    category: 'Identity boundary',
    topic: 'identity',
    summary: 'Prove identity, delegate access, then enforce permission at the resource.',
    consistency:
      'Token validity, session revocation and authorization changes have different freshness boundaries.',
    scale:
      'Cache signing keys safely; bound token lifetime and coordinate revocation requirements.',
    cost: 'Key rotation, session state, consent and token handling complexity.',
    avoid:
      'Do not build a bespoke identity protocol or assume JWT eliminates security-sensitive state.',
    alternative:
      'Server-side sessions with secure cookies can simplify revocation; opaque tokens support central introspection.',
    misconception:
      'OAuth delegates authorization; OIDC adds an identity layer. A signed JWT is not inherently encrypted or more secure.',
    failure: [
      'A revoked user retains access.',
      'A resource accepts an unexpired self-contained token without revocation checks.',
      'Permissions persist until its acceptance boundary changes.',
      'Use short lifetimes and a revocation/session policy appropriate to the risk.',
    ],
    source: ['OpenID Connect Core', 'https://openid.net/specs/openid-connect-core-1_0.html'],
    scope:
      'Authorization code with PKCE shown; cookie sessions, API keys and mTLS serve different trust models.',
    related: ['gateway', 'rate-limiter', 'websocket'],
    graph: layer(
      'identity',
      'Authorization code + PKCE',
      'The access token and ID token serve different audiences and purposes.',
      [
        n(
          'user',
          'User agent',
          'Approve sign-in / consent.',
          'Navigate to the authorization server.',
          'Protect redirect and session handling.',
        ),
        n(
          'client',
          'Client application',
          'Bind the code exchange.',
          'Generate a verifier and send its S256 challenge.',
          'Store the verifier securely for this transaction.',
        ),
        n(
          'issuer',
          'Authorization server',
          'Authenticate and issue a code.',
          'Bind the code to client, redirect and PKCE challenge.',
          'Validate redirect URIs and prevent request forgery.',
        ),
        n(
          'tokens',
          'Token endpoint',
          'Exchange a code with proof.',
          'Check code and verifier; issue scoped tokens.',
          'Do not expose tokens in logs or unsafe storage.',
        ),
        n(
          'resource',
          'Resource server',
          'Enforce access.',
          'Validate issuer, audience, expiry and authorization; ID tokens are not generic API access tokens.',
          'Revocation and key rotation need explicit handling.',
        ),
      ],
      [
        e('client', 'user', 'redirect + challenge'),
        e('user', 'issuer', 'authenticate'),
        e('issuer', 'client', 'code'),
        e('client', 'tokens', 'code + verifier'),
        e('tokens', 'client', 'tokens'),
        e('client', 'resource', 'API + access token'),
      ],
      [
        demo('pkce', 'Follow code + PKCE', [
          f(
            'Create proof',
            'The client keeps the verifier and sends its hash challenge.',
            ['client'],
            { client: 'challenge = S256(verifier)' },
          ),
          f(
            'Authenticate user',
            'The authorization server authenticates and returns a bound code.',
            ['user', 'issuer'],
            { issuer: 'one-time authorization code' },
          ),
          f('Exchange', 'The verifier proves continuity with the original request.', ['tokens'], {
            tokens: 'verify challenge → tokens',
          }),
          f(
            'Call API',
            'The resource validates the access token and checks the requested permission.',
            ['resource'],
            { resource: 'audience + scope + object policy' },
          ),
        ]),
      ],
    ),
  },
  {
    id: 'multi-region',
    name: 'Multi-region',
    category: 'Distributed deployment',
    topic: 'regions',
    summary: 'Choose a cross-region availability and data-consistency boundary.',
    consistency:
      'During a partition, availability can conflict with the chosen consistency guarantee. Even without partitions, stronger coordination can add latency (PACELC).',
    scale:
      'Route locally where safe; partition ownership, test evacuation capacity and respect residency constraints.',
    cost: 'Cross-region latency, transfer charges, conflict resolution and failover operations.',
    avoid:
      'Do not add active-active writes without a concrete availability or locality requirement and conflict model.',
    alternative:
      'Multi-zone deployment within one region often meets simpler resilience requirements.',
    misconception:
      'CAP is not “pick any two.” RPO measures tolerated data loss; RTO measures recovery time.',
    failure: [
      'A region fails while replicas lag.',
      'Asynchronous replication has not copied the latest commits.',
      'Failover may lose recent data or wait for recovery.',
      'Fence writers, evaluate replay position, rehearse promotion and budget RPO/RTO.',
    ],
    source: [
      'AWS multi-region fundamentals',
      'https://docs.aws.amazon.com/prescriptive-guidance/latest/aws-multi-region-fundamentals/',
    ],
    scope:
      'Active-passive example; active-active writes require ownership, coordination or explicit conflict resolution.',
    related: ['postgres', 'dns', 'kafka'],
    graph: layer(
      'regions',
      'Regional failover',
      'The replication and routing control paths have different delays.',
      [
        n(
          'routing',
          'Global routing',
          'Select a serving region.',
          'Use health and policy to shift new traffic.',
          'DNS caches and persistent connections delay convergence.',
          undefined,
          'control',
        ),
        n(
          'a',
          'Region A primary',
          'Accept writes.',
          'Own the active write boundary in this example.',
          'It must be fenced before another writer takes over.',
        ),
        n(
          'link',
          'Replication link',
          'Copy committed changes.',
          'Async transfer favors latency; sync coordination waits across regions.',
          'Partitions expose the availability/consistency choice.',
          'quorum',
        ),
        n(
          'b',
          'Region B standby',
          'Prepare to take over.',
          'Track receive and replay positions.',
          'A lagging copy cannot recreate absent commits.',
        ),
        n(
          'fence',
          'Failover controller',
          'Prevent competing writers.',
          'Fence A before promoting B according to policy.',
          'Failure detection is not proof that A is dead.',
          undefined,
          'control',
        ),
      ],
      [
        e('routing', 'a', 'normal traffic'),
        e('a', 'link', 'changes', 'async'),
        e('link', 'b', 'apply', 'async'),
        e('fence', 'b', 'promote', 'control'),
        e('routing', 'b', 'failover traffic'),
      ],
      [
        demo(
          'region',
          'Lose a region',
          [
            f('Asynchronous lag', 'A has v2 while B still holds v1.', ['a', 'b'], {
              a: 'v2 committed',
              b: 'v1 replayed',
            }),
            f(
              'A becomes unreachable',
              'Unreachability does not prove A has stopped writing.',
              ['a', 'fence'],
              { a: 'unreachable', fence: 'fence before promotion' },
              ['a'],
            ),
            f(
              'Choose recovery boundary',
              'Promote B only under the declared loss/fencing policy; here v2 is outside the retained boundary.',
              ['b', 'fence'],
              { b: 'promoted at v1 · RPO exposure' },
              ['a'],
            ),
            f(
              'Shift traffic',
              'Recovery time includes detection, fencing, promotion and routing convergence.',
              ['routing', 'b'],
              { routing: 'new traffic → B', b: 'serving' },
              ['a'],
            ),
          ],
          true,
        ),
      ],
    ),
  },
];

export const systemConcepts: Record<string, XRayConcept> = Object.fromEntries(
  specs.map((s) => {
    const overview = { ...s.graph, id: 'overview', name: s.name };
    return [
      s.id,
      concept(
        {
          id: s.id,
          name: s.name,
          category: s.category,
          summary: s.summary,
          role: s.summary,
          consistencyModel: s.consistency,
          scalingStrategies: [s.scale],
          tradeoffs: [s.cost],
          whenToUse: s.summary,
          whenNotToUse: s.avoid,
          alternatives: [s.alternative],
          misconceptions: [s.misconception],
          failureModes: [
            {
              symptom: s.failure[0],
              cause: s.failure[1],
              impact: s.failure[2],
              mitigation: s.failure[3],
            },
          ],
          sources: [{ title: s.source[0], url: s.source[1] }],
          relatedConcepts: s.related,
          versionContext: s.scope,
          implementationNotes:
            'The graph is an illustrative mechanism model, not a vendor’s physical topology. Managed-service contracts must be checked independently.',
        },
        [overview, s.graph],
      ),
    ];
  }),
);
