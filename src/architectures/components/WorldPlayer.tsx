import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  List,
  Pause,
  Play,
  RotateCcw,
  Square,
  X,
} from 'lucide-react';
import { useExperience, type MotionPreference } from '../../experience/preferences';
import { ImpactChain } from '../../experience/SandboxActions';
import { useReducedMotion } from '../../utils/useReducedMotion';
import { useUniverse } from '../../state/universe';
import { compileFrames } from '../engine';
import { useWorld } from '../state';
import type { DebugCondition } from '../types';

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
  const world = useWorld();
  const experience = useExperience();
  const reduced = useReducedMotion();
  const [optionsOpen, setOptionsOpen] = useState(false);
  const architecture = world.architecture!;
  const scenario =
    architecture.scenarios.find((item) => item.id === world.scenarioId) ||
    architecture.scenarios[0];
  const frames = useMemo(
    () => compileFrames(scenario, world.debug, world.sandbox),
    [scenario, world.debug, world.sandbox],
  );
  const frame = frames[world.step];
  const traffic = useUniverse((state) => state.traffic);
  const blocked =
    world.sandbox.consumersPaused && !!frame?.steps.some((step) => step.from === 'rw-events');
  const totalDuration = frames.reduce((sum, item) => sum + item.duration, 0);
  const playhead = world.completed
    ? totalDuration
    : frames.slice(0, Math.max(0, world.step)).reduce((sum, item) => sum + item.duration, 0) +
      world.elapsed;

  useEffect(() => {
    if (!world.running || !frame || experience.cameraMoving) return;
    if (blocked) {
      world.pause();
      return;
    }
    if (world.starting) {
      const timer = window.setTimeout(
        () =>
          world.set({
            starting: false,
            elapsed: 0,
            startedAt: performance.now(),
            epoch: world.epoch + 1,
          }),
        reduced ? 0 : Math.max(0, 550 - world.elapsed),
      );
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(
      () => {
        if (world.step === frames.length - 1) world.finish();
        else world.seek(world.step + 1, true);
      },
      world.speed === 0
        ? 100
        : Math.max(
            0,
            (frame.duration - world.elapsed) / world.speed -
              (performance.now() - world.startedAt),
          ),
    );
    return () => window.clearTimeout(timer);
  }, [
    world.running,
    experience.cameraMoving,
    world.step,
    world.speed,
    world.elapsed,
    world.startedAt,
    world.epoch,
    world.starting,
    world.pause,
    world.set,
    blocked,
    reduced,
    frame,
    frames.length,
    world.finish,
    world.seek,
  ]);

  const nextScenario =
    architecture.scenarios[(architecture.scenarios.indexOf(scenario) + 1) % architecture.scenarios.length];

  return (
    <div className={`world-player ${frame ? 'playing' : ''}`}>
      {world.starting && (
        <div className="scenario-slate" role="status">
          <strong>{scenario.name}</strong>
        </div>
      )}
      {world.completed && (
        <div className="world-completion" role="status">
          <div>
            <Check size={15} />
            <strong>Flow complete</strong>
            <button
              className="icon-button"
              aria-label="Dismiss flow summary"
              onClick={() => world.set({ completed: false })}
            >
              <X size={13} />
            </button>
          </div>
          <p>{scenario.keyIdea}</p>
          <div className="world-summary-actions">
            <button
              onClick={() => {
                world.seek(-1);
                world.toggle();
              }}
            >
              <RotateCcw size={12} /> Replay
            </button>
            <button onClick={() => world.chooseScenario(nextScenario.id)}>
              Next flow <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}
      {frame && !world.starting && (
        <div className="world-step-card" aria-live={world.running ? 'off' : 'polite'}>
          <span className="world-step-count">
            {frame.parallel && <b>Parallel · {frame.steps.length} paths</b>}
            {world.step + 1} / {frames.length}
          </span>
          <div className="world-step-explanation">
            <strong>{frame.steps.map((step) => step.action).join(' + ')}</strong>
            {experience.explain && <p>{frame.steps[0]?.explanation}</p>}
          </div>
        </div>
      )}
      {world.timeline && (
        <div className="world-timeline">
          <div className="popover-heading">
            {scenario.name}
            <button
              className="icon-button"
              aria-label="Close flow timeline"
              onClick={() => world.set({ timeline: false })}
            >
              <X size={13} />
            </button>
          </div>
          {frames.map((item, index) => (
            <button
              className={index === world.step ? 'active' : ''}
              key={item.id}
              onClick={() => world.seek(index)}
            >
              <span>{index < world.step ? '✓' : String(index + 1).padStart(2, '0')}</span>
              <strong>{item.steps.map((step) => step.action).join(' + ')}</strong>
              {item.parallel && <small>parallel</small>}
            </button>
          ))}
        </div>
      )}
      {optionsOpen && (
        <div className="flow-options" role="dialog" aria-label="Flow options">
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
          <label>
            <span>Scenario</span>
            <select
              aria-label="Choose flow"
              value={scenario.id}
              onChange={(event) => world.chooseScenario(event.target.value)}
            >
              {architecture.scenarios.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Playback speed</span>
            <select
              aria-label="Playback speed"
              value={world.speed}
              onChange={(event) => world.setSpeed(Number(event.target.value))}
            >
              <option value="1">Standard</option>
              <option value="0">Instant</option>
            </select>
          </label>
          <label>
            <span>Condition</span>
            <select
              aria-label="Debug condition"
              value={world.debug}
              onChange={(event) => world.setDebug(event.target.value as DebugCondition)}
            >
              {scenario.debugOptions.map((item) => (
                <option key={item} value={item}>
                  {debugNames[item]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Traffic</span>
            <select
              aria-label="Traffic level"
              value={traffic}
              onChange={(event) =>
                useUniverse.getState().set({ traffic: Number(event.target.value) })
              }
            >
              <option value="0">10 req/s</option>
              <option value="1">1K req/s</option>
              <option value="2">25K req/s</option>
              <option value="3">100K req/s</option>
            </select>
          </label>
          <label>
            <span>Motion</span>
            <select
              aria-label="Motion preference"
              value={experience.motion}
              onChange={(event) =>
                experience.setMotion(event.target.value as MotionPreference)
              }
            >
              <option value="system">System</option>
              <option value="full">Full</option>
              <option value="reduced">Reduced</option>
              <option value="off">Off</option>
            </select>
          </label>
          <button
            aria-label="Auto follow flow"
            aria-pressed={experience.autoFollow}
            onClick={() => experience.set({ autoFollow: !experience.autoFollow })}
          >
            Follow active step <span>{experience.autoFollow ? 'On' : 'Off'}</span>
          </button>
          <button
            aria-pressed={experience.explain}
            onClick={() => experience.set({ explain: !experience.explain })}
          >
            Show explanations <span>{experience.explain ? 'On' : 'Off'}</span>
          </button>
          <button
            aria-label="Toggle flow timeline"
            onClick={() => world.set({ timeline: !world.timeline })}
          >
            <List size={13} /> {world.timeline ? 'Hide timeline' : 'View timeline'}
          </button>
          {(frame || world.completed) && (
            <button
              onClick={() => {
                world.seek(-1);
                setOptionsOpen(false);
              }}
            >
              <RotateCcw size={13} /> Reset flow
            </button>
          )}
          {frame && (
            <label className="flow-scrubber">
              <span>Scrub flow</span>
              <input
                type="range"
                aria-label="Scrub flow"
                min="0"
                max={totalDuration}
                step="10"
                value={Math.min(playhead, totalDuration)}
                onChange={(event) => world.scrub(Number(event.target.value))}
              />
            </label>
          )}
          <ImpactChain />
        </div>
      )}
      <div className="world-player-bar">
        {frame && (
          <button
            className="icon-button"
            aria-label="Previous flow step"
            disabled={world.step === 0}
            onClick={() => world.seek(world.step - 1)}
          >
            <ChevronLeft size={16} />
          </button>
        )}
        <button
          className="world-play-button"
          onClick={() =>
            blocked ? useUniverse.getState().select('rw-events') : world.toggle()
          }
          aria-label={world.running ? 'Pause flow' : frame ? 'Resume flow' : 'Play flow'}
        >
          {world.running ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}
          <span>{world.running ? 'Pause' : frame ? 'Resume' : 'Play'}</span>
        </button>
        {frame ? (
          <>
            <span className="compact-flow-progress">
              Step {world.step + 1} of {frames.length}
            </span>
            <button
              className="icon-button"
              aria-label="Next flow step"
              onClick={() =>
                world.step === frames.length - 1
                  ? world.finish()
                  : world.seek(world.step + 1)
              }
            >
              <ChevronRight size={16} />
            </button>
            <button className="icon-button" aria-label="Restart flow" onClick={() => world.seek(-1)}>
              <Square size={12} />
            </button>
          </>
        ) : (
          <label className="world-scenario-select">
            <span className="sr-only">Choose flow</span>
            <select
              aria-label="Choose flow"
              value={scenario.id}
              onChange={(event) => world.chooseScenario(event.target.value)}
            >
              {architecture.scenarios.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <ChevronDown size={13} />
          </label>
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
