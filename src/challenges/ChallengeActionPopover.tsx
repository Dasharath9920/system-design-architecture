import { useMemo, useState } from 'react';
import { Check, Wrench, X } from 'lucide-react';
import { challengeActions } from './actions';
import type { Challenge } from './types';
import { useChallenge } from './state';

export function shuffleChallengeOptions(ids: string[], random = Math.random) {
  const shuffled = [...ids];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }
  return shuffled;
}

export function ChallengeActionPopover({
  challenge,
  left,
  top,
}: {
  challenge: Challenge;
  left: number;
  top: number;
}) {
  const state = useChallenge();
  const [choice, setChoice] = useState<string | null>(null);
  const selected = state.selectedTarget;
  const target = challenge.interactionTargets.find(
    (item) => item.targetId === selected?.id && item.targetType === selected.type,
  );
  const options = useMemo(() => {
    if (!target) return [];
    const available = challenge.allowedActions.filter((id) => !state.appliedActions.includes(id));
    const desiredCount = Math.min(4, Math.max(2, target.actions.length));
    const contextual = target.actions.filter((id) => available.includes(id));
    const pool = [...contextual, ...available.filter((id) => !contextual.includes(id))].slice(
      0,
      desiredCount,
    );
    return shuffleChallengeOptions(pool);
  }, [challenge.id, target, state.appliedActions]);
  if (!target) return null;
  return (
    <section
      className="challenge-action-popover"
      role="dialog"
      aria-label="Modify architecture"
      style={{ left, top }}
    >
      <header>
        <span>
          <Wrench size={12} /> MODIFY {selected?.type === 'edge' ? 'FLOW' : 'COMPONENT'}
        </span>
        <button aria-label="Close architecture actions" onClick={state.closeTarget}>
          <X size={13} />
        </button>
      </header>
      <strong>{target.prompt}</strong>
      <div className="challenge-popover-options">
        {options.map((id) => (
          <button
            key={id}
            className={choice === id ? 'chosen' : ''}
            onClick={() => setChoice(id)}
            aria-pressed={choice === id}
          >
            <span>{challengeActions[id].label}</span>
            <small>{challengeActions[id].summary}</small>
          </button>
        ))}
      </div>
      {options.length ? (
        <button
          className="challenge-popover-apply"
          disabled={!choice}
          onClick={() => choice && state.applyAction(choice)}
        >
          <Check size={12} /> Apply change
        </button>
      ) : (
        <p>All changes here are already applied. Test the architecture now.</p>
      )}
    </section>
  );
}
