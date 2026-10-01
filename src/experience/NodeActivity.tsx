import { memo, useEffect, useRef, useState } from 'react';
import type { Activity } from './types';
export const NodeActivity = memo(function NodeActivity({
  kind,
  caption,
  arrived,
  paused,
  reduced,
  queue = 4,
}: {
  kind: Activity;
  caption: string;
  arrived: boolean;
  paused: boolean;
  reduced: boolean;
  queue?: number;
}) {
  return (
    <div
      className={`node-activity activity-${kind} ${arrived ? 'activity-arrived' : ''} ${paused ? 'activity-paused' : ''} ${reduced ? 'activity-static' : ''}`}
      aria-label={caption}
    >
      <svg viewBox="0 0 156 19" aria-hidden="true">
        {['rank', 'merge'].includes(kind) ? (
          [0, 1, 2, 3, 4].map((n) => (
            <g
              key={n}
              className="rank-card"
              style={{ transform: `translateX(${(arrived ? [1, 3, 0, 4, 2][n] : n) * 29}px)` }}
            >
              <rect x="1" y="1" width="24" height="17" rx="2" />
              <text x="9" y="13">
                {'ABCDE'[n]}
              </text>
            </g>
          ))
        ) : ['chunks', 'deduplicate'].includes(kind) ? (
          [0, 1, 2, 3, 4].map((n) => (
            <g
              key={n}
              className={
                kind === 'deduplicate' && arrived && [1, 4].includes(n) ? 'chunk-reused' : ''
              }
            >
              <rect x={n * 30} y="1" width="24" height="16" rx="2" />
              <text x={n * 30 + 6} y="12">
                0{n + 1}
              </text>
            </g>
          ))
        ) : ['match'].includes(kind) ? (
          <>
            <path d="M8 14h44L86 4h62" />
            {[28, 78, 131].map((x, i) => (
              <g key={x} className={arrived && i === 1 ? 'match-selected' : ''}>
                <circle cx={x} cy={i === 1 ? 6 : 13} r="4" />
                <text x={x + 7} y={i === 1 ? 9 : 16}>
                  {'ABC'[i]}
                </text>
              </g>
            ))}
          </>
        ) : ['fanout', 'route'].includes(kind) ? (
          <>
            <path className="branch-path" d="M8 9h30M38 9L90 2h53M38 9h105M38 9L90 17h53" />
            <circle cx="8" cy="9" r="3" />
            {[2, 9, 17].map((y) => (
              <circle key={y} cx="146" cy={y} r="2" />
            ))}
          </>
        ) : ['ledger', 'authorize'].includes(kind) ? (
          <>
            <rect x="1" y="1" width="66" height="17" rx="2" />
            <rect x="82" y="1" width="66" height="17" rx="2" />
            <text x="7" y="12">
              {kind === 'ledger' ? 'DR 125.00' : 'CHECK'}
            </text>
            <text x="88" y="12">
              {kind === 'ledger'
                ? 'CR 125.00'
                : !arrived || caption.includes('PENDING')
                  ? 'PENDING'
                  : caption.startsWith('AUTHORIZED')
                    ? 'HELD'
                    : 'CHECKED'}
            </text>
            <text x="72" y="12">
              =
            </text>
          </>
        ) : ['predict', 'reconcile', 'replicate'].includes(kind) ? (
          <>
            <path d="M1 15h150" />
            <rect className="state-ghost" x="106" y="3" width="10" height="12" rx="2" />
            <rect
              className="state-authority"
              x={arrived ? 98 : 35}
              y="3"
              width="10"
              height="12"
              rx="2"
            />
            <path d="M57 7h30m-5-3 5 3-5 3" />
          </>
        ) : ['hit', 'miss'].includes(kind) ? (
          <>
            <rect x="1" y="1" width="42" height="16" rx="3" />
            <text x="10" y="12">
              KEY
            </text>
            <path d="M52 9h44" />
            <text x="108" y="12">
              {kind === 'hit' ? '✓ HIT' : '× MISS'}
            </text>
          </>
        ) : ['enqueue', 'consume'].includes(kind) ? (
          <>
            {Array.from({ length: 9 }, (_, i) => (
              <rect
                key={i}
                className={i < Math.min(9, Math.max(0, queue)) ? 'queue-filled' : ''}
                x={i * 15}
                y="3"
                width="11"
                height="12"
                rx="2"
              />
            ))}
            <path d="M139 9h15m-4-3 4 3-4 3" />
          </>
        ) : kind === 'buffer' ? (
          <>
            {[0, 1, 2, 3, 4].map((i) => (
              <rect
                className="activity-buffer"
                style={{ animationDelay: `${i * 110}ms` }}
                key={i}
                x={i * 30}
                y="5"
                width="24"
                height="9"
                rx="2"
              />
            ))}
          </>
        ) : (
          <>
            {[0, 1, 2].map((i) => (
              <g key={i} className="activity-row" style={{ animationDelay: `${i * 80}ms` }}>
                <rect x="2" y={i * 6 + 1} width="17" height="3" rx="1" />
                <rect x="24" y={i * 6 + 1} width={88 - i * 15} height="3" rx="1" />
              </g>
            ))}
            <text x="124" y="12">
              {kind === 'write' ? '✓' : kind === 'degraded' ? '!' : '↗'}
            </text>
          </>
        )}
      </svg>
      <span>{caption}</span>
    </div>
  );
});

export function InstancePool({
  count,
  failed = false,
  active = false,
}: {
  count: number;
  failed?: boolean;
  active?: boolean;
}) {
  const previous = useRef(count);
  const [draining, setDraining] = useState(0);
  const [change, setChange] = useState(0);
  useEffect(() => {
    const delta = count - previous.current;
    if (!delta) return;
    setDraining(Math.max(0, -delta));
    setChange(delta);
    previous.current = count;
    const t = setTimeout(() => {
      setDraining(0);
      setChange(0);
    }, 900);
    return () => clearTimeout(t);
  }, [count]);
  return (
    <span
      className={`instance-pool ${active ? 'pool-routing' : ''}`}
      aria-label={`${count} instances${failed ? ', one unhealthy' : ''}`}
    >
      {Array.from({ length: Math.min(12, count + draining) }, (_, i) => (
        <i
          key={i}
          style={{ animationDelay: `${i * 60}ms` }}
          className={
            i >= count
              ? 'instance-draining'
              : failed && i === 0
                ? 'instance-failed'
                : active && i === (failed ? 1 : 0)
                  ? 'instance-chosen'
                  : ''
          }
        />
      ))}
      {change !== 0 && <small>{change > 0 ? `+${change} instances` : 'DRAINING'}</small>}
    </span>
  );
}
