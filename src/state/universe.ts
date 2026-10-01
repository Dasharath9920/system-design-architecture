import { create } from 'zustand';
import { useExperience } from '../experience/preferences';

interface UniverseState {
  selectedId: string | null;
  selectedEdge: string | null;
  depthId: string | null;
  focused: boolean;
  presetId: string;
  failedNodes: string[];
  traffic: number;
  searchOpen: boolean;
  scenarioId: string;
  step: number;
  running: boolean;
  completed: boolean;
  elapsed: number;
  startedAt: number;
  runEpoch: number;
  showTelemetry: boolean;
  select: (id: string | null) => void;
  inspectEdge: (id: string) => void;
  explore: (id: string | null) => void;
  setPreset: (id: string) => void;
  toggleFailure: (id: string) => void;
  reset: () => void;
  set: (state: Partial<UniverseState>) => void;
}
const initial = {
  selectedId: null,
  selectedEdge: null,
  depthId: null,
  focused: false,
  presetId: 'production',
  failedNodes: [],
  traffic: 1,
  searchOpen: false,
  scenarioId: 'request',
  step: -1,
  running: false,
  completed: false,
  elapsed: 0,
  startedAt: 0,
  runEpoch: 0,
  showTelemetry: false,
};
export const useUniverse = create<UniverseState>((set, get) => ({
  ...initial,
  select: (selectedId) => set({ selectedId, selectedEdge: null }),
  inspectEdge: (selectedEdge) => set({ selectedEdge, selectedId: null }),
  explore: (depthId) =>
    set({
      depthId,
      selectedId: null,
      selectedEdge: null,
      focused: false,
      running: false,
      step: -1,
    }),
  setPreset: (presetId) =>
    set({
      presetId,
      depthId: null,
      selectedId: null,
      selectedEdge: null,
      focused: false,
      running: false,
      step: -1,
      scenarioId: presetId === 'chat' ? 'chat' : presetId === 'video' ? 'video' : 'request',
    }),
  toggleFailure: (id) =>
    set((s) => ({
      failedNodes: s.failedNodes.includes(id)
        ? s.failedNodes.filter((n) => n !== id)
        : [...s.failedNodes, id],
      scenarioId:
        id === 'kafka' || id === 'workers'
          ? s.presetId === 'chat'
            ? 'chat'
            : ['production', 'ecommerce'].includes(s.presetId)
              ? 'place-order'
              : s.scenarioId
          : s.scenarioId,
      running: false,
      step: -1,
    })),
  reset: () => set(initial),
  set: (state) => {
    const old = get();
    const changed = state.step !== undefined && state.step !== old.step;
    const switching = state.scenarioId !== undefined && state.scenarioId !== old.scenarioId;
    const timing =
      changed || switching
        ? { elapsed: 0, startedAt: performance.now(), runEpoch: old.runEpoch + 1 }
        : state.running !== undefined && state.running !== old.running
          ? {
              elapsed:
                old.running && !useExperience.getState().cameraMoving
                  ? old.elapsed + performance.now() - old.startedAt
                  : old.elapsed,
              startedAt: performance.now(),
            }
          : {};
    set({ ...timing, ...(changed || switching ? { completed: false } : {}), ...state });
  },
}));
