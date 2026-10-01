import type { SimulationScenario, SimulationStep } from '../knowledge/types';
import { getPreset } from '../scenarios/presets';

export { getTrafficImpact, trafficLevels } from './traffic';
export type { TrafficImpact, TrafficLevel } from './traffic';

export const failureExplanations: Record<string, { title: string; description: string }> = {
  cache: {
    title: 'Cache unavailable',
    description:
      'The application stops waiting on the cache and reads the database directly. Latency and database pressure rise; bounded concurrency prevents a cascading failure.',
  },
  services: {
    title: 'One service instance fails',
    description:
      'Health checks remove one instance from a redundant pool. New requests use healthy instances; in-flight work may fail and needs safe, bounded retries.',
  },
  database: {
    title: 'Database primary fails',
    description:
      'This scenario assumes a standby and an automated failover controller. The old primary is fenced before a replica is promoted; asynchronous replication can lose recent writes.',
  },
  kafka: {
    title: 'One Kafka broker fails',
    description:
      'With a healthy in-sync replica available, partition leadership moves to another broker. Producers retry; partitions without enough in-sync replicas may reject writes.',
  },
  workers: {
    title: 'One consumer fails',
    description:
      'The group detects a lost heartbeat, reassigns partitions, and resumes from committed offsets. Processing may repeat, so handlers must be idempotent.',
  },
};

function step(
  nodes: string[],
  title: string,
  description: string,
  edges: string[] = [],
  duration = 1_150,
): SimulationStep {
  return { nodes, edges, title, description, duration };
}

function hop(
  source: string,
  target: string,
  title: string,
  description: string,
  edgeId = `${source}-${target}`,
): SimulationStep {
  return step([source, target], title, description, [edgeId]);
}

function resolveDns(): SimulationStep[] {
  return [
    hop(
      'client',
      'dns',
      'Resolve the hostname',
      'The client asks its resolver for an address. This lookup is connection setup, not a hop inside every HTTP request.',
    ),
    hop(
      'dns',
      'client',
      'Keep the answer until its TTL',
      'The resolved address returns to the client. Cached DNS answers avoid another lookup until expiration.',
      'client-dns',
    ),
  ];
}

function enterOrigin(
  failures: ReadonlySet<string>,
  hasAuth: boolean,
  purpose = 'A dynamic request',
): SimulationStep[] {
  return [
    ...resolveDns(),
    hop(
      'client',
      'cdn',
      'Connect to the edge',
      `${purpose} reaches the edge over HTTPS. It is uncacheable or misses the edge cache, so the edge contacts the origin.`,
    ),
    hop(
      'cdn',
      'waf',
      'Check the request',
      'The WAF evaluates request rules and abuse signals. Allowed traffic continues; suspicious traffic can be blocked.',
    ),
    hop(
      'waf',
      'load-balancer',
      'Choose a healthy destination',
      'The load balancer selects an available gateway instance. Placement of gateways and load balancers varies between architectures.',
    ),
    hop(
      'load-balancer',
      'api-gateway',
      'Apply API policy',
      'The gateway checks limits, chooses a route, and carries a request ID for tracing.',
    ),
    ...(hasAuth
      ? [
          hop(
            'api-gateway',
            'auth',
            'Verify identity and permissions',
            'This example checks with an identity service. Other deployments validate signed tokens locally, then enforce authorization at the service.',
          ),
          hop(
            'auth',
            'api-gateway',
            'Return the authorization decision',
            'The identity check returns to the gateway. Authentication is a side call; it does not forward the application request.',
            'api-gateway-auth',
          ),
        ]
      : []),
    ...(failures.has('services')
      ? [
          step(
            ['load-balancer', 'services'],
            'Route around one failed instance',
            'Health checks remove an unhealthy member from a redundant service pool. Discovery and routing select a healthy instance; in-flight requests may still fail.',
            [],
            1_600,
          ),
        ]
      : []),
    hop(
      'api-gateway',
      'services',
      'Run application logic',
      'The gateway forwards the request to a healthy service instance. The service enforces domain rules and controls access to its data.',
    ),
  ];
}

