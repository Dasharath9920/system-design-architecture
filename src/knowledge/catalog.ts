import type { Concept, Domain, EdgeKind, Relationship } from './types';

/** The knowledge graph is independent of the rendered graph. Only expanded branches mount. */
export const concepts: Record<string, Concept> = {};
export const rootIds = [
  'client',
  'dns',
  'cdn',
  'waf',
  'load-balancer',
  'api-gateway',
  'auth',
  'services',
  'cache',
  'database',
  'storage',
  'kafka',
  'workers',
  'search',
  'realtime',
  'notifications',
  'observability',
  'infrastructure',
];

function root(
  id: string,
  name: string,
  subtitle: string,
  domain: Domain,
  icon: string,
  stage: number,
  description: string,
  why: string,
  when: string,
  tradeoffs: string,
  options: string,
  tier: Concept['tier'] = 'core',
) {
  concepts[id] = {
    id,
    name,
    subtitle,
    domain,
    icon,
    stage,
    description,
    why: why.split('^'),
    when: when.split('^'),
    tradeoffs: tradeoffs.split('^'),
    options: options.split('^'),
    related: [],
    children: [],
    kind: 'concept',
    tier,
  };
}

/** Rows contain intentional, authored explanations, never generated placeholder content. */
function branch(parent: string, rows: string, kind: Concept['kind'] = 'concept') {
  for (const row of rows.trim().split('\n')) {
    const [id, name, description, why, when, tradeoffs, options = '', related = ''] = row
      .split('|')
      .map((field) => field.trim());
    if (!id || !name || !description || !why || !when || !tradeoffs)
      throw new Error(`Incomplete knowledge entry: ${id}`);
    if (concepts[id]) throw new Error(`Duplicate knowledge entry: ${id}`);
    const p = concepts[parent];
    concepts[id] = {
      id,
      name,
      description,
      subtitle: why,
      why: why.split('^'),
      when: when.split('^'),
      tradeoffs: tradeoffs.split('^'),
      options: options ? options.split('^') : [],
      related: related ? related.split('^') : [],
      children: [],
      parent,
      domain: p.domain,
      icon: p.icon,
      kind,
      tier: 'optional',
    };
    p.children.push(id);
  }
}

root(
  'client',
  'Clients',
  'Where every request begins',
  'client',
  'monitor',
  0,
  'Browsers, apps, and devices initiate requests and present the resulting experience.',
  'Translate user intent into requests^Keep interactions responsive despite network delays',
  'Every user-facing system^Public APIs and device integrations',
  'Networks can disconnect^Client input cannot be trusted',
  'Browser^Mobile app^Desktop app^IoT device',
);
root(
  'dns',
  'DNS',
  'Names become addresses',
  'network',
  'globe',
  1,
  'DNS resolves a hostname to records that help a client locate a service; it does not forward the application request.',
  'Stable names hide changing IP addresses^Steer users toward suitable endpoints',
  'Before connecting when no usable cached answer exists',
  'TTL delays changes^Cached answers make failover non-instant',
  'Cloudflare DNS^Amazon Route 53^Google Cloud DNS^Azure DNS',
);
root(
  'cdn',
  'CDN / Edge',
  'Closer to your users',
  'network',
  'cloud',
  1,
  'An edge network serves cacheable content near users and forwards eligible misses to an origin.',
  'Reduce round-trip latency^Offload repeat requests from origin',
  'Static assets and media^Carefully configured cacheable API responses',
  'Invalidation and freshness^Private content needs safe cache keys',
  'Cloudflare^CloudFront^Fastly^Akamai^Google Cloud CDN^Azure Front Door',
  'optional',
);
root(
  'waf',
  'WAF / Shield',
  'Filter before compute',
  'security',
  'shield',
  1,
  'An edge security layer inspects incoming traffic and mitigates abusive requests before they reach application infrastructure.',
  'Protect origin capacity^Block known application attack patterns',
  'Public internet applications^Abuse-prone endpoints',
  'False positives can block users^Rules do not replace secure application code',
  'Cloudflare WAF^AWS WAF^Azure WAF',
  'optional',
);
root(
  'load-balancer',
  'Load Balancer',
  'One endpoint, many servers',
  'network',
  'network',
  2,
  'A load balancer distributes connections or requests among healthy upstream instances.',
  'Spread load across replicas^Remove unhealthy instances from rotation',
  'Multiple service instances^Rolling deployments and availability',
  'Health checks are imperfect^Stateful sessions complicate routing',
  'NGINX^HAProxy^Envoy^Cloud load balancers',
);
root(
  'api-gateway',
  'API Gateway',
  'Your public API boundary',
  'network',
  'route',
  2,
  'A gateway routes API requests and applies shared policies before handing work to application services.',
  'Centralize API routing and quotas^Provide a stable external contract',
  'Several backend APIs^External partner or mobile APIs',
  'Can become a bottleneck^Business authorization still belongs with the service',
  'Kong^AWS API Gateway^Apigee^Azure API Management',
  'optional',
);
root(
  'auth',
  'Identity & Auth',
  'Who are you? What can you do?',
  'security',
  'lock',
  2,
  'Authentication establishes identity; authorization decides whether that identity may perform an action on a resource.',
  'Protect accounts and data^Enforce resource-level permissions',
  'Private data and privileged actions^Service-to-service trust',
  'Revocation versus token caching^Identity outages can block access',
  'Keycloak^Auth0^Okta^Amazon Cognito',
);
root(
  'services',
  'Application Services',
  'Business logic lives here',
  'compute',
  'server',
  3,
  'Application code validates requests, enforces business rules, and coordinates data and downstream services.',
  'Implement product behavior^Own clear transactional boundaries',
  'Start with a cohesive application^Split services when independent ownership or scaling warrants it',
  'Distributed calls add failure modes^Microservices increase operational cost',
  'Modular monolith^Microservices^Serverless',
);
root(
  'cache',
  'Cache',
  'Fast answers, less work',
  'data',
  'zap',
  4,
  'A cache keeps reusable data close to readers to reduce latency and repeated work.',
  'Reduce database load^Accelerate frequent reads',
  'Expensive, repeated reads^Data with an explicit freshness policy',
  'Invalidation can be difficult^Miss storms can overwhelm the source',
  'Redis^Memcached^Local cache^Managed cache',
  'optional',
);
root(
  'database',
  'Database',
  'The durable source of truth',
  'data',
  'database',
  4,
  'A database stores and queries structured state under an explicit consistency and durability model.',
  'Persist business state^Enforce invariants with the right transaction model',
  'Choose by access pattern, integrity needs, and workload^Measure before adding shards',
  'Indexes trade writes for reads^Distribution adds coordination and failure complexity',
  'Relational^Document^Key-value^Distributed SQL^Graph^Analytical',
);
root(
  'storage',
  'Object Storage',
  'Files, media, and durable blobs',
  'data',
  'hard-drive',
  5,
  'Object storage keeps blobs under keys and serves them through an API rather than a mounted block device.',
  'Store large media economically^Separate binary objects from database metadata',
  'Uploads and downloads^Backups, static assets, and data lakes',
  'Not a filesystem or relational database^Egress and request costs matter',
  'Amazon S3^Google Cloud Storage^Azure Blob Storage^MinIO',
  'optional',
);
root(
  'kafka',
  'Event Streaming',
  'Write once, many consumers',
  'events',
  'radio',
  4,
  'An event streaming backbone durably records events so independent consumers can process and replay them.',
  'Decouple producer and consumer lifecycles^Retain events for replay and new consumers',
  'Event-driven workflows and CDC^High-throughput ordered streams',
  'Ordering is per partition^Retries and external effects require idempotency',
  'Apache Kafka^Apache Pulsar^Managed streaming',
  'optional',
);
root(
  'workers',
  'Background Workers',
  'Work beyond the request',
  'events',
  'workflow',
  5,
  'Workers process queued tasks or events outside the user request, with explicit retries and concurrency limits.',
  'Keep expensive work off the critical path^Absorb bursts with queues',
  'Image processing and exports^Payment workflows and data pipelines',
  'Users see delayed results^Poison messages and retries need policies',
  'Celery^Temporal^Airflow^Flink^Spark',
  'optional',
);
root(
  'search',
  'Search Index',
  'Find what matters',
  'data',
  'search',
  5,
  'A search engine maintains a derived index optimized for text relevance and retrieval.',
  'Fast full-text queries^Ranking, faceting, and filtering',
  'Product discovery and document search^Synchronize from the authoritative store',
  'Index lag means stale results^Reindexing needs time and capacity',
  'Elasticsearch^OpenSearch^Solr^Algolia',
  'optional',
);
root(
  'realtime',
  'Realtime Gateway',
  'Keep the conversation open',
  'compute',
  'message-circle',
  3,
  'A realtime gateway holds client connections and routes live updates through a messaging or fanout layer.',
  'Push updates without repeated polling^Support interactive shared state',
  'Chat and collaboration^Live dashboards and multiplayer',
  'Long-lived connections need lifecycle management^Reconnects require recovery and deduplication',
  'WebSocket^Server-Sent Events^WebRTC',
  'optional',
);
root(
  'notifications',
  'Notifications',
  'Reach users beyond the session',
  'events',
  'bell',
  5,
  'A notification pipeline sends messages through channels chosen by user preferences and delivery policies.',
  'Decouple delivery from business actions^Apply templates, consent, and retries',
  'Receipts, alerts, and updates^Asynchronous customer communication',
  'Provider acceptance is not user delivery^Duplicate prevention and rate limits matter',
  'Email^SMS^Mobile push^Web push^In-app',
  'optional',
);
root(
  'observability',
  'Observability',
  'Understand the whole system',
  'operations',
  'activity',
  6,
  'Metrics, logs, traces, and profiles explain system behavior and help engineers investigate failures.',
  'Detect user-visible degradation^Connect symptoms across service boundaries',
  'Across the entire system^Design around service objectives',
  'High-cardinality telemetry is expensive^Sampling and retention lose detail',
  'OpenTelemetry^Prometheus^Grafana^Loki^Jaeger',
);
root(
  'infrastructure',
  'Infrastructure',
  'The systems beneath the system',
  'operations',
  'box',
  6,
  'Deployment, networking, orchestration, and reliability mechanisms provide the foundation on which application components run.',
  'Repeatable deployments^Recover from machine and zone failures',
  'Choose complexity appropriate to your team^Grow from a simple deployment as needed',
  'More automation still needs ownership^Managed services trade control for operations support',
  'Containers^Kubernetes^Cloud services^CI/CD^Multi-region',
);

branch(
  'client',
  `
browser|Web Browser|Renders the application and applies browser security, networking, and caching rules.|Universal distribution|Web applications|Untrusted execution environment^Browser constraints differ from native apps|Chrome^Firefox^Safari
mobile|Mobile App|A native or hybrid client uses local storage and intermittent network connections.|Device integration|Mobile-first products|Version fragmentation^Background execution limits|Swift^Kotlin^React Native
desktop|Desktop App|An installed client integrates with the operating system and backend APIs.|Rich local capabilities|Developer tools and productivity software|Update rollout and local security|Electron^Tauri^Native
internet-of-things|IoT Devices|Constrained devices exchange telemetry and commands with backend services.|Connect physical systems|Sensors and smart devices|Limited power and unreliable links^Fleet identity management|MQTT^CoAP
third-party-clients|Third-party Clients|External applications consume documented APIs under scoped credentials.|Enable integrations|Partner ecosystems|Backward compatibility^Quota and abuse management|SDK^CLI^API client
http|HTTP Protocols|HTTP defines request and response semantics across several transport versions.|Interoperable communication|Web and API traffic|Version-specific transport behavior|HTTP/1.1^HTTP/2^HTTP/3|tls
api-styles|API Styles|An API style defines how clients express requests and consume results.|Clear contracts|Designing a client-facing interface|Different clients favor different contracts|REST^GraphQL^gRPC^Webhooks
client-resilience|Client Resilience|Clients budget time, retry selectively, and recover state after network interruptions.|Tolerate unreliable networks|Mobile and public internet clients|Retries can multiply server load|Timeouts^Backoff^Jitter|idempotency
client-caching|Client Caching|A browser or app reuses local responses according to freshness and validation rules.|Avoid repeated downloads|Cacheable resources and offline experiences|Stale data^Private data must stay scoped|Cache-Control^ETag^Service workers
serialization|Serialization|Serialization converts application data into bytes shared across process boundaries.|Cross-language communication|Every network or durable message format|Schema evolution and payload size|JSON^Protobuf^MessagePack
`,
);
branch(
  'http',
  `
http1|HTTP/1.1|Requests share persistent TCP connections; parallelism often uses multiple connections.|Broad compatibility|Legacy servers and proxies|Head-of-line blocking in a connection|Keep-alive^Connection pooling
http2|HTTP/2|Multiple request streams share one TCP connection using binary framing.|Efficient multiplexing|Many concurrent API and asset requests|TCP loss can delay all streams|Header compression|tcp
http3|HTTP/3 / QUIC|HTTP/3 uses QUIC over UDP with independently delivered streams and integrated TLS.|Reduce transport blocking|Lossy networks and connection migration|UDP paths and proxy support vary|QUIC^TLS 1.3|udp
tcp|TCP|TCP delivers an ordered reliable byte stream with congestion control.|Reliable transport|HTTP/1.1, HTTP/2, and database connections|Loss delays ordered delivery^Connection setup cost||connection-reuse
udp|UDP|UDP sends datagrams without built-in delivery or ordering guarantees.|Application-controlled transport|Realtime media, DNS, and QUIC|Applications must supply needed reliability|QUIC^RTP
connection-reuse|Connection Reuse|Keep-alive and pooling reuse established connections for later requests.|Avoid handshake overhead|Frequent calls to the same endpoint|Idle limits and stale connections|HTTP keep-alive^Connection pools
compression|Compression|Payload compression trades CPU for fewer bytes transmitted.|Reduce bandwidth|Large text responses|CPU overhead^Small payloads may not benefit|Brotli^gzip^Zstandard
`,
);
branch(
  'api-styles',
  `
rest|REST|Resource-oriented APIs commonly use HTTP methods and representations.|Familiar HTTP semantics|Public APIs and CRUD workflows|Over-fetching and many round trips|OpenAPI^JSON|pagination
graphql|GraphQL|Clients select fields from a typed graph through an API query language.|Flexible client queries|Different views need different data shapes|Query cost control^Resolver N+1 queries|Apollo^GraphQL Yoga
grpc|gRPC|Typed remote procedure calls commonly use Protobuf over HTTP/2.|Efficient service calls|Internal APIs and streaming RPC|Browser support needs adaptation^Tight schema coordination|Protobuf^Connect
webhooks|Webhooks|A producer sends HTTP callbacks to registered endpoints after events occur.|Push events to integrations|Partner notifications|Retries duplicate delivery^Verify signatures and destinations||idempotency
pagination|Pagination|Large result sets are divided into bounded pages.|Limit response cost|Lists and feeds|Concurrent writes affect page stability|Offset^Cursor^Keyset
`,
);
branch(
  'pagination',
  `
offset-pagination|Offset Pagination|Skip a number of rows before returning the next page.|Simple page numbers|Small stable datasets|Deep offsets grow expensive^Rows can shift under writes||keyset-pagination
keyset-pagination|Keyset / Cursor Pagination|Continue after a stable ordered key encoded in a cursor.|Efficient deep traversal|Large feeds and timelines|Requires deterministic ordering^Arbitrary page jumps are harder|Composite cursor^Opaque token
`,
);
branch(
  'client-resilience',
  `
client-retry|Selective Retries|Repeat a failed operation only when its semantics and failure mode permit it.|Recover transient failures|Retryable errors with a bounded attempt budget|Duplicate effects^Amplified overload||idempotency
exponential-backoff|Exponential Backoff|Increase the delay between unsuccessful attempts up to a limit.|Reduce retry pressure|Transient failures and throttling|Longer recovery latency||jitter
jitter|Jitter|Randomize retry timing so clients do not retry simultaneously.|Avoid synchronized bursts|Large client fleets|Less predictable individual timing||exponential-backoff
request-batching|Request Batching|Combine several operations in one network round trip.|Amortize network cost|Small frequent requests|Larger failure scope^Batch waiting increases latency
`,
);
branch(
  'client-caching',
  `
service-workers|Service Workers|A browser worker can intercept requests and manage offline response strategies.|Offline app shell|Progressive web apps|Cache updates need careful versioning^HTTPS required|Cache API^Background sync
offline-storage|Offline Storage|Persistent client storage holds data that can later synchronize with the backend.|Work through disconnections|Mobile field apps and offline editing|Conflict resolution^Local data security|IndexedDB^SQLite
etag|ETag Validation|Clients send a resource validator to check whether a cached representation is still current.|Avoid unchanged bodies|Resources with safe validators|Validation still costs a round trip|If-None-Match^304 response
`,
);
branch(
  'serialization',
  `
json|JSON|A text format represents objects, arrays, and primitive values.|Human-readable interchange|Public HTTP APIs|Verbose encoding^No built-in schema|JSON Schema
protobuf|Protocol Buffers|A schema defines compact binary messages with numbered fields.|Typed compact payloads|gRPC and event schemas|Field evolution rules^Binary debugging needs tools|protoc^Schema registry
messagepack|MessagePack|A binary encoding represents JSON-like data using compact typed values.|Smaller payloads|Bandwidth-sensitive integrations|Less readable^Schema conventions remain external
`,
  'technology',
);

