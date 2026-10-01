import { challengeActions } from './actions';
import type { Challenge, ChallengeDifficulty, ChallengeEvaluation } from './types';

export function evaluateChallenge(challenge: Challenge, applied: string[]): ChallengeEvaluation {
  const chosen = new Set(applied);
  const valid = challenge.validSolutions.find((solution) =>
    solution.actions.every((id) => chosen.has(id)),
  );
  if (valid)
    return {
      status: 'solved',
      feedback: valid.result,
      tradeoff: valid.tradeoff,
      metrics: challenge.after,
      matchedActions: valid.actions,
    };
  const partial = challenge.partialSolutions.find((solution) =>
    solution.actions.every((id) => chosen.has(id)),
  );
  if (partial)
    return {
      status: 'partial',
      feedback: partial.result,
      tradeoff: partial.tradeoff,
      metrics: challenge.partialAfter,
      matchedActions: partial.actions,
    };
  const last = applied.at(-1);
  return {
    status: 'unresolved',
    feedback: last
      ? `${challengeActions[last]?.label || 'That change'} does not remove the active bottleneck in this workload.`
      : 'The same workload still reaches the original failure boundary.',
    metrics: challenge.before,
    matchedActions: [],
  };
}

export function pickChallenge<T extends Challenge>(
  pool: T[],
  difficulty: ChallengeDifficulty,
  previous?: string | null,
  random = Math.random,
): T {
  const eligible = pool.filter((item) => item.difficulty === difficulty && item.id !== previous);
  const choices = eligible.length
    ? eligible
    : pool.filter((item) => item.difficulty === difficulty);
  if (!choices.length) throw new Error(`No ${difficulty} challenges are available.`);
  return choices[Math.floor(random() * choices.length) % choices.length];
}