function databaseRecovery(failures: ReadonlySet<string>): SimulationStep[] {
  if (!failures.has('database')) return [];
  return [
    step(
      ['database'],
      'Primary unavailable · writes pause',
      'The failover controller confirms a failure and fences the old primary. Timeouts prevent requests from waiting indefinitely.',
      [],
      1_600,
    ),
    step(
      ['database', 'services'],
      'Promote a configured replica',
      'A suitable standby is promoted and clients reconnect. This assumes redundancy; asynchronous replication may lose unreplicated writes.',
      ['services-database'],
      1_600,
    ),
  ];
}

function returnResponse(
  title = 'Return the response',
  description = 'The result returns along the established connection. DNS is not involved in the response path.',
): SimulationStep[] {
  return [
    hop(
      'services',
      'api-gateway',
      'Return the application result',
      'The service serializes the result and returns it to the gateway with the appropriate status.',
      'api-gateway-services',
    ),
    step(
      ['api-gateway', 'load-balancer', 'waf', 'cdn', 'client'],
      title,
      description,
      ['load-balancer-api-gateway', 'waf-load-balancer', 'cdn-waf', 'client-cdn'],
      1_500,
    ),
  ];
}

function readScenario(
  failures: ReadonlySet<string>,
  presetId: string,
  nodes: ReadonlySet<string>,
): SimulationScenario {
  const redirect = presetId === 'url-shortener';
  const analytics = presetId === 'analytics';
  const steps = enterOrigin(
    failures,
    nodes.has('auth'),
    redirect ? 'A short-link lookup' : analytics ? 'A dashboard query' : 'A dynamic API request',
  );
  if (failures.has('cache')) {
    steps.push(
      step(
        ['cache', 'services'],
        'Cache timeout · bypass the cache',
        'The cache circuit opens after a bounded timeout. The service queries the database directly; the cache does not forward requests.',
        ['services-cache'],
        1_500,
      ),
    );
    steps.push(
      step(
        ['services', 'database'],
        'Database traffic increases',
        'Previously cached reads now compete for database connections. Concurrency limits and load shedding keep a cache outage from taking down the database.',
        ['services-database'],
        1_500,
      ),
    );
  } else {
    steps.push(
      hop(
        'services',
        'cache',
        'Check the application cache',
        redirect
          ? 'Look up the short key in a distributed cache before reading its durable URL mapping.'
          : 'The service uses cache-aside: first look up a reusable result by key. TTLs and invalidation control staleness.',
      ),
    );
    steps.push(
      hop(
        'cache',
        'services',
        'Cache miss · return to the service',
        'The cache has no usable entry. The service decides to query the database; there is no cache-to-database forwarding hop.',
        'services-cache',
      ),
    );
  }
  steps.push(...databaseRecovery(failures));
  steps.push(
    hop(
      'services',
      'database',
      redirect
        ? 'Read the durable URL mapping'
        : analytics
          ? 'Read the derived analytics view'
          : 'Read the source of truth',
      analytics
        ? 'Read a precomputed view suitable for the dashboard. The view may lag behind incoming events.'
        : 'The service executes a bounded query. A read replica is suitable only when the requested consistency allows replication lag.',
    ),
  );
  steps.push(
    hop(
      'database',
      'services',
      'Return the stored result',
      'The database returns data to the application. The application controls validation, serialization, and any cache update.',
      'services-database',
    ),
  );
  if (!failures.has('cache')) {
    steps.push(
      hop(
        'services',
        'cache',
        'Fill the cache',
        'The application writes the result with a TTL. Coalescing concurrent fills helps avoid a cache stampede.',
      ),
    );
  }
  steps.push(
    ...returnResponse(
      redirect ? 'Return the redirect' : 'Deliver the response',
      redirect
        ? 'The client receives a redirect status and Location header. Following the destination creates a separate request outside this architecture.'
        : 'The response returns to the client. Private API results should not enter a shared CDN cache without correct cache policy.',
    ),
  );
  return {
    id: 'request',
    name: redirect
      ? 'Resolve a short URL'
      : analytics
        ? 'Read an analytics view'
        : 'Follow a request',
    description:
      'DNS once, edge policy, application cache miss, database read, cache fill, and response.',
    steps,
  };
}

