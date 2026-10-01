import { edgeId } from './builders';
import type { CompanyArchitecture, DebugCondition, PlaybackFrame, Scenario } from './types';
import type { Sandbox } from '../experience/types';
import { applySandbox } from '../experience/presentation';

/** A group is one barrier: all its paths run together before the next frame. */
export function compileFrames(
  scenario: Scenario,
  condition: DebugCondition,
  sandbox?: Sandbox,
): PlaybackFrame[] {
  const steps = scenario.steps.filter(
    (step) =>
      (!step.condition || step.condition === condition) && !step.excludeWhen?.includes(condition),
  );
  const frames: PlaybackFrame[] = [];
  for (const step of steps) {
    const last = frames.at(-1);
    if (step.parallelGroup && last?.id === step.parallelGroup) {
      last.steps.push(step);
      last.duration = Math.max(last.duration, step.duration);
      last.nodes = [...new Set([...last.nodes, step.from, step.to])];
      last.edgeIds = [...new Set([...last.edgeIds, edgeId(step.from, step.to)])];
      last.parallel = true;
    } else
      frames.push({
        id: step.parallelGroup || step.id,
        steps: [step],
        duration: step.duration,
        nodes: [...new Set([step.from, step.to])],
        edgeIds: step.from === step.to ? [] : [edgeId(step.from, step.to)],
        parallel: false,
      });
  }
  return applySandbox(frames, sandbox);
}
export function compareArchitectures(current: CompanyArchitecture, other: CompanyArchitecture) {
  const nodes = new Map(other.nodes.map((n) => [n.id, n]));
  return new Map(
    current.nodes.map((n) => {
      const peer = nodes.get(n.id);
      return [
        n.id,
        !peer
          ? 'only'
          : n.label !== peer.label ||
              n.technology !== peer.technology ||
              n.confidence !== peer.confidence ||
              n.description !== peer.description
            ? 'different'
            : 'shared',
      ] as const;
    }),
  );
}
