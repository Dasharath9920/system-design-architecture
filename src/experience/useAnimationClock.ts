import { useEffect, useState } from 'react';
import type { AnimationClock } from './types';
export const clockElapsed = (clock: AnimationClock) =>
  clock.elapsed + (clock.running ? (performance.now() - clock.startedAt) * (clock.speed || 1) : 0);
/** One arrival notification per active node. No graph-wide animation-frame state. */
export function useArrival(clock: AnimationClock | undefined) {
  const [arrived, setArrived] = useState(false);
  useEffect(() => {
    if (!clock) {
      setArrived(false);
      return;
    }
    const remaining = clock.duration * 0.72 - clockElapsed(clock);
    if (clock.reduced || remaining <= 0) {
      setArrived(true);
      return;
    }
    setArrived(false);
    if (!clock.running) return;
    const timer = window.setTimeout(() => setArrived(true), remaining / (clock.speed || 1));
    return () => window.clearTimeout(timer);
  }, [
    clock?.key,
    clock?.duration,
    clock?.elapsed,
    clock?.startedAt,
    clock?.speed,
    clock?.running,
    clock?.reduced,
  ]);
  return arrived;
}