branch(
  'dns',
  `
recursive-resolver|Recursive Resolver|A resolver looks up DNS records on behalf of a client and caches answers.|Reuse resolution work|Operating system and ISP DNS queries|Cache poisoning defenses^Privacy of query data|Unbound^Public resolvers
authoritative-dns|Authoritative DNS|Authoritative servers publish the records configured for a domain.|Control domain answers|Every hosted domain|Delegation and configuration mistakes|Route 53^Cloudflare DNS^Azure DNS
dns-ttl|DNS TTL & Caching|TTL limits how long a resolver may reuse a DNS answer before refreshing.|Reduce lookup latency|Balancing query cost and change speed|Low TTL increases queries^Cached records delay cutovers||geo-dns
geo-dns|GeoDNS|DNS policies return endpoints based on resolver or client location and health signals.|Regional routing|Multi-region service entry|Geolocation is approximate^TTL delays failover||multi-region
anycast|Anycast|Multiple sites advertise one address and network routing selects a reachable path.|Global entry point|DNS and edge networks|Routing is not application-health aware^Route changes affect connections||bgp
bgp|BGP Routing|Networks exchange reachability information to choose inter-network paths.|Connect autonomous networks|Internet routing and anycast|Policy-driven routes are not necessarily shortest|Route advertisements
`,
);
branch(
  'cdn',
  `
edge-pop|Edge Locations / PoPs|Points of presence place servers near network users.|Shorter network trips|Global delivery|Uneven regional coverage^Capacity varies by location
origin|Origin Server|The origin supplies authoritative content when the edge cannot serve a response.|Source cache misses|CDN-backed websites and APIs|Origin overload on cache misses^Restrict direct access
edge-cache|Edge Cache|A CDN stores eligible responses according to cache keys and freshness policy.|Offload the origin|Static content and safe public responses|Cache key mistakes leak or mix content|Cache-Control^Vary
cache-invalidation|Cache Invalidation|Evict or version cached data when the authoritative value changes.|Control stale reads|Mutable cached resources|Races between reads and writes^Global propagation cost|Versioned URLs^Purge API^TTL|cache-aside
edge-compute|Edge Compute|Small functions execute close to users inside the edge network.|Early routing and personalization|Lightweight request transformations|Runtime and state limits^Distributed debugging|Cloudflare Workers^Lambda@Edge
media-optimization|Image / Video Delivery|Transform images and package video into cacheable formats and chunks.|Efficient device-specific delivery|Media-heavy applications|Transcoding cost^Variant explosion|AVIF^WebP^HLS^DASH
cdn-options|CDN Implementations|Managed edge networks differ in reach, cache controls, security, and compute integration.|Outsource global delivery|Selecting a provider by measured workload|Egress economics^Provider-specific configuration|Cloudflare^CloudFront^Fastly^Akamai^Google Cloud CDN^Azure Front Door
`,
);
branch(
  'waf',
  `
ddos|DDoS Protection|Absorb or reject distributed traffic intended to exhaust network or application capacity.|Preserve service availability|Internet-facing services|Application attacks can resemble normal traffic|Anycast^Rate limits^Upstream filtering
bot-protection|Bot Protection|Signals and challenges distinguish automation from legitimate users.|Reduce automated abuse|Login, scraping, and purchasing endpoints|False positives^Accessibility and privacy concerns|Behavior signals^Challenges
request-filtering|Request Filtering|Rules inspect request attributes for suspicious or disallowed patterns.|Reject obvious malicious requests|Edge security policies|Rules can miss novel attacks^False positives|Managed rules^Custom rules
ip-filtering|IP / Geo Restrictions|Allow or deny traffic based on network addresses or approximate location.|Limit exposed audience|Private administration or regional requirements|VPNs change apparent location^Shared IPs affect many users|Allow lists^Geo policies
tls|TLS / HTTPS|TLS authenticates peers and encrypts transport between network endpoints.|Protect data in transit|Public traffic and private service calls|Certificate lifecycle^Termination creates a trust boundary|TLS 1.3^TLS 1.2|mtls
tls-termination|TLS Termination|A proxy decrypts a TLS connection and may create a new protected connection upstream.|Centralize certificate handling|Edge proxies and load balancers|Protect the backend hop too^Key exposure boundary||certificates
certificates|Certificates & Rotation|Certificates bind a public key to an identity and expire to limit trust lifetime.|Authenticated endpoints|TLS and mutual TLS|Expiry outages^Private keys need protection|ACME^Private CA
`,
);
branch(
  'load-balancer',
  `
reverse-proxy|Reverse Proxy|A proxy receives client requests and forwards them to upstream services.|Centralized routing and TLS|Application entry points|Extra hop^Proxy buffer and timeout tuning|NGINX^HAProxy^Envoy^Traefik
layer4|Layer 4 Balancing|Route transport connections without interpreting application requests.|Low overhead|TCP or UDP services|Limited application-aware routing|TCP proxy^Network load balancer
layer7|Layer 7 Balancing|Route HTTP or RPC requests using paths, headers, or other application attributes.|Precise traffic policies|HTTP APIs and web applications|Parsing overhead^Protocol support matters|HTTP reverse proxy
balancing-algorithms|Balancing Algorithms|A policy selects the next healthy upstream for each connection or request.|Distribute work predictably|Choosing how replicas share traffic|No policy knows future request cost|Round robin^Least connections^Consistent hashing
health-checks|Health Checks|Probes and passive errors identify upstreams that should stop receiving new work.|Isolate failed instances|Replicated services|False failures^Readiness and liveness mean different things
sticky-sessions|Sticky Sessions|A routing policy tries to send a client back to the same instance.|Support local session state|Legacy or specialized stateful workloads|Uneven load^Instance loss breaks affinity|Cookie affinity^IP hash
connection-draining|Connection Draining|Stop new traffic and let active requests finish before removing an instance.|Safer deployments|Rolling replacement and scale-down|Long-lived connections need deadlines
`,
);
branch(
  'balancing-algorithms',
  `
round-robin|Round Robin|Rotate evenly through eligible upstreams; weights assign different shares.|Simple distribution|Similar instance and request costs|Ignores current load|Weighted round robin
least-connections|Least Connections|Choose an upstream with fewer active connections.|Adapt to varying connection duration|Long requests or persistent connections|Connection count may not reflect CPU work
least-response-time|Least Response Time|Prefer healthy upstreams with lower observed latency, often adjusted for load.|Steer from slow instances|Variable server performance|Measurements can be noisy^Feedback can oscillate
consistent-hashing|Consistent Hashing|Map keys to servers so membership changes move only part of the keyspace.|Reduce reshuffling|Distributed caches and shard placement|Hot keys persist^Virtual nodes and rebalancing add complexity|Hash ring^Rendezvous hashing|sharding
`,
);
branch(
  'api-gateway',
  `
api-routing|API Routing|Map hostnames, paths, and versions to the service responsible for them.|Stable external endpoints|Several backend APIs|Routing configuration becomes critical
rate-limiting|Rate Limiting|Constrain request frequency to protect capacity and allocate access fairly.|Control bursts and abuse|Public APIs and expensive endpoints|Distributed counters trade precision for cost|Token bucket^Sliding window^Leaky bucket|redis
api-quotas|Quotas|Limit usage over a billing or entitlement window.|Allocate finite resources|Tenant plans and partner APIs|Enforcement and reporting can lag||multi-tenancy
api-versioning|API Versioning|Evolve contracts while providing a supported migration path for clients.|Protect existing integrations|Breaking API changes|More versions increase maintenance|URL version^Header version^Compatible evolution
api-transformation|Protocol & Payload Transformation|A gateway adapts headers, payloads, or protocols between external and internal contracts.|Bridge incompatible interfaces|Legacy integration|Hidden coupling^Transformation latency|HTTP to gRPC^Header mapping
api-composition|API Composition|An API layer combines responses from multiple services.|Fewer client round trips|Screens that need several domain resources|Tail latency^Partial failure handling||backend-for-frontend
kong|Kong|An API gateway offers routing and plugin-based policies around service APIs.|Reusable API policy|Gateway deployments|Plugin compatibility and operations|NGINX^Apigee^AWS API Gateway
`,
);
branch(
  'rate-limiting',
  `
token-bucket|Token Bucket|Requests consume replenishing tokens up to a bounded capacity.|Permit controlled bursts|APIs with average-rate limits|Shared token accounting can contend
leaky-bucket|Leaky Bucket|Drain accepted work at a steady rate from a bounded queue.|Smooth downstream traffic|Rate-sensitive providers|Queued requests add latency^Overflow must reject
fixed-window|Fixed Window|Count requests in fixed time intervals and reject beyond the limit.|Cheap counters|Simple coarse rate limits|Boundary bursts can double the instantaneous load
sliding-window|Sliding Window|Measure recent traffic with a rolling log or approximate counter.|Smoother limits|Fair per-client enforcement|Exact logs cost memory^Approximation trades precision
`,
);
branch(
  'auth',
  `
sessions|Sessions & Cookies|A browser stores an opaque session identifier while a server stores session state.|Revocable login state|First-party browser applications|Session-store availability^Protect cookies and prevent CSRF|HttpOnly^Secure^SameSite
jwt|JWT|A signed token carries claims that a verifier can validate without fetching session state.|Local verification|Short-lived identity or access assertions|Signatures do not encrypt claims^Revocation is harder|Asymmetric signatures^Short expiry
oauth|OAuth 2.0|OAuth delegates scoped access to a resource without sharing the resource owner's password.|Delegated authorization|Third-party integrations and API access|Flow configuration is security-sensitive^OAuth alone is not a login protocol|Authorization code + PKCE|oidc
oidc|OpenID Connect|OIDC adds an identity layer and ID tokens to OAuth 2.0.|Standardized login|Federated web and mobile sign-in|Validate issuer, audience, expiry, and nonce|Discovery^JWKS|oauth
saml|SAML / SSO|SAML exchanges signed identity assertions, commonly for enterprise single sign-on.|Enterprise federation|Corporate SaaS identity integration|XML complexity^Certificate rotation|Okta^Entra ID
access-control|Access Control|Authorization evaluates the actor, requested action, resource, and context.|Protect resource boundaries|Every privileged operation|Policy drift^Checks must exist at the data-owning boundary|RBAC^ABAC^ACL
api-keys|API Keys|An API key identifies a caller or integration and can carry a scoped access policy.|Simple machine access|Metered public APIs|Long-lived bearer secret^Not a substitute for user identity|Scoped keys^Rotation
mtls|Mutual TLS|Both peers present certificates so each authenticates the other.|Workload identity|Service-to-service traffic|Certificate issuance and rotation^Authorization remains separate|SPIFFE^Service mesh
refresh-tokens|Refresh Tokens|A protected long-lived credential obtains new short-lived access tokens.|Maintain sessions safely|OAuth-based clients|Theft enables persistent access^Rotate and detect reuse
revocation|Token Revocation|Invalidate access using session deletion, deny lists, token introspection, or short lifetimes.|Stop compromised access|Logout and incident response|Local token verification delays revocation|Introspection^Short expiry
identity-providers|Identity Providers|A dedicated identity system handles sign-in, federation, and identity lifecycle.|Avoid custom credential systems|Centralized identity|Provider dependency^Migration and pricing|Keycloak^Auth0^Okta^Amazon Cognito
`,
);
branch(
  'access-control',
  `
rbac|Role-Based Access|Assign permissions to roles and roles to identities.|Understandable permission bundles|Stable organizational roles|Role explosion^Resource ownership needs extra checks
abac|Attribute-Based Access|Evaluate policies using identity, resource, and environment attributes.|Context-sensitive permissions|Complex tenant or regulatory rules|Policy testing and explainability
acl|Access Control Lists|Attach explicit identities or groups and permissions to a resource.|Resource-specific sharing|Documents and collaboration|Large lists and inheritance become complex
least-privilege|Least Privilege|Grant only the permissions required for a workload or person to perform its job.|Reduce compromise impact|Every IAM boundary|Maintaining correct grants takes effort||iam
`,
);

