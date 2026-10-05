import test from 'node:test';
import assert from 'node:assert/strict';
import { concepts } from '../src/knowledge/catalog';
import { scaleScenarios } from '../src/time-machine/data';
import { architectureEdges, architectureNodes, estimateWorkload } from '../src/time-machine/engine';

test('time machine ships five complete deterministic learning scenarios', () => {
  assert.deepEqual(
    scaleScenarios.map((scenario) => scenario.id),
    ['generic-web', 'social-feed', 'messaging', 'video-streaming', 'ecommerce'],
  );
  for (const scenario of scaleScenarios) {
    assert.ok(scenario.stages.length >= 5, scenario.name);
    assert.equal(scenario.stages[0].users, 100);
    scenario.stages.slice(1).forEach((stage) => {
      assert.ok(stage.bottleneck, `${scenario.name}: ${stage.label} has a bottleneck`);
      assert.ok(stage.actions.some((action) => action.id === stage.requiredAction));
      assert.ok(stage.actions.some((action) => action.outcome !== 'resolve'));
      assert.ok(stage.metrics.length >= 2);
      assert.ok(concepts[stage.bottleneck!.nodeId]);
      stage.addedNodes.forEach((id) => assert.ok(concepts[id], `${scenario.name}: ${id}`));
    });
  }
});

test('back-of-envelope estimates follow the displayed assumptions exactly', () => {
  const generic = scaleScenarios[0];
  assert.deepEqual(estimateWorkload(generic, 10_000), {
    users: 10_000,
    activeUsers: 1_000,
    requestsPerSecond: 2_000,
    readsPerSecond: 1_600,
    writesPerSecond: 400,
    bandwidthMBps: 12,
  });
});

test('architecture history only contains components earned by that stage', () => {
  const generic = scaleScenarios[0];
  assert.deepEqual(architectureNodes(generic, 0), ['client', 'services', 'database']);
  const horizontal = architectureNodes(generic, 1);
  assert.ok(horizontal.includes('load-balancer'));
  assert.ok(!horizontal.includes('cache'));
  const global = architectureNodes(generic, generic.stages.length - 1);
  for (const id of [
    'load-balancer',
    'replication',
    'cache',
    'cdn',
    'kafka',
    'workers',
    'sharding',
    'multi-region',
  ])
    assert.ok(global.includes(id), id);
  const edges = architectureEdges(global);
  assert.ok(edges.some((edge) => edge.source === 'client' && edge.target === 'multi-region'));
  assert.ok(edges.some((edge) => edge.kind === 'replication'));
  assert.ok(edges.some((edge) => edge.kind === 'publish'));
});
