import type { PlaybackFrame } from '../architectures/types';
import type { Sandbox } from './types';

export function presentationAt(frames: PlaybackFrame[], step: number, completed: boolean) {
  const past = frames.slice(0, completed ? frames.length : Math.max(0, step));
  const clients: Record<string, string> = {};
  const nodeCaptions: Record<string, string> = {};
  for (const frame of past)
    for (const s of frame.steps) {
      if (s.visual?.sourceState) clients[s.visual.sourceState.node] = s.visual.sourceState.state;
      if (s.visual?.client) clients[s.visual.client.node] = s.visual.client.state;
      if (s.visual) nodeCaptions[s.to] = s.visual.caption;
    }
  for (const s of frames[step]?.steps || [])
    if (s.visual?.sourceState) clients[s.visual.sourceState.node] = s.visual.sourceState.state;
  const enqueued = past.flatMap((f) => f.steps).filter((s) => s.to === 'rw-events').length;
  const consumed = past.filter((f) => f.steps.some((s) => s.from === 'rw-events')).length;
  return {
    clients,
    nodeCaptions,
    enqueued,
    consumed,
    visitedNodes: new Set(past.flatMap((f) => f.nodes)),
    visitedEdges: new Set(past.flatMap((f) => f.edgeIds)),
  };
}
export function traceFor(frames: PlaybackFrame[]) {
  let elapsed = 0;
  return frames.flatMap((f, index) => {
    const spans = f.steps.map((s) => ({
      id: s.id,
      name: s.action,
      from: s.from,
      to: s.to,
      start: elapsed,
      duration: s.visual?.latencyMs || 12,
      frame: index,
      phase: s.visual?.phase || 'REQUEST',
    }));
    elapsed += Math.max(...spans.map((s) => s.duration));
    return spans;
  });
}
export function summaryFor(frames: PlaybackFrame[]) {
  const steps = frames.flatMap((f) => f.steps);
  return {
    steps: frames.length,
    sync: steps.filter((s) => ['request', 'read', 'write'].includes(s.edgeType)).length,
    async: steps.filter((s) => ['event', 'telemetry', 'replication'].includes(s.edgeType)).length,
    hits: steps.filter((s) => s.edgeType === 'cache-hit').length,
  };
}
export function applySandbox(frames: PlaybackFrame[], sandbox?: Sandbox): PlaybackFrame[] {
  if (!sandbox) return frames;
  return frames.map((frame) => {
    const steps = frame.steps.map((s) => {
      const slow =
        sandbox.databaseSlow &&
        /database|posts|metadata|ledger|shard/.test(s.to) &&
        ['read', 'write'].includes(s.edgeType);
      const consume = s.from === 'rw-events';
      return {
        ...s,
        duration: slow
          ? s.duration + 1800
          : consume
            ? s.duration / Math.sqrt(sandbox.consumers)
            : s.duration,
        visual: s.visual
          ? {
              ...s.visual,
              ...(slow
                ? {
                    caption: 'SLOW · BOUNDED WAIT',
                    arrival: 'degraded' as const,
                    latencyMs: s.visual.latencyMs * 3,
                  }
                : {}),
              ...(consume && sandbox.consumersPaused
                ? { caption: 'CONSUMER PAUSED', arrival: 'degraded' as const }
                : {}),
            }
          : undefined,
      };
    });
    return { ...frame, steps, duration: Math.max(...steps.map((s) => s.duration)) };
  });
}
export function frameAtTime(frames: PlaybackFrame[], time: number) {
  let remaining = Math.max(0, time);
  for (let i = 0; i < frames.length; i++) {
    if (remaining < frames[i].duration || i === frames.length - 1)
      return { step: i, elapsed: Math.min(remaining, frames[i].duration) };
    remaining -= frames[i].duration;
  }
  return { step: -1, elapsed: 0 };
}
