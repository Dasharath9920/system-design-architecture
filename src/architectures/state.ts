import { create } from 'zustand';
import { useUniverse } from '../state/universe';
import { loadArchitecture } from './loader';
import { compileFrames } from './engine';
import type { CompanyArchitecture, DebugCondition, Lens } from './types';
import { defaultSandbox, type Sandbox } from '../experience/types';
import { frameAtTime } from '../experience/presentation';
import { useExperience } from '../experience/preferences';
interface WorldState {
  architecture: CompanyArchitecture | null;
  explorerOpen: boolean;
  sourcesOpen: boolean;
  error: string | null;
  scenarioId: string;
  step: number;
  running: boolean;
  elapsed: number;
  startedAt: number;
  epoch: number;
  speed: number;
  debug: DebugCondition;
  completed: boolean;
  starting: boolean;
  sandbox: Sandbox;
  packetInspection: { edge: string; label: string; kind: string } | null;
  scrub: (time: number) => void;
  changeSandbox: (changes: Partial<Sandbox>) => void;
  lens: Lens;
  insights: boolean;
  timeline: boolean;
  compare: CompanyArchitecture | null;
  activate: (family: string, company?: string, scenario?: string, push?: boolean) => Promise<void>;
  leave: (push?: boolean) => void;
  chooseScenario: (id: string, push?: boolean) => void;
  toggle: () => void;
  pause: () => void;
  seek: (step: number, run?: boolean) => void;
  finish: () => void;
  setSpeed: (speed: number) => void;
  setDebug: (debug: DebugCondition) => void;
  setCompare: (id: string) => Promise<void>;
  set: (state: Partial<WorldState>) => void;
}
let request = 0;
function locationFor(a: CompanyArchitecture, scenario: string) {
  return `/architecture/${a.familyId}/${a.id}/${scenario}`;
}
function navigate(path: string) {
  if (window.location.pathname !== path) window.history.pushState({}, '', path);
}
export const useWorld = create<WorldState>((set, get) => ({
  architecture: null,
  explorerOpen: false,
  sourcesOpen: false,
  error: null,
  scenarioId: '',
  step: -1,
  running: false,
  elapsed: 0,
  startedAt: 0,
  epoch: 0,
  speed: 1,
  debug: 'normal',
  completed: false,
  starting: false,
  sandbox: { ...defaultSandbox },
  packetInspection: null,
  lens: 'architecture',
  insights: false,
  timeline: false,
  compare: null,
  set,
  activate: async (family, company = 'generic', scenario, push = true) => {
    const token = ++request;
    get().pause();
    try {
      const architecture = await loadArchitecture(family, company);
      if (token !== request) return;
      const chosen =
        architecture.scenarios.find((s) => s.id === scenario) || architecture.scenarios[0];
      useUniverse.getState().set({
        depthId: null,
        selectedId: null,
        selectedEdge: null,
        focused: false,
        running: false,
        step: -1,
        failedNodes: [],
        searchOpen: false,
      });
      set({
        architecture,
        packetInspection: null,
        starting: false,
        sandbox: { ...defaultSandbox },
        scenarioId: chosen.id,
        step: -1,
        running: false,
        elapsed: 0,
        completed: false,
        debug: 'normal',
        compare: null,
        explorerOpen: false,
        sourcesOpen: false,
        error: null,
        epoch: get().epoch + 1,
      });
      if (push) navigate(locationFor(architecture, chosen.id));
      else if (scenario !== chosen.id)
        window.history.replaceState({}, '', locationFor(architecture, chosen.id));
    } catch (error) {
      if (token === request)
        set({ error: error instanceof Error ? error.message : 'Unable to load architecture.' });
    }
  },
  leave: (push = true) => {
    request++;
    set({
      architecture: null,
      starting: false,
      sandbox: { ...defaultSandbox },
      step: -1,
      running: false,
      elapsed: 0,
      completed: false,
      compare: null,
      explorerOpen: false,
      sourcesOpen: false,
      error: null,
    });
    useUniverse.getState().reset();
    useExperience.getState().set({ cinema: false, trace: false });
    if (push) navigate('/');
  },
  chooseScenario: (id, push = true) => {
    const a = get().architecture;
    if (!a?.scenarios.some((s) => s.id === id)) return;
    set({
      scenarioId: id,
      packetInspection: null,
      starting: false,
      step: -1,
      running: false,
      elapsed: 0,
      completed: false,
      debug: 'normal',
      epoch: get().epoch + 1,
    });
    useUniverse.getState().set({ selectedId: null, selectedEdge: null });
    if (push) navigate(locationFor(a, id));
  },
  pause: () => {
    const state = get();
    if (state.running)
      set({
        running: false,
        starting: false,
        elapsed: state.starting
          ? 0
          : useExperience.getState().cameraMoving
            ? state.elapsed
            : state.elapsed + (performance.now() - state.startedAt) * (state.speed || 1),
      });
  },
  toggle: () => {
    const state = get();
    if (state.running) {
      state.pause();
      return;
    }
    set({
      running: true,
      starting: state.step < 0 ? state.speed !== 0 : state.starting,
      step: state.step < 0 ? 0 : state.step,
      completed: false,
      startedAt: performance.now(),
    });
  },
  seek: (step, run = false) => {
    const state = get();
    const scenario = state.architecture?.scenarios.find((s) => s.id === state.scenarioId);
    if (!scenario) return;
    const count = compileFrames(scenario, state.debug, state.sandbox).length;
    set({
      step: Math.min(Math.max(step, -1), count - 1),
      packetInspection: null,
      starting: false,
      running: run && step >= 0,
      elapsed: 0,
      startedAt: performance.now(),
      completed: false,
      epoch: state.epoch + 1,
    });
    useUniverse.getState().set({ selectedId: null, selectedEdge: null });
  },
  finish: () => set({ step: -1, running: false, elapsed: 0, completed: true, starting: false }),
  setSpeed: (speed) => {
    if (![0, 0.5, 1, 1.5, 2].includes(speed)) return;
    const state = get();
    set({
      speed,
      elapsed: state.running
        ? state.elapsed + (performance.now() - state.startedAt) * (state.speed || 1)
        : state.elapsed,
      startedAt: performance.now(),
    });
  },
  setDebug: (debug) => {
    const state = get();
    const scenario = state.architecture?.scenarios.find((s) => s.id === state.scenarioId);
    if (!scenario?.debugOptions.includes(debug)) return;
    set({
      debug,
      step: -1,
      running: false,
      elapsed: 0,
      completed: false,
      starting: false,
      epoch: state.epoch + 1,
    });
  },
  scrub: (time) => {
    const s = get();
    const scenario = s.architecture?.scenarios.find((f) => f.id === s.scenarioId);
    if (!scenario) return;
    const point = frameAtTime(compileFrames(scenario, s.debug, s.sandbox), time);
    set({
      ...point,
      running: false,
      starting: false,
      completed: false,
      startedAt: performance.now(),
      epoch: s.epoch + (point.step !== s.step ? 1 : 0),
    });
  },
  changeSandbox: (changes) => {
    get().pause();
    set({ sandbox: { ...get().sandbox, ...changes }, starting: false });
  },
  setCompare: async (id) => {
    const current = get().architecture;
    if (!current) return;
    if (!id) {
      set({ compare: null });
      return;
    }
    const other = await loadArchitecture(current.familyId, id);
    if (get().architecture === current) set({ compare: other });
  },
}));
export function restoreWorldRoute() {
  const match = window.location.pathname.match(
    /^\/architecture\/([^/]+)\/([^/]+)(?:\/([^/]+))?\/?$/,
  );
  if (match) void useWorld.getState().activate(match[1], match[2], match[3], false);
  else useWorld.getState().leave(false);
}
