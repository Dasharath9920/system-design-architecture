import test from 'node:test';
import assert from 'node:assert/strict';
import { loadXRay, matchXRay, searchXRay, xrayCatalog } from '../src/xray/registry';

test('all 15 X-Ray components have navigable, bounded graphs and valid demonstrations', async () => {
  assert.equal(xrayCatalog.length, 15);
  for (const entry of xrayCatalog) {
    const c = await loadXRay(entry.id);
    assert.ok(c.layers.overview);
    assert.ok(c.failureModes.length && c.sources.length && c.whenNotToUse && c.consistencyModel);
    for (const l of Object.values(c.layers)) {
      const ids = new Set(l.nodes.map((n) => n.id));
      assert.equal(ids.size, l.nodes.length, `${c.id}/${l.id} duplicate node`);
      assert.ok(ids.size >= 3 && ids.size <= 9, `${c.id}/${l.id} excessive graph`);
      for (const n of l.nodes)
        if (n.next) assert.ok(c.layers[n.next], `${c.id}/${l.id}: missing ${n.next}`);
      for (const e of l.edges)
        assert.ok(ids.has(e.from) && ids.has(e.to), `${c.id}/${l.id}: dangling edge`);
      assert.ok(l.demos.length, `${c.id}/${l.id}: no demo`);
      for (const d of l.demos)
        for (const f of d.frames) {
          assert.ok(f.title && f.explanation);
          for (const id of [...f.active, ...(f.failed || []), ...Object.keys(f.values)])
            assert.ok(ids.has(id), `${c.id}/${l.id}/${d.id}: unknown ${id}`);
        }
    }
  }
});

test('search resolves mechanisms to a real internal layer without mixing implementations', async () => {
  for (const query of [
    'MVCC',
    'WAL',
    'Kafka ISR',
    'Bloom filter',
    'B-tree',
    'token bucket',
    'Raft',
    'consistent hashing',
    'Merkle',
    'deduplication',
  ]) {
    const result = searchXRay(query)[0];
    assert.ok(result, query);
    assert.ok((await loadXRay(result.id)).layers[result.layer], query);
  }
  assert.equal(matchXRay('database', 'MySQL'), undefined);
  assert.equal(matchXRay('dynamodb'), undefined);
  assert.equal(matchXRay('database'), 'postgres');
  assert.equal(matchXRay('redis'), 'redis');
});

test('critical demos retain the consistency and failure boundaries they teach', async () => {
  const pg = await loadXRay('postgres');
  const lag = pg.layers.replication.demos[0].frames;
  assert.match(lag[1].values.read, /stale/);
  assert.match(lag[2].values.read, /v2/);
  const redis = await loadXRay('redis');
  assert.match(redis.layers.routing.demos[0].frames[0].values.slots, /12182/);
  assert.match(redis.layers.replication.demos[0].frames.at(-1)!.values.route, /v1/);
  const kafka = await loadXRay('kafka');
  assert.match(kafka.layers.consumers.demos[0].frames[2].values.extra, /no extra partition/);
  assert.match(
    kafka.layers.replication.demos[0].frames.at(-1)!.values.producer,
    /not enough replicas/,
  );
});
