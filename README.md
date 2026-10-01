# System Design Universe

A canvas-first, interactive architecture explorer. Start with 18 major components, follow a request, then explore hundreds of connected concepts without leaving the graph.

## Run locally

Requires Node.js 20.19+ or 22.12+ and npm.

```sh
npm install
npm run dev
```

Open **http://localhost:5173**. No API keys, backend, or database are required.

```sh
npm run build     # Type-check and create dist/
npm run preview   # Serve the production build
npm test          # Knowledge, layout, and simulation checks
npm run test:e2e  # Browser interaction tests
```

Browser tests use installed Google Chrome on macOS, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` if provided, or Playwright Chromium. On other systems, install Chromium with `npx playwright install chromium` first.

## Explore

- Drag to pan; scroll or pinch to zoom. Use the minimap or **Fit architecture** to find your way back.
- Click a node to inspect its purpose, options, trade-offs, and connections. Double-click or use its **+** button to explore children.
- Click an edge to understand the interaction. Dotted **includes** lines in deep views show containment, not runtime traffic.
- Search with **⌘K / Ctrl+K**. Find concepts, companies, and flows; company questions open the appropriate real-world architecture.
- Breadcrumbs and **Escape** move back through the hierarchy. Zooming into a selected expandable node reveals its internals; zooming far out collapses a level.
- **F** fits the graph; arrow keys pan; **Space** plays or pauses the current flow.
- **Visualize request** offers normal requests, CDN hits, order events, video delivery, and chat, depending on the preset. Pause or select any step to inspect the flow.
- Within **PostgreSQL**, **Redis Cluster**, and **Apache Kafka**, visualization follows the selected technology’s internals.
- Select cache, services, database, Kafka, or workers to simulate a recoverable failure. The explanation states the redundancy and failover assumptions.
- Change traffic to see instance counts, replicas, queue backlog, and architectural pressure. These are illustrative teaching models, not measured capacity predictions.

The six presets reuse one graph: production, e-commerce, real-time chat, video streaming, URL shortener, and analytics. Optional and advanced components are labeled; no preset claims to be the only correct implementation.

## Real-world architectures

Open the architecture selector in the header. Choose one of ten families, start with **Generic Pattern**, then select an authored company example. The same canvas morphs between architectures.

| Family              | Authored examples                          | Main flows                                       |
| ------------------- | ------------------------------------------ | ------------------------------------------------ |
| Social Feed         | Instagram, historical Facebook TAO variant | Home Feed, Create Post, Celebrity Post           |
| Messaging           | Discord                                    | Send Message, Group Message, Reconnect           |
| Video Streaming     | Netflix, YouTube                           | Playback, Seek, Upload / Catalog Preparation     |
| Ride Sharing        | Uber                                       | Request Ride, Location Updates, Complete Trip    |
| E-commerce          | Amazon-style                               | Order Saga, Search, Cart                         |
| Search Engine       | Google-style                               | Parallel Query, Crawl / Index, Autocomplete      |
| File Storage / Sync | Dropbox                                    | Upload, Device Sync, Conflict Resolution         |
| Music / Audio       | Spotify-style                              | Playback, Playlist, Recommendations              |
| Real-time Gaming    | Fortnite-style                             | Join Match, Movement / Replication, Match Result |
| Payments            | Stripe-style                               | Authorization, Capture, Refund, Reconciliation   |

**Play flow** runs a finite scenario with simultaneous parallel paths, semantic packet glyphs, step explanations, pause/resume, previous/next, restart, a scrubbable timeline, and 0.5×–2× or Instant speed. Completion stops every moving packet, retains the completed route and client result, and offers replay or a next scenario. Restart clears that state. Clicking a component pauses playback; concept drill-down preserves a return path to the company architecture.

**Auto Follow** is on by default in both players. Each playing step frames its source, destinations, and routed packets together, including parallel branches and expanded internals. A 550 ms eased transition finishes before packet travel; already readable interactions keep their current framing. Pan, zoom, minimap interaction, or selection interrupts following. Pause preserves the viewport, and resume follows from the next step. Stop, reset, or changing scenarios restores the captured overview; natural completion holds the last view for one second before a 750 ms return. A resized browser or changed story layout uses the normal overview fit calculation. Reduced motion uses immediate framing. Turning Auto Follow off keeps manual camera control.

Mini client previews reflect scenario outcomes, with finite cache, database, queue, media, ranking, chunking, and delivery effects. Explain, Cinema (Escape to exit), motion preferences, simulated traces, contextual sandbox actions, and four-step Show Me demonstrations are available in the relevant controls and inspectors. Trace timings and sandbox quantities are explicitly illustrative.

Debug branches are authored per scenario: cache hit/miss, offline recipient, slow database, consumer lag, degraded network, inventory rejection, and uncertain payment outcomes. These change the actual steps. Architecture lenses highlight the flow, data, reliability, infrastructure, or observability concerns. Comparison marks changed decisions and evidence; optional insight labels identify important boundaries. Traffic remains an illustrative model, not a company capacity estimate.

Every component and edge carries **verified**, **inferred**, or **conceptual** confidence. Inspect a component or open **Evidence & sources** for publication dates, historical scope, and primary references. A documented component does not verify the entire company diagram. The 50-company discovery catalog currently offers 12 authored company examples; remaining entries are explicitly marked **Research planned**, not filled with invented company diagrams.

Deep links use `/architecture/:family/:company/:scenario`, for example `/architecture/video/netflix/playback`. Refresh and browser back restore the selected architecture and scenario. Playback restarts idle; it does not auto-run after navigation. Static hosting must rewrite unknown application paths to `index.html`.

## Structure

| Directory                | Responsibility                                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `src/knowledge`          | Typed concepts, authored explanations, hierarchy, source links, and semantic relationships                       |
| `src/graph`              | Progressive visibility and scenario-specific edge selection                                                      |
| `src/layout`             | Deterministic layout with dependency ranks, cycle handling, and a separate operations rail                       |
| `src/nodes`, `src/edges` | Memoized graph rendering, semantic edge styling, directional packets                                             |
| `src/simulation`         | Finite flow steps, failure behavior, traffic assumptions, and timeline helpers                                   |
| `src/scenarios`          | Architecture presets                                                                                             |
| `src/state`              | Zustand interaction and simulation state                                                                         |
| `src/components`         | Contextual inspectors, search, controls, and lightweight chrome                                                  |
| `src/experience`         | Reusable visual primitives, client state replay, sandbox presentation, and generic flow camera framing           |
| `src/architectures`      | Typed family registry, lazy content modules, evidence, branch/parallel engine, URL state, player, and inspectors |

React, TypeScript, Vite, and React Flow provide the application foundation. The knowledge graph is independent of visible nodes: only the selected hierarchy level renders. Inspectors and search load on demand, and the knowledge and graph dependencies have separate production chunks. Motion respects `prefers-reduced-motion`; the same explanations and step controls remain available without animated packets.

## Technical references and scope

Cornerstone concepts link to primary documentation in their inspector. Flow semantics were checked against the [Kafka design documentation](https://kafka.apache.org/41/design/design/), [PostgreSQL replication documentation](https://www.postgresql.org/docs/current/high-availability.html), [Redis Cluster specification](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/), [AWS transactional outbox guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html), and [MDN HTTP caching guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching). Canvas integration follows the [React Flow documentation](https://reactflow.dev/learn).

This is a local educational simulator. It does not execute real network requests, deploy infrastructure, benchmark workloads, or predict availability. Multi-region, sharding, and Kubernetes internals are explorable knowledge branches; they do not run a live distributed-system model. Architecture-question search uses local intent matching, not a remote language model. Real-world architecture URLs survive refresh; account sync and persisted workspaces are outside this build.

The application works without external data services. Optional Google Fonts enhance the typography; system fonts are used when unavailable. Deploy `dist/` to any static hosting service after `npm run build`.
