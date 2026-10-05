import assert from 'node:assert/strict';
import { test } from 'node:test';
import { challengeActions } from '../src/challenges/actions';
import { challengeCounts, challenges } from '../src/challenges/data';
import { evaluateChallenge, pickChallenge } from '../src/challenges/engine';
import { loadArchitecture } from '../src/architectures/loader';
import { compileFrames } from '../src/architectures/engine';
import { presentationAt } from '../src/experience/presentation';
import { challengeArchitecture } from '../src/challenges/mutations';
import { shuffleChallengeOptions } from '../src/challenges/ChallengeActionPopover';

test('challenge catalog contains ten unique, complete scenarios at each real difficulty', async () => {
  assert.deepEqual(challengeCounts, { easy: 10, medium: 10, hard: 10 });
  assert.equal(new Set(challenges.map((item) => item.id)).size, 30);
  for (const challenge of challenges) {
    assert.equal(challenge.hints.length, 3);
    assert.ok(challenge.validSolutions.length > 0);
    assert.ok(challenge.allowedActions.length >= 3);
    assert.equal(challenge.before.length, challenge.after.length);
    const architecture = await loadArchitecture(
      challenge.architecture.family,
      challenge.architecture.company,
    );
    assert.ok(
      architecture.scenarios.some((scenario) => scenario.id === challenge.architecture.scenario),
      `${challenge.id} references a missing flow`,
    );
    const nodeIds = new Set(architecture.nodes.map((node) => node.id));
    const edgeIds = new Set(architecture.edges.map((edge) => edge.id));
    for (const symptom of challenge.symptoms)
      assert.ok(nodeIds.has(symptom.nodeId), `${challenge.id} has a missing symptom node`);
    for (const id of challenge.allowedActions) {
      const action = challengeActions[id];
      assert.ok(action, `${challenge.id} references unknown action ${id}`);
      assert.ok(
        action.nodeIds.some((nodeId) => nodeIds.has(nodeId)),
        `${challenge.id}/${id} has no contextual target`,
      );
    }
    const availableTargets = challenge.interactionTargets.filter((target) =>
      target.targetType === 'node' ? nodeIds.has(target.targetId) : edgeIds.has(target.targetId),
    );
    for (const target of availableTargets) {
      assert.ok(target.actions.length > 0 && target.actions.length <= 4);
      assert.ok(target.actions.every((id) => challenge.allowedActions.includes(id)));
    }
    for (const id of challenge.allowedActions)
      assert.ok(
        availableTargets.some((target) => target.actions.includes(id)),
        `${challenge.id}/${id} is not offered on the architecture`,
      );
    for (const solution of [...challenge.validSolutions, ...challenge.partialSolutions])
      assert.ok(
        solution.actions.every((id) => challenge.allowedActions.includes(id)),
        `${challenge.id} solution uses a hidden action`,
      );
  }
});

test('stale-read fix changes the immediate read route and result while preserving the write', async () => {
  const challenge = challenges.find((item) => item.id === 'replica-lag')!;
  const base = await loadArchitecture('files');
  const fixed = challengeArchitecture(base, challenge, ['sticky_read']);
  const original = base.scenarios.find((item) => item.id === 'stale-read-challenge')!;
  const replay = fixed.scenarios.find((item) => item.id === 'stale-read-challenge')!;
  assert.deepEqual(replay.steps.slice(0, 5), original.steps.slice(0, 5));
  assert.equal(original.steps[5].to, 'rw-replica');
  assert.equal(replay.steps[5].to, 'rw-metadata');
  assert.equal(
    presentationAt(compileFrames(original, 'normal'), -1, true).clients['rw-client'],
    'stale-version',
  );
  assert.equal(
    presentationAt(compileFrames(replay, 'normal'), -1, true).clients['rw-client'],
    'latest-version',
  );
  assert.equal(base.edges.find((edge) => edge.id === 'rw-gateway--rw-replica')!.type, 'read');
  assert.equal(
    fixed.edges.find((edge) => edge.id === 'rw-gateway--rw-replica')!.type,
    'alternative',
  );
});

test('adding a load balancer inserts it into the replayed request path', async () => {
  const challenge = challenges.find((item) => item.id === 'single-server-overload')!;
  const base = await loadArchitecture('commerce');
  const evolved = challengeArchitecture(base, challenge, ['add_load_balancer']);
  const scenario = evolved.scenarios.find((item) => item.id === challenge.architecture.scenario)!;
  assert.ok(evolved.nodes.some((node) => node.id === 'challenge-add_load_balancer'));
  assert.ok(
    scenario.steps.some(
      (step) => step.from === 'rw-gateway' && step.to === 'challenge-add_load_balancer',
    ),
  );
  assert.ok(
    scenario.steps.some(
      (step) => step.from === 'challenge-add_load_balancer' && step.to === 'rw-service',
    ),
  );
  assert.equal(
    evolved.edges.find((edge) => edge.id === 'rw-gateway--rw-service')?.type,
    'alternative',
  );
  assert.equal(base.edges.find((edge) => edge.id === 'rw-gateway--rw-service')?.type, 'request');
});

test('challenge choices can place the best action in any option position', () => {
  const actions = ['best', 'partial', 'irrelevant'];
  const sequence = (values: number[]) => {
    let index = 0;
    return () => values[Math.min(index++, values.length - 1)];
  };
  const positions = [
    shuffleChallengeOptions(actions, () => 0.9).indexOf('best'),
    shuffleChallengeOptions(actions, sequence([0.9, 0])).indexOf('best'),
    shuffleChallengeOptions(actions, () => 0).indexOf('best'),
  ];
  assert.deepEqual(new Set(positions), new Set([0, 1, 2]));
  assert.deepEqual(actions, ['best', 'partial', 'irrelevant']);
});

test('rule evaluation distinguishes resolved, partial, and irrelevant consequences', () => {
  const stampede = challenges.find((item) => item.id === 'cache-stampede')!;
  assert.equal(evaluateChallenge(stampede, ['request_coalescing']).status, 'solved');
  assert.equal(evaluateChallenge(stampede, ['add_read_replica']).status, 'partial');
  assert.equal(evaluateChallenge(stampede, ['add_load_balancer']).status, 'unresolved');
  assert.equal(evaluateChallenge(stampede, []).metrics[0].value, '99%');
});

test('random selection avoids the previous challenge without creating a fixed sequence', () => {
  const easy = challenges.filter((item) => item.difficulty === 'easy');
  const first = pickChallenge(challenges, 'easy', null, () => 0);
  const next = pickChallenge(challenges, 'easy', first.id, () => 0);
  assert.notEqual(next.id, first.id);
  assert.equal(pickChallenge(challenges, 'easy', null, () => 0.999).id, easy.at(-1)!.id);
});

test('advanced rules preserve the central distributed-systems nuance', () => {
  const event = challenges.find((item) => item.id === 'event-duplication')!;
  assert.equal(evaluateChallenge(event, ['retry_budget']).status, 'partial');
  assert.equal(evaluateChallenge(event, ['idempotent_consumer']).status, 'solved');
  const kafka = challenges.find((item) => item.id === 'consumer-lag')!;
  assert.equal(evaluateChallenge(kafka, ['add_partitions']).status, 'partial');
  assert.equal(evaluateChallenge(kafka, ['add_consumers']).status, 'solved');
  const celebrity = challenges.find((item) => item.id === 'celebrity-post')!;
  assert.equal(evaluateChallenge(celebrity, ['add_consumers', 'add_partitions']).status, 'partial');
  assert.equal(evaluateChallenge(celebrity, ['hybrid_fanout']).status, 'solved');
});
