export interface XRaySource {
  title: string;
  url: string;
}
export interface XRayFailure {
  symptom: string;
  cause: string;
  impact: string;
  mitigation: string;
}
export interface XRayNode {
  id: string;
  name: string;
  role: string;
  how: string;
  why: string;
  tradeoff: string;
  next?: string;
  plane?: 'data' | 'control';
}
export interface XRayEdge {
  from: string;
  to: string;
  label: string;
  kind?: 'sync' | 'async' | 'control';
}
export interface XRayFrame {
  title: string;
  explanation: string;
  active: string[];
  values: Record<string, string>;
  failed?: string[];
}
export interface XRayDemo {
  id: string;
  name: string;
  failure?: boolean;
  frames: XRayFrame[];
}
export interface XRayLayer {
  id: string;
  name: string;
  summary: string;
  nodes: XRayNode[];
  edges: XRayEdge[];
  demos: XRayDemo[];
  parentId?: string;
  sources?: XRaySource[];
  scope?: string;
}
export interface XRayConcept {
  id: string;
  name: string;
  category: string;
  summary: string;
  role: string;
  consistencyModel: string;
  scalingStrategies: string[];
  failureModes: XRayFailure[];
  tradeoffs: string[];
  alternatives: string[];
  whenToUse: string;
  whenNotToUse: string;
  misconceptions: string[];
  relatedConcepts: string[];
  sources: XRaySource[];
  confidence: 'documented-concepts';
  versionContext: string;
  implementationNotes: string;
  lastReviewed: string;
  layers: Record<string, XRayLayer>;
}
