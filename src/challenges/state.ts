import { create } from 'zustand';
import { useWorld } from '../architectures/state';
import type { CompanyArchitecture } from '../architectures/types';
import { useUniverse } from '../state/universe';
import { defaultSandbox } from '../experience/types';
import { challenges } from './data';
import { evaluateChallenge, pickChallenge } from './engine';
import { challengeArchitecture } from './mutations';
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
  baseArchitecture: CompanyArchitecture | null;
  selectedTarget: { id: string; type: 'node' | 'edge' } | null;
  returnPhase: ChallengePhase;
  spotlight: 'area' | 'all' | null;
  onboardingVisible: boolean;
  appliedActions: string[];
  hintCount: number;
  evaluation: ChallengeEvaluation | null;
  solutionShown: boolean;
  solved: number;
  credited: boolean;
  openSelector: () => void;
  closeSelector: () => void;
  chooseDifficulty: (difficulty: ChallengeDifficulty) => Promise<void>;
  next: () => Promise<void>;
  exit: () => void;
  run: (testing?: boolean) => void;
  completeRun: () => void;
  applyAction: (id: string) => void;
  openTarget: (id: string, type: 'node' | 'edge') => void;
  closeTarget: () => void;
  showTargets: () => void;
  clearSpotlight: () => void;
  tryAnotherSolution: () => void;
  dismissOnboarding: () => void;
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
  phase: 'idle',
  baseArchitecture: null,
  selectedTarget: null,
  returnPhase: 'diagnosing',
  spotlight: null,
  onboardingVisible: false,
  appliedActions: [],
  hintCount: 0,
  evaluation: null,
  solutionShown: false,
  solved: solvedCount(),
  credited: false,
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
    let onboardingVisible = false;
    try {
      onboardingVisible = localStorage.getItem('sdu-challenge-onboarded') !== 'yes';
    } catch {
      /* optional */
    }
    set({
      selectorOpen: false,
      loading: false,
      challengeId: challenge.id,
      difficulty,
      phase: 'idle',
      baseArchitecture: useWorld.getState().architecture,
      selectedTarget: null,
      returnPhase: 'diagnosing',
      spotlight: null,
      onboardingVisible,
      appliedActions: [],
      hintCount: 0,
      evaluation: null,
      solutionShown: false,
      credited: false,
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
      phase: 'idle',
      baseArchitecture: null,
      selectedTarget: null,
      returnPhase: 'diagnosing',
      spotlight: null,
      onboardingVisible: false,
      appliedActions: [],
      hintCount: 0,
      evaluation: null,
      solutionShown: false,
      credited: false,
    });
  },
  run: (testing = false) => {
    const state = get();
    const challenge = current(state.challengeId);
    if (!challenge) return;
    set({ phase: testing ? 'testing' : 'observing', evaluation: null, selectedTarget: null });
    useUniverse.getState().set({ selectedId: null, selectedEdge: null });
    prepareRun(challenge, testing, state.appliedActions);
  },
  completeRun: () => {
    const state = get();
    const challenge = current(state.challengeId);
    if (!challenge || !['observing', 'testing'].includes(state.phase)) return;
    if (state.phase === 'observing') {
      set({ phase: 'diagnosing', spotlight: 'area' });
      return;
    }
    const evaluation = evaluateChallenge(challenge, state.appliedActions);
    if (evaluation.status === 'solved') {
      const solved = state.solved + (state.credited ? 0 : 1);
      try {
        sessionStorage.setItem('sdu-challenges-solved', String(solved));
      } catch {
        /* optional */
      }
      set({ phase: 'solved', evaluation, solved, credited: true });
    } else
      set({
        phase: evaluation.status === 'partial' ? 'partial' : 'test_failed',
        evaluation,
        spotlight: 'area',
      });
  },
  applyAction: (id) => {
    const state = get();
    const challenge = current(state.challengeId);
    if (
      !challenge?.allowedActions.includes(id) ||
      state.appliedActions.includes(id) ||
      !state.baseArchitecture
    )
      return;
    const actions = [...state.appliedActions, id];
    useWorld.getState().pause();
    useWorld.getState().set({
      architecture: challengeArchitecture(state.baseArchitecture, challenge, actions),
      completed: false,
      step: -1,
      epoch: useWorld.getState().epoch + 1,
    });
    set({
      appliedActions: actions,
      evaluation: null,
      phase: 'ready_to_test',
      selectedTarget: null,
      spotlight: null,
    });
  },
  openTarget: (id, type) => {
    useUniverse.getState().set({ selectedId: null, selectedEdge: null });
    set((state) => ({
      selectedTarget: { id, type },
      returnPhase: state.phase === 'modifying' ? state.returnPhase : state.phase,
      phase: 'modifying',
      spotlight: null,
    }));
  },
  closeTarget: () => set((state) => ({ selectedTarget: null, phase: state.returnPhase })),
  showTargets: () => set({ spotlight: 'all' }),
  clearSpotlight: () => set({ spotlight: null }),
  tryAnotherSolution: () => {
    const state = get();
    if (!state.baseArchitecture) return;
    useWorld.getState().pause();
    useWorld.getState().set({
      architecture: state.baseArchitecture,
      completed: false,
      step: -1,
      epoch: useWorld.getState().epoch + 1,
    });
    set({
      phase: 'diagnosing',
      appliedActions: [],
      evaluation: null,
      selectedTarget: null,
      spotlight: 'area',
      solutionShown: false,
    });
  },
  dismissOnboarding: () => {
    try {
      localStorage.setItem('sdu-challenge-onboarded', 'yes');
    } catch {
      /* optional */
    }
    set({ onboardingVisible: false });
  },
  hint: () =>
    set((state) => ({
      hintCount: Math.min(3, state.hintCount + 1),
      spotlight: state.hintCount === 1 ? 'area' : state.spotlight,
    })),
  revealSolution: () => {
    const state = get();
    const challenge = current(state.challengeId);
    if (!challenge) return;
    const actions = [...new Set([...state.appliedActions, ...challenge.validSolutions[0].actions])];
    if (state.baseArchitecture)
      useWorld
        .getState()
        .set({ architecture: challengeArchitecture(state.baseArchitecture, challenge, actions) });
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
    const base = get().baseArchitecture;
    if (base) useWorld.getState().set({ architecture: base });
    set({
      phase: 'idle',
      appliedActions: [],
      selectedTarget: null,
      spotlight: null,
      hintCount: 0,
      evaluation: null,
      solutionShown: false,
    });
  },
}));

export const activeChallenge = () => current(useChallenge.getState().challengeId);
