export type SemanticPacket =
  | 'request'
  | 'json'
  | 'key'
  | 'query'
  | 'rows'
  | 'message'
  | 'event'
  | 'segment'
  | 'chunk'
  | 'transaction'
  | 'location'
  | 'input'
  | 'state'
  | 'ack'
  | 'telemetry'
  | 'post';
export type Activity =
  | 'process'
  | 'read'
  | 'write'
  | 'hit'
  | 'miss'
  | 'enqueue'
  | 'consume'
  | 'rank'
  | 'fanout'
  | 'merge'
  | 'buffer'
  | 'match'
  | 'chunks'
  | 'deduplicate'
  | 'authorize'
  | 'ledger'
  | 'predict'
  | 'reconcile'
  | 'replicate'
  | 'route'
  | 'degraded';
export interface StepVisual {
  packet: SemanticPacket;
  payload: string;
  arrival: Activity;
  caption: string;
  phase: 'REQUEST' | 'DATA' | 'ASYNC WORK' | 'MEDIA' | 'RECOVERY';
  latencyMs: number;
  burst?: number;
  hold?: number;
  client?: { node: string; state: string };
  sourceState?: { node: string; state: string };
}
export interface AnimationClock {
  key: string;
  duration: number;
  elapsed: number;
  startedAt: number;
  speed: number;
  running: boolean;
  reduced: boolean;
}
export interface NodeStory {
  visual: StepVisual;
  clock: AnimationClock;
  receiving: boolean;
}
export interface Sandbox {
  databaseSlow: boolean;
  consumersPaused: boolean;
  consumers: number;
  burst: number;
  extraServers: number;
  failedServer: boolean;
  replicas: number;
}
export const defaultSandbox: Sandbox = {
  databaseSlow: false,
  consumersPaused: false,
  consumers: 1,
  burst: 0,
  extraServers: 0,
  failedServer: false,
  replicas: 1,
};
