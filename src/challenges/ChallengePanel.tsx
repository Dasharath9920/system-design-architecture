import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronRight,
  Ellipsis,
  Lightbulb,
  Play,
  RotateCcw,
  Shuffle,
  X,
} from 'lucide-react';
import { useWorld } from '../architectures/state';
import { challengeActions } from './actions';
import { challenges } from './data';
import { useChallenge } from './state';

export function ChallengePanel() {
  const state = useChallenge();
  const world = useWorld();
  const [moreOpen, setMoreOpen] = useState(false);
  const challenge = challenges.find((item) => item.id === state.challengeId);
  useEffect(() => {
    if (world.completed) state.completeRun();
  }, [world.completed, state.phase]);
  useEffect(() => {
    if (!state.spotlight) return;
    const timer = window.setTimeout(state.clearSpotlight, 1500);
    return () => window.clearTimeout(timer);
  }, [state.spotlight, state.phase]);
  if (!challenge) return null;
  const busy = state.phase === 'observing' || state.phase === 'testing';
  const diagnosing = ['diagnosing', 'modifying', 'test_failed', 'partial'].includes(state.phase);
  const compact = state.phase !== 'idle';
  return (
    <>
      <aside
        className={`challenge-panel phase-${state.phase} ${compact ? 'challenge-compact' : ''}`}
        aria-label="Active system design challenge"
      >
        <header>
          <span>
            {challenge.difficulty.toUpperCase()} · {challenge.category.toUpperCase()}
          </span>
          <button className="icon-button" aria-label="Exit challenge" onClick={state.exit}>
            <X size={14} />
          </button>
        </header>
        <h2>{challenge.title}</h2>
        {state.phase === 'idle' && <p>{challenge.description}</p>}
        {state.onboardingVisible && state.phase === 'idle' && (
          <div className="challenge-onboarding">
            Run the flow, find the problem, modify the architecture, then test your fix.
            <button onClick={state.dismissOnboarding}>Got it</button>
          </div>
        )}
        {state.phase === 'idle' && (
          <button className="challenge-main-button" onClick={() => state.run()}>
            <Play size={13} fill="currentColor" /> Run flow
          </button>
        )}
        {busy && (
          <p className="challenge-phase-note">
            {state.phase === 'testing'
              ? 'Testing the same workload with your change…'
              : 'Watch what breaks in this flow…'}
          </p>
        )}
        {diagnosing && (
          <p className="challenge-phase-note">
            {challenge.observed}
            <strong>Where would you change the design?</strong>
          </p>
        )}
        {state.phase === 'diagnosing' && (
          <button className="challenge-main-button" onClick={state.showTargets}>
            Inspect the highlighted path <ArrowRight size={12} />
          </button>
        )}
        {['partial', 'test_failed'].includes(state.phase) && (
          <button className="challenge-main-button" onClick={state.showTargets}>
            Modify again <ArrowRight size={12} />
          </button>
        )}
        {state.phase === 'ready_to_test' && (
          <p className="challenge-phase-note">
            <strong>Architecture updated.</strong> Watch the same workload run again.
          </p>
        )}
        {state.evaluation && (
          <div className={`challenge-result ${state.evaluation.status}`}>
            <strong>
              {state.evaluation.status === 'solved' ? (
                <>
                  <Check size={14} /> SOLVED
                </>
              ) : state.evaluation.status === 'partial' ? (
                'BOTTLENECK REMAINS'
              ) : (
                'PROBLEM UNCHANGED'
              )}
            </strong>
            <p>{state.evaluation.feedback}</p>
            {state.evaluation.tradeoff && <small>TRADE-OFF · {state.evaluation.tradeoff}</small>}
          </div>
        )}
        {state.phase === 'solved' && (
          <div className="challenge-key">
            <span>KEY IDEA</span>
            <p>{challenge.keyIdea}</p>
          </div>
        )}
        {state.phase === 'solved' && (
          <div className="challenge-metrics" aria-label="Simulated workload metrics">
            {state.evaluation?.metrics.map((item, index) => (
              <span key={item.label}>
                <small>{item.label}</small>
                <span className="challenge-metric-comparison">
                  <s>{challenge.before[index]?.value}</s>
                  <ChevronRight size={10} />
                  <strong>{item.value}</strong>
                </span>
                <i>SIMULATED</i>
              </span>
            ))}
          </div>
        )}
        {state.phase === 'ready_to_test' && (
          <button className="challenge-main-button" onClick={() => state.run(true)}>
            <Play size={13} fill="currentColor" /> Test fix
          </button>
        )}
        {state.phase === 'solved' && (
          <div className="challenge-solved-actions">
            <button className="challenge-main-button" onClick={() => void state.next()}>
              Next challenge <ArrowRight size={13} />
            </button>
            <button onClick={() => state.run(true)}>Replay result</button>
            <button onClick={state.tryAnotherSolution}>Try another solution</button>
          </div>
        )}
        {state.hintCount > 0 && (
          <div className="challenge-hints">
            {challenge.hints.slice(0, state.hintCount).map((hint, index) => (
              <p key={hint}>
                <b>{['WHAT TO OBSERVE', 'WHERE TO LOOK', 'WHAT CONCEPT'][index]}</b>
                {hint}
              </p>
            ))}
          </div>
        )}
        <div className="challenge-secondary-actions">
          <button disabled={state.hintCount >= 3 || busy} onClick={state.hint}>
            <Lightbulb size={11} /> Hint
          </button>
          <button disabled={busy} onClick={() => void state.next()}>
            <Shuffle size={11} /> Try another
          </button>
          <button
            aria-label="More challenge options"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((open) => !open)}
          >
            <Ellipsis size={14} />
          </button>
        </div>
        {moreOpen && (
          <div className="challenge-more-actions">
            <button disabled={busy} onClick={state.reset}>
              <RotateCcw size={11} /> Reset challenge
            </button>
            <button disabled={busy || state.solutionShown} onClick={state.revealSolution}>
              Show solution
            </button>
            <button onClick={state.openSelector}>Change difficulty</button>
          </div>
        )}
        {state.solutionShown && (
          <p className="challenge-solution">
            <b>WHY IT WORKS</b>
            {challenge.solutionExplanation}
          </p>
        )}
        {!!state.appliedActions.length && state.phase !== 'solved' && (
          <div className="challenge-changes">
            {state.appliedActions.map((id) => (
              <span key={id}>{challengeActions[id].label}</span>
            ))}
          </div>
        )}
      </aside>
      {['diagnosing', 'modifying', 'ready_to_test', 'test_failed', 'partial'].includes(
        state.phase,
      ) && (
        <div className="challenge-guidance" role="status">
          <span className="challenge-guidance-step">
            {state.phase === 'ready_to_test'
              ? '4 · TEST'
              : state.phase === 'modifying'
                ? '3 · MODIFY'
                : '2 · DIAGNOSE'}
          </span>
          <strong>
            {state.phase === 'ready_to_test'
              ? 'Architecture updated'
              : state.phase === 'modifying'
                ? 'Choose an architectural change'
                : 'Find what caused the failure'}
          </strong>
          <div>
            <button onClick={state.showTargets}>What can I change?</button>
            <button onClick={state.hint} disabled={state.hintCount >= 3}>
              Hint
            </button>
            <button onClick={state.reset}>Reset</button>
          </div>
        </div>
      )}
    </>
  );
}
