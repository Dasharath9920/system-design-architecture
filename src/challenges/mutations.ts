import { edgesFromScenarios } from '../architectures/builders';
import type {
  CompanyArchitecture,
  ArchitectureNode,
  ArchitectureEdge,
} from '../architectures/types';
import { challengeActions } from './actions';
import type { Challenge } from './types';

const additions: Record<string, { conceptId: string; label: string; target: string }> = {
  add_load_balancer: { conceptId: 'load-balancer', label: 'Load Balancer', target: 'rw-service' },
  add_read_replica: { conceptId: 'replication', label: 'Read Replica', target: 'rw-database' },
  add_cache: { conceptId: 'cache', label: 'Read Cache', target: 'rw-service' },
  add_cdn: { conceptId: 'cdn', label: 'CDN / Edge', target: 'rw-client' },
  add_search_index: { conceptId: 'search', label: 'Search Index', target: 'rw-service' },
  add_failover_replica: {
    conceptId: 'replication',
    label: 'Failover Standby',
    target: 'rw-database',
  },
};

/** Derive a visible graph from the original architecture and the learner's changes. */
export function challengeArchitecture(
  base: CompanyArchitecture,
  challenge: Challenge,
  applied: string[],
): CompanyArchitecture {
  const nodes = [...base.nodes];
  const edges = base.edges.map((edge) => ({ ...edge }));
  const scenarios = base.scenarios.map((scenario) => {
    if (
      challenge.id === 'single-server-overload' &&
      scenario.id === challenge.architecture.scenario &&
      applied.includes('add_load_balancer')
    ) {
      const steps = scenario.steps.flatMap((step) =>
        step.from === 'rw-gateway' && step.to === 'rw-service'
          ? [
              {
                ...step,
                id: `${step.id}-balanced`,
                to: 'challenge-add_load_balancer',
                action: 'Route through load balancer',
                explanation: 'The public endpoint selects a healthy application instance.',
              },
              {
                ...step,
                from: 'challenge-add_load_balancer',
                action: 'Dispatch to healthy instance',
                explanation: 'Requests spread across stateless service instances.',
              },
            ]
          : [step],
      );
      return { ...scenario, steps };
    }
    if (
      challenge.id !== 'replica-lag' ||
      scenario.id !== 'stale-read-challenge' ||
      !applied.includes('sticky_read')
    )
      return scenario;
    const steps = scenario.steps.map((step, index) =>
      index === 5
        ? {
            ...step,
            to: 'rw-metadata',
            action: 'Route immediate read to writer',
            explanation: 'This session reads its just-committed version from the primary.',
          }
        : index === 6
          ? {
              ...step,
              from: 'rw-metadata',
              action: 'Version 2',
              explanation: 'The writer returns the latest committed version.',
            }
          : index === 7
            ? {
                ...step,
                action: 'LATEST VERSION ✓ · received v2',
                explanation: 'The client sees the version it just saved.',
                visual: step.visual
                  ? {
                      ...step.visual,
                      payload: 'version=2',
                      arrival: 'read' as const,
                      caption: 'LATEST VERSION ✓',
                      client: { node: 'rw-client', state: 'latest-version' },
                    }
                  : undefined,
              }
            : step,
    );
    return { ...scenario, steps };
  });

  for (const id of applied) {
    const addition = additions[id];
    if (!addition) continue;
    const action = challengeActions[id];
    const target =
      nodes.find((node) => node.id === addition.target) ||
      nodes.find((node) => action.nodeIds.includes(node.id));
    if (!target) continue;
    const newId = `challenge-${id}`;
    if (nodes.some((node) => node.id === newId)) continue;
    const node: ArchitectureNode = {
      ...target,
      id: newId,
      conceptId: addition.conceptId,
      label: addition.label,
      role: action.summary,
      description: action.summary,
      category:
        addition.conceptId === 'cache' || addition.conceptId === 'replication' ? 'data' : 'network',
      positionHint: target.positionHint + (id === 'add_load_balancer' ? -0.25 : 0.25),
      insight: undefined,
      sourceIds: [],
    };
    nodes.push(node);
    const source =
      id === 'add_load_balancer' && nodes.some((item) => item.id === 'rw-gateway')
        ? 'rw-gateway'
        : target.id;
    const edge: ArchitectureEdge = {
      id: `${source}--${newId}`,
      source,
      target: newId,
      type: addition.conceptId === 'replication' ? 'replication' : 'request',
      label: action.label,
      description: action.summary,
      confidence: 'conceptual',
      sourceIds: [],
      scenarioIds: [challenge.architecture.scenario],
    };
    edges.push(edge);
    if (id === 'add_load_balancer' && source !== target.id) {
      edges.push({
        ...edge,
        id: `${newId}--${target.id}`,
        source: newId,
        target: target.id,
        label: 'Dispatch to healthy instance',
      });
      const direct = edges.find((item) => item.id === `${source}--${target.id}`);
      if (direct) {
        direct.type = 'alternative';
        direct.label = 'Direct route replaced';
      }
    }
  }

  if (challenge.id === 'replica-lag' && applied.includes('sticky_read')) {
    const stale = edges.find((edge) => edge.id === 'rw-gateway--rw-replica');
    if (stale) {
      stale.type = 'alternative';
      stale.label = 'Replica path bypassed for this session';
    }
    const writer = edges.find((edge) => edge.id === 'rw-gateway--rw-metadata');
    if (writer) writer.label = 'Immediate read · writer';
  }
  for (const edge of edgesFromScenarios(scenarios)) {
    if (!edges.some((existing) => existing.id === edge.id)) edges.push(edge);
  }
  return { ...base, nodes, edges, scenarios };
}
