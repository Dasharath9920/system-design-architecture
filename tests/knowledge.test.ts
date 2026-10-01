import assert from 'node:assert/strict';
import test from 'node:test';
import {
  concepts,
  getAncestors,
  relationships,
  rootIds,
  searchConcepts,
} from '../src/knowledge/catalog';
import { presets } from '../src/scenarios/presets';
import { failureExplanations, getScenarios } from '../src/simulation/scenarios';

const expectedRoots = [
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

test('knowledge graph has stable roots, complete explanations, and a connected acyclic hierarchy', () => {
  assert.deepEqual(rootIds, expectedRoots);
  assert.equal(new Set(rootIds).size, rootIds.length);
  assert.ok(Object.keys(concepts).length >= 400);
  for (const [id, concept] of Object.entries(concepts)) {
    assert.equal(concept.id, id);
    assert.ok(concept.name && concept.description && concept.subtitle, id);
    for (const field of ['why', 'when', 'tradeoffs'] as const)
      assert.ok(concept[field].length > 0 && concept[field].every(Boolean), `${id}.${field}`);
    assert.ok(!/coming soon|placeholder/i.test(concept.description), id);
    assert.equal(
      new Set(concept.children).size,
      concept.children.length,
      `${id} has duplicate children`,
    );
    assert.equal(
      new Set(concept.related).size,
      concept.related.length,
      `${id} has duplicate related references`,
    );
    for (const child of concept.children) {
      assert.ok(concepts[child], `${id} has unknown child ${child}`);
      assert.equal(concepts[child].parent, id);
    }
    for (const related of concept.related)
      assert.ok(concepts[related], `${id} has unknown related concept ${related}`);
    if (rootIds.includes(id)) {
      assert.equal(concept.parent, undefined);
      assert.equal(typeof concept.stage, 'number');
    } else {
      assert.ok(
        concept.parent && concepts[concept.parent]?.children.includes(id),
        `${id} is orphaned`,
      );
      const visited = new Set<string>([id]);
      let cursor = concept.parent;
      while (cursor) {
        assert.ok(!visited.has(cursor), `Hierarchy cycle at ${id} → ${cursor}`);
        visited.add(cursor);
        cursor = concepts[cursor].parent;
      }
      const ancestors = getAncestors(id);
      assert.ok(rootIds.includes(ancestors[0]), `${id} has no root ancestor`);
      assert.equal(ancestors.at(-1), concept.parent);
    }
    if (concept.source) assert.equal(new URL(concept.source).protocol, 'https:');
  }
  assert.deepEqual(getAncestors('missing-id'), []);
});

test('semantic relationships have valid unique identities and teach safe topology', () => {
  assert.equal(new Set(relationships.map((edge) => edge.id)).size, relationships.length);
  for (const edge of relationships) {
    assert.ok(concepts[edge.source], edge.id);
    assert.ok(concepts[edge.target], edge.id);
    assert.ok(edge.label && edge.description, edge.id);
    assert.notEqual(edge.source, edge.target, edge.id);
  }
  const dnsEdges = relationships.filter((edge) => edge.source === 'dns' || edge.target === 'dns');
  assert.equal(dnsEdges.length, 1);
  assert.equal(dnsEdges[0].source, 'client');
  assert.match(dnsEdges[0].description, /do not flow through DNS/);
  assert.ok(!relationships.some((edge) => edge.source === 'cache' && edge.target === 'database'));
  assert.ok(
    relationships.some((edge) => edge.id === 'services-cache-fill' && edge.kind === 'cache fill'),
  );
  assert.equal(relationships.find((edge) => edge.id === 'database-kafka')?.kind, 'CDC');
});

test('concepts, technologies, and cloud services remain distinguishable during deep exploration', () => {
  for (const id of [
    'client',
    'dns',
    'cdn',
    'waf',
    'reverse-proxy',
    'auth',
    'microservices',
    'cache',
    'redis',
    'postgresql',
    'nosql',
    'replication',
    'sharding',
    'apache-kafka',
    'message-queue',
    'workers',
    'websocket',
    'kubernetes',
    'multi-region',
    'cap',
    'raft',
    'fencing-tokens',
    'outbox',
    'multi-tenancy',
    'data-engineering',
  ])
    assert.ok(concepts[id], id);
  assert.equal(concepts.kafka.kind, 'concept');
  assert.equal(concepts['apache-kafka'].kind, 'technology');
  assert.equal(concepts.redis.kind, 'technology');
  assert.equal(concepts['managed-cache'].kind, 'service');
  assert.equal(concepts.postgresql.kind, 'technology');
  assert.equal(concepts.spanner.kind, 'service');
  assert.deepEqual(getAncestors('kafka-partition'), ['kafka', 'apache-kafka']);
  assert.deepEqual(getAncestors('redis-sorted-sets'), ['cache', 'redis', 'redis-data']);
  assert.deepEqual(getAncestors('pg-physical'), [
    'database',
    'relational',
    'postgresql',
    'pg-replication',
  ]);
  assert.ok(concepts.cap.description.includes('network partition'));
  assert.ok(concepts['exactly-once'].description.includes('transactional boundary'));
});

test('search finds exact names, technologies, implementation options, and descriptive terms', () => {
  assert.equal(searchConcepts(' Redis ')[0].id, 'redis');
  assert.equal(searchConcepts('PostgreSQL')[0].id, 'postgresql');
  assert.equal(searchConcepts('Apache Kafka')[0].id, 'apache-kafka');
  assert.ok(searchConcepts('Cloudflare').some((concept) => concept.id === 'dns'));
  assert.ok(searchConcepts('presigned').some((concept) => concept.id === 'presigned-urls'));
  assert.ok(searchConcepts('fencing').some((concept) => concept.id === 'fencing-tokens'));
  assert.deepEqual(
    searchConcepts('').map((concept) => concept.id),
    rootIds,
  );
  assert.deepEqual(searchConcepts('no-such-concept-xyz'), []);
});

test('every preset and healthy or failed simulation references real nodes and semantic edges', () => {
  const edgeMap = new Map(relationships.map((edge) => [edge.id, edge]));
  for (const preset of presets) {
    for (const id of preset.nodes) assert.ok(concepts[id], `${preset.id}: unknown concept ${id}`);
    const failures = [
      [],
      ...Object.keys(failureExplanations).map((id) => [id]),
      Object.keys(failureExplanations),
    ];
    for (const failed of failures) {
      for (const scenario of getScenarios(failed, preset.id)) {
        for (const step of scenario.steps) {
          for (const id of step.nodes)
            assert.ok(concepts[id], `${preset.id}/${scenario.id}: unknown concept ${id}`);
          for (const id of step.edges) {
            const edge = edgeMap.get(id);
            assert.ok(edge, `${preset.id}/${scenario.id}: unknown relationship ${id}`);
            assert.ok(
              preset.nodes.includes(edge.source) && preset.nodes.includes(edge.target),
              `${preset.id}/${scenario.id}: relationship outside preset ${id}`,
            );
          }
        }
      }
    }
  }
});