branch(
  'services',
  `
application-server|Application Server|A process handles requests and runs domain logic using downstream dependencies.|Execute business rules|Most backend applications|Thread or event-loop saturation^Connection limits|Node.js^JVM^Go^Python
architecture-styles|Application Architecture|Choose deployment boundaries based on domain ownership and operational needs.|Manage complexity|Starting or evolving a product|Distribution is not automatically an improvement|Monolith^Modular monolith^Microservices^Serverless
service-discovery|Service Discovery|Resolve logical service names into currently available instances.|Decouple callers from changing addresses|Dynamic infrastructure|Stale membership^Discovery outages|Kubernetes DNS^Consul^Cloud Map
service-mesh|Service Mesh|Proxies provide service traffic policies, identity, and telemetry outside application code.|Consistent service networking|Many services with shared traffic requirements|Proxy overhead^Operational complexity|Istio^Linkerd^Envoy
resilience-patterns|Resilience Patterns|Bound failures with time budgets, isolation, admission control, and safe fallbacks.|Prevent cascading failures|Remote dependencies and overloaded services|Incorrect retries and fallbacks can worsen incidents|Timeout^Circuit breaker^Bulkhead
architecture-patterns|Coordination Patterns|Patterns describe explicit ways to split reads, writes, workflows, and integration boundaries.|Make coordination deliberate|Complex domain workflows|Additional infrastructure and recovery logic|CQRS^Saga^Outbox^Event sourcing
multi-tenancy|Multi-tenancy|Several customers share infrastructure with explicit identity, resource, and data isolation.|Share operating cost|SaaS applications|Noisy neighbors^Tenant data leakage risk|Shared schema^Separate schema^Database per tenant
feature-flags|Feature Flags|Configuration gates behavior independently of a code deployment.|Progressive release|Experiments and staged rollouts|Flag debt^Combinations multiply testing
`,
);
branch(
  'architecture-styles',
  `
monolith|Monolith|One deployable application owns multiple related business capabilities.|Simple operations and transactions|Small teams and cohesive workloads|Whole-app deployments^Scaling is less granular
modular-monolith|Modular Monolith|One deployable enforces internal module boundaries and explicit interfaces.|Strong boundaries with simple deployment|Growing products with evolving domains|Requires discipline^Shared process and database constraints
microservices|Microservices|Independently deployed services own specific business capabilities and data contracts.|Independent ownership and scaling|Established domain boundaries and capable operations|Network failures^Distributed data consistency|Domain services^Bounded contexts
serverless|Serverless Functions|Managed runtimes execute code on demand with provider-managed capacity.|Reduce server operations|Bursty event handlers and lightweight APIs|Cold starts^Execution and connection limits|AWS Lambda^Cloud Run functions^Azure Functions
soa|Service-Oriented Architecture|Larger reusable services expose contracts across organizational systems.|Enterprise interoperability|Shared business capabilities|Central integration layers can accumulate coupling|SOAP^REST^Message bus
event-driven|Event-Driven Architecture|Services react to published facts instead of making every action a synchronous chain.|Independent consumers|Business events and asynchronous projections|Eventual consistency^Schema evolution and replay safety||kafka
`,
);
branch(
  'resilience-patterns',
  `
timeouts|Timeouts & Deadlines|Bound how long an operation and its downstream calls may consume resources.|Release stuck work|Every remote call|Too short causes false failures^Propagate remaining budget
circuit-breaker|Circuit Breaker|Temporarily stop calls to a failing dependency and probe for recovery.|Avoid repeated doomed work|Persistent downstream failure|Tuning and state consistency^Recovery probes can surge
bulkhead|Bulkhead|Isolate pools and concurrency limits so one workload cannot exhaust all capacity.|Contain failure blast radius|Shared hosts and dependencies|Reserved capacity may be idle
backpressure|Backpressure|A slower consumer signals or enforces a limit on how much upstream work it accepts.|Keep queues and memory bounded|Streaming and async pipelines|Producers must slow down, drop, or spill
load-shedding|Load Shedding|Reject lower-priority work when accepting it would degrade all requests.|Preserve useful throughput|Overload and dependency degradation|Some requests intentionally fail|Admission control^Priority queues
fallback|Graceful Degradation|Return a safe reduced experience when a noncritical capability fails.|Preserve core user value|Recommendations or enrichment outages|Stale or incomplete results^Never fabricate successful critical writes
idempotency|Idempotency Keys|Persist an operation key and its result so a retry does not repeat the business effect.|Safe retries|Payments and resource creation|Key scope, expiry, and atomicity matter|Unique constraint^Request ledger|outbox
`,
);
branch(
  'architecture-patterns',
  `
cqrs|CQRS|Separate command handling from read models, which may share or use distinct stores.|Optimize reads and writes independently|Complex queries over domain state|Projection lag^More models to maintain|Materialized views|event-sourcing
event-sourcing|Event Sourcing|An append-only domain event history is the authoritative state from which projections are derived.|Auditable state evolution|Domains needing temporal reconstruction|Event evolution^Deletion and replay complexity|Snapshots^Projections
saga|Saga|A workflow coordinates local transactions with compensating actions when later steps fail.|Cross-service business workflows|Orders and reservations|Compensation is not a database rollback^Intermediate states are visible|Orchestration^Choreography
outbox|Transactional Outbox|Write domain state and an outgoing event record in one local database transaction.|Avoid database/message dual-write gaps|Reliable event publication after commits|Relay duplicates^Cleanup and ordering|Polling relay^CDC relay|cdc
inbox|Inbox / Deduplication|A consumer records a message identifier atomically with its local effects.|Make repeated delivery safe|At-least-once consumers|Retention and atomic boundaries matter|Unique message ID|delivery-semantics
backend-for-frontend|Backend for Frontend|A backend tailors data and operations to one client experience.|Simplify client-specific needs|Distinct mobile and web requirements|Duplicated logic^More deployments||api-composition
strangler-fig|Strangler Fig|Gradually route parts of a legacy system to replacement components.|Incremental modernization|Large risky migrations|Temporary routing and data synchronization complexity
anti-corruption-layer|Anti-Corruption Layer|An adapter translates an external model into the domain's own language.|Preserve domain boundaries|Legacy or vendor integrations|Mapping code and ongoing maintenance
sidecar|Sidecar / Ambassador|A colocated helper process supplies a capability or proxies external access for an application.|Reuse operational capabilities|Telemetry agents and network proxies|Shared lifecycle^Additional resource usage|Envoy^Log agent
`,
);
branch(
  'saga',
  `
saga-orchestration|Workflow Orchestration|A coordinator explicitly records progress and commands each step.|Visible workflow state|Long-running business processes|Coordinator availability^Workflow versioning|Temporal^State machine
saga-choreography|Event Choreography|Participants react to each other's events without one central workflow controller.|Independent participants|Short event-driven workflows|Global behavior becomes hard to trace^Cycles and duplicate events
`,
);
branch(
  'multi-tenancy',
  `
shared-schema|Shared Database / Schema|Tenant rows coexist in shared tables, scoped by a tenant key.|Efficient resource sharing|Many small tenants|Every access must enforce tenant scope^Noisy neighbors|Row-level security
tenant-schema|Schema per Tenant|Each tenant has a separate schema within a shared database.|Namespace isolation|Moderate tenant counts|Migration fanout^Shared compute still couples tenants
tenant-database|Database per Tenant|Each tenant receives a separate database or instance.|Stronger data isolation|Large or regulated tenants|Higher cost^Fleet management complexity
tenant-routing|Tenant Routing & Quotas|Resolve a tenant to its placement and apply fair resource budgets.|Control noisy neighbors|Shared SaaS infrastructure|Placement migrations^Distributed quota accounting
`,
);

branch(
  'cache',
  `
local-cache|Local / In-process Cache|A process stores frequently used values in its own memory.|No network hop|Small hot reference data|Each replica holds a separate copy^Invalidation across instances|Caffeine^LRU map
distributed-cache|Distributed Cache|Multiple application instances share a network-accessible cache.|Shared hot data|Horizontally scaled services|Network hop^Shared outage impact|Redis^Memcached^Hazelcast
cache-strategies|Caching Strategies|Choose who loads the cache and when writes reach the authoritative store.|Make freshness explicit|Any mutable cached data|Each strategy has distinct failure windows|Cache-aside^Read-through^Write-through^Write-behind
cache-eviction|TTL & Eviction|Expiration limits freshness while eviction reclaims memory under pressure.|Bound memory and staleness|Finite cache capacity|Eviction can remove hot data^TTL is not a correctness guarantee|LRU^LFU^FIFO
cache-failures|Cache Failure Modes|Miss bursts, hot keys, and invalidation races can overwhelm caches or their sources.|Design safe failure behavior|High-traffic cached systems|A cache can hide insufficient database capacity|Request coalescing^Jittered TTL^Negative caching
redis|Redis|Redis provides in-memory data structures with optional persistence, replication, and sharding.|Fast shared state|Caching, counters, sessions, and leaderboards|Memory cost^Durability and failover depend on configuration|Memcached^Valkey^Managed Redis
memcached|Memcached|A lightweight distributed cache stores opaque values by key.|Simple ephemeral caching|Read-heavy web applications|No built-in persistence^Client-managed sharding|Redis^Local cache
managed-cache|Managed Cache Services|Cloud providers operate cache instances, maintenance, monitoring, and failover tooling.|Lower operating burden|Teams using managed infrastructure|Provider limits and pricing^Application caching policy is still yours|Amazon ElastiCache^Google Memorystore^Azure Managed Redis
`,
);
branch(
  'cache-strategies',
  `
cache-aside|Cache-aside|The application checks cache, reads the database on a miss, then fills the cache.|Cache only requested data|Read-heavy workloads|Stale read/write races^Misses are slower||cache-invalidation
read-through|Read-through|A cache loader obtains missing values from the backing store on the caller's behalf.|Centralize loading|Shared cache access abstraction|Loader coupling^Cold misses still hit the source
write-through|Write-through|Writes pass through a cache layer that synchronously updates the backing store.|Simplify read freshness|Workloads favoring predictable cache contents|Higher write latency^Failure coordination is required
write-behind|Write-behind|A cache acknowledges writes before asynchronously persisting them to the store.|Absorb write bursts|Loss-tolerant or carefully durable write buffers|Data loss window^Ordering and recovery complexity
refresh-ahead|Refresh-ahead|Refresh likely-to-be-read entries before they expire.|Avoid hot-key miss latency|Predictably popular data|Unused refresh work^Source pressure
`,
);
branch(
  'cache-eviction',
  `
lru|Least Recently Used|Evict entries that have gone the longest without access.|Favor recent working sets|Temporal locality|Scans can displace useful entries|Approximate LRU
lfu|Least Frequently Used|Evict entries with low observed access frequency, often with aging.|Retain persistent hot items|Stable popularity distributions|Tracking cost^Old popularity needs decay
fifo|First In, First Out|Evict entries in insertion order regardless of later reads.|Cheap bookkeeping|Simple bounded buffers|May evict frequently used data
cache-ttl|Cache TTL|A time-to-live expires an entry after a configured period.|Bound stale lifetime|Data with tolerable staleness|Simultaneous expiry causes bursts^Early invalidation may still be needed||cache-stampede
`,
);
branch(
  'cache-failures',
  `
cache-stampede|Cache Stampede|Many requests miss the same popular key and all reload it concurrently.|Identify amplification risk|Popular keys at expiry|Locks can block readers^Stale data needs an explicit policy|Single-flight^Stale-while-revalidate^Jitter
cache-penetration|Cache Penetration|Repeated requests for absent values bypass a cache that only stores hits.|Protect the database from misses|Invalid IDs and bot traffic|Negative entries delay newly created data|Negative caching^Bloom filter|bloom-filter
cache-avalanche|Cache Avalanche|Many keys or cache nodes disappear together, sending a wave of reads downstream.|Plan correlated failure capacity|Bulk expirations and cache outages|Database fallback can itself fail|Staggered TTL^Load shedding
hot-keys|Hot Keys|A small number of keys receive a disproportionate share of requests.|Spot uneven load|Viral content and global counters|Adding shards does not split one key|Local cache^Read replicas^Key splitting
`,
);
branch(
  'redis',
  `
redis-data|Redis Data Structures|Native structures support operations close to the data rather than round-tripping whole documents.|Atomic structure operations|Counters, sets, rankings, and sessions|Large operations can block command processing|Strings^Hashes^Lists^Sets^Sorted sets
redis-persistence|Redis Persistence|RDB snapshots and an append-only file provide different restart recovery and durability trade-offs.|Recover memory contents|Redis state that should survive a restart|Disk and fork overhead^Policy determines potential data loss|RDB^AOF
redis-replication|Redis Replication|A primary streams updates to replicas asynchronously by default.|Read replicas and failover copies|Higher Redis availability|Acknowledged writes may be lost on failover^WAIT does not provide strong consistency||redis-sentinel
redis-cluster|Redis Cluster|Keys map into 16,384 hash slots distributed among primaries with replica-based failover.|Scale memory and throughput|Datasets beyond one Redis server|Multi-key operations need the same slot^Resharding and hot keys|Hash tags^Slot migration
redis-sentinel|Redis Sentinel|Sentinel monitors a non-clustered Redis deployment and coordinates primary failover.|Automated recovery|Redis primary with replicas|Quorum and discovery configuration^Async replication may lose writes
redis-pubsub|Redis Pub/Sub|Publishers deliver transient messages to currently subscribed connections.|Low-latency fanout|Ephemeral live updates|Messages are not retained^Disconnected subscribers miss delivery||redis-streams
redis-streams|Redis Streams|Append-only entries support IDs, consumer groups, acknowledgments, and pending-message recovery.|Durable-style event processing|Moderate event or work streams|Retention consumes memory/storage^Delivery requires explicit acknowledgment policy||kafka
redis-use-cases|Redis Use Cases|Redis commonly stores cached objects, sessions, rate counters, and sorted rankings.|Fast shared operations|Bounded low-latency state|Avoid treating all memory state as equally disposable|Rate limits^Leaderboard^Session store
`,
);
branch(
  'redis-cluster',
  `
redis-primary|Redis Shard Primary|A primary handles commands for its assigned hash slots and streams writes to replicas.|Partition write responsibility|Redis Cluster deployments|One hot slot can bottleneck|Shard 1^Shard 2^Shard 3
redis-replica|Redis Shard Replica|A replica follows a primary and may be promoted after a failure.|Recover a failed shard|High-availability clusters|Replica lag^Promotion needs a surviving cluster majority
redis-slots|Hash Slot Distribution|CRC16-based slot mapping routes keys; hash tags colocate selected keys.|Predictable client routing|Multi-key Redis Cluster operations|Hot tags concentrate traffic^Not a generic consistent-hash ring
`,
);

