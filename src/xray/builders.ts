import type { XRayConcept, XRayDemo, XRayEdge, XRayFrame, XRayLayer, XRayNode } from './types';

export const node = (
  id: string,
  name: string,
  role: string,
  how: string,
  tradeoff: string,
  next?: string,
  plane?: 'data' | 'control',
): XRayNode => ({ id, name, role, how, why: role, tradeoff, next, plane });
export const edge = (
  from: string,
  to: string,
  label: string,
  kind: XRayEdge['kind'] = 'sync',
): XRayEdge => ({ from, to, label, kind });
export const frame = (
  title: string,
  explanation: string,
  active: string[],
  values: Record<string, string>,
  failed?: string[],
): XRayFrame => ({ title, explanation, active, values, failed });
export const demo = (id: string, name: string, frames: XRayFrame[], failure = false): XRayDemo => ({
  id,
  name,
  frames,
  failure,
});
export const layer = (
  id: string,
  name: string,
  summary: string,
  nodes: XRayNode[],
  edges: XRayEdge[],
  demos: XRayDemo[],
  parentId?: string,
): XRayLayer => ({ id, name, summary, nodes, edges, demos, parentId });
export function concept(
  info: Omit<XRayConcept, 'confidence' | 'lastReviewed' | 'layers'>,
  layers: XRayLayer[],
): XRayConcept {
  return {
    ...info,
    confidence: 'documented-concepts',
    lastReviewed: '2026-10-06',
    layers: Object.fromEntries(layers.map((item) => [item.id, item])),
  };
}
