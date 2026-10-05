import type { EdgeKind } from '../knowledge/types';

export type ScalePhase =
  'stable' | 'ramping' | 'bottleneck' | 'partial' | 'applying' | 'validating';

export interface ScaleAssumptions {
  concurrency: number;
  requestsPerSecond: number;
  readRatio: number;
  averageResponseKB: number;
}

export interface ScaleMetricChange {
  label: string;
  before: string;
  after: string;
}

export interface ScaleAction {
  id: string;
  label: string;
  outcome: 'resolve' | 'partial' | 'premature';
  explanation: string;
}

export interface ScaleStage {
  id: string;
  label: string;
  users: number;
  title: string;
  lesson: string;
  bottleneck?: {
    nodeId: string;
    type: string;
    explanation: string;
    signal: string;
  };
  actions: ScaleAction[];
  requiredAction?: string;
  addedNodes: string[];
  metrics: ScaleMetricChange[];
  insight?: string;
  tradeoff?: string;
}

export interface ScaleScenario {
  id: string;
  name: string;
  description: string;
  architectureFamily: string;
  assumptions: ScaleAssumptions;
  baseNodes: string[];
  stages: ScaleStage[];
}

export interface ScaleWorkload {
  users: number;
  activeUsers: number;
  requestsPerSecond: number;
  readsPerSecond: number;
  writesPerSecond: number;
  bandwidthMBps: number;
}

export interface ScaleRelationship {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
  label: string;
  description: string;
}
