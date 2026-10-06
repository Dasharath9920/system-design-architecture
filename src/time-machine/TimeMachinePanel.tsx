import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  Info,
  Play,
  RotateCcw,
  X,
} from 'lucide-react';
import { concepts } from '../knowledge/catalog';
import { useUniverse } from '../state/universe';
import { useReducedMotion } from '../utils/useReducedMotion';
import { getScaleScenario, scaleScenarios } from './data';
import { compactNumber, estimateWorkload } from './engine';
import { useTimeMachine } from './state';
import type { ScaleAction } from './types';
import { XRayAction } from '../xray/XRayAction';
import { useXRay } from '../xray/state';

export function TimeMachinePanel() {
  const state = useTimeMachine();
  const xrayActive = useXRay((s) => !!s.request);
  const reduced = useReducedMotion();
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  const scenario = getScaleScenario(state.scenarioId);
  const stage = scenario.stages[state.stageIndex];
  const workload = useMemo(
    () => estimateWorkload(scenario, state.rampUsers),
    [scenario, state.rampUsers],
  );

  useEffect(() => {
    if (state.phase !== 'ramping' || xrayActive) return;
    const baseline = scenario.stages[Math.max(0, state.completedStage)].users;
    const from = useTimeMachine.getState().rampUsers;
    const to = stage.users;
    const remaining = Math.max(0, Math.min(1, (to - from) / Math.max(1, to - baseline)));
    const duration = Math.max(1, (reduced ? 350 : 2100) * remaining);
    const startedAt = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = progress * progress * (3 - 2 * progress);
      state.set({ rampUsers: Math.round(from + (to - from) * eased) });
      if (progress < 1) frame = requestAnimationFrame(tick);
      else
        state.set({
          rampUsers: to,
          phase: 'bottleneck',
          feedback: null,
          startedAt: performance.now(),
        });
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [
    state.phase,
    state.stageIndex,
    state.completedStage,
    scenario,
    stage.users,
    reduced,
    xrayActive,
  ]);

  useEffect(() => {
    if (state.phase !== 'applying' || xrayActive) return;
    const timer = window.setTimeout(
      () =>
        state.set({
          phase: 'validating',
          startedAt: performance.now(),
          epoch: state.epoch + 1,
          feedback: 'Re-running the same workload against the evolved architecture…',
        }),
      reduced ? 180 : 900,
    );
    return () => window.clearTimeout(timer);
  }, [state.phase, state.epoch, reduced, xrayActive]);

  useEffect(() => {
    if (state.phase !== 'validating' || xrayActive) return;
    const timer = window.setTimeout(
      () =>
        state.set({
          phase: 'stable',
          completedStage: Math.max(state.completedStage, state.stageIndex),
          feedback: 'The current workload now has healthy capacity margin.',
          attemptedAction: null,
        }),
      reduced ? 350 : 1700,
    );
    return () => window.clearTimeout(timer);
  }, [state.phase, state.completedStage, state.stageIndex, reduced, xrayActive]);

  const selectStage = (index: number) => {
    if (state.phase === 'ramping' || state.phase === 'applying' || state.phase === 'validating')
      return;
    if (index <= state.completedStage) {
      state.set({
        stageIndex: index,
        phase: 'stable',
        rampUsers: scenario.stages[index].users,
        feedback: index < state.completedStage ? 'Viewing a saved architecture stage.' : null,
        attemptedAction: null,
      });
      return;
    }
    if (index !== state.completedStage + 1) return;
    state.set({
      stageIndex: index,
      phase: 'ramping',
      rampUsers: scenario.stages[state.completedStage].users,
      feedback: 'Ramping traffic against the current architecture…',
      attemptedAction: null,
      epoch: state.epoch + 1,
      startedAt: performance.now(),
    });
  };

  const applyAction = (choice: ScaleAction) => {
    if (choice.outcome === 'resolve') {
      state.set({
        phase: 'applying',
        feedback: choice.explanation,
        attemptedAction: choice.id,
        appliedActions: { ...state.appliedActions, [state.stageIndex]: choice.id },
        startedAt: performance.now(),
      });
      return;
    }
    state.set({
      phase: 'partial',
      attemptedAction: choice.id,
      feedback: choice.explanation,
    });
  };

  const finished = state.completedStage === scenario.stages.length - 1 && state.phase === 'stable';
  const isSavedView = state.stageIndex < state.completedStage;
  const afterFix = state.phase === 'stable' && state.stageIndex > 0;
  const introducedComponents = useMemo(
    () =>
      [...new Set(scenario.stages.flatMap((item) => item.addedNodes))]
        .map((id) => concepts[id]?.name || id)
        .join(' · '),
    [scenario],
  );

  return (
    <>
      <section className="time-machine-panel" aria-label="Architecture Time Machine">
        <header>
          <span>
            <Clock3 size={13} /> Architecture Time Machine
          </span>
          <button className="icon-button" aria-label="Exit Time Machine" onClick={state.exit}>
            <X size={14} />
          </button>
        </header>
        {state.phase === 'stable' &&
          stage.addedNodes.map((id) => (
            <XRayAction
              key={id}
              conceptId={id}
              sourceId={id}
              label={concepts[id]?.name}
              layer={/replica/.test(id) ? 'replication' : undefined}
            >
              Why was {concepts[id]?.name || id} added?
            </XRayAction>
          ))}

        <label className="time-machine-scenario">
          <span>Scale system</span>
          <select
            aria-label="Choose Time Machine system"
            value={scenario.id}
            onChange={(event) => state.chooseScenario(event.target.value)}
          >
            {scaleScenarios.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <div className="time-machine-scale-heading">
          <div>
            <strong>{compactNumber(state.rampUsers)} users</strong>
            <small>{stage.title}</small>
          </div>
          <button
            className="assumptions-trigger"
            aria-label="Show scale assumptions"
            aria-expanded={assumptionsOpen}
            onClick={() => setAssumptionsOpen((open) => !open)}
          >
            <Info size={12} /> Assumptions
          </button>
        </div>

        {assumptionsOpen && (
          <div className="time-machine-assumptions" role="note">
            <span>{Math.round(scenario.assumptions.concurrency * 100)}% concurrent</span>
            <span>{scenario.assumptions.requestsPerSecond} req/s per active user</span>
            <span>
              {Math.round(scenario.assumptions.readRatio * 100)}/
              {Math.round((1 - scenario.assumptions.readRatio) * 100)} read/write
            </span>
            <span>{scenario.assumptions.averageResponseKB} KB average response</span>
          </div>
        )}

        <div className="time-machine-estimate">
          <span>
            <small>Active</small>
            <strong>~{compactNumber(workload.activeUsers)}</strong>
          </span>
          <b>× {scenario.assumptions.requestsPerSecond} req/s</b>
          <span>
            <small>Peak</small>
            <strong>≈ {compactNumber(workload.requestsPerSecond)} req/s</strong>
          </span>
        </div>

        {state.phase === 'ramping' && (
          <div className="time-machine-status ramping" role="status">
            <Play size={13} fill="currentColor" />
            <div>
              <strong>Traffic ramp</strong>
              <span>Testing today’s architecture before adding anything.</span>
            </div>
          </div>
        )}

        {(state.phase === 'bottleneck' || state.phase === 'partial') && stage.bottleneck && (
          <div className="time-machine-decision" role="status">
            <div className="time-machine-problem">
              <CircleAlert size={14} />
              <span>
                <small>{stage.bottleneck.type}</small>
                <strong>{stage.bottleneck.explanation}</strong>
              </span>
            </div>
            {state.phase === 'partial' && (
              <p className="time-machine-feedback">
                <b>
                  {stage.actions.find((item) => item.id === state.attemptedAction)?.outcome ===
                  'premature'
                    ? 'NOT NEEDED YET'
                    : 'PARTIAL IMPROVEMENT'}
                </b>
                {state.feedback}
              </p>
            )}
            <p>How would you scale this?</p>
            <div className="time-machine-actions">
              {stage.actions.map((choice) => (
                <button key={choice.id} onClick={() => applyAction(choice)}>
                  {choice.label} <ChevronRight size={12} />
                </button>
              ))}
            </div>
          </div>
        )}

        {(state.phase === 'applying' || state.phase === 'validating') && (
          <div className="time-machine-status evolving" role="status">
            <span className="time-machine-spinner" />
            <div>
              <strong>
                {state.phase === 'applying' ? 'Evolving architecture' : 'Re-running workload'}
              </strong>
              <span>{state.feedback}</span>
            </div>
          </div>
        )}

        {state.phase === 'stable' && (
          <div className="time-machine-status stable" role="status">
            <Check size={14} />
            <div>
              <strong>{finished ? 'System scaled' : 'System stable'}</strong>
              <span>{state.feedback || stage.lesson}</span>
            </div>
          </div>
        )}

        {afterFix && !isSavedView && (
          <div className="time-machine-after">
            <small>BEFORE → AFTER · SIMULATED</small>
            {stage.metrics.slice(0, 3).map((metric) => (
              <div key={metric.label}>
                <span>{metric.label}</span>
                <del>{metric.before}</del>
                <ArrowRight size={10} />
                <strong>{metric.after}</strong>
              </div>
            ))}
            {stage.insight && (
              <p>
                <b>Why this works</b> {stage.insight}
                {stage.tradeoff && <em> Trade-off: {stage.tradeoff}</em>}
              </p>
            )}
            {stage.addedNodes[0] && (
              <button
                className="learn-why"
                onClick={() => {
                  state.exit();
                  useUniverse.getState().explore(stage.addedNodes[0]);
                }}
              >
                Learn why <ChevronRight size={11} />
              </button>
            )}
          </div>
        )}

        {state.phase === 'stable' && !finished && (
          <button
            className="time-machine-next"
            onClick={() =>
              selectStage(
                isSavedView
                  ? state.completedStage
                  : Math.min(state.stageIndex + 1, scenario.stages.length - 1),
              )
            }
          >
            {isSavedView
              ? `Return to ${scenario.stages[state.completedStage].label}`
              : `Test ${scenario.stages[state.stageIndex + 1].label} users`}
            <ArrowRight size={13} />
          </button>
        )}

        {finished && (
          <div className="time-machine-finish">
            <div>
              <p>
                {scenario.stages[0].label} users → {stage.label} users
              </p>
              <span>Introduced: {introducedComponents}</span>
            </div>
            <div className="time-machine-finish-actions">
              <button onClick={() => state.enter(scenario.id)}>
                <RotateCcw size={12} /> Replay
              </button>
              <button
                onClick={() => {
                  const index = scaleScenarios.findIndex((item) => item.id === scenario.id);
                  state.chooseScenario(scaleScenarios[(index + 1) % scaleScenarios.length].id);
                }}
              >
                Try another system <ArrowRight size={11} />
              </button>
            </div>
          </div>
        )}
      </section>

      <nav className="time-machine-history" aria-label="Architecture history">
        {scenario.stages.map((item, index) => {
          const available = index <= state.completedStage + 1;
          return (
            <button
              key={item.id}
              className={`${index === state.stageIndex ? 'current' : ''} ${index <= state.completedStage ? 'complete' : ''}`}
              disabled={!available || ['ramping', 'applying', 'validating'].includes(state.phase)}
              onClick={() => selectStage(index)}
              aria-label={`${item.label} users${index <= state.completedStage ? ', completed' : ''}`}
            >
              <i>{index < state.completedStage ? '✓' : index + 1}</i>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