branch(
  'database',
  `
relational|Relational Databases|Tables, constraints, joins, and transactions support structured business data.|Enforce data integrity|Transactional records and flexible queries|Schema evolution^Write scaling needs design|PostgreSQL^MySQL^SQL Server^Oracle
nosql|NoSQL Databases|Non-relational models organize data around documents, keys, or column families.|Access-pattern flexibility|Workloads with clear model-specific needs|Transaction and consistency behavior vary by product|MongoDB^DynamoDB^Cassandra^Couchbase
distributed-sql|Distributed SQL|SQL databases distribute data and coordinate transactions across nodes.|SQL with horizontal resilience|Transactional workloads beyond one machine or region|Consensus latency^Cross-range transaction cost|CockroachDB^Google Spanner^TiDB
graph-database|Graph Databases|Nodes and relationships model highly connected data for traversal.|Efficient relationship exploration|Fraud graphs and recommendations|Partitioning traversals is difficult|Neo4j^Amazon Neptune
time-series|Time-series Databases|Time-oriented storage supports ingest, retention, and windowed queries.|Efficient temporal analysis|Telemetry and sensor measurements|Cardinality and retention design|TimescaleDB^InfluxDB
analytical-database|Analytical / Columnar|Column-oriented engines scan and aggregate many records efficiently.|Fast analytical queries|Warehouses and event analytics|Usually unsuitable for frequent individual row updates|ClickHouse^BigQuery^Snowflake^Redshift
replication|Replication|Maintain copies of data on multiple nodes for availability, read capacity, or locality.|Survive node loss^Scale eligible reads|Availability and locality requirements|Replica lag^Replication is not an independent backup|Leader/follower^Multi-leader^Leaderless
sharding|Partitioning & Sharding|Divide a dataset by a key; sharding places partitions on separate servers.|Distribute data and write load|After measuring a single-store limit|Cross-shard queries and transactions^Rebalancing complexity|Range^Hash^Directory
transactions|Transactions & Concurrency|Group state changes with defined atomicity and isolation while coordinating concurrent work.|Protect business invariants|Related writes that must succeed together|Contention^Isolation semantics vary by engine|ACID^MVCC^Locks
indexes|Indexes & Query Planning|Extra data structures narrow reads so queries avoid scanning every record.|Accelerate selective queries|Frequent filters, joins, and ordering|Storage and write amplification^Wrong indexes add cost|B-tree^Hash^LSM^Composite
backup-recovery|Backup & Recovery|Independent recoverable copies and logs restore data after loss or corruption.|Recover from destructive mistakes|Every durable production datastore|Backups require restore testing^Recovery takes time|Snapshots^PITR^Off-site copies
distributed-systems|Distributed Fundamentals|Independent machines coordinate under delay, partial failure, and uncertain clocks.|Reason about failure correctly|Any replicated or distributed system|Coordination trades latency and availability|Consistency^Consensus^Quorums^Clocks
schema-design|Schema & Data Modeling|Choose entities, relationships, constraints, and migrations around real access patterns.|Preserve meaning as data grows|Every persistent application|Read convenience and write integrity can conflict|Normalization^Denormalization^Materialized views
`,
);
branch(
  'relational',
  `
postgresql|PostgreSQL|A relational database combines SQL, transactions, extensibility, and a mature storage engine.|Strong transactional foundation|General-purpose business applications|Connection and vacuum tuning^Horizontal writes require additional design|MySQL^SQL Server^Oracle
mysql|MySQL|A relational database commonly uses InnoDB for transactional tables and replication.|Broad operational ecosystem|Web applications and transactional workloads|Engine-specific behavior^Schema migration planning|MariaDB^PostgreSQL
sql-server|Microsoft SQL Server|A relational database integrates SQL transactions, administration, and analytics tooling.|Integrated enterprise data platform|Microsoft-centered organizations|Licensing and operational footprint|Azure SQL
oracle|Oracle Database|An enterprise relational system supports advanced transactions, availability, and administration.|Mature enterprise capabilities|Existing Oracle workloads|Licensing complexity^Specialized operations
`,
  'technology',
);
branch(
  'postgresql',
  `
connection-pool|Connection Pool / PgBouncer|Reuse a bounded set of database connections instead of opening one per request.|Protect connection capacity|Many application instances|Pool saturation^Transaction pooling restricts session state|PgBouncer^Driver pool
pg-primary|PostgreSQL Primary|The writable server records changes in WAL and sends them to replicas.|Single write authority|Standard PostgreSQL replication|Write capacity remains concentrated^Fence the old primary on failover
pg-replica|PostgreSQL Read Replica|A standby replays WAL and can serve eligible read-only queries.|Offload reads|Read-heavy workloads tolerating lag|Stale reads^Long queries can conflict with WAL replay
wal|Write-Ahead Log|Record durable change information before related data pages are written.|Crash recovery and replication|Transactional storage engines|Log retention and I/O cost|WAL archive^Replication stream
pg-mvcc|MVCC & Vacuum|PostgreSQL keeps row versions for snapshots; vacuum reclaims dead tuples when safe.|Concurrent readers and writers|OLTP applications|Long transactions delay cleanup^Bloat needs management||mvcc
pg-partitioning|PostgreSQL Partitioning|Declarative partitioning splits a table into local child tables by a key.|Prune scans and manage retention|Large time-based tables|Does not itself distribute writes across servers^Partition key constraints|Range^List^Hash
pg-replication|PostgreSQL Replication Modes|Physical replication replays storage changes; logical replication publishes row-level changes.|Choose copy granularity|Standbys, migrations, and data integrations|Logical schema changes need coordination^Slots can retain WAL|Streaming^Logical publication/subscription|replication
pg-failover|PostgreSQL Failover|A standby is promoted after verifying the old primary cannot continue serving writes.|Restore write availability|Primary failure with an eligible standby|Lost async writes^Clients must reconnect|Patroni^Managed database failover|fencing-tokens
cdc|Change Data Capture|Capture committed database changes as a stream for downstream systems.|Keep derived systems in sync|Search indexing, outbox relay, and analytics|Schema evolution^Connector lag and duplicate delivery|Debezium^Logical decoding|kafka
`,
);
branch(
  'nosql',
  `
document-database|Document Databases|Nested document records colocate related fields and support document-oriented queries.|Flexible aggregate data|Catalogs and content models|Duplication across documents^Unbounded documents are costly|MongoDB^CouchDB^Couchbase
key-value|Key-value Databases|Look up a value by its key using an access model optimized for direct retrieval.|Predictable lookups|Sessions, carts, and keyed entities|Limited ad-hoc querying^Key design matters|DynamoDB^Redis
wide-column|Wide-column Databases|Partitioned rows with clustering columns support scalable key-oriented queries.|High write throughput|Large distributed event and time-oriented workloads|Design tables per query^Hot partitions|Cassandra^HBase
mongodb|MongoDB|A document database offers indexed queries, replication, sharding, and transactions.|Rich document access|Evolving nested domain objects|Shard-key design^Distributed transaction overhead|Couchbase^CouchDB
dynamodb|Amazon DynamoDB|A managed key-value and document service partitions data around keys.|Managed high-scale access|Known key-based access patterns|Hot-key limits^Index and consistency constraints|Global secondary indexes^Streams
cassandra|Apache Cassandra|A distributed wide-column database uses partition keys, replication, and tunable consistency.|Available multi-node writes|High-volume predictable queries|Repair operations^Data modeling around queries|Quorums^Compaction
`,
);
branch(
  'distributed-sql',
  `
cockroachdb|CockroachDB|A distributed SQL database replicates ranges with consensus and supports distributed transactions.|Resilient SQL scale|Transactional multi-zone workloads|Coordination latency^Locality requires design|Regional tables^Multi-region tables
spanner|Google Spanner|A managed distributed database combines transactions with replicated storage and bounded clock uncertainty.|Global transactional consistency|Large relational workloads needing regional resilience|Cost^Cross-region latency and locality choices|TrueTime^GoogleSQL
 tidb|TiDB|TiDB separates a MySQL-compatible SQL layer from distributed transactional storage.|Scale compute and storage independently|Large MySQL-compatible workloads|Operational complexity^Compatibility differences|TiKV^TiFlash
`,
  'technology',
);
branch(
  'replication',
  `
synchronous-replication|Synchronous Replication|A commit waits for configured replica acknowledgment before returning success.|Reduce acknowledged data loss|Strong durability objectives|Higher write latency^Unavailable replicas may block writes
asynchronous-replication|Asynchronous Replication|A primary acknowledges writes before followers necessarily receive them.|Low write latency|Read scaling and distant replicas|Failover can lose recent writes^Reads may be stale
leader-follower|Leader / Follower|One leader orders writes and followers copy its log or state.|Simple write coordination|Most primary/replica databases|Leader bottleneck^Election and fencing on failure
multi-leader|Multi-leader|Several writable leaders exchange changes and reconcile conflicting writes.|Local writes across sites|Disconnected or geographically distributed use cases|Conflict resolution^Global invariants are difficult
leaderless|Leaderless Replication|Clients or coordinators contact several replicas and reconcile versions.|Configurable availability|Dynamo-style systems|Read repair and conflict semantics^Quorum overlap alone is not linearizability
replication-lag|Replication Lag|A replica trails the primary by time, bytes, or log position.|Measure stale-read exposure|Read replicas and CDC|A small time metric can hide stalled workload patterns||read-your-writes
read-routing|Read Routing|Choose primary or replicas based on freshness and workload requirements.|Scale safe reads|Reports and cache refreshes|Session consistency^Replica health and lag checks
`,
);
branch(
  'sharding',
  `
horizontal-partitioning|Horizontal Partitioning|Split rows into partitions that retain the same schema.|Manage large tables|Retention and partition pruning|Partition count overhead^May still use one server
vertical-partitioning|Vertical Partitioning|Separate columns or related data into different tables or stores.|Isolate large or rarely used fields|Distinct access and security needs|Joins or additional lookups
range-sharding|Range Sharding|Assign contiguous key ranges to shards.|Efficient ordered scans|Time or lexicographic access|Sequential writes may hotspot the newest range
hash-sharding|Hash Sharding|Hash a key to spread records across shards.|Even key distribution|Point reads and distributed writes|Range queries scatter across shards^Popular keys still hotspot
 directory-sharding|Directory-based Sharding|A mapping service records which shard owns each entity or tenant.|Flexible placement|Tenant isolation and migrations|Directory availability^Mapping cache invalidation
rebalancing|Shard Rebalancing|Move partition ownership and data while preserving correct routing.|Adapt capacity|Adding nodes and repairing imbalance|Migration traffic^Concurrent-write coordination
hot-partitions|Hot Partitions|A partition receives much more traffic or data than its peers.|Identify uneven scaling|Skewed tenant or timestamp workloads|More shards do not automatically split a single hot key|Salting^Adaptive partitioning
`,
);
branch(
  'transactions',
  `
acid|ACID|Atomicity, consistency, isolation, and durability define transaction guarantees; consistency means application invariants.|Precise transaction reasoning|Integrity-sensitive writes|Guarantees depend on configuration and isolation
isolation-levels|Isolation Levels|Isolation controls which effects concurrent transactions may observe.|Trade concurrency for protection|Transactions with competing reads and writes|Names do not imply identical engine behavior|Read committed^Repeatable read^Serializable
mvcc|Multi-Version Concurrency Control|Readers observe eligible row versions instead of blocking every writer.|Concurrent snapshots|Read/write transactional workloads|Version cleanup^Snapshot visibility rules
optimistic-concurrency|Optimistic Concurrency|Validate a version or predicate at commit and retry if concurrent changes conflict.|Avoid long-held locks|Low-contention updates|Conflicting work is repeated|Compare-and-swap^Version column
pessimistic-concurrency|Pessimistic Locking|Acquire locks before modifying contested data.|Serialize conflicting operations|High-contention invariant checks|Blocking^Deadlocks and lock timeouts
2pc|Two-Phase Commit|A coordinator asks participants to prepare, then records and distributes a commit or abort decision.|Atomic cross-resource commit|Compatible transactional resource managers|Prepared participants can block during coordinator failure||saga
3pc|Three-Phase Commit|An added pre-commit phase reduces some blocking under restrictive timing and failure assumptions.|Study transaction coordination limits|Conceptual comparison to 2PC|Not partition-safe under general asynchronous failures^Uncommon in practice
`,
);
branch(
  'indexes',
  `
btree|B-tree Index|A balanced ordered tree supports equality and range lookups.|Efficient ordered access|Transactional database queries|Random writes and page splits
lsm-tree|LSM Tree|Buffer writes and merge sorted disk runs through compaction.|High sustained writes|Write-heavy storage engines|Read and space amplification^Compaction cost
hash-index|Hash Index|A hash maps exact keys to candidate records.|Equality lookup|Exact-match workloads|No range ordering^Collisions and resizing
composite-index|Composite Index|Index multiple columns in a defined order.|Match common filter and sort patterns|Multi-column queries|Column order matters^Redundant indexes cost writes
query-optimization|Query Optimization|A planner chooses access paths and join strategies using costs and statistics.|Avoid expensive execution plans|Slow or growing query workloads|Stale statistics^Parameter-sensitive plans|EXPLAIN^Query profiling
bloom-filter|Bloom Filter|A compact probabilistic structure can prove a key is absent but may falsely suggest presence.|Skip unnecessary lookups|LSM runs and cache penetration defenses|False positives^Standard filters do not support deletions
`,
);
branch(
  'backup-recovery',
  `
snapshots|Snapshots|Capture storage or database state at a point in time with the provider's consistency guarantees.|Fast baseline copies|Backups and cloning|Crash-consistent may not mean application-consistent^Shared failure domains
pitr|Point-in-Time Recovery|Replay archived logs from a base backup to a chosen recovery point.|Recover before accidental changes|Durable transactional systems|Continuous log archival^Restore duration
restore-testing|Restore Testing|Regularly restore backups and verify the application can use the recovered data.|Prove recovery works|Disaster recovery practice|Test infrastructure and time|Recovery drills
`,
);
branch(
  'schema-design',
  `
normalization|Normalization|Separate facts so each is represented in a well-defined place.|Reduce update anomalies|Transactional source data|Joins can add read cost
denormalization|Denormalization|Duplicate selected data to match important read patterns.|Faster reads|Feeds and distributed read models|Synchronization and stale copies
materialized-views|Materialized Views|Store a query's result and refresh it periodically or incrementally.|Avoid repeated expensive queries|Dashboards and projections|Refresh cost^Staleness between updates
schema-migration|Schema Migration|Version data structures and deploy compatible changes across running clients.|Safe model evolution|Changing production schemas|Locks and backfills^Old and new code may overlap|Expand-contract^Online backfill
`,
);

branch(
  'distributed-systems',
  `
cap|CAP Theorem|During a network partition, a distributed register cannot guarantee both linearizable consistency and a response to every request.|Clarify partition behavior|Designing replicated systems|Not a general pick-two checklist^Availability has a specific formal meaning|CP behavior^AP behavior
pacelc|PACELC|During partitions systems trade availability and consistency; otherwise replication often trades latency and consistency.|Include normal-operation latency|Evaluating distributed data stores|A framing model rather than a full system specification
consistency-models|Consistency Models|A consistency model defines which observations of concurrent data are allowed.|Specify what users can rely on|Replicated and cached data|Stronger guarantees require coordination|Linearizable^Causal^Eventual^Read-your-writes
consensus|Consensus|Nodes agree on an ordered decision despite failures under a defined fault model.|One coherent replicated history|Metadata, elections, and replicated logs|Quorum loss stops progress^Network latency limits throughput|Raft^Paxos
quorums|Quorums / N, R, W|With N replicas, read and write acknowledgments may overlap when R + W exceeds N under specific assumptions.|Reason about replica overlap|Tunable replicated stores|Overlap alone does not imply linearizability^Sloppy quorums and conflicts change guarantees
network-partitions|Network Partitions|Some nodes cannot communicate even while both sides remain alive.|Plan partial failures|Every distributed deployment|No timeout can perfectly distinguish failure from delay
split-brain|Split Brain|Multiple nodes incorrectly act as the sole authority at the same time.|Prevent conflicting writes|Failover and leader-based systems|Detection is insufficient without fencing||fencing-tokens
leader-election|Leader Election|Participants choose a coordinator with a protocol that prevents conflicting authority.|Coordinate shared work|Replicated logs and schedulers|Election delays^Old leaders must lose authority||consensus
logical-clocks|Logical Clocks|Counters encode causal ordering without depending on synchronized wall clocks.|Order distributed events|Replication and conflict reasoning|Do not measure elapsed physical time|Lamport clocks^Vector clocks
clock-sync|Clock Synchronization|NTP or PTP estimates wall-clock time while accounting for uncertainty and drift.|Comparable timestamps|Operations and expiry policies|Clocks can jump^Use monotonic clocks for durations
failure-detection|Failure Detection|Heartbeats and timeouts suspect failed peers based on missing responses.|Trigger recovery|Membership and failover|Slow nodes can be falsely suspected|Heartbeats^Phi-accrual detectors
distributed-locks|Distributed Locks|A coordination service grants temporary exclusive ownership over shared work.|Serialize critical activity|Schedulers and cross-process coordination|Lock expiry does not stop a paused old owner|Leases^Fencing tokens
 gossip|Gossip Protocols|Nodes periodically exchange membership or state with selected peers.|Scalable dissemination|Cluster membership and anti-entropy|Convergence is delayed^Not a consensus protocol
merkle-tree|Merkle Trees|A hierarchy of hashes identifies which portions of two datasets differ.|Efficient replica comparison|Anti-entropy repair and integrity checks|Tree maintenance cost^Comparison does not resolve conflicts
`,
);
branch(
  'consistency-models',
  `
linearizability|Linearizability|Each operation appears to occur atomically between its invocation and response, respecting real-time order.|Single-copy behavior|Locks, counters, and critical state|Coordination latency^Partitions can make operations unavailable
strong-consistency|Strong Consistency|An umbrella term that needs a precise model such as linearizability or strict serializability.|Ask for explicit guarantees|Product requirement discussions|Marketing usage is ambiguous|Linearizability^Strict serializability
eventual-consistency|Eventual Consistency|If updates stop and communication continues, replicas eventually converge under the system's reconciliation rules.|Available distributed reads|Feeds and noncritical projections|No bounded staleness guarantee by itself
causal-consistency|Causal Consistency|Operations that depend on each other are observed in causal order.|Preserve meaningful dependencies|Replies, collaboration, and shared workflows|Metadata cost^Concurrent writes still need rules
read-your-writes|Read-your-writes|A client observes its own completed writes in subsequent reads.|Avoid confusing post-write views|Profiles, carts, and user settings|Session routing or position tracking|Primary reads^Replica catch-up
base|BASE|Basically available, soft state, and eventual consistency describe a loose design philosophy.|Name availability-oriented designs|Comparing system behaviors|Not a precise consistency contract^Product guarantees still matter
`,
);
branch(
  'consensus',
  `
raft|Raft|An elected leader replicates log entries and commits them with a majority under Raft's safety rules.|Understandable replicated consensus|etcd and distributed metadata|Needs a majority for progress^Leader and log maintenance|etcd^KRaft
paxos|Paxos|Quorum-based voting lets nodes agree on a value despite failures; variants replicate sequences.|Foundation for consensus systems|Distributed coordination|Implementation complexity^Liveness requires eventual favorable conditions
`,
  'pattern',
);
branch(
  'logical-clocks',
  `
lamport-clocks|Lamport Clocks|Increment counters locally and advance them on received events to preserve happened-before order.|Simple causal ordering aid|Distributed event labeling|An ordered timestamp does not prove causation
vector-clocks|Vector Clocks|Per-participant counters distinguish causal ancestry from concurrent histories.|Detect concurrent updates|Conflict-aware replication|Metadata grows with participants^Conflict resolution remains separate
`,
);
branch(
  'distributed-locks',
  `
leases|Leases|An owner holds authority for a limited duration that must be renewed.|Recover abandoned ownership|Leader and lock services|Clock and pause assumptions^Expiry does not cancel outstanding work
fencing-tokens|Fencing Tokens|Every new owner receives an increasing token; the protected resource rejects operations with an older token.|Block stale owners|Lease-based writes to shared resources|The resource must enforce token ordering||split-brain
`,
);

