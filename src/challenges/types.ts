export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';
export type ChallengeCategory =
  | 'scaling'
  | 'caching'
  | 'database'
  | 'messaging'
  | 'reliability'
  | 'networking'
  | 'storage'
  | 'consistency'
  | 'streaming'
  | 'security'
  | 'real-time'
  | 'distributed-systems';

export interface ChallengeMetric {
  label: string;
  value: string;
  tone?: 'normal' | 'warning' | 'critical' | 'good';
}
export interface ChallengeAction {
  id: string;
  label: string;
  summary: string;
  nodeIds: string[];
}
export interface ChallengeSolution {
  actions: string[];
  result: string;
  tradeoff: string;
}
export interface Challenge {
  id: string;
  title: string;
  difficulty: ChallengeDifficulty;
  category: ChallengeCategory;
  description: string;
  context: string;
  architecture: { family: string; company: string; scenario: string };
  workload: {
    trafficRps?: number;
    readRatio?: number;
    writeRatio?: number;
    queueDepth?: number;
    consumerRate?: number;
    activeConnections?: number;
    storageThroughput?: number;
  };
  symptoms: Array<{ nodeId: string; label: string }>;
  allowedActions: string[];
  validSolutions: ChallengeSolution[];
  partialSolutions: ChallengeSolution[];
  failureConditions: string[];
  hints: [string, string, string];
  solutionExplanation: string;
  keyIdea: string;
  before: ChallengeMetric[];
  after: ChallengeMetric[];
  partialAfter: ChallengeMetric[];
}
export type ChallengePhase = 'briefing' | 'running' | 'observed' | 'testing' | 'partial' | 'solved';
export interface ChallengeEvaluation {
  status: 'unresolved' | 'partial' | 'solved';
  feedback: string;
  tradeoff?: string;
  metrics: ChallengeMetric[];
  matchedActions: string[];
}
