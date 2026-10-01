import assert from 'node:assert/strict';
import { test } from 'node:test';
import { families } from '../src/architectures/registry';
import { loadArchitecture } from '../src/architectures/loader';
import { compileFrames } from '../src/architectures/engine';
import { architectureConcepts, architectureRelationships } from '../src/architectures/adapter';
import { layoutArchitecture, NODE_HEIGHT, NODE_WIDTH } from '../src/layout/architecture';
import { storyLayout } from '../src/experience/storyLayout';
import {
  applySandbox,
  frameAtTime,
  presentationAt,
  traceFor,
} from '../src/experience/presentation';
import { defaultSandbox } from '../src/experience/types';

test('all authored visual cues reference real nodes and story layouts have no collisions', async () => {
  for (const family of families) {
    const a = await loadArchitecture(family.id);
    const ids = new Set(a.nodes.map((n) => n.id));
    for (const scenario of a.scenarios)
      for (const step of scenario.steps) {
        assert.ok(step.visual?.payload && step.visual.caption, step.action);
        assert.ok(step.visual.latencyMs > 0);
        for (const state of [step.visual.client, step.visual.sourceState])
          if (state) assert.ok(ids.has(state.node), step.action);
      }
    const base = layoutArchitecture(
      [...ids],
      architectureRelationships(a),
      architectureConcepts(a),
    );
    const layout = storyLayout(base, a, true);
    const positions = Object.entries(layout.positions);
    for (let i = 0; i < positions.length; i++)
      for (let j = i + 1; j < positions.length; j++) {
        const [aId, p] = positions[i],
          [bId, q] = positions[j];
        assert.ok(
          Math.abs(p.x - q.x) >= NODE_WIDTH || Math.abs(p.y - q.y) >= NODE_HEIGHT,
          `${family.id}: ${aId} overlaps ${bId}`,
        );
      }
  }
});

test('scrubbing backwards reconstructs client state without future delivery leaking through', async () => {
  const a = await loadArchitecture('chat');
  const frames = compileFrames(a.scenarios[0], 'normal');
  assert.equal(presentationAt(frames, -1, true).clients['rw-client'], 'delivered');
  const acceptance = frames.findIndex((f) =>
    f.steps.some((s) => s.action === 'Accepted acknowledgment'),
  );
  assert.equal(presentationAt(frames, acceptance, false).clients['rw-client'], 'sending');
  assert.equal(presentationAt(frames, acceptance + 1, false).clients['rw-client'], 'sent');
  const beginning = presentationAt(frames, -1, false);
  assert.deepEqual(beginning.clients, {});
  assert.equal(beginning.visitedEdges.size, 0);
  const boundary = frames[0].duration;
  assert.deepEqual(frameAtTime(frames, boundary), { step: 1, elapsed: 0 });
  assert.deepEqual(frameAtTime(frames, -100), { step: 0, elapsed: 0 });
  assert.deepEqual(frameAtTime(frames, Infinity), {
    step: frames.length - 1,
    elapsed: frames.at(-1)!.duration,
  });
});

test('parallel trace spans share a start and the next frame waits for the longest span', async () => {
  const a = await loadArchitecture('search');
  const frames = compileFrames(a.scenarios[0], 'normal');
  const index = frames.findIndex((f) => f.parallel);
  const spans = traceFor(frames);
  const parallel = spans.filter((s) => s.frame === index);
  assert.equal(parallel.length, 2);
  assert.equal(parallel[0].start, parallel[1].start);
  assert.equal(
    spans.find((s) => s.frame === index + 1)!.start,
    Math.max(...parallel.map((s) => s.start + s.duration)),
  );
});

test('sandbox slows real database work and scales consumers without mutating the authored flow', async () => {
  const a = await loadArchitecture('commerce');
  const frames = compileFrames(a.scenarios[0], 'normal');
  const before = structuredClone(frames);
  const changed = applySandbox(frames, {
    ...defaultSandbox,
    databaseSlow: true,
    consumers: 4,
    consumersPaused: true,
  });
  const database = frames
    .flatMap((f) => f.steps)
    .find((s) => s.to === 'rw-database' && s.edgeType === 'write')!;
  const slow = changed.flatMap((f) => f.steps).find((s) => s.id === database.id)!;
  assert.equal(slow.duration, database.duration + 1800);
  assert.equal(slow.visual!.latencyMs, database.visual!.latencyMs * 3);
  const consumer = frames.flatMap((f) => f.steps).find((s) => s.from === 'rw-events')!;
  const paused = changed.flatMap((f) => f.steps).find((s) => s.id === consumer.id)!;
  assert.equal(paused.duration, consumer.duration / 2);
  assert.equal(paused.visual!.caption, 'CONSUMER PAUSED');
  assert.deepEqual(frames, before);
});

test('showcase stories end after actual delivery, synchronization, and authorization responses', async () => {
  const files = await loadArchitecture('files');
  const upload = compileFrames(files.scenarios[0], 'normal');
  assert.equal(upload.at(-1)!.steps[0].action, 'Verify and apply');
  assert.equal(presentationAt(upload, -1, true).clients['rw-device'], 'synced');
  const chat = await loadArchitecture('chat');
  const offline = compileFrames(chat.scenarios[0], 'offline');
  assert.equal(offline.at(-2)!.steps[0].to, 'rw-recipient');
  assert.equal(presentationAt(offline, -1, true).clients['rw-client'], 'delivered');
  const ride = await loadArchitecture('ride');
  const matching = compileFrames(ride.scenarios[0], 'normal');
  assert.ok(matching[0].parallel && matching[1].parallel);
  assert.ok(matching[0].steps.some((s) => s.from === 'rw-driver'));
  const payments = await loadArchitecture('payments');
  for (const debug of ['normal', 'payment-timeout'] as const) {
    const authorization = compileFrames(payments.scenarios[0], debug);
    const response = authorization.findIndex((f) =>
      f.steps.some((s) => s.action === 'Return authorization status'),
    );
    assert.notEqual(
      presentationAt(authorization, response, false).clients['rw-client'],
      'authorized',
    );
    assert.equal(
      presentationAt(authorization, response + 1, false).clients['rw-client'],
      'authorized',
    );
    assert.ok(
      !authorization
        .flatMap((f) => f.steps)
        .some((s) => s.to === 'rw-ledger' || s.to === 'rw-settlement'),
    );
  }
});