branch(
  'kafka',
  `
apache-kafka|Apache Kafka|A distributed event log retains partitioned records so independent consumer groups can process and replay them.|Durable replayable streams|High-throughput domain events, CDC, and stream processing|Partition-level ordering^Operational complexity and consumer lag|Apache Pulsar^Managed Kafka
kafka-producer|Producer|A producer writes keyed records to topics using batching, acknowledgments, and retry policies.|Publish durable facts|Application events and CDC|Retries and partition selection affect ordering|Idempotent producer^acks=all
kafka-broker|Broker|A Kafka broker stores partition replicas and serves producer and consumer requests.|Distributed log storage|Kafka clusters|Disk, network, and partition-count limits
kafka-topic|Topic|A named stream groups records with a shared retention and partitioning policy.|Organize event contracts|Domain event families|Too many topics and partitions cost resources
kafka-partition|Partitions|A partition is an ordered append-only log; a key usually chooses the target partition.|Parallelize stream throughput|Scaling producers and consumers|Order is only within a partition^Hot keys concentrate load
kafka-consumer-group|Consumer Group|Consumers share partition ownership so each partition is assigned to at most one group member at a time.|Parallel processing per application|Independent downstream processors|Extra consumers can idle^Rebalances interrupt work
kafka-consumer|Consumer|A consumer polls assigned partitions, processes records, and tracks progress.|Independent stream processing|Notifications, projections, and analytics|Slow handlers create lag^Effects and commits must be coordinated
kafka-offsets|Offsets & Commits|An offset identifies a position in a partition; a committed offset marks where a group resumes.|Restart and replay|Reliable consumers|Commit before work risks loss^Commit after work can replay duplicates
kafka-replication|Kafka Replication & ISR|Each partition has a leader and replicas; in-sync replicas track the leader closely enough for membership in the ISR.|Durable partition availability|Production Kafka topics|acks=all relies on ISR and min.insync.replicas^Replication adds bandwidth
kafka-rebalance|Consumer Rebalance|A coordinator redistributes partition assignments as consumers join, leave, or change subscriptions.|Recover and scale processing|Consumer group membership changes|Processing pauses^In-flight work can repeat
kafka-retention|Retention & Replay|Kafka retains records by time or size independently of whether consumers have read them.|Replay past events|Recovery and new projections|Retention can expire unread data^Storage planning
kafka-compaction|Log Compaction|Kafka eventually retains the latest record for each key, with tombstones representing deletion.|Rebuild current keyed state|Changelogs and compacted reference topics|Not immediate deduplication^Intermediate events may disappear
kraft|KRaft Metadata|Kafka's Raft-based controllers manage cluster metadata; ZooKeeper belongs to older Kafka architectures.|Remove external metadata coordination|Modern Kafka deployments|Controller quorum availability^Legacy migration planning|Controller quorum^Metadata log
messaging-patterns|Messaging Patterns|Queues, publish/subscribe buses, and retained streams offer different consumption contracts.|Match delivery to work|Asynchronous communication design|A stream is not simply a task queue|Work queue^Pub/sub^Event stream
messaging-technologies|Messaging Implementations|Brokers and managed services differ in replay, routing, ordering, and operational responsibilities.|Choose by workload|Selecting asynchronous infrastructure|No universal best broker|RabbitMQ^Pulsar^SQS^SNS^Google Pub/Sub^NATS
schema-registry|Schema Registry|Store versioned message schemas and validate compatibility policies.|Evolve event contracts|Many producers and consumers|Governance overhead^Compatibility is not business-semantic equivalence|Avro^Protobuf^JSON Schema
delivery-semantics|Delivery Semantics|Delivery contracts describe what happens when publication, processing, or acknowledgment fails.|Make retries safe|Every messaging workflow|Broker delivery does not define end-to-end effects|At-most-once^At-least-once^Exactly-once scope
`,
);
branch(
  'messaging-patterns',
  `
message-queue|Message Queue|Competing workers receive tasks with acknowledgments and redelivery after failure.|Distribute background work|Emails, exports, and task execution|Duplicate delivery^Poison messages|RabbitMQ^SQS^Service Bus
pubsub|Publish / Subscribe|One publication reaches multiple independent subscriptions.|Fan out events|Independent reactions to a fact|Subscriber lag and delivery policy vary|SNS^Google Pub/Sub^NATS
queue-ack|Acknowledgment|A consumer tells a broker that a delivery reached the required processing point.|Recover unfinished work|Durable work queues|Ack timing decides loss versus duplicate risk
 dead-letter-queue|Dead-letter Queue|Repeatedly failing messages are isolated for investigation and controlled replay.|Stop poison-message loops|Bounded retry policies|A DLQ needs ownership^Replay can duplicate effects
retry-queue|Retry / Delayed Queue|Failed or scheduled work waits until a future delivery time.|Space out retries|Transient provider failures|Ordering changes^Long backlogs need monitoring
`,
);
branch(
  'messaging-technologies',
  `
rabbitmq|RabbitMQ|A broker routes messages through exchanges into queues with consumer acknowledgments.|Flexible work routing|Task processing and integration|Broker and queue topology tuning|AMQP^Quorum queues
pulsar|Apache Pulsar|A messaging platform separates brokers from durable segment storage and supports several subscription modes.|Multi-tenant messaging|Streams and queue-like consumption|More infrastructure components|BookKeeper^Tiered storage
sqs|Amazon SQS|A managed queue offers standard or FIFO delivery options with visibility timeouts.|Managed background tasks|AWS asynchronous workers|Standard queues can duplicate and reorder^Visibility requires tuning|Standard^FIFO
sns|Amazon SNS|A managed topic service pushes messages to multiple endpoint subscriptions.|Managed event fanout|AWS notifications and queue fanout|Endpoint delivery constraints|SQS subscriptions^HTTP endpoints
google-pubsub|Google Cloud Pub/Sub|Managed topics and subscriptions deliver events through pull or push consumption.|Elastic managed messaging|Google Cloud event pipelines|Ordering and delivery guarantees require configuration
azure-service-bus|Azure Service Bus|A managed enterprise broker provides queues, topics, sessions, and dead-lettering.|Managed business messaging|Azure integrations|Service tier and quota constraints
nats|NATS / JetStream|Core NATS offers lightweight messaging; JetStream adds retained streams and consumer state.|Low-latency messaging|Service messaging and event systems|Core NATS and JetStream have different durability contracts
`,
  'technology',
);
branch(
  'delivery-semantics',
  `
at-most-once|At-most-once|An operation may be lost but is not intentionally retried after uncertain delivery.|Avoid repeated processing|Loss-tolerant telemetry|Messages can disappear on failure
at-least-once|At-least-once|Retry until delivery or processing is acknowledged, allowing duplicates.|Avoid silent loss|Durable work with idempotent handlers|Duplicate effects unless deduplicated||inbox
exactly-once|Exactly-once Processing Scope|Exactly-once effects require a defined transactional boundary; Kafka transactions can atomically couple Kafka reads and writes.|Reason about duplicate-free results|Transactional stream pipelines|External databases and APIs need their own coordination^Not a universal delivery promise|Kafka transactions^Idempotent sink
`,
);

branch(
  'workers',
  `
worker-pool|Worker Pools|A bounded set of processes consumes work with controlled concurrency.|Match work to capacity|CPU or I/O background tasks|Too much concurrency overloads dependencies
job-scheduling|Task Scheduling|Schedules create work at a deadline or recurring interval.|Automate repeated tasks|Reports, cleanup, and reminders|Clock changes and overlapping runs|Cron^Delayed queues^Scheduler service
workflow-engine|Workflow Engines|Persist workflow progress so long-running operations can retry and resume after failures.|Durable coordination|Multi-step business processes|Workflow versioning^Deterministic execution constraints vary|Temporal^AWS Step Functions
batch-processing|Batch Processing|Process a finite dataset in scheduled or ad-hoc jobs.|Efficient bulk computation|Backfills, ETL, and daily analytics|Results arrive after the batch completes|Spark^Beam
stream-processing|Stream Processing|Continuously compute over unbounded events with explicit state and time semantics.|Low-latency derived results|Fraud signals and live aggregations|Late events^State recovery and checkpoints|Flink^Kafka Streams^Beam
data-engineering|Data Engineering|Move and transform operational data into analytical storage and models.|Support analytics without burdening OLTP|Reporting and machine-learning pipelines|Data quality^Lineage and freshness ownership|ETL^ELT^Warehouse^Lakehouse
celery|Celery|A distributed task framework dispatches Python jobs through a broker.|Python background processing|Email, reports, and integration tasks|Broker and worker operations^Task idempotency
 temporal|Temporal|A durable execution platform records workflow history and retries activities.|Recover long-lived workflows|Order fulfillment and human-in-the-loop flows|Deterministic workflow code^Activity effects still need idempotency
airflow|Apache Airflow|A scheduler orchestrates finite tasks and dependencies as workflow DAGs.|Scheduled data orchestration|Batch pipelines and backfills|Not a low-latency event stream processor^Scheduler operations
flink|Apache Flink|A distributed engine processes stateful streams using checkpoints and event-time windows.|Continuous stateful computation|Streaming analytics and enrichment|State and checkpoint tuning^Sink guarantees vary
spark|Apache Spark|A distributed compute engine processes batch datasets and micro-batch or continuous workloads.|Large-scale transformations|ETL and analytical processing|Cluster and shuffle cost^Latency depends on execution mode
beam|Apache Beam|A programming model describes batch and streaming pipelines executed by a chosen runner.|Portable pipeline definitions|Shared batch and stream transformations|Runner feature and performance differences
`,
);
branch(
  'stream-processing',
  `
event-time|Event Time & Watermarks|Event time comes from the event; watermarks estimate how far event-time processing can advance.|Handle out-of-order arrivals|Windowed streaming analytics|Late-event policy trades completeness for latency
stream-windows|Stream Windows|Group events into bounded tumbling, sliding, or session intervals.|Finite aggregates over endless data|Rates, sessions, and rolling summaries|Window state consumes memory^Late updates need semantics
checkpoints|Checkpoints|Persist stream state and source positions so processing can resume consistently.|Recover stateful computation|Stateful stream engines|Checkpoint overhead^End-to-end guarantees include sinks
`,
);
branch(
  'data-engineering',
  `
etl|ETL|Extract source data, transform it, then load the prepared result into a target.|Curated target data|Strict downstream schemas|Transformation bottleneck^Raw detail may be lost
elt|ELT|Extract and load raw data, then transform it inside the target analytical engine.|Flexible downstream modeling|Cloud warehouses|Compute cost^Govern raw sensitive data
data-warehouse|Data Warehouse|An analytical store organizes curated data for reporting and business queries.|Shared analytical truth|Business intelligence|Modeling effort^Data freshness lag|BigQuery^Snowflake^Redshift
data-lake|Data Lake|Object storage holds large raw and curated datasets in open formats.|Low-cost flexible storage|Logs, ML data, and historical analysis|Catalog and quality governance|Parquet^Object storage
lakehouse|Lakehouse|Table formats add transactions, snapshots, and schema controls to lake storage.|Reliable open data tables|Analytics over object storage|Engine compatibility^Compaction and metadata upkeep|Apache Iceberg^Delta Lake^Apache Hudi
`,
);

branch(
  'storage',
  `
object-store-options|Object Store Choices|Object APIs provide durable key-addressed blobs with provider-specific policies and guarantees.|Separate bytes from relational metadata|Media, archives, and backups|Request, storage, and egress costs|Amazon S3^Google Cloud Storage^Azure Blob Storage^MinIO
presigned-urls|Presigned URLs|A backend grants a short-lived capability for a particular object operation without sharing permanent credentials.|Direct client uploads and downloads|Large files that should bypass application servers|URL possession grants access^Limit method, lifetime, and object key
multipart-upload|Multipart Upload|Upload large objects in independently retryable parts and finalize them together.|Resumable parallel upload|Large media and backups|Abandoned parts cost storage^Finalization and integrity checks
storage-lifecycle|Lifecycle Policies|Transition or delete objects automatically based on age, version, or policy.|Control long-term costs|Backups and archive retention|Cold tiers have retrieval delays and charges
block-storage|Block Storage|A volume exposes raw blocks to a host that formats and manages a filesystem or database.|Low-level storage control|Virtual-machine disks and databases|Attachment and zone constraints^Backups remain necessary|EBS^Persistent Disk^Managed Disks
file-storage|File Storage|A shared filesystem exposes hierarchical files through protocols such as NFS or SMB.|Shared file access|Legacy applications and shared datasets|Metadata contention^Mount and permission operations|EFS^Filestore^Azure Files
distributed-filesystem|Distributed Filesystem|Files are spread across several nodes with metadata and failure-management mechanisms.|Scale file capacity|Large data platforms|Operational complexity^Small-file overhead|HDFS^CephFS
erasure-coding|Erasure Coding|Encode data into fragments so a subset can reconstruct it after failures.|Durability with less redundancy|Large durable object stores|Repair bandwidth^Small-write and compute overhead
storage-replication|Storage Replication|Copy objects or blocks across failure domains according to a defined policy.|Tolerate disk, zone, or regional loss|Durable storage design|Replication cost^Deletion may replicate too
object-versioning|Object Versioning|Retain prior object versions when an object is overwritten or deleted.|Recover accidental changes|Important user files and backups|Storage growth^Retention and lifecycle coordination
`,
);
branch(
  'object-store-options',
  `
s3|Amazon S3|A managed object service stores data in buckets with policies, versions, and storage classes.|Broad object-storage ecosystem|AWS media, backups, and lakes|Egress economics^IAM and lifecycle configuration
 gcs|Google Cloud Storage|A managed object service offers buckets, storage classes, and IAM-based access.|Google Cloud object storage|Media and analytical data|Request and network costs^Retention configuration
azure-blob|Azure Blob Storage|A managed blob service stores unstructured objects with access tiers and lifecycle rules.|Azure object storage|Application blobs and archives|Tier retrieval costs^Authorization configuration
minio|MinIO|An S3-compatible object storage system can run on infrastructure you operate.|Object API under your control|Private or hybrid deployments|You own disk health, upgrades, and resilience
`,
  'service',
);

