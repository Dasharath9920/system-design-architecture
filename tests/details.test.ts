import assert from 'node:assert/strict';
import test from 'node:test';
import { concepts, relationships } from '../src/knowledge/catalog';
import { getDetailScenario } from '../src/simulation/details';

test('technology flows remain inside the explored architecture and use real semantic edges', () => {
  const edgeIds = new Set(relationships.map((edge) => edge.id));
  for (const id of ['postgresql', 'redis-cluster', 'apache-kafka']) {
    const scenario = getDetailScenario(id);
    assert.ok(scenario);
    const visible = new Set([id, ...concepts[id].children]);
    assert.ok(scenario.steps.length >= 4);
    for (const step of scenario.steps) {
      for (const node of step.nodes) assert.ok(visible.has(node), `${id}: invisible node ${node}`);
      for (const edge of step.edges) assert.ok(edgeIds.has(edge), `${id}: invented edge ${edge}`);
      assert.ok(step.title && step.description);
    }
  }
  assert.equal(getDetailScenario(null), undefined);
  assert.equal(getDetailScenario('not-a-concept'), undefined);
});