function edgeHitScenario(): SimulationScenario {
  return {
    id: 'cache-hit',
    name: 'Edge cache hit',
    description: 'A public, cacheable asset is served at the edge without involving the origin.',
    steps: [
      ...resolveDns(),
      hop(
        'client',
        'cdn',
        'Request a cacheable asset',
        'The client requests a versioned image, script, or other public asset. The edge checks its cache key and freshness.',
      ),
      hop(
        'cdn',
        'client',
        'Cache hit · respond immediately',
        'The CDN serves a fresh cached object. The gateway, application cache, and database receive no request; origin failures do not affect this hit.',
        'client-cdn',
      ),
    ],
  };
}

function brokerRecovery(failures: ReadonlySet<string>): SimulationStep[] {
  return failures.has('kafka')
    ? [
        step(
          ['kafka'],
          'Broker lost · move partition leadership',
          'A surviving in-sync replica becomes leader. This assumes replicas are available; insufficient in-sync replicas can temporarily block publishing.',
          [],
          1_600,
        ),
        step(
          ['services', 'kafka'],
          'Retry the publish safely',
          'The producer discovers the new leader and retries. Producer idempotence helps within its supported scope; consumers still protect external side effects.',
          ['services-kafka'],
          1_600,
        ),
      ]
    : [];
}

function consumerRecovery(failures: ReadonlySet<string>): SimulationStep[] {
  return failures.has('workers')
    ? [
        step(
          ['kafka', 'workers'],
          'Consumer heartbeat expires',
          'The group detects a failed consumer. Lag grows while its partitions are temporarily unassigned.',
          ['kafka-workers'],
          1_500,
        ),
        step(
          ['kafka', 'workers'],
          'Rebalance and resume committed offsets',
          'Healthy members receive partition assignments. Uncommitted work may replay, so each handler deduplicates effects using an event ID.',
          ['kafka-workers'],
          1_500,
        ),
      ]
    : [];
}

function orderScenario(failures: ReadonlySet<string>): SimulationScenario {
  return {
    id: 'place-order',
    name: 'Place an order',
    description: 'Commit an order and an outbox event, then let independent consumers process it.',
    steps: [
      ...enterOrigin(failures, true, 'An authenticated order request'),
      ...databaseRecovery(failures),
      hop(
        'services',
        'database',
        'Commit order + outbox record',
        'One database transaction stores the pending order and its event. An idempotency key prevents a retried request from creating a second order.',
      ),
      hop(
        'database',
        'services',
        'Acknowledge the committed order',
        'A successful commit makes the pending order durable. Payment and inventory work still happen asynchronously.',
        'services-database',
      ),
      ...returnResponse(
        'Order accepted · work continues',
        'The client receives an order ID and pending status. Acceptance does not claim that payment or fulfillment has completed.',
      ),
      ...brokerRecovery(failures),
      hop(
        'services',
        'kafka',
        'Publish the outbox event',
        'An outbox relay publishes OrderCreated and marks progress. A crash can cause a duplicate, so consumers use the event ID to deduplicate.',
      ),
      ...consumerRecovery(failures),
      hop(
        'kafka',
        'workers',
        'Independent consumer groups react',
        'Payment and inventory groups each read the event. Within one group, a partition is assigned to one active consumer at a time.',
      ),
      step(
        ['workers', 'search', 'notifications'],
        'Fan out independent work',
        'Separate consumers update the search projection and send an order-received notification. Cross-service fulfillment needs retries and compensating actions.',
        ['workers-search', 'workers-notifications'],
        1_800,
      ),
    ],
  };
}

