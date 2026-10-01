import type { SimulationScenario, SimulationStep } from '../knowledge/types';

const hop = (
  source: string,
  target: string,
  title: string,
  description: string,
): SimulationStep => ({
  nodes: [source, target],
  edges: [`${source}-${target}`],
  title,
  description,
  duration: 2800,
});

const details: Record<string, SimulationScenario> = {
  postgresql: {
    id: 'postgresql-write',
    name: 'A PostgreSQL write',
    description:
      'Follow a transaction through the connection pool, WAL, replication, and change capture.',
    steps: [
      hop(
        'connection-pool',
        'pg-primary',
        'Borrow a bounded connection',
        'The pool admits a query on an existing connection. When the pool is full, callers wait within a timeout instead of opening unlimited connections.',
      ),
      hop(
        'pg-primary',
        'wal',
        'Record the change before data pages',
        'With normal durable commit settings, PostgreSQL flushes the transaction’s WAL record before acknowledging commit. Data pages can be written later.',
      ),
      hop(
        'pg-primary',
        'pg-replica',
        'Stream WAL to the standby',
        'A standby receives and replays the WAL. With asynchronous replication, committed writes can temporarily be missing from replica reads.',
      ),
      hop(
        'pg-primary',
        'cdc',
        'Expose committed row changes',
        'Configured logical decoding makes committed changes available to a CDC connector. Monitor slot retention so a lagging consumer does not exhaust disk.',
      ),
      hop(
        'pg-replica',
        'pg-failover',
        'What if the primary fails?',
        'An eligible standby can be promoted after fencing the old primary. Clients reconnect, and asynchronous replication can lose writes not yet replicated.',
      ),
    ],
  },
  'redis-cluster': {
    id: 'redis-cluster-write',
    name: 'A Redis Cluster write',
    description: 'Watch a key map to a hash slot, reach its primary, and replicate.',
    steps: [
      hop(
        'redis-cluster',
        'redis-slots',
        'Discover the slot map',
        'A cluster-aware client discovers the owners of 16,384 hash slots. This is Redis hash-slot partitioning, rather than a generic consistent-hashing ring.',
      ),
      hop(
        'redis-slots',
        'redis-primary',
        'Route the key to its owner',
        'The client computes the key’s slot and sends the command to that shard’s primary. Hash tags place related keys in one slot for compatible multi-key operations.',
      ),
      hop(
        'redis-primary',
        'redis-replica',
        'Replicate asynchronously',
        'The primary streams changes to its replica. Acknowledgment and replica receipt are distinct, so an automatic failover can lose recent writes.',
      ),
      {
        nodes: ['redis-primary', 'redis-replica'],
        edges: [],
        title: 'Recover a failed shard',
        description:
          'With a surviving cluster majority and an eligible replica, the cluster can promote the replica. Clients refresh their slot maps and retry only when safe.',
        duration: 3200,
      },
    ],
  },
  'apache-kafka': {
    id: 'kafka-record',
    name: 'A record through Kafka',
    description: 'Trace publication, partition ownership, consumption, and offset commits.',
    steps: [
      hop(
        'kafka-producer',
        'kafka-broker',
        'Publish to the partition leader',
        'The producer chooses a partition and sends a record batch to its leader broker. Producer acknowledgments and minimum in-sync replicas determine the write policy.',
      ),
      hop(
        'kafka-broker',
        'kafka-topic',
        'Store a record in its topic',
        'A topic is a logical collection of partition logs. Brokers store partition replicas; the topic itself is not a separate network hop.',
      ),
      hop(
        'kafka-topic',
        'kafka-partition',
        'Ordering belongs to the partition',
        'Records append at offsets within one partition. Ordering across partitions requires an explicit application design.',
      ),
      hop(
        'kafka-partition',
        'kafka-consumer-group',
        'Assign work within a group',
        'Each partition belongs to one active consumer in this group. Another consumer group can independently read the same event stream.',
      ),
      hop(
        'kafka-consumer-group',
        'kafka-consumer',
        'Poll and process the record',
        'A consumer polls its assigned partitions and applies business logic. Slow processing increases lag; downstream side effects need deduplication.',
      ),
      hop(
        'kafka-consumer',
        'kafka-offsets',
        'Commit the recovery position',
        'The committed offset records where the group resumes. A crash after an effect but before the commit may repeat processing; a Kafka transaction alone cannot cover arbitrary external effects.',
      ),
    ],
  },
};

export function getDetailScenario(depthId: string | null): SimulationScenario | undefined {
  return depthId ? details[depthId] : undefined;
}