branch(
  'search',
  `
inverted-index|Inverted Index|Map normalized terms to documents that contain them.|Fast full-text matching|Text search engines|Index storage^Updates require index maintenance
tokenization|Tokenization & Analysis|Break text into tokens and normalize it for language-aware matching.|Match user language|Searchable text|Analyzer choices change meaning|Stemming^Synonyms^Language analyzers
ranking|Relevance Ranking|Score matching documents using textual and application-specific signals.|Put useful results first|Search discovery experiences|Relevance needs evaluation^Popularity bias|BM25^Business signals^Learning to rank
search-pipeline|Indexing Pipeline|Changes flow from the source database through events or CDC into a searchable projection.|Keep search derived and rebuildable|Production search|Index lag^Deletes and schema changes must propagate||cdc
search-shards|Search Shards & Replicas|Partition an index into shards and copy shards for query capacity and availability.|Scale indexing and reads|Large indexes|Oversharding costs memory^Scatter-gather tail latency
elasticsearch|Elasticsearch|A distributed search engine indexes documents for text search and aggregation.|Flexible search and analytics|Application search and logs|Heap and shard tuning^Index is usually a derived store|OpenSearch^Solr
opensearch|OpenSearch|An open-source search and analytics engine supports indexed queries and aggregations.|Search and log exploration|Search-backed applications|Cluster operations^Index lifecycle planning
solr|Apache Solr|A Lucene-based search platform provides schemas, faceting, and distributed search.|Mature text search|Document and enterprise search|Schema and cluster management
algolia|Algolia|A managed search platform provides hosted indices, ranking controls, and client integrations.|Rapid hosted search|Commerce and product discovery|Service cost^Provider-specific relevance configuration
vector-search|Vector / Hybrid Search|Nearest-neighbor indexes retrieve embeddings; hybrid search combines semantic similarity with lexical evidence.|Match meaning beyond words|Semantic retrieval and recommendations|Approximation quality^Embedding freshness and evaluation|HNSW^BM25 + vectors
`,
);
branch(
  'realtime',
  `
websocket|WebSocket|A long-lived connection supports bidirectional messages after an HTTP handshake.|Interactive two-way traffic|Chat, collaboration, and multiplayer|Connection lifecycle^Reconnect and message recovery
sse|Server-Sent Events|An HTTP response streams text events from server to client with browser reconnection support.|Simple server push|Live feeds and dashboards|One-way application channel^Proxy buffering configuration
long-polling|Long Polling|A server holds an HTTP request until data arrives or a timeout requires another request.|Push-like compatibility|Fallback for constrained networks|Repeated request overhead^Race handling
webrtc|WebRTC|Browsers exchange realtime media or data using peer negotiation, connectivity checks, and optional relays.|Interactive audio and video|Calls and peer communication|NAT traversal^TURN relay bandwidth|STUN^TURN^SFU
connection-registry|Connection Registry|Map online users or sessions to the gateway holding their connection.|Route targeted updates|Multi-instance realtime systems|Stale registrations^Reconnect races
presence|Presence|Heartbeats and expiring state estimate which users or devices are online.|Show live availability|Chat and collaboration|Online status is approximate^Large fanout can be expensive
fanout|Fanout|Deliver one event to many connections or recipients using explicit routing and buffering.|Broadcast efficiently|Rooms, feeds, and live alerts|Slow consumers^Viral rooms and backpressure
collaboration|Collaborative State|Operational transforms or CRDTs coordinate edits across concurrent participants.|Convergent shared editing|Documents and whiteboards|Metadata and merge complexity^Domain constraints remain|CRDT^Operational transform
`,
);
branch(
  'notifications',
  `
email|Email Delivery|Queue templated email and record provider feedback for bounces and complaints.|Reach asynchronous inboxes|Receipts and account communication|Deliverability^Provider acceptance is not inbox delivery|Amazon SES^SendGrid
sms|SMS Delivery|Send concise messages through telecom-connected providers.|Reach phone numbers|Alerts and verification|Per-message cost^Delivery and regional restrictions|Twilio
mobile-push|Mobile Push|Platform gateways deliver notifications to registered device tokens.|Reach mobile apps|Background updates and alerts|Tokens expire^OS policies govern presentation|FCM^APNs
web-push|Web Push|A push service delivers notifications to a browser subscription through a service worker.|Reach opted-in browsers|Web engagement and updates|Permission fatigue^Subscription lifecycle
in-app|In-app Notifications|Persist notifications in an application inbox and stream live updates when connected.|Reliable product history|Activity feeds and alerts|Read-state synchronization^Retention
notification-preferences|Preferences & Consent|Choose channels, quiet hours, and categories based on user settings.|Respect user intent|Multi-channel communication|Preference races^Critical and promotional policies differ
notification-templates|Templates & Localization|Render versioned messages with validated variables and locale rules.|Consistent messaging|Transactional communication|Escaping and missing variables^Template/version coordination
notification-delivery|Delivery Tracking & Retry|Track each channel attempt, classify errors, and retry only appropriate failures.|Recover transient provider failures|Production notification pipelines|Duplicates^Acceptance, delivery, and reading differ|Backoff^DLQ^Provider callbacks
`,
);

branch(
  'observability',
  `
metrics|Metrics|Numeric measurements summarize system behavior over time.|Cheap trend and alert signals|Rates, latency, and saturation|High-cardinality labels are expensive^Aggregates hide individual events|Counters^Gauges^Histograms
logs|Logs|Timestamped records describe discrete application and infrastructure events.|Detailed incident evidence|Debugging and audits|Volume and retention cost^Avoid credentials and sensitive payloads|Structured JSON^Loki^OpenSearch
traces|Distributed Traces|Related spans follow one operation across process boundaries.|Locate cross-service latency|Distributed request paths|Sampling misses some requests^Context must propagate|OpenTelemetry^Jaeger^Zipkin
profiling|Continuous Profiling|Sample CPU, allocation, and runtime behavior to identify expensive code paths.|Find resource bottlenecks|Performance diagnosis|Collection overhead^Sensitive stack metadata
opentelemetry|OpenTelemetry|A vendor-neutral toolkit instruments and exports traces, metrics, and logs.|Portable telemetry pipeline|Instrumented distributed applications|Collector operations^Instrumentation quality varies
service-objectives|SLI / SLO / SLA|Indicators measure user experience, objectives set targets, and agreements define contractual commitments.|Align reliability with user needs|Production service ownership|Bad indicators reward the wrong behavior|Availability^Latency^Correctness
alerting|Alerting & On-call|Actionable conditions notify responders when user impact requires intervention.|Shorten incident response|Production operations|Alert fatigue^Missing ownership|Burn-rate alerts^Runbooks
correlation-ids|Correlation IDs|Propagate identifiers across requests, messages, and logs to connect related work.|Follow one business operation|Async and synchronous workflows|Untrusted IDs need validation^Avoid personal data
observability-tools|Telemetry Implementations|Backends store and explore signals; collectors and agents transport them.|Choose a usable operating stack|Production telemetry|Retention cost^Vendor-specific queries|Prometheus^Grafana^Loki^Jaeger^Datadog^New Relic
`,
);
branch(
  'metrics',
  `
red-metrics|RED Method|Track request rate, errors, and duration for request-driven services.|See customer-facing degradation|HTTP and RPC services|Requires meaningful failure definitions
use-method|USE Method|Inspect utilization, saturation, and errors for every constrained resource.|Find capacity bottlenecks|CPU, memory, disks, and networks|Averages can hide brief saturation
latency-percentiles|Latency Percentiles|Percentiles describe how slow the tail of a request distribution is.|Reveal slow user experiences|Service latency objectives|Do not average percentiles across instances|p50^p95^p99
`,
);
branch(
  'service-objectives',
  `
error-budget|Error Budgets|The allowed unreliability implied by an SLO guides release and reliability decisions.|Balance change and stability|Teams with measured SLOs|Window choice matters^A budget is not permission to ignore incidents
burn-rate|Burn-rate Alerts|Measure how quickly failures consume the error budget over multiple windows.|Alert on meaningful degradation|SLO-based operations|Sparse traffic needs careful thresholds
`,
);
branch(
  'observability-tools',
  `
prometheus|Prometheus|Collects labeled time-series metrics and evaluates rules with PromQL.|Service and infrastructure metrics|Pull-based metrics collection|Cardinality^Long-term storage needs planning
grafana|Grafana|Visualizes data from telemetry sources and supports dashboards and alerting.|Explore multiple signal sources|Operational dashboards|Dashboards can become stale^Data quality comes from sources
loki|Grafana Loki|Stores logs indexed mainly by labels rather than every text term.|Label-centered log exploration|Kubernetes and service logs|Label design^Broad text queries can scan substantial data
jaeger|Jaeger / Zipkin|Distributed tracing backends collect and display spans and their relationships.|Inspect request execution|Tracing instrumented services|Sampling and retention^Instrumentation gaps
datadog|Datadog / New Relic|Managed observability platforms combine telemetry ingestion, analysis, and alerts.|Integrated managed operations|Teams prioritizing hosted tooling|Usage-based cost^Vendor coupling
`,
  'technology',
);

branch(
  'infrastructure',
  `
containers|Containers & Images|Package an application and dependencies as an isolated process environment sharing a host kernel.|Repeatable application runtime|Consistent build and deployment|Not a VM security boundary^Images need patching|Docker^containerd
kubernetes|Kubernetes|Controllers reconcile desired workloads across a cluster of machines.|Automate deployment and recovery|Many container workloads with operational capacity|Significant operational complexity^Not required for every application|EKS^GKE^AKS
cloud-services|Cloud Implementations|Cloud services implement compute, storage, networking, and data concepts with different managed boundaries.|Reduce infrastructure ownership|Choosing where to run a system|Egress and provider coupling^Shared responsibility|AWS^Google Cloud^Azure
network-security|Private Network & Security|Network boundaries, identity, encryption, and audit controls protect internal resources.|Limit reachable attack surface|Every production deployment|Configuration drift^Network location alone does not grant trust|VPC^Subnets^IAM^KMS
deployment|Delivery & Deployment|A repeatable pipeline builds, verifies, and releases versioned artifacts.|Safe, repeatable change|Every production application|Pipeline credentials are powerful^Rollback may not reverse data migrations|CI/CD^GitOps^Infrastructure as Code
scalability|Scalability & Capacity|Match resource capacity to measured traffic and data while controlling bottlenecks.|Grow deliberately|Load and dataset growth|More nodes do not fix serial bottlenecks|Vertical^Horizontal^Autoscaling
reliability|Reliability & Recovery|Redundancy, failure isolation, and practiced recovery keep service objectives achievable.|Handle expected failures|Production systems with availability goals|Extra capacity costs money^Redundancy can share hidden failure modes|Multi-AZ^Backups^Failover
multi-region|Multi-region Architecture|Operate across regions with explicit traffic, ownership, replication, and failure policies.|Regional resilience and locality|Global users or regional disaster requirements|Replication latency^Conflicts, cost, and operational complexity|Active-passive^Active-active
`,
);
branch(
  'containers',
  `
container-image|Container Image|A content-addressed layered artifact contains an application's runtime filesystem.|Deploy the same artifact everywhere|Container packaging|Large images slow startup^Base images need updates|OCI image^Multi-stage build
container-registry|Container Registry|A registry stores and distributes versioned images and their metadata.|Central artifact distribution|Container deployment pipelines|Access controls^Mutable tags can hide changes|ECR^Artifact Registry^ACR
container-runtime|Container Runtime|A runtime pulls images and starts isolated container processes.|Execute containers|Container hosts and Kubernetes nodes|Kernel and runtime vulnerabilities|containerd^CRI-O
`,
);
branch(
  'kubernetes',
  `
k8s-cluster|Cluster & Nodes|A cluster combines a control plane with worker nodes that run pods.|Pool compute capacity|Orchestrated workloads|Node failures and capacity constraints
k8s-control-plane|Control Plane|The API server, scheduler, controllers, and etcd maintain and reconcile cluster state.|Coordinate desired state|Every Kubernetes cluster|etcd quorum and API availability^Control state is critical
k8s-pod|Pod|The smallest scheduling unit groups containers with shared networking and optional volumes.|Colocate tightly coupled processes|Container workloads|Pods are replaceable^Local state is ephemeral
k8s-deployment|Deployment & ReplicaSet|A Deployment manages ReplicaSets to roll out and maintain interchangeable pod replicas.|Declarative rollout|Stateless application replicas|Readiness and rollout limits need tuning
k8s-service|Service|A stable virtual endpoint selects eligible backend pods.|Stable service discovery|Traffic between changing pods|Selection and readiness errors^Implementation-specific forwarding
k8s-ingress|Ingress / Gateway API|Routing resources configure a controller to expose HTTP or other supported traffic to services.|Declarative entry routing|External cluster traffic|A controller is required^Feature support varies|NGINX Ingress^Envoy Gateway
k8s-config|ConfigMap & Secret|Resources supply configuration and sensitive values to workloads.|Separate config from images|Runtime configuration|Secrets are not encrypted merely by base64 encoding^Use encryption and RBAC
k8s-statefulset|StatefulSet|Manages pods with stable identities and ordered lifecycle behavior, often with persistent volumes.|Predictable stateful identities|Databases and brokers operated on Kubernetes|Does not itself provide database replication or backups
k8s-daemonset|DaemonSet|Runs a pod on every eligible node.|Host-level agents|Logging, networking, and monitoring agents|Per-node resource overhead
k8s-job|Job & CronJob|Jobs run finite work to completion; CronJobs create Jobs on a schedule.|Scheduled batch execution|Maintenance and periodic processing|Runs can overlap or repeat^Work must tolerate retries
k8s-hpa|Horizontal Pod Autoscaler|Changes replica count based on resource or custom metric targets.|Elastic application replicas|Variable demand|Metrics and startup lag^Requires node capacity
k8s-probes|Liveness, Readiness & Startup|Different probes restart stuck containers, remove unready endpoints, or allow slow startup.|Separate recovery from traffic admission|Long-running services|Bad probes cause restart loops or outages
k8s-resources|Requests & Limits|Requests influence scheduling; limits constrain resource usage according to runtime behavior.|Bound and allocate resources|Multi-workload clusters|CPU throttling^Memory limit termination
`,
);
branch(
  'cloud-services',
  `
cloud-compute|Virtual Machines|Rent isolated virtual machines while managing the guest OS and application lifecycle.|Maximum runtime flexibility|Traditional servers and custom runtimes|Patching and capacity remain yours|AWS EC2^Google Compute Engine^Azure Virtual Machines
cloud-serverless|Managed Functions|Execute event-driven code with provider-managed server allocation.|Elastic event handlers|Bursty APIs and automation|Runtime limits^Cold starts and connection pressure|AWS Lambda^Cloud Run functions^Azure Functions
managed-kubernetes|Managed Kubernetes|A provider operates parts of the Kubernetes control plane and supporting infrastructure.|Reduce cluster administration|Teams that need Kubernetes|Workloads, policy, and cost still need ownership|Amazon EKS^Google GKE^Azure AKS
managed-databases|Managed Databases|A provider handles defined database tasks such as backups, upgrades, and instance recovery.|Reduce routine database operations|Production data services|Failover behavior and limits vary^Query and schema design remain yours|Amazon RDS^Cloud SQL^Azure Database for PostgreSQL
cloud-mapping|Conceptual Cloud Equivalents|Match architectural roles first, then compare provider-specific capabilities and limits.|Portable design reasoning|Cloud selection and migration|Similarly named services are not feature-identical|S3 / GCS / Blob^EKS / GKE / AKS^EC2 / GCE / Azure VM
`,
  'service',
);
branch(
  'network-security',
  `
vpc|VPC & Virtual Networks|An isolated cloud network contains address ranges, routes, and network interfaces.|Explicit network boundaries|Cloud infrastructure|Peering and route complexity^Overlapping addresses
subnets|Subnets & Routing|Subnets divide address space and routes define how traffic reaches destinations.|Segment workloads|Public ingress and private backends|A subnet name does not ensure privacy
security-groups|Security Groups & Firewalls|Rules permit or deny network traffic at defined boundaries.|Restrict reachable services|Database and application networks|Broad rules accumulate risk^Stateful and stateless behavior differs
private-endpoints|Private Networking|Private endpoints and internal routes keep service traffic off public addresses where supported.|Reduce public exposure|Databases and managed service access|DNS and routing configuration^Private access still requires auth
iam|IAM & Service Accounts|Policies grant users and workloads permission to perform actions on resources.|Workload access control|Cloud and platform APIs|Overbroad roles^Credential lifecycle|Workload identity^Short-lived credentials
kms|KMS & Encryption at Rest|A key service governs encryption keys while storage systems encrypt persisted data.|Protect stored bytes and control key access|Sensitive data and compliance needs|Key availability^Encryption does not prevent authorized misuse
secret-management|Secrets Management|Store, distribute, audit, and rotate credentials outside source code and images.|Reduce credential exposure|Database passwords and API credentials|Bootstrap identity^Rotation coordination|Vault^AWS Secrets Manager^Secret Manager^Azure Key Vault
zero-trust|Zero Trust|Authorize each interaction using identity and context rather than trusting network location.|Reduce implicit trust|Distributed workforce and workloads|Policy and identity infrastructure complexity
 audit-logging|Audit Logging|Record security-relevant actions with actor, target, time, and outcome.|Investigate accountability|Privileged operations and sensitive data|Integrity and retention^Sensitive fields need care
`,
);
branch(
  'deployment',
  `
ci-cd|CI / CD Pipeline|Build, test, package, and release changes through reproducible automated stages.|Reduce manual release errors|Frequent software delivery|Pipeline supply-chain risk^Tests cannot prove all behavior
artifact-provenance|Artifacts & Provenance|Immutable digests, signatures, and build metadata identify exactly what was produced and deployed.|Trace releases to source|Production supply chains|Key and metadata management|SBOM^Image digest^Signature
rolling-deployment|Rolling Deployment|Replace a bounded portion of instances while keeping others serving.|Continuous availability during rollout|Backward-compatible service changes|Old and new versions overlap^Slow rollback
blue-green|Blue-green Deployment|Maintain two environments and switch traffic from the old release to the new one.|Fast traffic cutover|Changes needing a clean environment|Extra capacity^Shared database changes need compatibility
canary|Canary Release|Send a small traffic share to a new version and compare user-relevant signals.|Limit release blast radius|Observable services|Low traffic may miss failures^Metrics need meaningful cohorts
ab-testing|A/B Experiments|Assign users to stable variants and measure product outcomes.|Evaluate product hypotheses|Feature and experience changes|Statistical validity^Different purpose from canary safety checks
rollback|Rollback & Roll-forward|Return to a known artifact or ship a corrective change with a data compatibility plan.|Restore service after bad changes|Release incidents|Schema and side effects may not be reversible
infrastructure-as-code|Infrastructure as Code|Version declarative infrastructure definitions and apply reviewed changes.|Repeatable infrastructure|Cloud and platform resources|State management^Drift and destructive plans|Terraform^Pulumi^CloudFormation
gitops|GitOps|A controller reconciles deployed resources with versioned desired state.|Auditable deployment changes|Kubernetes and declarative platforms|Reconciliation can undo manual fixes^Repository access is powerful|Argo CD^Flux
`,
);
branch(
  'scalability',
  `
vertical-scaling|Vertical Scaling|Give an instance more CPU, memory, or storage capability.|Simple capacity growth|Early growth and single-node bottlenecks|Hardware ceiling^Resizing may require disruption
horizontal-scaling|Horizontal Scaling|Add instances and distribute eligible work among them.|More parallel capacity|Workloads with separable work|Shared bottlenecks remain^Coordination overhead
stateless-services|Stateless Services|Keep durable session and business state outside replaceable application instances.|Easy replica replacement|Horizontally scaled APIs|External stores become critical dependencies
stateful-services|Stateful Services|Instances own persistent or connection state that affects placement and recovery.|Efficient state locality|Databases, streams, and realtime gateways|Migration and failover complexity
autoscaling|Autoscaling|Adjust capacity using measured demand and safety limits.|Match variable demand|Bursty applications|Delayed metrics and startup^Scale-down needs draining
capacity-planning|Capacity Planning|Estimate throughput, data size, concurrency, and headroom, then validate with workload tests.|Avoid surprise bottlenecks|Growth and major launches|Averages hide peaks^Synthetic workloads can mislead
scale-journey|From One User to Global|Evolve from one service and database to measured caching, replicas, partitioning, and regional placement.|Add complexity when justified|Growing products|User count alone does not determine architecture|1 user^1K^100K^1M^100M^Global
`,
);
branch(
  'reliability',
  `
high-availability|High Availability|Use redundancy and recovery mechanisms to meet a defined availability objective.|Reduce service downtime|Production critical paths|Extra components can share a common failure cause
fault-tolerance|Fault Tolerance|A system continues an explicitly defined function despite specified component failures.|Bound failure impact|Critical operations|Costs rise with the tolerated fault model
multi-az|Multiple Availability Zones|Place independent replicas across physically separated zones in one region.|Survive zone outages|Regional high availability|Cross-zone latency and traffic costs^Shared regional dependencies
rpo-rto|RPO & RTO|RPO bounds tolerable data loss measured in time; RTO targets time to restore service.|Make recovery requirements concrete|Disaster recovery planning|Targets require tested mechanisms and capacity
disaster-recovery|Disaster Recovery|Restore or fail over services after failures beyond routine redundancy.|Recover from regional or destructive incidents|Critical production systems|Backups, infrastructure, credentials, and runbooks must work together
chaos-engineering|Chaos Engineering|Controlled experiments test hypotheses about failure behavior within a bounded blast radius.|Find hidden dependencies|Mature observable systems|Experiments can affect users^Require recovery controls
self-healing|Self-healing|Controllers replace failed instances or reconcile missing desired state automatically.|Shorten routine recovery|Orchestrated infrastructure|Automation can repeatedly recreate the same failure
`,
);
branch(
  'multi-region',
  `
global-routing|Global Traffic Routing|DNS, anycast, or a global proxy selects a regional entry point based on policy and health.|Route users to viable regions|Global applications|DNS caches and stale health affect failover|GeoDNS^Anycast^Global load balancer
active-passive|Active-passive Regions|One region serves writes while a secondary is prepared for controlled failover.|Simpler regional write ownership|Disaster recovery deployments|Idle capacity cost^Promotion and traffic cutover take time
active-active|Active-active Regions|Multiple regions serve traffic concurrently with explicit data ownership or conflict rules.|Local latency and regional availability|Globally distributed workloads|Cross-region invariants^Conflict handling or coordinated writes
cross-region-replication|Cross-region Replication|Copy committed changes to another region synchronously or asynchronously.|Regional recovery and locality|Multi-region state|WAN latency or replica lag^Transfer costs
regional-failover|Regional Failover|Fence old writers, promote eligible state, and route traffic to a prepared region.|Restore service after regional loss|Tested regional recovery plans|RPO/RTO depend on replication and readiness^Failback is another migration
 data-locality|Data Locality & Residency|Place data and computation near users or inside required geographic boundaries.|Control latency and geography|Global or regulated workloads|Cross-region features become more complex^Backup and telemetry locations count
`,
);

