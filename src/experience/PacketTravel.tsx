import { memo, useEffect, useRef } from 'react';
import type { AnimationClock, StepVisual, SemanticPacket } from './types';
import { clockElapsed } from './useAnimationClock';
const glyphs: Record<SemanticPacket, string> = {
  request: '→',
  json: '{}',
  key: '⌁',
  query: '?',
  rows: '≡',
  message: '…',
  event: '◆',
  segment: '▶',
  chunk: '01',
  transaction: '$',
  location: '·',
  input: '→',
  state: '≋',
  ack: '✓',
  telemetry: '⌁',
  post: '▧',
};
export const PacketTravel = memo(function PacketTravel({
  path,
  clock,
  visual,
  onInspect,
  reverse = false,
}: {
  path: string;
  clock: AnimationClock;
  visual: StepVisual;
  onInspect: () => void;
  reverse?: boolean;
}) {
  const count = Math.min(4, visual.burst || 1);
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <TravelObject
          key={`${clock.key}-${i}`}
          path={path}
          clock={clock}
          visual={visual}
          index={i}
          onInspect={onInspect}
          reverse={reverse}
        />
      ))}
    </>
  );
});
function TravelObject({
  path,
  clock,
  visual,
  index,
  onInspect,
  reverse,
}: {
  path: string;
  clock: AnimationClock;
  visual: StepVisual;
  index: number;
  onInspect: () => void;
  reverse: boolean;
}) {
  const ref = useRef<SVGGElement>(null);
  const animation = useRef<Animation | null>(null);
  const delay = index * clock.duration * 0.055;
  const travel = clock.duration * 0.72;
  useEffect(() => {
    if (!ref.current) return;
    const motion = ref.current.animate(
      [
        { offsetDistance: reverse ? '100%' : '0%', opacity: 0 },
        { offsetDistance: reverse ? '98%' : '2%', opacity: 1, offset: 0.08 },
        { offsetDistance: reverse ? '0%' : '100%', opacity: 1 },
      ],
      { duration: travel, delay, fill: 'both', easing: 'cubic-bezier(.32,.02,.2,1)' },
    );
    animation.current = motion;
    return () => {
      motion.cancel();
      animation.current = null;
    };
  }, [path, clock.key, travel, delay, reverse]);
  useEffect(() => {
    const motion = animation.current;
    if (!motion) return;
    const elapsed = clockElapsed(clock);
    motion.currentTime = Math.min(elapsed, travel + delay);
    motion.playbackRate = clock.speed || 1;
    if (clock.running && elapsed < travel + delay) motion.play();
    else motion.pause();
  }, [path, clock.key, clock.elapsed, clock.startedAt, clock.speed, clock.running, travel, delay]);
  const square = ['json', 'rows', 'segment', 'chunk', 'post', 'state'].includes(visual.packet);
  return (
    <g
      ref={ref}
      className={`${index === 0 ? 'request-packet world-packet' : 'packet-following'} semantic-packet semantic-${visual.packet}`}
      style={{ offsetPath: `path('${path}')`, offsetRotate: '0deg' }}
      data-packet-kind={visual.packet}
      role={index === 0 ? 'button' : undefined}
      tabIndex={index === 0 ? 0 : undefined}
      aria-label={index === 0 ? `Inspect ${visual.packet} payload: ${visual.payload}` : undefined}
      onClick={(e) => {
        e.stopPropagation();
        onInspect();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onInspect();
        }
      }}
    >
      <title>{visual.payload}</title>
      <path className="packet-tail" d="M-13 0h-11m-4 0h-5" />
      {visual.packet === 'message' ? (
        <path className="packet-shell" d="M-9-7h18v12H-3l-5 4V5h-1z" />
      ) : visual.packet === 'location' ? (
        <path className="packet-shell" d="M0 10C-16-3-7-13 0-10C7-13 16-3 0 10Z" />
      ) : square ? (
        <rect className="packet-shell" x="-10" y="-7" width="20" height="14" rx="3" />
      ) : (
        <circle className="packet-shell" r="8" />
      )}
      <text textAnchor="middle" dominantBaseline="central">
        {visual.packet === 'segment'
          ? String(index + 1).padStart(2, '0')
          : visual.packet === 'chunk'
            ? ['01', '03', '04', '06'][index]
            : glyphs[visual.packet]}
      </text>
    </g>
  );
}
