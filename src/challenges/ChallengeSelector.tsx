import { Gauge, Layers3, ShieldCheck, X } from 'lucide-react';
import { useChallenge } from './state';
import type { ChallengeDifficulty } from './types';

const choices: Array<{ id: ChallengeDifficulty; label: string; note: string; icon: typeof Gauge }> =
  [
    { id: 'easy', label: 'Easy', note: 'One clear bottleneck', icon: Gauge },
    { id: 'medium', label: 'Medium', note: 'Interacting trade-offs', icon: Layers3 },
    { id: 'hard', label: 'Hard', note: 'Distributed failure and scale', icon: ShieldCheck },
  ];
export function ChallengeSelector() {
  const state = useChallenge();
  if (!state.selectorOpen) return null;
  return (
    <div className="challenge-modal-backdrop" role="presentation">
      <section
        className="challenge-selector"
        role="dialog"
        aria-modal="true"
        aria-label="System design challenges"
      >
        <button
          className="icon-button challenge-close"
          aria-label="Close challenges"
          onClick={state.closeSelector}
        >
          <X size={15} />
        </button>
        <span className="challenge-eyebrow">SYSTEM DESIGN CHALLENGES</span>
        <h2>Choose difficulty</h2>
        <p>
          Practice real architecture problems by changing the system and running the same workload
          again.
        </p>
        <div className="challenge-difficulties">
          {choices.map(({ id, label, note, icon: Icon }) => (
            <button
              key={id}
              disabled={state.loading}
              onClick={() => void state.chooseDifficulty(id)}
            >
              <Icon size={17} />
              <strong>{label}</strong>
              <small>{note}</small>
            </button>
          ))}
        </div>
        <small>
          {state.loading
            ? 'Loading a random challenge…'
            : 'A random challenge opens immediately · no score or penalty'}
        </small>
      </section>
    </div>
  );
}
