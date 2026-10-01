import type { Relationship, SimulationStep } from '../knowledge/types';
import type { StepVisual } from './types';
export function legacyVisual(step: SimulationStep, edge?: Relationship): StepVisual {
  const text = `${step.title} ${edge?.kind || ''}`.toLowerCase();
  const packet: StepVisual['packet'] = /cache.*lookup|cache.*key/.test(text)
    ? 'key'
    : /replicat|wal/.test(text)
      ? 'state'
      : /read|query/.test(text)
        ? 'query'
        : /event|publish|fanout/.test(text)
          ? 'event'
          : /media|stream|video/.test(text)
            ? 'segment'
            : /write|commit/.test(text)
              ? 'json'
              : /ack|respond|return/.test(text)
                ? 'ack'
                : 'request';
  const arrival: StepVisual['arrival'] = /timeout|fail|unavailable/.test(text)
    ? 'degraded'
    : /promot|recover/.test(text)
      ? 'replicate'
      : /cache.*hit/.test(text)
        ? 'hit'
        : /cache.*miss/.test(text)
          ? 'miss'
          : /fanout|fan out/.test(text)
            ? 'fanout'
            : /partition|route|balance/.test(text)
              ? 'route'
              : /consume/.test(text)
                ? 'consume'
                : /event|queue|publish/.test(text)
                  ? 'enqueue'
                  : /write|commit|wal/.test(text)
                    ? 'write'
                    : /query|read/.test(text)
                      ? 'read'
                      : /media|video/.test(text)
                        ? 'buffer'
                        : 'process';
  return {
    packet,
    arrival,
    payload:
      packet === 'key'
        ? 'key:user_42'
        : packet === 'event'
          ? 'event:user_42'
          : packet === 'query'
            ? 'SELECT …'
            : packet === 'state'
              ? 'log / state record'
              : 'request 42',
    caption:
      arrival === 'degraded'
        ? 'DEGRADED'
        : arrival === 'replicate'
          ? 'RECOVERY / REPLICATION'
          : arrival === 'hit'
            ? 'HIT'
            : arrival === 'miss'
              ? 'MISS'
              : arrival.toUpperCase(),
    phase:
      arrival === 'degraded'
        ? 'RECOVERY'
        : packet === 'event'
          ? 'ASYNC WORK'
          : packet === 'query' || arrival === 'write'
            ? 'DATA'
            : 'REQUEST',
    latencyMs: 12,
    burst: packet === 'segment' ? 3 : 1,
  };
}