branch(
  'redis-data',
  `
redis-strings|Strings & Counters|A string stores bytes or a numeric value manipulated with atomic counter commands.|Simple atomic state|Cache entries and rate counters|Expiry and numeric bounds^Multi-command workflows need coordination|GET / SET^INCR
redis-hashes|Hashes|A hash stores named fields within one Redis key.|Compact object fields|Profiles and session attributes|Large keys concentrate traffic^No relational joins|HGET / HSET
redis-lists|Lists|A list keeps ordered elements with pushes and pops at either end.|Simple ordered buffers|Recent items and basic queues|Queue reliability requires extra protocol|LPUSH / RPOP
redis-sets|Sets|A set stores unique unordered members and supports membership and set operations.|Fast membership checks|Tags, unique users, and relationships|Large intersections consume CPU|SADD^SISMEMBER
redis-sorted-sets|Sorted Sets|Members carry numeric scores and can be retrieved by rank or score range.|Ordered rankings|Leaderboards and time-priority indices|Memory overhead^Hot leaderboards remain one key|ZADD^ZRANGE
redis-bitmaps|Bitmaps & HyperLogLog|Bit operations track dense boolean state; HyperLogLog estimates distinct counts with bounded memory.|Compact counting structures|Activity flags and approximate cardinality|Bitmap keyspace density matters^HyperLogLog is approximate
`,
);
branch(
  'redis-persistence',
  `
redis-rdb|RDB Snapshots|Periodically serialize the Redis dataset into a compact point-in-time snapshot.|Fast compact restart files|Backups and loss-tolerant cache state|Writes after the snapshot can be lost^Fork memory overhead
redis-aof|Append-only File|Record write operations and periodically rewrite them into a compact recovery log.|Finer durability control|Redis state needing smaller loss windows|Fsync policy trades latency for durability^Rewrite overhead
`,
);
branch(
  'pg-replication',
  `
pg-physical|Physical Streaming|Stream WAL records so a standby reproduces the primary's physical data changes.|Whole-cluster standby|Read replicas and failover|Version/platform constraints^Standby remains read-only||synchronous-replication^asynchronous-replication
pg-logical|Logical Replication|Publish selected row changes to subscriptions rather than copying the storage layout.|Selective data movement|Online migrations and integrations|DDL is not automatically replicated^Replica identity and slot retention||cdc
`,
);
branch(
  'graph-database',
  `
neo4j|Neo4j|A property graph database queries connected entities and relationships with Cypher.|Expressive graph traversals|Fraud investigation and knowledge graphs|Dense traversals can explode^Distribution needs care
neptune|Amazon Neptune|A managed graph database supports property-graph and RDF workloads with supported query languages.|Managed graph operations|Connected-data applications on AWS|Engine and query compatibility^Service limits
`,
  'technology',
);
branch(
  'time-series',
  `
timescaledb|TimescaleDB|A PostgreSQL extension organizes time-series data into time-based chunks and analytical features.|SQL with time-oriented storage|Metrics and events alongside relational data|Retention and chunk tuning^Feature availability depends on edition
influxdb|InfluxDB|A time-series platform stores and queries timestamped measurements.|Time-focused ingestion and queries|Telemetry and sensor data|Cardinality and retention planning^Engine versions have different interfaces
`,
  'technology',
);
branch(
  'analytical-database',
  `
clickhouse|ClickHouse|A column-oriented database compresses and scans data for fast analytical aggregation.|Low-latency analytics|Large append-heavy event datasets|Sort-key design^Updates and merges need planning
bigquery|Google BigQuery|A managed analytical warehouse executes queries over large columnar datasets.|Managed analytical scale|SQL reporting and event analysis|Scan and capacity cost^Not an OLTP transaction store
snowflake|Snowflake|A managed data platform separates analytical compute from shared storage.|Independent analytical workloads|Warehousing and data collaboration|Compute and storage economics^Platform-specific behavior
redshift|Amazon Redshift|A managed analytical warehouse integrates with AWS data services.|Cloud SQL analytics|AWS-centered warehouses|Distribution and workload tuning^Compute cost
`,
  'technology',
);
branch(
  'document-database',
  `
couchbase|Couchbase|A distributed document platform combines key-value access, document queries, and optional mobile synchronization.|Flexible document access|Low-latency applications with document queries|Service sizing^Cross-service operational complexity
couchdb|Apache CouchDB|A document database uses HTTP APIs and replication designed for disconnected synchronization.|Offline-friendly replication|Replicated document applications|Conflict resolution^Query and indexing constraints
`,
  'technology',
);
branch(
  'wide-column',
  `
hbase|Apache HBase|A distributed wide-column store provides indexed access to large sparse tables over distributed storage.|Large sparse datasets|High-volume keyed access|Region management^Hadoop ecosystem operations
`,
  'technology',
);
branch(
  'distributed-cache',
  `
hazelcast|Hazelcast|A distributed in-memory platform partitions shared data structures across a cluster.|Shared distributed data|Java-centered low-latency workloads|Cluster coordination^Persistence and consistency need explicit configuration
`,
  'technology',
);
branch(
  'third-party-clients',
  `
sdk|SDKs|A client library wraps authentication, serialization, retries, and API contracts for an ecosystem.|Consistent integrations|Public developer platforms|Versioning and generated-code quality^Retries must match semantics
cli|CLI Clients|A command-line interface invokes APIs for interactive or automated operations.|Scriptable product access|Developer tools and operations|Credential handling^Stable machine-readable output
`,
);
branch(
  'cache',
  `
proxy-cache|Reverse Proxy / API Cache|A proxy caches explicitly eligible HTTP responses before they reach an application.|Offload repeated API work|Safe public or correctly partitioned private responses|Authentication-aware cache keys^Invalidation policy|NGINX^Varnish
database-buffer-cache|Database Buffer Cache|A database reuses recently accessed pages in memory without changing application query semantics.|Avoid repeated disk reads|Every disk-backed transactional engine|Working-set pressure^Distinct from an application object cache
`,
);
branch(
  'services',
  `
configuration-management|Configuration Management|Versioned runtime settings control endpoints, limits, and operational behavior independently of the binary.|Consistent environment behavior|Every deployed application|Invalid config can cause outages^Changes need validation and rollout|Config service^Environment configuration
`,
);

// Kafka is an implementation inside the streaming domain. Its mechanics remain
// behind that technology boundary while queue and pub/sub choices stay generic.
function reparent(id: string, parent: string) {
  const previous = concepts[id].parent;
  if (previous)
    concepts[previous].children = concepts[previous].children.filter((child) => child !== id);
  concepts[id].parent = parent;
  concepts[parent].children.push(id);
}
for (const id of [
  'kafka-producer',
  'kafka-broker',
  'kafka-topic',
  'kafka-partition',
  'kafka-consumer-group',
  'kafka-consumer',
  'kafka-offsets',
  'kafka-replication',
  'kafka-rebalance',
  'kafka-retention',
  'kafka-compaction',
  'kraft',
])
  reparent(id, 'apache-kafka');
for (const id of ['message-queue', 'pubsub']) reparent(id, 'kafka');

// Taxonomy distinguishes architecture concepts, patterns, concrete products, and managed services.
const technologyIds = [
  'apache-kafka',
  'redis',
  'memcached',
  'kong',
  'mongodb',
  'cassandra',
  'rabbitmq',
  'pulsar',
  'nats',
  'celery',
  'temporal',
  'airflow',
  'flink',
  'spark',
  'beam',
  'elasticsearch',
  'opensearch',
  'solr',
  'kubernetes',
  'opentelemetry',
];
const serviceIds = [
  'dynamodb',
  'sqs',
  'sns',
  'google-pubsub',
  'azure-service-bus',
  'algolia',
  's3',
  'gcs',
  'azure-blob',
  'managed-cache',
  'spanner',
  'neptune',
  'bigquery',
  'snowflake',
  'redshift',
  'datadog',
];
const patternIds = [
  'cache-aside',
  'read-through',
  'write-through',
  'write-behind',
  'refresh-ahead',
  'cqrs',
  'event-sourcing',
  'saga',
  'outbox',
  'inbox',
  'backend-for-frontend',
  'strangler-fig',
  'anti-corruption-layer',
  'sidecar',
  'circuit-breaker',
  'bulkhead',
  'idempotency',
  'active-active',
  'active-passive',
];
for (const id of technologyIds) concepts[id].kind = 'technology';
for (const id of serviceIds) concepts[id].kind = 'service';
for (const id of patternIds) concepts[id].kind = 'pattern';
concepts.minio.kind = 'technology';
for (const id of [
  'distributed-systems',
  'distributed-sql',
  'sharding',
  'multi-region',
  'consensus',
  '2pc',
  '3pc',
  'kubernetes',
])
  concepts[id].tier = 'advanced';
for (const id of [
  'monolith',
  'modular-monolith',
  'microservices',
  'serverless',
  'rest',
  'graphql',
  'grpc',
  'websocket',
  'sse',
  'long-polling',
])
  concepts[id].tier = 'alternative';

