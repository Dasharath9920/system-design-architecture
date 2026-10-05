import { create } from 'zustand';
import { getScaleScenario } from './data';
import type { ScalePhase } from './types';

interface TimeMachineState {
  active: boolean;
  scenarioId: string;
  stageIndex: number;
  completedStage: number;
  phase: ScalePhase;
  rampUsers: number;
  epoch: number;
  startedAt: number;
  feedback: string | null;
  attemptedAction: string | null;
  appliedActions: Record<number, string>;
  enter: (scenarioId?: string) => void;
  exit: () => void;
  chooseScenario: (scenarioId: string) => void;
  set: (value: Partial<TimeMachineState>) => void;
}

const initialScenario = getScaleScenario('generic-web');

export const useTimeMachine = create<TimeMachineState>((set) => ({
  active: false,
  scenarioId: initialScenario.id,
  stageIndex: 0,
  completedStage: 0,
  phase: 'stable',
  rampUsers: initialScenario.stages[0].users,
  epoch: 0,
  startedAt: 0,
  feedback: null,
  attemptedAction: null,
  appliedActions: {},
  enter: (scenarioId = 'generic-web') => {
    const scenario = getScaleScenario(scenarioId);
    set({
      active: true,
      scenarioId: scenario.id,
      stageIndex: 0,
      completedStage: 0,
      phase: 'stable',
      rampUsers: scenario.stages[0].users,
      epoch: 0,
      startedAt: performance.now(),
      feedback: null,
      attemptedAction: null,
      appliedActions: {},
    });
  },
  exit: () => set({ active: false }),
  chooseScenario: (scenarioId) => {
    const scenario = getScaleScenario(scenarioId);
    set({
      scenarioId: scenario.id,
      stageIndex: 0,
      completedStage: 0,
      phase: 'stable',
      rampUsers: scenario.stages[0].users,
      epoch: 0,
      startedAt: performance.now(),
      feedback: null,
      attemptedAction: null,
      appliedActions: {},
    });
  },
  set,
}));
