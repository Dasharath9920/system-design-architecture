import type { SimulationScenario, SimulationStep } from '../knowledge/types';

export const DEFAULT_STEP_DURATION = 1_250;

export interface SimulationFrame {
  stepIndex: number;
  step: SimulationStep | null;
  stepProgress: number;
  progress: number;
  complete: boolean;
}

export function stepDuration(step: SimulationStep): number {
  return step.duration !== undefined && Number.isFinite(step.duration) && step.duration > 0
    ? step.duration
    : DEFAULT_STEP_DURATION;
}

export function getScenarioDuration(scenario: SimulationScenario): number {
  return scenario.steps.reduce((total, step) => total + stepDuration(step), 0);
}

/** Pure timeline sampling supports play, pause, seeking, and a finite first-run animation. */
export function getSimulationFrame(
  scenario: SimulationScenario,
  elapsedMs: number,
): SimulationFrame {
  const total = getScenarioDuration(scenario);
  if (scenario.steps.length === 0) {
    return { stepIndex: -1, step: null, stepProgress: 1, progress: 1, complete: true };
  }
  const elapsed = Number.isNaN(elapsedMs) ? 0 : Math.min(total, Math.max(0, elapsedMs));
  let start = 0;
  for (let index = 0; index < scenario.steps.length; index += 1) {
    const step = scenario.steps[index];
    const duration = stepDuration(step);
    if (elapsed < start + duration || index === scenario.steps.length - 1) {
      return {
        stepIndex: index,
        step,
        stepProgress: Math.min(1, (elapsed - start) / duration),
        progress: total === 0 ? 1 : elapsed / total,
        complete: elapsed >= total,
      };
    }
    start += duration;
  }
  // Every nonempty timeline returns from the final iteration above.
  return { stepIndex: -1, step: null, stepProgress: 1, progress: 1, complete: true };
}