const sources: Record<string, string> = {
  dns: 'https://www.rfc-editor.org/rfc/rfc1034',
  http: 'https://www.rfc-editor.org/rfc/rfc9110',
  tls: 'https://www.rfc-editor.org/rfc/rfc8446',
  oauth: 'https://www.rfc-editor.org/rfc/rfc6749',
  oidc: 'https://openid.net/specs/openid-connect-core-1_0.html',
  redis: 'https://redis.io/docs/latest/develop/',
  'redis-replication': 'https://redis.io/docs/latest/operate/oss_and_stack/management/replication/',
  'redis-cluster': 'https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/',
  'redis-slots': 'https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/',
  postgresql: 'https://www.postgresql.org/docs/current/',
  'pg-replication': 'https://www.postgresql.org/docs/current/high-availability.html',
  'pg-mvcc': 'https://www.postgresql.org/docs/current/mvcc.html',
  kafka: 'https://kafka.apache.org/documentation/',
  'apache-kafka': 'https://kafka.apache.org/documentation/',
  'exactly-once': 'https://kafka.apache.org/41/design/design/#message-delivery-semantics',
  'kafka-compaction': 'https://kafka.apache.org/41/design/design/#log-compaction',
  kraft: 'https://kafka.apache.org/41/getting-started/zk2kraft/',
  kubernetes: 'https://kubernetes.io/docs/concepts/overview/components/',
  'k8s-deployment': 'https://kubernetes.io/docs/concepts/workloads/controllers/deployment/',
  'k8s-config': 'https://kubernetes.io/docs/concepts/configuration/secret/',
  opentelemetry: 'https://opentelemetry.io/docs/concepts/',
  raft: 'https://raft.github.io/raft.pdf',
  cap: 'https://www.cs.princeton.edu/courses/archive/spring13/cos598C/Gilbert.pdf',
  s3: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html',
  'presigned-urls':
    'https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html',
};
for (const [id, source] of Object.entries(sources)) concepts[id].source = source;

export const relationships: Relationship[] = [];
function edge(
  source: string,
  target: string,
  kind: EdgeKind,
  label: string,
  description: string,
  id = `${source}-${target}`,
) {
  if (!concepts[source] || !concepts[target])
    throw new Error(`Unknown relationship endpoint: ${source} → ${target}`);
  relationships.push({ id, source, target, kind, label, description });
  if (!concepts[source].related.includes(target)) concepts[source].related.push(target);
  if (!concepts[target].related.includes(source)) concepts[target].related.push(source);
}

// The overview is one possible production architecture, not a required sequence.
edge(
  'client',
  'dns',
  'request',
  'Resolve name',
  'The client asks a resolver for a hostname. A cached answer can skip this lookup; application payloads do not flow through DNS.',
);
edge(
  'client',
  'cdn',
  'request',
  'HTTPS request',
  'After resolving the endpoint, the client establishes a secure connection to the edge. Eligible cache hits return directly from the CDN.',
);
edge(
  'cdn',
  'waf',
  'request',
  'Inspect request',
  'An integrated or downstream WAF evaluates requests before origin forwarding. Provider-specific ordering varies.',
);
edge(
  'waf',
  'load-balancer',
  'request',
  'Allowed traffic',
  'Requests that pass the selected security rules continue toward a healthy origin endpoint.',
);
edge(
  'load-balancer',
  'api-gateway',
  'request',
  'Route to healthy gateway',
  'This example balances across gateway instances. Other architectures place a gateway before a regional or service load balancer.',
);
edge(
  'api-gateway',
  'auth',
  'authentication',
  'Verify identity',
  'The gateway validates credentials using cached signing keys, session state, or identity-service introspection. An identity service need not receive every request.',
);
edge(
  'api-gateway',
  'services',
  'request',
  'Application request',
  'The gateway routes the request with identity context. The owning service still enforces authorization for the specific action and resource.',
);
edge(
  'services',
  'cache',
  'cache lookup',
  'Cache lookup',
  'The application asks the cache for a reusable value before reading the source database. A miss returns control to the application.',
);
edge(
  'services',
  'database',
  'read',
  'Read / write',
  'The application queries the database after a cache miss or executes a transactional write. Redis does not transparently forward a cache-aside miss.',
);
edge(
  'services',
  'cache',
  'cache fill',
  'Fill after a miss',
  'After reading the database, the application writes a cached representation with an appropriate key and freshness policy.',
  'services-cache-fill',
);
edge(
  'services',
  'kafka',
  'publish',
  'Publish domain event',
  'The application publishes committed business facts. A transactional outbox or CDC relay closes the database/message dual-write gap.',
);
edge(
  'database',
  'kafka',
  'CDC',
  'Change stream',
  'A CDC connector reads committed database changes and publishes them to a stream for derived indexes, analytics, or an outbox relay.',
);
edge(
  'kafka',
  'workers',
  'consume',
  'Consume independently',
  'Workers in separate consumer groups read the same retained events at their own pace; workers inside one group share partitions.',
);
edge(
  'workers',
  'search',
  'write',
  'Update index',
  'An indexing consumer transforms events into a searchable projection. It handles duplicate delivery and tracks lag.',
);
edge(
  'workers',
  'notifications',
  'event',
  'Delivery job',
  'A consumer turns a committed business event into a preference-aware notification request without delaying the original API call.',
);
edge(
  'workers',
  'storage',
  'write',
  'Processed artifact',
  'Background processing stores generated media, reports, or analytical data in object storage.',
);
edge(
  'services',
  'storage',
  'write',
  'Object / upload grant',
  'The service stores object metadata and can issue a scoped presigned URL so the client transfers large bytes directly.',
);
edge(
  'client',
  'storage',
  'write',
  'Presigned upload',
  'After obtaining permission from the application, the client uploads directly to the allowed object key using a short-lived signed capability.',
);
edge(
  'cdn',
  'storage',
  'read',
  'Fetch static origin',
  'On a media or asset cache miss, the CDN fetches the object from its configured storage origin and may cache the response.',
);
edge(
  'services',
  'search',
  'read',
  'Search query',
  'The service queries the derived search index and can validate sensitive or freshness-critical results against authoritative data.',
);
edge(
  'services',
  'realtime',
  'event',
  'Live update',
  'Application events route to the gateway holding a user connection; realtime delivery is separate from committing durable state.',
);
edge(
  'client',
  'realtime',
  'request',
  'Persistent connection',
  'A client opens an authenticated WebSocket or SSE connection, often through the same edge and routing layers omitted from this logical edge.',
);
edge(
  'realtime',
  'cache',
  'read',
  'Presence & connection map',
  'The gateway uses fast shared state to find online sessions. Expiry and heartbeats make presence approximate.',
);
edge(
  'realtime',
  'kafka',
  'publish',
  'Message event',
  'Accepted realtime messages may enter a durable event stream. Acknowledgment must clearly distinguish receipt from durable persistence.',
);
edge(
  'realtime',
  'database',
  'write',
  'Persist message',
  'Durable chat history is committed to a database, directly or through a domain service, before claiming durable acceptance.',
);
edge(
  'realtime',
  'notifications',
  'event',
  'Offline delivery',
  'When a recipient is disconnected, a preference-aware notification workflow can request push delivery.',
);
edge(
  'workers',
  'realtime',
  'event',
  'Deliver to live sessions',
  'A message consumer identifies online recipients and sends the durable event to the gateway holding each connection.',
);
edge(
  'services',
  'observability',
  'telemetry',
  'Metrics, logs & traces',
  'Instrumented service activity emits correlated telemetry. Collection runs alongside the request path, not as its final processing stage.',
);
edge(
  'database',
  'observability',
  'telemetry',
  'Query & health signals',
  'Database telemetry reports query latency, locks, connections, and replication lag with careful cardinality and access controls.',
);
edge(
  'kafka',
  'observability',
  'telemetry',
  'Lag & broker health',
  'Broker metrics and consumer lag reveal saturation, stalled processors, and retention risks.',
);
edge(
  'infrastructure',
  'services',
  'synchronization',
  'Deploy & reconcile',
  'Infrastructure controllers reconcile application instances with desired configuration. This is management flow, not a user request.',
);

// Deeper semantic connections appear only when their endpoints are visible.
edge(
  'connection-pool',
  'pg-primary',
  'request',
  'Reuse a connection',
  'A bounded pool forwards queries to the writable primary and protects it from excessive connection count.',
);
edge(
  'pg-primary',
  'pg-replica',
  'replication',
  'Replay WAL',
  'The primary sends WAL to a standby. Asynchronous replay means the standby can return older data.',
);
edge(
  'pg-primary',
  'wal',
  'write',
  'Log before data',
  'The storage engine records the change in WAL so recovery can reconstruct committed state after a crash.',
);
edge(
  'wal',
  'pitr',
  'backup',
  'Archive logs',
  'Continuous WAL archives plus a base backup enable recovery to a selected point in time.',
);
edge(
  'pg-replica',
  'pg-failover',
  'failover',
  'Eligible promotion',
  'A failover controller can promote an eligible standby only while preventing the old primary from accepting conflicting writes.',
);
edge(
  'pg-primary',
  'cdc',
  'CDC',
  'Committed changes',
  'Logical decoding exposes committed row changes, with replication slot retention and connector recovery requirements.',
);
edge(
  'cdc',
  'kafka-producer',
  'publish',
  'Publish changes',
  'A connector produces database changes to partitioned topics for downstream consumers.',
);
edge(
  'kafka-producer',
  'kafka-broker',
  'publish',
  'Append records',
  'The producer chooses a partition and sends batches to its current leader broker.',
);
edge(
  'kafka-broker',
  'kafka-topic',
  'write',
  'Store partition replicas',
  'A topic is a logical collection of partitions; brokers physically store their replicas.',
);
edge(
  'kafka-topic',
  'kafka-partition',
  'stream',
  'Partitioned log',
  'Records are distributed among ordered partitions, typically using the record key.',
);
edge(
  'kafka-partition',
  'kafka-consumer-group',
  'consume',
  'Assign partition ownership',
  'Each partition is assigned to at most one member in this consumer group; another group reads independently.',
);
edge(
  'kafka-consumer-group',
  'kafka-consumer',
  'consume',
  'Poll assigned records',
  'Consumers poll their assigned partitions and advance committed progress according to processing semantics.',
);
edge(
  'kafka-consumer',
  'kafka-offsets',
  'write',
  'Commit progress',
  'A commit records the next position the group will use on recovery. A crash before commit can cause repeat processing.',
);
edge(
  'redis-primary',
  'redis-replica',
  'replication',
  'Asynchronous copy',
  'A primary streams changes to a replica; recent acknowledged writes may be absent when that replica is promoted.',
);
edge(
  'redis-sentinel',
  'redis-replication',
  'health check',
  'Monitor & coordinate',
  'Sentinel monitors a non-clustered primary/replica deployment and coordinates failover with quorum and majority authorization.',
);
edge(
  'redis-cluster',
  'redis-slots',
  'synchronization',
  'Slot ownership',
  'Clients discover which primary owns each of 16,384 slots and follow redirections during migration.',
);
edge(
  'redis-slots',
  'redis-primary',
  'request',
  'Route key to shard',
  'A key maps to a slot and the client sends its command to the owning primary.',
);
edge(
  'cache-aside',
  'cache-invalidation',
  'synchronization',
  'Manage freshness',
  'Database writes need an invalidation or update policy; a cache TTL alone does not eliminate stale-read races.',
);
edge(
  'k8s-control-plane',
  'k8s-deployment',
  'synchronization',
  'Reconcile desired replicas',
  'The Deployment controller manages ReplicaSets according to declared rollout and replica settings.',
);
edge(
  'k8s-deployment',
  'k8s-pod',
  'synchronization',
  'Maintain replicas',
  'A ReplicaSet maintains the requested number of pod replicas while a Deployment coordinates updates.',
);
edge(
  'k8s-service',
  'k8s-pod',
  'request',
  'Route to ready endpoints',
  'The Service selects pod endpoints, normally excluding pods whose readiness checks fail.',
);
edge(
  'k8s-hpa',
  'k8s-deployment',
  'synchronization',
  'Adjust replica target',
  'The autoscaler changes the desired replica count using observed metrics and configured bounds.',
);
edge(
  'global-routing',
  'active-passive',
  'failover',
  'Choose viable region',
  'Global routing follows the regional recovery policy; state promotion and old-writer fencing must precede accepting writes.',
);
edge(
  'cross-region-replication',
  'regional-failover',
  'replication',
  'Prepare regional recovery',
  'The replica position determines what data is available at promotion and therefore the possible recovery point.',
);
edge(
  'outbox',
  'cdc',
  'CDC',
  'Relay committed outbox rows',
  'A CDC relay publishes rows committed atomically with business state; consumers still tolerate duplicate publication.',
);
edge(
  'stream-processing',
  'data-warehouse',
  'write',
  'Materialize analytics',
  'A streaming pipeline writes validated events or aggregates to analytical storage with the sink guarantees it supports.',
);
edge(
  'data-lake',
  'lakehouse',
  'synchronization',
  'Transactional table metadata',
  'A lakehouse table format coordinates snapshots and file metadata over object storage.',
);

// Related concepts are navigable links even when the corresponding visual edge is hidden.
const relatedPairs = [
  ['postgresql', 'indexes'],
  ['postgresql', 'transactions'],
  ['postgresql', 'replication'],
  ['postgresql', 'backup-recovery'],
  ['pg-replication', 'synchronous-replication'],
  ['pg-replication', 'asynchronous-replication'],
  ['redis', 'cache-strategies'],
  ['redis', 'distributed-locks'],
  ['apache-kafka', 'schema-registry'],
  ['apache-kafka', 'delivery-semantics'],
  ['apache-kafka', 'stream-processing'],
  ['cap', 'network-partitions'],
  ['cap', 'linearizability'],
  ['quorums', 'leaderless'],
  ['raft', 'kraft'],
  ['raft', 'k8s-control-plane'],
  ['distributed-locks', 'fencing-tokens'],
  ['redis', 'rate-limiting'],
  ['redis', 'presence'],
  ['redis', 'hot-keys'],
  ['replication', 'replication-lag'],
  ['replication', 'backup-recovery'],
  ['saga', '2pc'],
  ['kafka-offsets', 'idempotency'],
  ['exactly-once', 'inbox'],
  ['multi-region', 'data-locality'],
  ['multi-region', 'rpo-rto'],
  ['schema-migration', 'rolling-deployment'],
  ['websocket', 'connection-draining'],
  ['api-keys', 'secret-management'],
  ['tls', 'certificates'],
  ['cache-stampede', 'load-shedding'],
  ['cloud-serverless', 'connection-pool'],
  ['stateless-services', 'sessions'],
  ['presigned-urls', 'cdn'],
  ['search-pipeline', 'outbox'],
  ['nosql', 'consistency-models'],
  ['spanner', 'clock-sync'],
  ['vector-search', 'search-pipeline'],
  ['service-objectives', 'reliability'],
  ['dead-letter-queue', 'alerting'],
  ['tenant-routing', 'sharding'],
  ['backpressure', 'stream-processing'],
  ['service-mesh', 'mtls'],
  ['cdc', 'search-pipeline'],
  ['containers', 'container-registry'],
];
for (const [a, b] of relatedPairs) {
  if (!concepts[a].related.includes(b)) concepts[a].related.push(b);
  if (!concepts[b].related.includes(a)) concepts[b].related.push(a);
}

/** Root-first ancestry, excluding the target; useful for revealing a search result. */
export function getAncestors(id: string): string[] {
  const ancestors: string[] = [];
  const visited = new Set<string>();
  let parent = concepts[id]?.parent;
  while (parent && !visited.has(parent)) {
    visited.add(parent);
    ancestors.unshift(parent);
    parent = concepts[parent]?.parent;
  }
  return ancestors;
}

const searchIndex = Object.values(concepts).map((concept) => ({
  concept,
  name: `${concept.name} ${concept.id}`.toLowerCase(),
  text: `${concept.name} ${concept.id} ${concept.description} ${concept.options.join(' ')} ${concept.why.join(' ')} ${concept.when.join(' ')}`.toLowerCase(),
}));

/** Ranked, case-insensitive AND search; exact names win before descriptive matches. */
export function searchConcepts(query: string): Concept[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return rootIds.map((id) => concepts[id]);
  const tokens = normalized.split(/\s+/);
  return searchIndex
    .filter((item) => tokens.every((token) => item.text.includes(token)))
    .map((item) => ({
      concept: item.concept,
      score:
        item.concept.name.toLowerCase() === normalized
          ? 100
          : item.name.startsWith(normalized)
            ? 60
            : item.name.includes(normalized)
              ? 40
              : 10 - getAncestors(item.concept.id).length,
    }))
    .sort((a, b) => b.score - a.score || a.concept.name.localeCompare(b.concept.name))
    .map((item) => item.concept);
}
