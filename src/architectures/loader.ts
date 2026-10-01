import { edgesFromScenarios } from './builders';
import { getFamily } from './registry';
import { enrichScenarios } from '../experience/content';
import type { CompanyArchitecture, FamilyBlueprint } from './types';
const modules: Record<string, () => Promise<{ default: FamilyBlueprint }>> = {
  social: () => import('./families/social'),
  chat: () => import('./families/chat'),
  video: () => import('./families/video'),
  ride: () => import('./families/ride'),
  commerce: () => import('./families/commerce'),
  search: () => import('./families/search'),
  files: () => import('./families/files'),
  music: () => import('./families/music'),
  gaming: () => import('./families/gaming'),
  payments: () => import('./families/payments'),
};
export async function loadArchitecture(
  familyId: string,
  companyId = 'generic',
): Promise<CompanyArchitecture> {
  const family = getFamily(familyId);
  if (!family || !modules[familyId]) throw new Error('This architecture family was not found.');
  const blueprint = (await modules[familyId]()).default;
  const variant = blueprint.variants.find((v) => v.id === companyId);
  if (companyId !== 'generic' && !variant)
    throw new Error(
      'This company is listed for future research. Explore the generic pattern or a published example.',
    );
  const authoredScenarios = blueprint.scenarios.map((s) => ({
    ...s,
    ...variant?.scenarioOverrides?.[s.id],
  }));
  const nodes = [
    ...blueprint.nodes.map((n) => ({ ...n, ...variant?.overrides?.[n.id] })),
    ...(variant?.additionalNodes || []),
  ];
  const scenarios = enrichScenarios(familyId, authoredScenarios, nodes);
  const edges = [
    ...edgesFromScenarios(scenarios),
    ...(blueprint.edges || []),
    ...(variant?.additionalEdges || []),
  ].map((e) => ({ ...e, ...variant?.edgeOverrides?.[e.id] }));
  for (const n of nodes.filter((n) => n.category === 'compute' || n.category === 'data')) {
    edges.push({
      id: `${n.id}--rw-telemetry`,
      source: n.id,
      target: 'rw-telemetry',
      type: 'telemetry',
      label: 'Operational signals',
      description:
        'Conceptual metrics, logs, and traces observe this boundary without blocking user work.',
      confidence: 'conceptual',
      sourceIds: [],
      scenarioIds: [],
    });
  }
  return {
    id: companyId,
    familyId,
    company: variant?.name || 'Generic Pattern',
    product: family.name,
    logo: family.icon,
    summary: variant?.summary || family.description,
    scaleContext: family.keyChallenges.join(' · '),
    nodes,
    edges,
    scenarios,
    sources: variant?.sources || [],
    lastReviewed: '2026-09-24',
    era: variant?.era || 'Conceptual teaching architecture; no company implementation claims',
  };
}
