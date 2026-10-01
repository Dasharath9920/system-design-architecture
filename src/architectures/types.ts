import type { Domain, EdgeKind } from '../knowledge/types';
import type { StepVisual } from '../experience/types';

export type Confidence = 'verified' | 'inferred' | 'conceptual';
export type PacketKind =
  | 'request'
  | 'event'
  | 'read'
  | 'write'
  | 'cache-hit'
  | 'cache-miss'
  | 'media'
  | 'replication'
  | 'ack'
  | 'telemetry';
export type Lens =
  'architecture' | 'flow' | 'data' | 'reliability' | 'infrastructure' | 'observability';
export type DebugCondition =
  | 'normal'
  | 'cache-hit'
  | 'cache-miss'
  | 'offline'
  | 'slow-database'
  | 'payment-timeout'
  | 'inventory-failure'
  | 'network-degraded'
  | 'consumer-lag';
export interface Source {
  id: string;
  title: string;
  publisher: string;
  url: string;
  date: string;
  type: 'engineering' | 'documentation' | 'paper';
  scope: string;
}
export interface ArchitectureNode {
  id: string;
  conceptId: string;
  label: string;
  category: Domain;
  technology?: string;
  role: string;
  description: string;
  why: string;
  tradeoff: string;
  confidence: Confidence;
  sourceIds: string[];
  positionHint: number;
  importance: 'core' | 'supporting';
  expandable: boolean;
  children: string[];
  insight?:
    | 'HOT PATH'
    | 'BOTTLENECK RISK'
    | 'CONSISTENCY BOUNDARY'
    | 'ASYNC BOUNDARY'
    | 'DURABILITY BOUNDARY';
}
export interface ArchitectureEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeKind;
  label: string;
  description: string;
  confidence: Confidence;
  sourceIds: string[];
  scenarioIds: string[];
}
export interface ScenarioStep {
  visual?: StepVisual;
  id: string;
  from: string;
  to: string;
  action: string;
  explanation: string;
  why: string;
  solves: string;
  edgeType: PacketKind;
  duration: number;
  parallelGroup?: string;
  result?: string;
  failurePossibility?: DebugCondition;
  condition?: DebugCondition;
  excludeWhen?: DebugCondition[];
}
export interface Scenario {
  id: string;
  name: string;
  description: string;
  steps: ScenarioStep[];
  keyProblem: string;
  estimatedDuration: number;
  keyIdea: string;
  completion: string;
  debugOptions: DebugCondition[];
}
export interface CompanyOption {
  id: string;
  name: string;
  available: boolean;
  note?: string;
}
export interface ArchitectureFamily {
  id: string;
  name: string;
  description: string;
  icon: string;
  defaultScenario: string;
  companies: CompanyOption[];
  genericArchitecture: string;
  keyChallenges: string[];
  scenarioNames: string[];
}
export interface CompanyArchitecture {
  id: string;
  familyId: string;
  company: string;
  product: string;
  logo: string;
  summary: string;
  scaleContext: string;
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  scenarios: Scenario[];
  sources: Source[];
  lastReviewed: string;
  era: string;
}
export interface CompanyVariant {
  id: string;
  name: string;
  summary: string;
  era: string;
  sources: Source[];
  overrides?: Partial<Record<string, Partial<ArchitectureNode>>>;
  additionalNodes?: ArchitectureNode[];
  additionalEdges?: ArchitectureEdge[];
  edgeOverrides?: Partial<Record<string, Partial<ArchitectureEdge>>>;
  scenarioOverrides?: Partial<Record<string, Partial<Scenario>>>;
}
export interface FamilyBlueprint {
  familyId: string;
  nodes: ArchitectureNode[];
  scenarios: Scenario[];
  variants: CompanyVariant[];
  edges?: ArchitectureEdge[];
}
export interface PlaybackFrame {
  id: string;
  steps: ScenarioStep[];
  duration: number;
  nodes: string[];
  edgeIds: string[];
  parallel: boolean;
}
