import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  Pause,
  Play,
  RotateCcw,
  Square,
  X,
} from 'lucide-react';
import { getDetailScenario } from '../simulation/details';
import { getScenarios, trafficLevels } from '../simulation/scenarios';
import { useExperience } from '../experience/preferences';
import { useUniverse } from '../state/universe';

export function SimulationControls() {
  const state = useUniverse();
  const cameraMoving = useExperience((item) => item.cameraMoving);
  const autoFollow = useExperience((item) => item.autoFollow);
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const detailScenario = getDetailScenario(state.depthId);
  const scenarios = useMemo(
    () =>
      detailScenario
        ? [detailScenario]
        : getScenarios(state.failedNodes, state.presetId),
    [detailScenario, state.failedNodes, state.presetId],
  );
  const scenario = scenarios.find((item) => item.id === state.scenarioId) || scenarios[0];
  const current = scenario?.steps[state.step];
  const traffic = trafficLevels[state.traffic] || trafficLevels[0];

  useEffect(() => {
    if (!state.running || !scenario || cameraMoving) return;
    if (state.step >= scenario.steps.length - 1) {
      const timer = window.setTimeout(
        () => state.set({ running: false, step: -1, completed: true }),
        Math.max(
          0,
          Math.max(current?.duration || 0, 2400) -
            state.elapsed -
            (performance.now() - state.startedAt),
        ),
      );
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(
      () => state.set({ step: state.step + 1 }),
      state.step < 0
        ? 0
        : Math.max(
            0,
            Math.max(current?.duration || 0, 2400) -
              state.elapsed -
              (performance.now() - state.startedAt),
          ),
    );
    return () => window.clearTimeout(timer);
  }, [
    state.running,
    state.step,
    scenario,
    current,
    state.set,
    state.elapsed,
    state.startedAt,
    cameraMoving,
  ]);

  const play = () => {
    if (state.depthId && !detailScenario)
      state.set({ depthId: null, selectedId: null, focused: false });
    state.set({
      selectedId: null,
      selectedEdge: null,
      focused: false,
      scenarioId: scenario.id,
      running: !state.running,
      step: state.step < 0 ? 0 : state.step,
    });
  };

  return (
    <div className="simulation-area">
      {current && (
        <div className="simulation-story" role="status" aria-live="polite">
          <span>
            {state.step + 1} / {scenario.steps.length}
          </span>
          <div>
            <strong>{current.title}</strong>
            <p>{current.description}</p>
          </div>
        </div>
      )}
      {scenarioOpen && (
        <div className="control-popover scenario-menu" role="dialog" aria-label="Choose flow">
          <div className="popover-heading">
            Choose a flow
            <button
              className="icon-button"
              aria-label="Close flow menu"
              onClick={() => setScenarioOpen(false)}
            >
              <X size={13} />
            </button>
          </div>
          {scenarios.map((item) => (
            <button
              key={item.id}
              className={`scenario-choice ${scenario.id === item.id ? 'selected' : ''}`}
              onClick={() => {
                state.set({ scenarioId: item.id, step: -1, running: false });
                setScenarioOpen(false);
              }}
            >
              <span>
                <strong>{item.name}</strong>
                <small>{item.description}</small>
              </span>
              {scenario.id === item.id && <Check size={15} />}
            </button>
          ))}
        </div>
      )}
      {optionsOpen && (
        <div className="control-popover flow-options" role="dialog" aria-label="Flow options">
          <div className="popover-heading">
            Flow options
            <button
              className="icon-button"
              aria-label="Close flow options"
              onClick={() => setOptionsOpen(false)}
            >
              <X size={13} />
            </button>
          </div>
          <div className="traffic-options" aria-label="Traffic level">
            {trafficLevels.map((item, index) => (
              <button
                key={item.id}
                className={state.traffic === index ? 'selected' : ''}
                onClick={() => state.set({ traffic: index })}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p>{traffic.description}</p>
          <button
            aria-pressed={autoFollow}
            onClick={() => useExperience.getState().set({ autoFollow: !autoFollow })}
          >
            Follow active step <span>{autoFollow ? 'On' : 'Off'}</span>
          </button>
          <button onClick={() => state.set({ step: -1, running: false })}>
            <RotateCcw size={13} /> Replay from start
          </button>
        </div>
      )}
      <div className="simulation-toolbar">
        {current && (
          <button
            className="icon-button"
            aria-label="Previous simulation step"
            disabled={state.step === 0}
            onClick={() => state.set({ step: state.step - 1, running: false })}
          >
            <ChevronLeft size={16} />
          </button>
        )}
        <button className="visualize-button" aria-label={state.running ? 'Pause flow' : 'Play flow'} onClick={play}>
          {state.running ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}
          <span>{state.running ? 'Pause' : current ? 'Resume' : 'Play'}</span>
        </button>
        {current ? (
          <>
            <span className="compact-flow-progress">
              Step {state.step + 1} of {scenario.steps.length}
            </span>
            <button
              className="icon-button"
              aria-label="Next simulation step"
              disabled={state.step === scenario.steps.length - 1}
              onClick={() => state.set({ step: state.step + 1, running: false })}
            >
              <ChevronRight size={16} />
            </button>
            <button
              className="icon-button"
              aria-label="Close visualization"
              onClick={() => state.set({ running: false, step: -1 })}
            >
              <Square size={12} />
            </button>
          </>
        ) : (
          <button
            className="flow-selector"
            aria-label="Choose request scenario"
            onClick={() => setScenarioOpen((open) => !open)}
          >
            <span>{scenario?.name || 'Request flow'}</span>
            <ChevronDown size={13} />
          </button>
        )}
        <button
          className="icon-button"
          aria-label="Flow options"
          aria-expanded={optionsOpen}
          onClick={() => setOptionsOpen((open) => !open)}
        >
          <Ellipsis size={17} />
        </button>
      </div>
    </div>
  );
}
