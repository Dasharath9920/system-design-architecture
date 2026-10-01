import { memo } from 'react';
const labels: Record<string, string> = {
  idle: 'READY',
  loading: 'REQUESTING',
  feed: 'RANKED FEED',
  publishing: 'PUBLISHING',
  posted: 'POST SAVED',
  sending: '○ SENDING',
  sent: '✓ SENT',
  received: 'Hello 👋',
  delivered: '✓✓ DELIVERED',
  offline: 'OFFLINE · STORED',
  manifest: 'MANIFEST READY',
  playing: 'BUFFERED · PLAYING',
  adaptive: '720p · BUFFERED',
  uploading: 'UPLOADING',
  ready: 'READY TO PLAY',
  searching: 'FINDING',
  offer: 'RIDE OFFER',
  matched: 'DRIVER B MATCHED',
  moving: 'LOCATION UPDATED',
  complete: 'TRIP COMPLETE',
  ordering: 'CHECKOUT PENDING',
  confirmed: 'ORDER CONFIRMED',
  unavailable: 'OUT OF STOCK',
  canceled: 'CANCELED · RELEASED',
  products: 'PRODUCTS FOUND',
  cart: 'CART SAVED',
  results: 'RANKED RESULTS',
  suggestions: 'SUGGESTIONS',
  deduplicated: 'UPLOAD 01 · 03 · 04',
  uploaded: 'VERSION COMMITTED',
  changes: 'CHANGE AVAILABLE',
  synced: 'SYNCED',
  conflict: 'BOTH EDITS PRESERVED',
  playlist: 'PLAYLIST READY',
  recommendations: 'FOR YOUR EARS',
  matching: 'MATCHMAKING',
  joining: 'JOINING SESSION',
  joined: 'SESSION CONNECTED',
  predicted: 'CLIENT PREDICTION',
  reconciled: 'SERVER CORRECTION',
  replicated: 'STATE RECEIVED',
  saved: 'PROGRESS SAVED',
  validating: 'VALIDATING',
  authorized: 'AUTHORIZED',
  pending: 'OUTCOME UNKNOWN',
  captured: 'CAPTURED ≠ SETTLED',
  refunded: 'REFUND RECORDED',
  settled: 'SETTLED',
};
export const ClientPreview = memo(function ClientPreview({
  family,
  state = 'idle',
  active = false,
}: {
  family: string;
  state?: string;
  active?: boolean;
}) {
  const ready = [
    'feed',
    'received',
    'delivered',
    'playing',
    'adaptive',
    'matched',
    'confirmed',
    'results',
    'synced',
    'uploaded',
    'playlist',
    'recommendations',
    'joined',
    'reconciled',
    'replicated',
    'authorized',
    'captured',
    'settled',
  ].includes(state);
  const label = labels[state] || state.toUpperCase();
  return (
    <div
      className={`client-preview preview-${family} ${ready ? 'preview-ready' : ''} ${active ? 'preview-active' : ''}`}
      data-preview-state={state}
      aria-label={`${family} client: ${label}`}
    >
      <svg viewBox="0 0 156 28" aria-hidden="true">
        {family === 'social' && (
          <>
            {[0, 1, 2].map((_, i) => (
              <g key={i} transform={`translate(${i * 50},0)`}>
                <rect className={`preview-art art-${i}`} width="42" height="22" rx="3" />
                <path d="M4 17l10-10 6 6 8-5 10 9" />
                <text x="5" y="9">
                  {ready ? ['C', 'A', 'E'][i] : ['A', 'B', 'C'][i]}
                </text>
              </g>
            ))}
          </>
        )}
        {family === 'chat' && (
          <>
            <path className="preview-chat" d="M4 3h89v17H14l-7 6v-6H4Z" />
            <text x="12" y="14">
              {state === 'idle'
                ? 'Hello 👋'
                : state === 'offline'
                  ? 'Waiting for reconnect'
                  : 'Hello 👋'}
            </text>
            <text className="preview-check" x="119" y="17">
              {['delivered', 'received'].includes(state) ? '✓✓' : state === 'sent' ? '✓' : '○'}
            </text>
          </>
        )}
        {(family === 'video' || family === 'music') && (
          <>
            <rect className="preview-art art-1" width="34" height="25" rx="3" />
            {family === 'video' ? (
              <path d="M13 7l12 6-12 6z" />
            ) : (
              <path d="M5 13h3l2-7 3 16 3-20 3 19 3-11 3 3h4" />
            )}
            <text x="43" y="9">
              {family === 'music'
                ? 'AUDIO STREAM'
                : state === 'adaptive'
                  ? '720p · ADAPTIVE'
                  : '1080p · MEDIA'}
            </text>
            {[0, 1, 2, 3].map((i) => (
              <rect
                key={i}
                className={`buffer-segment ${ready ? 'filled' : ''}`}
                x={44 + i * 26}
                y="16"
                width="22"
                height="5"
                rx="1"
                style={{ animationDelay: `${i * 110}ms` }}
              />
            ))}
          </>
        )}
        {family === 'ride' && (
          <>
            <path className="mini-map" d="M0 9h153M0 21h153M18 0v28M52 0v28M95 0v28M132 0v28" />
            <path
              className="mini-route"
              d={state === 'matched' ? 'M20 19H75V7H117' : 'M20 19H48'}
            />
            {[
              ['A', 52, 5],
              ['B', 117, 7],
              ['C', 87, 22],
            ].map(([name, x, y]) => (
              <g
                key={name}
                className={state === 'matched' && name === 'B' ? 'driver-selected' : ''}
              >
                <circle cx={Number(x)} cy={Number(y)} r="3" />
                <text x={Number(x) + 5} y={Number(y) + 3}>
                  {name}
                </text>
              </g>
            ))}
            <circle className="rider-point" cx="20" cy="19" r="4" />
          </>
        )}
        {family === 'commerce' && (
          <>
            <rect className="preview-art art-2" width="25" height="25" rx="3" />
            <path d="M6 8h13v11H6zm3 0V5h7v3" />
            <text x="34" y="10">
              ORDER #1042
            </text>
            <path className="order-track" d="M38 21h105" />
            {[0, 1, 2].map((i) => (
              <circle
                className={ready ? 'order-done' : ''}
                key={i}
                cx={40 + i * 47}
                cy="21"
                r="3"
              />
            ))}
          </>
        )}
        {family === 'search' && (
          <>
            <circle cx="6" cy="6" r="4" />
            <path d="M9 9l4 4" />
            <text x="18" y="9">
              distributed systems
            </text>
            {[0, 1, 2].map((i) => (
              <g key={i}>
                <rect
                  className={ready ? 'result-ready' : ''}
                  x="3"
                  y={14 + i * 5}
                  width={ready ? 110 - i * 18 : 42}
                  height="2"
                  rx="1"
                />
                <rect x="125" y={14 + i * 5} width="24" height="2" />
              </g>
            ))}
          </>
        )}
        {family === 'files' && (
          <>
            {[0, 1, 2, 3, 4].map((i) => (
              <g
                key={i}
                className={
                  ['deduplicated', 'uploaded', 'changes', 'synced'].includes(state) &&
                  [1, 4].includes(i)
                    ? 'chunk-reused'
                    : ''
                }
              >
                <rect x={i * 29 + 2} y="2" width="23" height="23" rx="2" />
                <text x={i * 29 + 8} y="16">
                  {i + 1 < 10 ? '0' : ''}
                  {i + 1}
                </text>
              </g>
            ))}
          </>
        )}
        {family === 'gaming' && (
          <>
            <path className="game-ground" d="M0 22h153M27 22V8h28v14M106 22V4h22v18" />
            <rect
              className="predicted-player"
              x={state === 'predicted' ? 95 : 78}
              y="10"
              width="9"
              height="12"
              rx="2"
            />
            <rect
              className="real-player"
              x={
                ['reconciled', 'replicated', 'joined'].includes(state)
                  ? 79
                  : state === 'predicted'
                    ? 95
                    : 63
              }
              y="10"
              width="9"
              height="12"
              rx="2"
            />
            <path d="M72 6h22m-4-3 4 3-4 3" />
          </>
        )}
        {family === 'payments' && (
          <>
            <rect className="payment-card" x="0" y="1" width="149" height="25" rx="3" />
            <text x="7" y="12">
              USD 125.00
            </text>
            <text x="7" y="21">
              {state === 'captured'
                ? 'CAPTURE RECORDED'
                : state === 'settled'
                  ? 'FUNDS SETTLED'
                  : 'intent_42 · stable key'}
            </text>
            <circle cx="135" cy="13" r="7" />
            <text x="132" y="16">
              {ready ? '✓' : '·'}
            </text>
          </>
        )}
      </svg>
      <span className="client-state-label">{label}</span>
    </div>
  );
});
