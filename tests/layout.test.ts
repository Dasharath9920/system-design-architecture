import assert from 'node:assert/strict';
import test from 'node:test';
import {
  layoutArchitecture,
  NODE_HEIGHT,
  NODE_WIDTH,
  type ArchitectureLayout,
} from '../src/layout/architecture';
import type { Concept, Relationship } from '../src/knowledge/types';

function concept(id: string, stage?: number): Concept {
  return {
    id,
    name: id,
    subtitle: '',
    domain: 'compute',
    kind: 'concept',
    icon: 'box',
    description: '',
    why: [],
    when: [],
    tradeoffs: [],
    options: [],
    related: [],
    children: [],
    stage,
  };
}

function edge(
  source: string,
  target: string,
  kind: Relationship['kind'] = 'request',
): Relationship {
  return { id: `${source}-${target}-${kind}`, source, target, kind, label: kind, description: '' };
}

function assertNoOverlap(layout: ArchitectureLayout): void {
  const nodes = Object.entries(layout.positions);
  for (let a = 0; a < nodes.length; a++) {
    const [id, position] = nodes[a];
    assert.ok(Number.isFinite(position.x) && Number.isFinite(position.y));
    assert.ok(position.x >= 0 && position.y >= 0);
    assert.ok(position.x + NODE_WIDTH <= layout.width);
    assert.ok(position.y + NODE_HEIGHT <= layout.height);
    for (let b = a + 1; b < nodes.length; b++) {
      const [otherId, other] = nodes[b];
      const overlapX = position.x < other.x + NODE_WIDTH && position.x + NODE_WIDTH > other.x;
      const overlapY = position.y < other.y + NODE_HEIGHT && position.y + NODE_HEIGHT > other.y;
      assert.ok(!overlapX || !overlapY, `${id} overlaps ${otherId}`);
    }
  }
}

test('overview keeps request layers ordered and places operations on a separate rail', () => {
  const stages = [0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 4, 5, 5, 5, 5, 6, 6];
  const ids = stages.map((_, index) => `node-${index}`);
  const concepts = Object.fromEntries(ids.map((id, index) => [id, concept(id, stages[index])]));
  const relationships = ids.slice(1).map((id, index) => edge(ids[index], id));
  const layout = layoutArchitecture(ids, relationships, concepts);
  assert.equal(Object.keys(layout.positions).length, 18);
  assert.equal(layout.bands.length, 7);
  for (let stage = 0; stage < 5; stage++) {
    const source = ids.find((_, index) => stages[index] === stage)!;
    const target = ids.find((_, index) => stages[index] === stage + 1)!;
    assert.ok(layout.positions[source].x < layout.positions[target].x);
  }
  const bottomOfFlow = Math.max(
    ...ids
      .filter((_, index) => stages[index] < 6)
      .map((id) => layout.positions[id].y + NODE_HEIGHT),
  );
  for (const id of ids.filter((_, index) => stages[index] === 6)) {
    assert.ok(layout.positions[id].y > bottomOfFlow);
  }
  assertNoOverlap(layout);
  assert.deepEqual(layoutArchitecture(ids, relationships, concepts), layout);
});

test('detail ranks request and replication edges while ignoring return traffic', () => {
  const ids = ['application', 'pool', 'primary', 'replica', 'backup'];
  const concepts = Object.fromEntries(ids.map((id) => [id, concept(id)]));
  const relationships = [
    edge('application', 'pool'),
    edge('pool', 'primary'),
    edge('primary', 'replica', 'replication'),
    edge('primary', 'backup', 'backup'),
    edge('primary', 'application', 'response'),
    edge('replica', 'application', 'telemetry'),
  ];
  const layout = layoutArchitecture(ids, relationships, concepts, 'detail');
  assert.ok(layout.positions.application.x < layout.positions.pool.x);
  assert.ok(layout.positions.pool.x < layout.positions.primary.x);
  assert.ok(layout.positions.primary.x < layout.positions.replica.x);
  assert.equal(layout.positions.replica.x, layout.positions.backup.x);
  assertNoOverlap(layout);
});

test('cyclic and disconnected details remain finite, complete, and balanced', () => {
  const ids = Array.from({ length: 29 }, (_, index) => `concept-${index}`);
  const concepts = Object.fromEntries(ids.map((id) => [id, concept(id)]));
  const relationships = [edge(ids[0], ids[1]), edge(ids[1], ids[2]), edge(ids[2], ids[0])];
  const layout = layoutArchitecture(ids, relationships, concepts, 'detail');
  const rowsPerColumn = new Map<number, number>();
  for (const position of Object.values(layout.positions)) {
    rowsPerColumn.set(position.x, (rowsPerColumn.get(position.x) ?? 0) + 1);
  }
  assert.equal(Object.keys(layout.positions).length, ids.length);
  assert.ok([...rowsPerColumn.values()].every((count) => count <= 4));
  assertNoOverlap(layout);
});

test('layout tolerates empty, missing, duplicate, and external graph entities', () => {
  assert.deepEqual(layoutArchitecture([], [], {}), {
    positions: {},
    width: 0,
    height: 0,
    bands: [],
  });
  const layout = layoutArchitecture(['known', 'missing', 'known'], [edge('external', 'known')], {
    known: concept('known', 3),
  });
  assert.deepEqual(Object.keys(layout.positions), ['known']);
  assertNoOverlap(layout);
});

test('large visible layers automatically add columns without collisions', () => {
  const ids = Array.from({ length: 80 }, (_, index) => `component-${index}`);
  const concepts = Object.fromEntries(ids.map((id) => [id, concept(id, 3)]));
  const layout = layoutArchitecture(ids, [], concepts);
  assert.equal(Object.keys(layout.positions).length, 80);
  assertNoOverlap(layout);
});
