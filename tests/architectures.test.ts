import assert from 'node:assert/strict';
import { test } from 'node:test';
import { families } from '../src/architectures/registry';
import { loadArchitecture } from '../src/architectures/loader';
import { compileFrames, compareArchitectures } from '../src/architectures/engine';
import { architectureConcepts, architectureRelationships } from '../src/architectures/adapter';
import { concepts } from '../src/knowledge/catalog';
import { layoutArchitecture, NODE_HEIGHT, NODE_WIDTH } from '../src/layout/architecture';
import { searchArchitectures } from '../src/architectures/search';

test('ten families have complete generic patterns, authored examples, and valid evidence', async () => {
  assert.equal(families.length, 10);
  for (const family of families) {
    assert.ok(family.companies.some((c) => c.available));
    for (const company of [
      'generic',
      ...family.companies.filter((c) => c.available).map((c) => c.id),
    ]) {
      const a = await loadArchitecture(family.id, company);
      const ids = new Set(a.nodes.map((n) => n.id));
      const edgeIds = new Set(a.edges.map((e) => e.id));
      const sourceIds = new Set(a.sources.map((s) => s.id));
      assert.equal(ids.size, a.nodes.length);
      assert.equal(edgeIds.size, a.edges.length);
      assert.ok(a.scenarios.length >= 3);
      assert.ok(a.nodes.length >= 10);
      for (const n of a.nodes) {
        assert.ok(concepts[n.conceptId], n.conceptId);
        assert.ok(n.why && n.tradeoff);
      }
      for (const item of [...a.nodes, ...a.edges]) {
        if (item.confidence === 'verified')
          assert.ok(item.sourceIds.length > 0, `${family.id} verified claim without evidence`);
        for (const id of item.sourceIds) assert.ok(sourceIds.has(id), id);
      }
      for (const edge of a.edges) {
        assert.ok(ids.has(edge.source) && ids.has(edge.target), edge.id);
        assert.ok(edge.scenarioIds.every((id) => a.scenarios.some((s) => s.id === id)));
      }
      for (const scenario of a.scenarios) {
        assert.equal(new Set(scenario.steps.map((s) => s.id)).size, scenario.steps.length);
        for (const step of scenario.steps) {
          assert.ok(ids.has(step.from) && ids.has(step.to), step.id);
          assert.ok(step.explanation && step.why && step.solves);
          assert.ok(step.duration > 0);
        }
        for (const debug of scenario.debugOptions) {
          const frames = compileFrames(scenario, debug);
          assert.ok(frames.length);
          for (const frame of frames)
            for (const id of frame.edgeIds) assert.ok(edgeIds.has(id), id);
        }
      }
      const layout = layoutArchitecture(
        a.nodes.map((n) => n.id),
        architectureRelationships(a),
        architectureConcepts(a),
      );
      const positions = Object.values(layout.positions);
      for (let i = 0; i < positions.length; i++)
        for (let j = i + 1; j < positions.length; j++)
          assert.ok(
            Math.abs(positions[i].x - positions[j].x) >= NODE_WIDTH ||
              Math.abs(positions[i].y - positions[j].y) >= NODE_HEIGHT,
            `${family.id}/${company} overlapping nodes`,
          );
    }
  }
});
test('unresearched companies never silently masquerade as verified implementations', async () => {
  await assert.rejects(() => loadArchitecture('chat', 'whatsapp'), /future research/);
  const result = searchArchitectures('send WhatsApp message')[0];
  assert.equal(result.company, 'generic');
  assert.match(result.detail, /research planned/);
});

