import assert from 'node:assert/strict';
import test from 'node:test';
import type { SimulationScenario } from '../src/knowledge/types';
import { getPreset, presets } from '../src/scenarios/presets';
import {
  DEFAULT_STEP_DURATION,
  getScenarioDuration,
  getSimulationFrame,
} from '../src/simulation/engine';
import {
  failureExplanations,
  getScenarios,
  getTrafficImpact,
  trafficLevels,
} from '../src/simulation/scenarios';

const ids = [
  'client',
  'dns',
  'cdn',
  'waf',
  'load-balancer',
  'api-gateway',
  'auth',
  'services',
  'cache',
  'database',
  'storage',
  'kafka',
  'workers',
  'search',
  'realtime',
  'notifications',
  'observability',
  'infrastructure',
];

test('all preset flows stay inside the selected architecture, including combined failures', () => {
  assert.equal(new Set(presets.map((preset) => preset.id)).size, presets.length);
  for (const preset of presets) {
    assert.equal(new Set(preset.nodes).size, preset.nodes.length);
    assert.ok(preset.nodes.every((id) => ids.includes(id)));
    for (const failures of [[], Object.keys(failureExplanations)]) {
      const scenarios = getScenarios(failures, preset.id);
      assert.equal(new Set(scenarios.map((scenario) => scenario.id)).size, scenarios.length);
      for (const scenario of scenarios) {
        assert.ok(scenario.steps.length > 0);
        assert.ok(getScenarioDuration(scenario) < 60_000);
        for (const step of scenario.steps) {
          assert.ok(
            step.nodes.every((id) => preset.nodes.includes(id)),
            `${preset.id}/${scenario.id}: ${step.title}`,
          );
          assert.ok(step.title && step.description);
        }
      }
    }
  }
  assert.equal(getPreset('invalid').id, 'production');
});

test('DNS occurs once at connection setup and authentication returns to the gateway', () => {
  for (const scenario of getScenarios()) {
    assert.deepEqual(scenario.steps[0].nodes, ['client', 'dns']);
    assert.deepEqual(scenario.steps[1].nodes, ['dns', 'client']);
    assert.ok(scenario.steps.slice(2).every((step) => !step.nodes.includes('dns')));
    const auth = scenario.steps.findIndex((step) => step.nodes.join(',') === 'api-gateway,auth');
    if (auth >= 0) assert.deepEqual(scenario.steps[auth + 1].nodes, ['auth', 'api-gateway']);
  }
});

test('cache bypass removes the fill, increases database load, and leaves edge hits independent', () => {
  const healthy = getScenarios().find((scenario) => scenario.id === 'request')!;
  const degraded = getScenarios(['cache']).find((scenario) => scenario.id === 'request')!;
  assert.ok(healthy.steps.some((step) => step.title === 'Fill the cache'));
  assert.ok(!degraded.steps.some((step) => step.title === 'Fill the cache'));
  assert.ok(degraded.steps.some((step) => step.title === 'Database traffic increases'));
  assert.ok(degraded.steps.some((step) => step.nodes.join(',') === 'services,database'));
  assert.deepEqual(
    getScenarios(['cache', 'database', 'services']).find((scenario) => scenario.id === 'cache-hit'),
    getScenarios().find((scenario) => scenario.id === 'cache-hit'),
  );
  assert.ok(
    getScenarios()
      .find((scenario) => scenario.id === 'cache-hit')!
      .steps.every((step) => step.nodes.every((id) => ['client', 'dns', 'cdn'].includes(id))),
  );
  for (const level of trafficLevels) {
    const normal = getTrafficImpact(level, []);
    const failure = getTrafficImpact(level, ['cache']);
    assert.ok(failure.databaseReadsPerSecond > normal.databaseReadsPerSecond);
    assert.equal(failure.databaseReadsPerSecond, level.rps);
    assert.ok(getTrafficImpact(level, ['services']).healthyServiceInstances >= 0);
  }
});

test('database recovery precedes a query and consumer recovery precedes independent fanout', () => {
  const scenarios = getScenarios(['database', 'services', 'kafka', 'workers']);
  const request = scenarios.find((scenario) => scenario.id === 'request')!;
  const promotion = request.steps.findIndex(
    (step) => step.title === 'Promote a configured replica',
  );
  const query = request.steps.findIndex((step) => step.title === 'Read the source of truth');
  assert.ok(promotion >= 0 && promotion < query);
  assert.ok(request.steps.some((step) => step.title === 'Route around one failed instance'));
  const order = scenarios.find((scenario) => scenario.id === 'place-order')!;
  const rebalance = order.steps.findIndex(
    (step) => step.title === 'Rebalance and resume committed offsets',
  );
  const fanout = order.steps.findIndex((step) => step.title === 'Fan out independent work');
  assert.ok(rebalance >= 0 && rebalance < fanout);
  const commit = order.steps.findIndex((step) => step.title === 'Commit order + outbox record');
  const publish = order.steps.findIndex((step) => step.title === 'Publish the outbox event');
  assert.ok(commit >= 0 && commit < publish && publish < fanout);
  assert.deepEqual(order.steps[fanout].nodes, ['workers', 'search', 'notifications']);
});

test('timeline sampling seeks across variable steps, clamps time, and completes exactly once', () => {
  const scenario: SimulationScenario = {
    id: 'timeline',
    name: 'Timeline',
    description: '',
    steps: [
      { nodes: [], edges: [], title: 'a', description: '', duration: 100 },
      { nodes: [], edges: [], title: 'b', description: '', duration: 200 },
    ],
  };
  assert.equal(getScenarioDuration(scenario), 300);
  assert.equal(getSimulationFrame(scenario, -100).stepProgress, 0);
  assert.equal(getSimulationFrame(scenario, Number.NaN).stepIndex, 0);
  assert.equal(getSimulationFrame(scenario, 50).stepProgress, 0.5);
  assert.equal(getSimulationFrame(scenario, 100).stepIndex, 1);
  assert.equal(getSimulationFrame(scenario, 100).stepProgress, 0);
  assert.equal(getSimulationFrame(scenario, 200).stepProgress, 0.5);
  assert.equal(getSimulationFrame(scenario, 299).complete, false);
  assert.equal(getSimulationFrame(scenario, 300).complete, true);
  assert.equal(getSimulationFrame(scenario, Number.POSITIVE_INFINITY).progress, 1);
  assert.equal(getSimulationFrame({ ...scenario, steps: [] }, 0).step, null);
  const invalidDurations = {
    ...scenario,
    steps: scenario.steps.map((step) => ({ ...step, duration: Number.NaN })),
  };
  assert.equal(getScenarioDuration(invalidDurations), DEFAULT_STEP_DURATION * 2);
});

test('building a degraded run does not mutate healthy or previous runs', () => {
  const original = getScenarios();
  const snapshot = structuredClone(original);
  const degraded = getScenarios(Object.keys(failureExplanations));
  degraded[0].steps[0].nodes.push('unrelated');
  assert.deepEqual(original, snapshot);
  assert.deepEqual(getScenarios(), snapshot);
});