function videoScenario(failures: ReadonlySet<string>): SimulationScenario {
  return {
    id: 'video',
    name: 'Play a video',
    description:
      'Authorize playback through the API, then deliver media segments directly from the edge.',
    steps: [
      ...enterOrigin(failures, true, 'A playback-session request'),
      ...databaseRecovery(failures),
      hop(
        'services',
        'database',
        'Read playback metadata',
        'The API checks entitlements and finds the video manifest. Application servers handle metadata rather than proxying every video byte.',
      ),
      hop(
        'database',
        'services',
        'Return the manifest location',
        'The stored metadata points to encoded renditions. The API creates a time-limited playback authorization.',
        'services-database',
      ),
      ...returnResponse(
        'Return a signed playback URL',
        'The client gets a manifest URL and authorization. Subsequent segment requests use the already resolved edge endpoint.',
      ),
      hop(
        'client',
        'cdn',
        'Request a video segment',
        'Adaptive playback requests a segment at a suitable bitrate. The CDN validates signed access and checks its segment cache.',
      ),
      hop(
        'cdn',
        'storage',
        'Edge miss · fetch the object',
        'On a miss, the CDN fetches the immutable encoded segment from its configured object-storage origin.',
      ),
      hop(
        'storage',
        'cdn',
        'Populate the edge cache',
        'Object storage returns the segment. The CDN caches it according to policy so later viewers can avoid origin reads.',
        'cdn-storage',
      ),
      hop(
        'cdn',
        'client',
        'Stream the segment to the viewer',
        'The client buffers the segment and chooses the next bitrate. Warm segments terminate at the edge.',
        'client-cdn',
      ),
    ],
  };
}

function chatScenario(failures: ReadonlySet<string>): SimulationScenario {
  return {
    id: 'chat',
    name: 'Send a chat message',
    description:
      'Establish an authenticated connection, persist a message, and fan it out to online or offline recipients.',
    steps: [
      ...enterOrigin(failures, true, 'A real-time session request'),
      hop(
        'services',
        'realtime',
        'Register the authenticated session',
        'A connection server associates the persistent connection with the user. Reconnects may move the session to another server.',
      ),
      hop(
        'client',
        'realtime',
        'Send on the open connection',
        'The client sends a message with a stable message ID over WebSocket. DNS and HTTP authorization are not repeated per frame.',
      ),
      hop(
        'realtime',
        'services',
        'Validate the message',
        'The connection layer passes the command to the owning service. The service checks conversation membership and deduplicates the client message ID.',
        'services-realtime',
      ),
      ...databaseRecovery(failures),
      hop(
        'services',
        'database',
        'Persist before acknowledging',
        'The message and an outbox record are committed before reporting durable acceptance. Message IDs and sequencing support replay on reconnect.',
      ),
      hop(
        'database',
        'services',
        'Confirm durable acceptance',
        'The committed message can now be acknowledged. Acceptance, delivery, and being read are separate states.',
        'services-database',
      ),
      ...brokerRecovery(failures),
      hop(
        'services',
        'kafka',
        'Publish the delivery event',
        'An outbox relay publishes the durable message event. Partition by conversation when ordered processing within a conversation is required.',
      ),
      ...consumerRecovery(failures),
      hop(
        'kafka',
        'workers',
        'Resolve recipients and fan out',
        'Delivery workers consume the event and find recipient sessions. Idempotent handling prevents replay from duplicating visible messages.',
      ),
      step(
        ['workers', 'realtime', 'notifications'],
        'Online delivery or offline notification',
        'Online recipients receive a push on their connection. Offline recipients get a notification and fetch durable history after reconnecting.',
        ['workers-realtime', 'workers-notifications'],
        1_800,
      ),
      hop(
        'realtime',
        'client',
        'Deliver to an online recipient',
        'The receiving client acknowledges delivery. If the connection drops, it resumes from stored history rather than relying on an ephemeral socket.',
        'client-realtime',
      ),
    ],
  };
}

/** Build fresh finite sequences so failure toggles never mutate shared knowledge or previous runs. */
export function getScenarios(
  failedNodes: string[] = [],
  presetId = 'production',
): SimulationScenario[] {
  const preset = getPreset(presetId);
  const visibleNodes = new Set(preset.nodes);
  const failures = new Set(failedNodes.filter((id) => visibleNodes.has(id)));
  const scenarios = [readScenario(failures, preset.id, visibleNodes), edgeHitScenario()];
  if (preset.id === 'production' || preset.id === 'ecommerce')
    scenarios.push(orderScenario(failures));
  if (preset.id === 'production' || preset.id === 'video') scenarios.push(videoScenario(failures));
  if (preset.id === 'production' || preset.id === 'chat') scenarios.push(chatScenario(failures));
  return scenarios;
}