test('company questions choose the default flow unless a specific action is named', () => {
  assert.equal(
    searchArchitectures('How does Netflix-scale video delivery work?')[0].scenario,
    'playback',
  );
  assert.equal(searchArchitectures('Netflix seek video')[0].scenario, 'seek');
  assert.equal(searchArchitectures('Dropbox upload file')[0].scenario, 'upload-file');
  assert.equal(searchArchitectures('Spotify load playlist')[0].scenario, 'playlist');
});
test('media flows bypass the API gateway and gameplay bypasses REST', async () => {
  for (const family of ['video', 'music']) {
    const a = await loadArchitecture(family);
    const media = a.scenarios.flatMap((s) => s.steps).filter((s) => s.edgeType === 'media');
    assert.ok(media.length > 0);
    for (const s of media) assert.ok(s.from !== 'rw-gateway' && s.to !== 'rw-gateway');
  }
  const game = await loadArchitecture('gaming');
  const movement = game.scenarios.find((s) => s.id === 'movement')!;
  assert.ok(movement.steps.every((s) => s.from !== 'rw-gateway' && s.to !== 'rw-gateway'));
});
test('search shard work is concurrent and cache hits skip the fanout', async () => {
  const a = await loadArchitecture('search');
  const s = a.scenarios[0];
  const normal = compileFrames(s, 'normal');
  const shards = normal.find((f) => f.id === 'shards')!;
  assert.equal(shards.steps.length, 2);
  assert.equal(shards.edgeIds.length, 2);
  assert.equal(shards.duration, Math.max(...shards.steps.map((s) => s.duration)));
  const hit = compileFrames(s, 'cache-hit');
  assert.ok(!hit.some((f) => f.nodes.some((n) => n.includes('shard'))));
  assert.ok(hit.length < normal.length);
});
test('checkout failure branches compensate and never confirm fulfillment', async () => {
  const a = await loadArchitecture('commerce');
  const s = a.scenarios[0];
  const timeout = compileFrames(s, 'payment-timeout').flatMap((f) => f.steps);
  assert.ok(timeout.some((s) => s.action === 'Release reservation'));
  assert.ok(!timeout.some((s) => s.to === 'rw-fulfillment'));
  assert.ok(!timeout.some((s) => s.action === 'Order confirmed'));
  const inventory = compileFrames(s, 'inventory-failure').flatMap((f) => f.steps);
  assert.ok(!inventory.some((s) => s.to === 'rw-payment'));
  assert.match(inventory.at(-1)!.action, /unavailable/);
});
test('payment lifecycle separates authorization, capture, and settlement', async () => {
  const a = await loadArchitecture('payments', 'stripe');
  const authorize = compileFrames(a.scenarios[0], 'normal').flatMap((f) => f.steps);
  assert.ok(!authorize.some((s) => s.to === 'rw-ledger' || s.to === 'rw-settlement'));
  assert.ok(a.scenarios.find((s) => s.id === 'capture')!.steps.some((s) => s.to === 'rw-ledger'));
  assert.ok(
    a.scenarios.find((s) => s.id === 'reconcile')!.steps.some((s) => s.to === 'rw-settlement'),
  );
});
test('comparison preserves shared IDs and highlights documented decisions', async () => {
  const generic = await loadArchitecture('video');
  const netflix = await loadArchitecture('video', 'netflix');
  const diff = compareArchitectures(netflix, generic);
  assert.equal(diff.get('rw-cdn'), 'different');
  assert.equal(diff.get('rw-client'), 'shared');
});

test('asynchronous fanout and fulfillment happen after user acknowledgment', async () => {
  const social = await loadArchitecture('social');
  const post = compileFrames(
    social.scenarios.find((s) => s.id === 'create-post')!,
    'normal',
  );
  assert.ok(
    post.findIndex((f) => f.steps.some((s) => s.action === 'Post accepted')) <
      post.findIndex((f) => f.steps.some((s) => s.to === 'rw-fanout')),
  );
  const commerce = await loadArchitecture('commerce');
  const order = compileFrames(commerce.scenarios[0], 'normal');
  assert.ok(
    order.findIndex((f) => f.steps.some((s) => s.action === 'Order confirmed')) <
      order.findIndex((f) => f.steps.some((s) => s.to === 'rw-fulfillment')),
  );
});
