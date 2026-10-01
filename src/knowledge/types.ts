export type Domain =
  'client' | 'network' | 'security' | 'compute' | 'data' | 'events' | 'operations';
export type ConceptKind =
  'concept' | 'technology' | 'service' | 'pattern' | 'infrastructure' | 'data store';
export interface Concept {
  id: string;
  name: string;
  subtitle: string;
  domain: Domain;
  kind: ConceptKind;
  icon: string;
  description: string;
  why: string[];
  when: string[];
  tradeoffs: string[];
  options: string[];
  related: string[];
  children: string[];
  parent?: string;
  stage?: number;
  tier?: 'core' | 'optional' | 'advanced' | 'alternative';
  source?: string;
}
export type EdgeKind =
  | 'request'
  | 'response'
  | 'read'
  | 'write'
  | 'replication'
  | 'event'
  | 'stream'
  | 'publish'
  | 'consume'
  | 'cache lookup'
  | 'cache fill'
  | 'authentication'
  | 'telemetry'
  | 'health check'
  | 'backup'
  | 'failover'
  | 'CDC'
  | 'synchronization'
  | 'contains'
  | 'alternative';
export interface Relationship {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
  label: string;
  description: string;
}
export interface ArchitecturePreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  nodes: string[];
  edges?: Relationship[];
}
export interface SimulationStep {
  nodes: string[];
  edges: string[];
  title: string;
  description: string;
  duration?: number;
}
export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  steps: SimulationStep[];
}
