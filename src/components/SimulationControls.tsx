import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  X,
} from 'lucide-react';
import { getScenarios, trafficLevels } from '../simulation/scenarios';
import { useExperience } from '../experience/preferences';
import { AutoFollowControl } from '../experience/ExperienceControls';
import { useUniverse } from '../state/universe';
import { getDetailScenario } from '../simulation/details';

export function SimulationControls() {
  const {
    scenarioId,
    step,
    running,
    failedNodes,
    presetId,
    traffic,
    set,
    depthId,
    elapsed,
    startedAt,
  } = useUniverse();
  const cameraMoving = useExperience((s) => s.cameraMoving);
  const [menu, setMenu] = useState<'scenario' | 'traffic' | null>(null);
  const detailScenario = getDetailScenario(depthId);
  const scenarios = useMemo(
    () => (detailScenario ? [detailScenario] : getScenarios(failedNodes, presetId)),
    [detailScenario, failedNodes, presetId],
  );
  const scenario = scenarios.find((s) => s.id === scenarioId) || scenarios[0];
  const current = scenario?.steps[step];
  const level = trafficLevels[traffic] || trafficLevels[0];
  useEffect(() => {
    if (!running || !scenario || cameraMoving) return;
    if (step >= scenario.steps.length - 1) {
      const timer = setTimeout(
        // Clear the terminal frame as well as stopping playback. Leaving the
        // last step selected keeps its nodes, edge, and packet highlighted.
        () => set({ running: false, step: -1, completed: true }),
        Math.max(
          0,
          Math.max(current?.duration || 0, 2400) - elapsed - (performance.now() - startedAt),
        ),
      );
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(
      () => set({ step: step + 1 }),
      step < 0
        ? 0
        : Math.max(
            0,
            Math.max(current?.duration || 0, 2400) - elapsed - (performance.now() - startedAt),
          ),
    );
    return () => clearTimeout(timer);
  }, [running, step, scenario, current, set, elapsed, startedAt, cameraMoving]);
  const play = () => {
    if (depthId && !detailScenario) set({ depthId: null, selectedId: null, focused: false });
    set({
      selectedId: null,
      selectedEdge: null,
      focused: false,
      scenarioId: scenario.id,
      running: !running,
      step: step < 0 ? 0 : step,
    });
    setMenu(null);
  };
  return (
    <div className="simulation-area">
      {current && (
        <div className="simulation-story" role="status" aria-live="polite">
          <div className="story-progress">
            <span>{String(step + 1).padStart(2, '0')}</span>
            <div>
              {scenario.steps.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Go to step ${i + 1}`}
                  className={i === step ? 'current' : i < step ? 'complete' : ''}
                  onClick={() => set({ step: i, running: false })}
                />
              ))}
            </div>
            <span>{String(scenario.steps.length).padStart(2, '0')}</span>
            <button
              className="icon-button"
              aria-label="Close visualization"
              onClick={() => set({ running: false, step: -1 })}
            >
              <X size={14} />
            </button>
          </div>
          <div className="story-text">
            <div>
              <strong>{current.title}</strong>
              <p>{current.description}</p>
            </div>
            <div className="story-navigation">
              <button
                className="icon-button"
                aria-label="Previous simulation step"
                disabled={step === 0}
                onClick={() => set({ step: step - 1, running: false })}
              >
                <ChevronLeft size={17} />
              </button>
              <button
                className="icon-button"
                aria-label="Next simulation step"
                disabled={step === scenario.steps.length - 1}
                onClick={() => set({ step: step + 1, running: false })}
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </div>
      )}
      {menu === 'scenario' && (
        <div className="control-popover scenario-menu">
          <div className="popover-heading">
            WATCH THE SYSTEM WORK
            <button
              className="icon-button"
              aria-label="Close flow menu"
              onClick={() => setMenu(null)}
            >
              <X size={13} />
            </button>
          </div>
          {scenarios.map((s) => (
            <button
              key={s.id}
              className={`scenario-choice ${scenario.id === s.id ? 'selected' : ''}`}
              onClick={() => {
                set({ scenarioId: s.id, step: -1, running: false });
                setMenu(null);
              }}
            >
              <span>
                <strong>{s.name}</strong>
                <small>{s.description}</small>
              </span>
              {s.id === scenario.id ? <Check size={15} /> : <ArrowRight size={15} />}
            </button>
          ))}
        </div>
      )}
      {menu === 'traffic' && (
        <div className="control-popover traffic-menu">
          <div className="popover-heading">
            EXPLORE SCALE <span>Illustrative model</span>
          </div>
          <div className="traffic-options">
            {trafficLevels.map((l, i) => (
              <button
                key={l.id}
                className={traffic === i ? 'selected' : ''}
                onClick={() => set({ traffic: i })}
              >
                {l.label}
              </button>
            ))}
          </div>
          <p>{level.description}</p>
          <ul>
            {level.effects.map((effect) => (
              <li key={effect}>{effect}</li>
            ))}
          </ul>
          <small>Capacity depends on workload and infrastructure.</small>
        </div>
      )}
      <div className="simulation-toolbar">
        <AutoFollowControl />
        <button className="visualize-button" onClick={play}>
          {running ? (
            <Pause size={15} fill="currentColor" />
          ) : (
            <Play size={15} fill="currentColor" />
          )}
          <span>{running ? 'Pause flow' : 'Visualize request'}</span>
        </button>
        <button
          className="flow-selector"
          aria-label="Choose request scenario"
          onClick={() => setMenu(menu === 'scenario' ? null : 'scenario')}
        >
          <span>{scenario?.name || 'Request flow'}</span>
          <ChevronDown size={13} />
        </button>
        <span className="toolbar-divider" />
        <button
          className="traffic-control"
          aria-label="Adjust traffic"
          onClick={() => setMenu(menu === 'traffic' ? null : 'traffic')}
        >
          <Gauge size={15} />
          <span>Traffic</span>
          <strong>{level.rps >= 1000 ? `${level.rps / 1000}K` : `${level.rps}`} req/s</strong>
          <ChevronDown size={12} />
        </button>
        {step >= 0 && (
          <>
            <span className="toolbar-divider" />
            <button
              className="icon-button"
              aria-label="Restart visualization"
              onClick={() => set({ step: -1, running: false })}
            >
              <RotateCcw size={15} />
            </button>
            <button
              className="icon-button"
              aria-label="Advance visualization"
              disabled={step >= scenario.steps.length - 1}
              onClick={() => set({ step: step + 1, running: false })}
            >
              <SkipForward size={15} />
            </button>
          </>
        )}
      </div>
      <div className="simulation-caption">
        <span className="live-dot" /> A living architecture. Follow a request to see it in motion.
      </div>
    </div>
  );
}
