import { concepts } from '../knowledge/catalog';
import type { Concept, Relationship } from '../knowledge/types';
import type { CompanyArchitecture, Lens } from './types';
export function architectureConcepts(architecture: CompanyArchitecture): Record<string, Concept> {
  const captions: Record<string, string> = {
    'rw-client': 'Start an action',
    'rw-service': 'Coordinate the action',
    'rw-rank': 'Score · select · order',
    'rw-presence': 'Live session lookup',
    'rw-cdn': 'Media near the viewer',
    'rw-storage': 'Durable bytes',
    'rw-metadata': 'Metadata and versions',
    'rw-events': 'Retain · replay · consume',
    'rw-server': 'Validate inputs · simulate',
    'rw-geo': 'Fresh nearby positions',
    'rw-match': 'Candidates → assignment',
    'rw-idempotency': 'One logical operation',
    'rw-ledger': 'Balanced, durable entries',
    'rw-chunks': 'Hash · split · reuse',
  };
  return Object.fromEntries(
    architecture.nodes.map((n) => {
      const base = concepts[n.conceptId];
      if (!base) throw new Error(`Unknown concept ${n.conceptId}`);
      return [
        n.id,
        {
          ...base,
          id: n.id,
          name: n.label,
          subtitle: n.technology || captions[n.id] || base.subtitle,
          description: n.description,
          domain: n.category,
          stage: n.positionHint,
          why: [n.why],
          tradeoffs: [n.tradeoff],
          kind: n.technology ? 'technology' : n.category === 'compute' ? 'service' : base.kind,
          source: undefined,
        } satisfies Concept,
      ];
    }),
  );
}
export const architectureRelationships = (a: CompanyArchitecture): Relationship[] =>
  a.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    kind: e.type,
    label: e.label,
    description: e.description,
  }));
export function lensMatches(category: string, lens: Lens) {
  if (lens === 'data') return ['data', 'events'].includes(category);
  if (lens === 'reliability') return ['data', 'security', 'operations'].includes(category);
  if (lens === 'infrastructure') return ['operations', 'network'].includes(category);
  if (lens === 'observability') return category === 'operations';
  return true;
}
