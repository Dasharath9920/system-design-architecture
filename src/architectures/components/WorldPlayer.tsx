import { useEffect, useMemo } from 'react';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  List,
  Pause,
  Play,
  RotateCcw,
  X,
} from 'lucide-react';
import { useWorld } from '../state';
import { compileFrames } from '../engine';
import { useUniverse } from '../../state/universe';
import type { DebugCondition } from '../types';
import { useExperience } from '../../experience/preferences';
import { ExperienceControls } from '../../experience/ExperienceControls';
import { ImpactChain } from '../../experience/SandboxActions';
import { summaryFor } from '../../experience/presentation';
import { useReducedMotion } from '../../utils/useReducedMotion';
const debugNames: Record<DebugCondition, string> = {
  normal: 'Normal conditions',
  'cache-hit': 'Cache hit',
  'cache-miss': 'Cache miss',
  offline: 'Recipient offline',
  'slow-database': 'Slow database',
  'payment-timeout': 'Payment timeout',
  'inventory-failure': 'Inventory unavailable',
  'network-degraded': 'Degraded network',
  'consumer-lag': 'Consumer lag',
};
export function WorldPlayer() {
  const w = useWorld();
  const experience = useExperience();
  const reduced = useReducedMotion();
  const a = w.architecture!;
  const scenario = a.scenarios.find((s) => s.id === w.scenarioId) || a.scenarios[0];
  const frames = useMemo(
    () => compileFrames(scenario, w.debug, w.sandbox),
    [scenario, w.debug, w.sandbox],
  );
  const frame = frames[w.step];
  const traffic = useUniverse((s) => s.traffic);
  const blocked = w.sandbox.consumersPaused && !!frame?.steps.some((s) => s.from === 'rw-events');
  const totals = summaryFor(frames);
  const totalDuration = frames.reduce((sum, f) => sum + f.duration, 0);
  const playhead = w.completed
    ? totalDuration
    : frames.slice(0, Math.max(0, w.step)).reduce((sum, f) => sum + f.duration, 0) + w.elapsed;
  useEffect(() => {
    if (!w.running || !frame || experience.cameraMoving) return;
    if (blocked) {
      w.pause();
      return;
    }
    if (w.starting) {
      const timer = setTimeout(
        () =>
          w.set({ starting: false, elapsed: 0, startedAt: performance.now(), epoch: w.epoch + 1 }),
        reduced ? 0 : Math.max(0, 550 - w.elapsed),
      );
      return () => clearTimeout(timer);
    }
    const timer = window.setTimeout(
      () => {
        if (w.step === frames.length - 1) w.finish();
        else w.seek(w.step + 1, true);
      },
      w.speed === 0
        ? 100
        : Math.max(0, (frame.duration - w.elapsed) / w.speed - (performance.now() - w.startedAt)),
    );
    return () => window.clearTimeout(timer);
  }, [
    w.running,
    experience.cameraMoving,
    w.step,
    w.speed,
    w.elapsed,
    w.startedAt,
    w.epoch,
    w.starting,
    w.pause,
    w.set,
    blocked,
    reduced,
    frame,
    frames.length,
    w.finish,
    w.seek,
  ]);
  const nextScenario = a.scenarios[(a.scenarios.indexOf(scenario) + 1) % a.scenarios.length];
  return (
    <div className={`world-player ${frame ? 'playing' : ''}`}>
      <ExperienceControls />
      {w.starting && (
        <div className="scenario-slate" role="status">
          <span>{a.company.toUpperCase()}</span>
          <strong>{scenario.name}</strong>
          <small>
            Following the {scenario.steps[0]?.visual?.phase.toLowerCase() || 'request'} path
          </small>
        </div>
      )}
      {w.completed && (
        <div className="world-completion" role="status">
          <div>
            <Check size={17} />
            <strong>
              {w.debug === 'normal' || w.debug === 'cache-hit' || w.debug === 'cache-miss'
                ? 'Flow complete'
                : 'Debug flow complete'}
            </strong>
            <button
              className="icon-button"
              aria-label="Dismiss flow summary"
              onClick={() => w.set({ completed: false })}
            >
              <X size={13} />
            </button>
          </div>
          <p>{scenario.keyIdea}</p>
          <div className="completion-stats">
            <span>{totals.steps} steps</span>
            <span>{totals.sync} sync operations</span>
            <span>{totals.async} async operations</span>
            <span>
              {totals.hits} cache {totals.hits === 1 ? 'hit' : 'hits'}
            </span>
          </div>
          <div className="world-summary-actions">
            <button
              onClick={() => {
                w.seek(-1);
                w.toggle();
              }}
            >
              <RotateCcw size={12} /> Replay
            </button>
            {scenario.debugOptions.length > 1 && (
              <button
                onClick={() => {
                  w.setDebug(scenario.debugOptions.find((d) => d !== 'normal')!);
                  w.seek(0, true);
                }}
              >
                Try a debug branch
              </button>
            )}
            <button
              onClick={() => {
                const n =
                  a.nodes.find(
                    (n) => n.insight === 'BOTTLENECK RISK' || n.insight === 'CONSISTENCY BOUNDARY',
                  ) ||
                  a.nodes.find((n) => n.insight === 'HOT PATH') ||
                  a.nodes[0];
                if (n) {
                  w.set({ insights: true });
                  useUniverse.getState().select(n.id);
                }
              }}
            >
              Inspect a bottleneck
            </button>
            <button onClick={() => w.chooseScenario(nextScenario.id)}>
              Next: {nextScenario.name} <ChevronRight size={12} />
            </button>
            <button onClick={() => experience.set({ trace: true })}>View trace</button>
          </div>
        </div>
      )}
      {frame && !w.starting && (
        <div className="world-step-card" aria-live={w.running ? 'off' : 'polite'}>
          <div className="world-step-heading">
            <span>
              STEP {w.step + 1} / {frames.length}
            </span>
            {frame.parallel && <b>PARALLEL · {frame.steps.length} PATHS</b>}
            <span className="flow-phase">{frame.steps[0]?.visual?.phase}</span>
            <small>{w.debug !== 'normal' ? debugNames[w.debug] : a.company}</small>
          </div>
          {experience.explain &&
            frame.steps.map((step) => (
              <div className="world-step-explanation" key={step.id}>
                <strong>{step.action}</strong>
                <p>{step.explanation}</p>
                <div>
                  <span>
                    <b>Why</b> {step.why}
                  </span>
                  <span>
                    <b>Solves</b> {step.solves}
                  </span>
                </div>
              </div>
            ))}
          <div className="world-progress" aria-label="Flow progress">
            {frames.map((f, i) => (
              <button
                key={f.id}
                title={`${i + 1}. ${f.steps.map((s) => s.action).join(' + ')}`}
                aria-label={`Jump to step ${i + 1}`}
                className={i === w.step ? 'current' : i < w.step ? 'done' : ''}
                onClick={() => w.seek(i)}
              />
            ))}
          </div>
          <label className="flow-scrubber">
            <span>Scrub flow</span>
            <input
              type="range"
              aria-label="Scrub flow"
              min="0"
              max={totalDuration}
              step="10"
              value={Math.min(playhead, totalDuration)}
              onChange={(e) => w.scrub(Number(e.target.value))}
            />
            <small>
              {w.step + 1} / {frames.length}
            </small>
          </label>
          <ImpactChain />
        </div>
      )}
      {w.timeline && (
        <div className="world-timeline">
          <div className="popover-heading">
            {scenario.name}
            <button
              className="icon-button"
              aria-label="Close flow timeline"
              onClick={() => w.set({ timeline: false })}
            >
              <X size={13} />
            </button>
          </div>
          {frames.map((f, i) => (
            <button className={i === w.step ? 'active' : ''} key={f.id} onClick={() => w.seek(i)}>
              <span>{i < w.step ? '✓' : String(i + 1).padStart(2, '0')}</span>
              <strong>{f.steps.map((s) => s.action).join(' + ')}</strong>
              {f.parallel && <small>parallel</small>}
            </button>
          ))}
        </div>
      )}
      <div className="world-player-bar">
        {frame && (
          <button
            className="icon-button"
            aria-label="Previous flow step"
            disabled={w.step === 0}
            onClick={() => w.seek(w.step - 1)}
          >
            <ChevronLeft size={17} />
          </button>
        )}
        <button
          className="world-play-button"
          onClick={() => (blocked ? useUniverse.getState().select('rw-events') : w.toggle())}
          aria-label={w.running ? 'Pause flow' : frame ? 'Resume flow' : 'Play flow'}
        >
          {w.running ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
          <span>
            {blocked ? 'Consumer paused' : w.running ? 'Pause' : frame ? 'Resume' : 'Play flow'}
          </span>
        </button>
        {frame && (
          <button
            className="icon-button"
            aria-label="Next flow step"
            onClick={() => (w.step === frames.length - 1 ? w.finish() : w.seek(w.step + 1))}
          >
            <ChevronRight size={17} />
          </button>
        )}
        <label className="world-scenario-select">
          <span className="sr-only">Choose flow</span>
          <select
            aria-label="Choose flow"
            value={scenario.id}
            onChange={(e) => w.chooseScenario(e.target.value)}
          >
            {a.scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <ChevronDown size={13} />
        </label>
        <button className="icon-button" aria-label="Restart flow" onClick={() => w.seek(-1)}>
          <RotateCcw size={15} />
        </button>
        <button
          className={`icon-button ${w.timeline ? 'active' : ''}`}
          aria-label="Toggle flow timeline"
          aria-expanded={w.timeline}
          onClick={() => w.set({ timeline: !w.timeline })}
        >
          <List size={16} />
        </button>
        <select
          className="world-speed"
          aria-label="Playback speed"
          value={w.speed}
          onChange={(e) => w.setSpeed(Number(e.target.value))}
        >
          {[0.5, 1, 1.5, 2].map((s) => (
            <option value={s} key={s}>
              {s}×
            </option>
          ))}
          <option value="0">Instant</option>
        </select>
        <select
          className="world-debug"
          aria-label="Debug condition"
          value={w.debug}
          onChange={(e) => w.setDebug(e.target.value as DebugCondition)}
        >
          {scenario.debugOptions.map((d) => (
            <option key={d} value={d}>
              {debugNames[d]}
            </option>
          ))}
        </select>
        <select
          className="world-traffic"
          aria-label="Traffic level"
          value={traffic}
          onChange={(e) => useUniverse.getState().set({ traffic: Number(e.target.value) })}
        >
          <option value="0">10 req/s</option>
          <option value="1">1K req/s</option>
          <option value="2">25K req/s</option>
          <option value="3">100K req/s</option>
        </select>
      </div>
      <div className="world-player-caption">
        {frame
          ? `${w.running ? 'Following' : 'Paused'} · ${frame.steps.map((s) => `${a.nodes.find((n) => n.id === s.from)?.label} → ${a.nodes.find((n) => n.id === s.to)?.label}`).join('  /  ')}`
          : scenario.keyProblem}
      </div>
    </div>
  );
}
