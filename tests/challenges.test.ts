import assert from 'node:assert/strict';
import { test } from 'node:test';
import { challengeActions } from '../src/challenges/actions';
import { challengeCounts, challenges } from '../src/challenges/data';
import { evaluateChallenge, pickChallenge } from '../src/challenges/engine';
import { loadArchitecture } from '../src/architectures/loader';

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
    for (const solution of [...challenge.validSolutions, ...challenge.partialSolutions])
      assert.ok(
        solution.actions.every((id) => challenge.allowedActions.includes(id)),
        `${challenge.id} solution uses a hidden action`,
      );
  }
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
