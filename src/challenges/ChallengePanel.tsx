import { useEffect, useState } from 'react';
import { Check, ChevronRight, Ellipsis, Lightbulb, Play, RotateCcw, Shuffle, X } from 'lucide-react';
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
  if (!challenge) return null;
  const metrics = state.evaluation?.metrics || challenge.before;
  const busy = ['running', 'testing'].includes(state.phase);
  return (
    <aside
      className={`challenge-panel phase-${state.phase}`}
      aria-label="Active system design challenge"
    >
      <header>
        <span>
          {challenge.difficulty.toUpperCase()} CHALLENGE · {challenge.category}
        </span>
        <button className="icon-button" aria-label="Exit challenge" onClick={state.exit}>
          <X size={14} />
        </button>
      </header>
      <h2>{challenge.title}</h2>
      <p>{challenge.description}</p>
      {state.evaluation && (
        <div className="challenge-metrics" aria-label="Simulated workload metrics">
          {metrics.map((item, index) => (
            <span className={item.tone} key={item.label}>
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
      {state.evaluation && (
        <div className={`challenge-result ${state.evaluation.status}`}>
          <strong>
            {state.evaluation.status === 'solved' ? (
              <>
                <Check size={14} /> Challenge solved
              </>
            ) : state.evaluation.status === 'partial' ? (
              'Partial improvement'
            ) : (
              'Problem remains'
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
      {!!state.appliedActions.length && (
        <div className="challenge-changes">
          {state.appliedActions.map((id) => (
            <span key={id}>{challengeActions[id].label}</span>
          ))}
        </div>
      )}
      {state.hintCount > 0 && (
        <div className="challenge-hints">
          {challenge.hints.slice(0, state.hintCount).map((hint, index) => (
            <p key={hint}>
              <b>Hint {index + 1}</b>
              {hint}
            </p>
          ))}
        </div>
      )}
      <div className="challenge-primary-actions">
        {state.phase === 'solved' ? (
          <>
            <button onClick={() => state.run(true)}>
              <Play size={13} /> Replay result
            </button>
            <button onClick={() => void state.next()}>
              Next challenge <ChevronRight size={13} />
            </button>
          </>
        ) : (
          <button disabled={busy} onClick={() => state.run(state.appliedActions.length > 0)}>
            <Play size={13} />
            {busy ? 'Flow running…' : state.appliedActions.length ? 'Test solution' : 'Run flow'}
          </button>
        )}
      </div>
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
      {state.solved > 0 && (
        <small className="challenge-session">Solved this session · {state.solved}</small>
      )}
    </aside>
  );
}
