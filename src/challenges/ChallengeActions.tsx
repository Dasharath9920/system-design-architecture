import { Check, Wrench } from 'lucide-react';
import type { ArchitectureNode } from '../architectures/types';
import { challengeActions } from './actions';
import { challenges } from './data';
import { useChallenge } from './state';

export function ChallengeActions({ node }: { node: ArchitectureNode }) {
  const state = useChallenge();
  const challenge = challenges.find((item) => item.id === state.challengeId);
  if (!challenge) return null;
  const actions = challenge.allowedActions
    .map((id) => challengeActions[id])
    .filter((action) => action?.nodeIds.includes(node.id));
  if (!actions.length) return null;
  return (
    <section className="inspector-section challenge-actions">
      <h3>
        <Wrench size={12} /> MODIFY SYSTEM <span>SIMULATED</span>
      </h3>
      <p>Apply a relevant architecture change, then test the same workload.</p>
      <div>
        {actions.map((action) => {
          const applied = state.appliedActions.includes(action.id);
          return (
            <button key={action.id} disabled={applied} onClick={() => state.applyAction(action.id)}>
              {applied ? <Check size={12} /> : <span>+</span>}
              <strong>{action.label}</strong>
              <small>{action.summary}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}
