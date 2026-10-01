import type { Source } from './types';
export const sources: Record<string, Source> = {
  netflix: {
    id: 'netflix',
    title: 'Open Connect overview',
    publisher: 'Netflix',
    url: 'https://openconnect.netflix.com/Open-Connect-Overview.pdf',
    date: 'Undated overview',
    type: 'documentation',
    scope:
      'Appliances store encoded media and serve it directly to clients; broader control-service topology is modeled.',
  },
  discord: {
    id: 'discord',
    title: 'How Discord Stores Trillions of Messages',
    publisher: 'Discord Engineering',
    url: 'https://discord.com/blog/how-discord-stores-trillions-of-messages',
    date: '2023-03-06',
    type: 'engineering',
    scope:
      'Historical migration to ScyllaDB and Rust data services. Does not establish the entire current messaging topology.',
  },
  instagram: {
    id: 'instagram',
    title: 'Scaling the Instagram Explore recommendations system',
    publisher: 'Meta Engineering',
    url: 'https://engineering.fb.com/2023/08/09/ml-applications/scaling-instagram-explore-recommendations-system/',
    date: '2023-08-09',
    type: 'engineering',
    scope:
      'Explore candidate retrieval and multi-stage ranking; applying this separation to the Home Feed is an inference.',
  },
  facebook: {
    id: 'facebook',
    title: 'TAO: The power of the graph',
    publisher: 'Meta Engineering',
    url: 'https://engineering.fb.com/2013/06/25/core-infra/tao-the-power-of-the-graph/',
    date: '2013-06-25',
    type: 'engineering',
    scope:
      'Historical Facebook social-graph storage. Does not identify the current feed implementation.',
  },
  uber: {
    id: 'uber',
    title: 'H3: Uber’s Hexagonal Hierarchical Spatial Index',
    publisher: 'Uber Engineering',
    url: 'https://www.uber.com/us/en/blog/h3/',
    date: '2018-06-27',
    type: 'engineering',
    scope:
      'H3 for marketplace analysis, pricing, and dispatch optimization. Live driver storage and matching topology are conceptual.',
  },
  amazon: {
    id: 'amazon',
    title: 'Dynamo: Amazon’s Highly Available Key-value Store',
    publisher: 'Amazon / SOSP',
    url: 'https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf',
    date: '2007',
    type: 'paper',
    scope:
      'Historical Dynamo shopping-cart use. The checkout saga here is a teaching architecture, not a documented Amazon workflow.',
  },
  google: {
    id: 'google',
    title: 'In-depth guide to how Google Search works',
    publisher: 'Google Search Central',
    url: 'https://developers.google.com/search/docs/fundamentals/how-search-works',
    date: 'Living documentation',
    type: 'documentation',
    scope:
      'Crawling, indexing, and serving stages. Physical shard topology and internal RPCs are conceptual.',
  },
  dropbox: {
    id: 'dropbox',
    title: 'Inside the Magic Pocket',
    publisher: 'Dropbox Engineering',
    url: 'https://dropbox.tech/infrastructure/inside-the-magic-pocket',
    date: '2016-05-06',
    type: 'engineering',
    scope:
      'Historical immutable block storage and content-addressed blocks; the sync flow is a teaching reconstruction.',
  },
  spotify: {
    id: 'spotify',
    title: 'For Your Ears Only: Personalizing Spotify Home with Machine Learning',
    publisher: 'Spotify Engineering',
    url: 'https://engineering.atspotify.com/2020/1/for-your-ears-only-personalizing-spotify-home-with-machine-learning',
    date: '2020-01',
    type: 'engineering',
    scope:
      'Home personalization with listening signals and ML. Audio delivery topology is conceptual.',
  },
  epic: {
    id: 'epic',
    title: 'Networking Overview for Unreal Engine',
    publisher: 'Epic Games',
    url: 'https://dev.epicgames.com/documentation/unreal-engine/networking-overview-for-unreal-engine',
    date: 'Living documentation',
    type: 'documentation',
    scope:
      'Authoritative client/server networking in Unreal Engine; not evidence of Fortnite’s exact production architecture.',
  },
  stripe: {
    id: 'stripe',
    title: 'Idempotent requests',
    publisher: 'Stripe',
    url: 'https://docs.stripe.com/api/idempotent_requests',
    date: 'Living documentation',
    type: 'documentation',
    scope:
      'Public idempotency API behavior; the internal storage and service boundaries are conceptual.',
  },
  intents: {
    id: 'intents',
    title: 'The Payment Intents API',
    publisher: 'Stripe',
    url: 'https://docs.stripe.com/payments/payment-intents',
    date: 'Living documentation',
    type: 'documentation',
    scope:
      'PaymentIntent lifecycle and asynchronous status confirmation. Authorization, capture, and settlement are distinct.',
  },
  youtube: {
    id: 'youtube',
    title: 'Upload videos longer than 15 minutes',
    publisher: 'YouTube Help',
    url: 'https://support.google.com/youtube/answer/71673?hl=en',
    date: 'Living documentation',
    type: 'documentation',
    scope:
      'Public upload and processing behavior. Encoding worker, storage, and CDN choices here are conceptual.',
  },
};
