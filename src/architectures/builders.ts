import type {
  ArchitectureNode,
  ArchitectureEdge,
  ScenarioStep,
  Scenario,
  DebugCondition,
  PacketKind,
} from './types';
import type { Domain, EdgeKind } from '../knowledge/types';

export const node = (
  id: string,
  conceptId: string,
  label: string,
  category: Domain,
  positionHint: number,
  role: string,
  why: string,
  tradeoff: string,
  insight?: ArchitectureNode['insight'],
): ArchitectureNode => ({
  id: `rw-${id}`,
  conceptId,
  label,
  category,
  positionHint,
  role,
  description: role,
  why,
  tradeoff,
  confidence: 'conceptual',
  sourceIds: [],
  importance: 'core',
  expandable: true,
  children: [],
  insight,
});
export const step = (
  from: string,
  to: string,
  action: string,
  explanation: string,
  why: string,
  solves: string,
  edgeType: PacketKind = 'request',
  extra: Partial<ScenarioStep> = {},
): ScenarioStep => ({
  id: '',
  from: `rw-${from}`,
  to: `rw-${to}`,
  action,
  explanation,
  why,
  solves,
  edgeType,
  duration: 2400,
  ...extra,
});
export function scenario(
  id: string,
  name: string,
  description: string,
  keyIdea: string,
  steps: ScenarioStep[],
  debugOptions: DebugCondition[] = ['normal'],
): Scenario {
  const indexed = steps.map((s, i) => ({ ...s, id: `${id}-${i + 1}` }));
  return {
    id,
    name,
    description,
    keyProblem: description,
    keyIdea,
    completion: `${name} · complete`,
    steps: indexed,
    estimatedDuration: indexed.reduce((sum, s) => sum + s.duration, 0),
    debugOptions,
  };
}
export const edgeId = (from: string, to: string) => `${from}--${to}`;
const edgeKinds: Record<PacketKind, EdgeKind> = {
  request: 'request',
  event: 'event',
  read: 'read',
  write: 'write',
  'cache-hit': 'response',
  'cache-miss': 'response',
  media: 'stream',
  replication: 'replication',
  ack: 'response',
  telemetry: 'telemetry',
};
export function edgesFromScenarios(scenarios: Scenario[]): ArchitectureEdge[] {
  const edges = new Map<string, ArchitectureEdge>();
  for (const scenario of scenarios)
    for (const step of scenario.steps) {
      if (step.from === step.to) continue;
      const id = edgeId(step.from, step.to);
      const existing = edges.get(id);
      if (existing) {
        if (!existing.scenarioIds.includes(scenario.id)) existing.scenarioIds.push(scenario.id);
        continue;
      }
      edges.set(id, {
        id,
        source: step.from,
        target: step.to,
        type: edgeKinds[step.edgeType],
        label: step.action,
        description: step.explanation,
        confidence: 'conceptual',
        sourceIds: [],
        scenarioIds: [scenario.id],
      });
    }
  return [...edges.values()];
}
export const commonNodes = () => [
  node(
    'client',
    'client',
    'Client',
    'client',
    0,
    'Starts an action and renders the result.',
    'Keep interactions responsive across unreliable networks.',
    'Local state can be stale.',
  ),
  node(
    'gateway',
    'api-gateway',
    'API / Edge Gateway',
    'network',
    1,
    'Routes authenticated control requests to the owning service.',
    'Bound public access and propagate request identity.',
    'A shared gateway can become a bottleneck.',
  ),
  node(
    'events',
    'kafka',
    'Event Stream',
    'events',
    4,
    'Retains domain events for independent downstream consumers.',
    'Separate background work from user-facing latency.',
    'Consumers must tolerate duplicate processing.',
    'ASYNC BOUNDARY',
  ),
  node(
    'telemetry',
    'observability',
    'Observability',
    'operations',
    6,
    'Collects operational signals across the system.',
    'Detect failures and connect symptoms across services.',
    'Sampling and retention trade detail for cost.',
  ),
  node(
    'infrastructure',
    'infrastructure',
    'Regional Infrastructure',
    'operations',
    6,
    'Places workloads across a failure domain and manages deployment.',
    'Provide capacity and recover replaceable instances.',
    'Regional state recovery needs explicit replication policy.',
  ),
];
