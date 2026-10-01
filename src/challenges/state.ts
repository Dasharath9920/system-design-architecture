import { create } from 'zustand';
import { useWorld } from '../architectures/state';
import { useUniverse } from '../state/universe';
import { defaultSandbox } from '../experience/types';
import { challenges } from './data';
import { evaluateChallenge, pickChallenge } from './engine';
import type { Challenge, ChallengeDifficulty, ChallengeEvaluation, ChallengePhase } from './types';

const debugByChallenge: Record<string, string> = {
  'cache-stampede': 'cache-miss',
  'cache-outage-cascade': 'cache-miss',
  'consumer-lag': 'consumer-lag',
  'order-partial-failure': 'inventory-failure',
  'payment-duplication': 'payment-timeout',
};
function remembered(difficulty: ChallengeDifficulty) {
  try {
    return sessionStorage.getItem(`sdu-challenge-previous-${difficulty}`);
  } catch {
    return null;
  }
}
function remember(challenge: Challenge) {
  try {
    sessionStorage.setItem(`sdu-challenge-previous-${challenge.difficulty}`, challenge.id);
    sessionStorage.setItem('sdu-challenge-active-difficulty', challenge.difficulty);
  } catch {
    /* optional */
  }
}
function solvedCount() {
  try {
    return Number(sessionStorage.getItem('sdu-challenges-solved') || 0);
  } catch {
    return 0;
  }
}

interface ChallengeState {
  selectorOpen: boolean;
  loading: boolean;
  challengeId: string | null;
  difficulty: ChallengeDifficulty | null;
  phase: ChallengePhase;
  appliedActions: string[];
  hintCount: number;
  evaluation: ChallengeEvaluation | null;
  solutionShown: boolean;
  solved: number;
  openSelector: () => void;
  closeSelector: () => void;
  chooseDifficulty: (difficulty: ChallengeDifficulty) => Promise<void>;
  next: () => Promise<void>;
  exit: () => void;
  run: (testing?: boolean) => void;
  completeRun: () => void;
  applyAction: (id: string) => void;
  hint: () => void;
  revealSolution: () => void;
  reset: () => void;
}

function current(id: string | null) {
  return challenges.find((item) => item.id === id) || null;
}
function prepareRun(challenge: Challenge, testing: boolean, actions: string[]) {
  const world = useWorld.getState();
  const evaluation = evaluateChallenge(challenge, actions);
  const resolved = testing && evaluation.status === 'solved';
  const wanted = resolved ? 'normal' : debugByChallenge[challenge.id] || 'normal';
  if (
    world.debug !== wanted &&
    world.architecture?.scenarios
      .find((scenario) => scenario.id === world.scenarioId)
      ?.debugOptions.includes(wanted as never)
  )
    world.setDebug(wanted as never);
  world.changeSandbox({
    ...defaultSandbox,
    consumers: actions.includes('add_consumers') ? 4 : 1,
    burst: challenge.workload.queueDepth
      ? Math.min(99, Math.ceil(challenge.workload.queueDepth / 100000))
      : 0,
    extraServers: actions.some((id) => ['add_load_balancer', 'autoscale'].includes(id)) ? 3 : 0,
    databaseSlow:
      !resolved &&
      [
        'read-heavy-database',
        'repeated-query',
        'cache-stampede',
        'search-shard-bottleneck',
      ].includes(challenge.id),
  });
  world.seek(-1);
  world.toggle();
}

export const useChallenge = create<ChallengeState>((set, get) => ({
  selectorOpen: false,
  loading: false,
  challengeId: null,
  difficulty: null,
  phase: 'briefing',
  appliedActions: [],
  hintCount: 0,
  evaluation: null,
  solutionShown: false,
  solved: solvedCount(),
  openSelector: () => {
    useWorld.getState().pause();
    set({ selectorOpen: true });
  },
  closeSelector: () => set({ selectorOpen: false }),
  chooseDifficulty: async (difficulty) => {
    const challenge = pickChallenge(challenges, difficulty, remembered(difficulty));
    set({ loading: true, difficulty });
    await useWorld
      .getState()
      .activate(
        challenge.architecture.family,
        challenge.architecture.company,
        challenge.architecture.scenario,
      );
    remember(challenge);
    set({
      selectorOpen: false,
      loading: false,
      challengeId: challenge.id,
      difficulty,
      phase: 'briefing',
      appliedActions: [],
      hintCount: 0,
      evaluation: null,
      solutionShown: false,
    });
  },
  next: async () => {
    const state = get();
    if (!state.difficulty) return;
    await state.chooseDifficulty(state.difficulty);
  },
  exit: () => {
    useWorld.getState().leave();
    try {
      sessionStorage.removeItem('sdu-challenge-active-difficulty');
    } catch {
      /* optional */
    }
    set({
      selectorOpen: false,
      loading: false,
      challengeId: null,
      difficulty: null,
      phase: 'briefing',
      appliedActions: [],
      hintCount: 0,
      evaluation: null,
      solutionShown: false,
    });
  },
  run: (testing = false) => {
    const state = get();
    const challenge = current(state.challengeId);
    if (!challenge) return;
    set({ phase: testing ? 'testing' : 'running', evaluation: null });
    useUniverse.getState().set({ selectedId: null, selectedEdge: null });
    prepareRun(challenge, testing, state.appliedActions);
  },
  completeRun: () => {
    const state = get();
    const challenge = current(state.challengeId);
    if (!challenge || !['running', 'testing'].includes(state.phase)) return;
    if (state.phase === 'running') {
      set({ phase: 'observed' });
      return;
    }
    const evaluation = evaluateChallenge(challenge, state.appliedActions);
    if (evaluation.status === 'solved') {
      const solved = state.solved + (state.phase === 'testing' ? 1 : 0);
      try {
        sessionStorage.setItem('sdu-challenges-solved', String(solved));
      } catch {
        /* optional */
      }
      set({ phase: 'solved', evaluation, solved });
    } else set({ phase: evaluation.status === 'partial' ? 'partial' : 'observed', evaluation });
  },
  applyAction: (id) => {
    const state = get();
    const challenge = current(state.challengeId);
    if (!challenge?.allowedActions.includes(id) || state.appliedActions.includes(id)) return;
    useWorld.getState().pause();
    set({
      appliedActions: [...state.appliedActions, id],
      evaluation: null,
      phase: state.phase === 'briefing' ? 'observed' : state.phase,
    });
  },
  hint: () => set((state) => ({ hintCount: Math.min(3, state.hintCount + 1) })),
  revealSolution: () => {
    const state = get();
    const challenge = current(state.challengeId);
    if (!challenge) return;
    const actions = [...new Set([...state.appliedActions, ...challenge.validSolutions[0].actions])];
    set({ appliedActions: actions, solutionShown: true, phase: 'testing', evaluation: null });
    prepareRun(challenge, true, actions);
  },
  reset: () => {
    const challenge = current(get().challengeId);
    if (!challenge) return;
    useWorld.getState().seek(-1);
    useWorld.getState().changeSandbox({ ...defaultSandbox });
    useWorld.getState().setDebug('normal');
    useUniverse.getState().set({ selectedId: null, selectedEdge: null });
    set({
      phase: 'briefing',
      appliedActions: [],
      hintCount: 0,
      evaluation: null,
      solutionShown: false,
    });
  },
}));

export const activeChallenge = () => current(useChallenge.getState().challengeId);
