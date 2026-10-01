import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react';
import { useReducedMotion } from '../utils/useReducedMotion';
type Lesson = {
  kind: 'ring' | 'bits' | 'tree' | 'queue' | 'replica' | 'breaker' | 'regions';
  frames: string[];
};
const lessons: Record<string, Lesson> = {
  'consistent-hashing': {
    kind: 'ring',
    frames: [
      'Keys choose the next server clockwise.',
      'Add server D between A and B.',
      'Only keys in D’s new interval move.',
      'Other keys keep their owners.',
    ],
  },
  'bloom-filter': {
    kind: 'bits',
    frames: [
      'Hash a key to bits 1, 4, and 7.',
      'Set those bits; do not store the key itself.',
      'All queried bits are set: possibly present.',
      'Verify a possible match in the backing store.',
    ],
  },
  'b-tree': {
    kind: 'tree',
    frames: [
      'Look for key 60. Compare with root 50.',
      '60 is greater: follow the right branch.',
      '60 is less than 75: choose its left child.',
      'Key 60 found without scanning every entry.',
    ],
  },
  'lsm-tree': {
    kind: 'queue',
    frames: [
      'Buffer writes in the mutable memtable.',
      'Flush a sorted immutable table to storage.',
      'Multiple sorted tables accumulate.',
      'Compaction merges tables and discards obsolete versions.',
    ],
  },
  'apache-kafka': {
    kind: 'queue',
    frames: [
      'Producer sends a record with key user-42.',
      'The partitioner routes it to P1.',
      'Consumer group A reads its assigned P1 offset.',
      'Group B reads independently; delivery is not a single shared dequeue.',
    ],
  },
  sharding: {
    kind: 'queue',
    frames: [
      'Route user-42 using a stable partition function.',
      'The example mapping chooses shard 1.',
      'Only the owning shard handles this key.',
      'A query across all keys needs fanout and merge.',
    ],
  },
  'circuit-breaker': {
    kind: 'breaker',
    frames: [
      'CLOSED: requests reach the dependency.',
      'Repeated failures cross the threshold: OPEN.',
      'After a cooldown, HALF OPEN permits a probe.',
      'Successful probe closes the circuit.',
    ],
  },
  raft: {
    kind: 'replica',
    frames: [
      'A leader replicates log entries to followers.',
      'A lost leader triggers an election timeout.',
      'A candidate needs a majority and an up-to-date log.',
      'The elected leader resumes replication.',
    ],
  },
  postgresql: {
    kind: 'replica',
    frames: [
      'Commit flushes WAL; asynchronous replicas may lag.',
      'The primary becomes unreachable.',
      'Fence the old primary before promoting an eligible standby.',
      'Clients reconnect. Unreplicated recent writes can be lost.',
    ],
  },
  database: {
    kind: 'replica',
    frames: [
      'Primary accepts writes; a standby receives replication.',
      'Primary is unreachable; writes pause.',
      'Fence the old primary, then promote the standby.',
      'Route to the new primary under the stated redundancy assumptions.',
    ],
  },
  cdn: {
    kind: 'regions',
    frames: [
      'The client reaches a nearby delivery edge.',
      'A cold edge fetches missing bytes from the origin.',
      'The edge retains a cacheable copy.',
      'The next valid cache hit avoids the origin.',
    ],
  },
  'load-balancer': {
    kind: 'replica',
    frames: [
      'Requests are distributed across healthy instances.',
      'Health checks mark one instance unavailable.',
      'New traffic avoids the unhealthy instance.',
      'A recovered instance rejoins after health checks pass.',
    ],
  },
};
export function ConceptDemo({ id }: { id: string }) {
  const lesson = lessons[id];
  const reduced = useReducedMotion();
  const [step, setStep] = useState(-1);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    setStep(-1);
    setRunning(false);
  }, [id]);
  useEffect(() => {
    if (!running || !lesson) return;
    const timer = setTimeout(() => {
      if (step >= lesson.frames.length - 1) setRunning(false);
      else setStep(step + 1);
    }, 1700);
    return () => clearTimeout(timer);
  }, [running, step, lesson]);
  if (!lesson) return null;
  return (
    <section
      className={`concept-demo ${reduced ? 'demo-static' : ''}`}
      aria-label="Concept demonstration"
    >
      <button
        className="show-me"
        onClick={() => {
          setStep(0);
          setRunning(true);
        }}
      >
        <Play size={12} /> Show me <span>Four-step visual</span>
      </button>
      {step >= 0 && (
        <>
          <svg viewBox="0 0 270 104" role="img" aria-label={lesson.frames[step]}>
            {lesson.kind === 'ring' ? (
              <>
                <circle cx="135" cy="51" r="39" className="demo-ring" />
                {[20, 150, 270, ...(step > 0 ? [90] : [])].map((angle, i) => {
                  const x = 135 + Math.sin((angle * Math.PI) / 180) * 39,
                    y = 51 - Math.cos((angle * Math.PI) / 180) * 39;
                  return (
                    <g key={angle}>
                      <circle className={i === 3 ? 'demo-highlight' : ''} cx={x} cy={y} r="9" />
                      <text x={x} y={y + 3} textAnchor="middle">
                        {'ABCD'[i]}
                      </text>
                    </g>
                  );
                })}
                {[30, 90, 170, 310].map((angle) => {
                  const x = 135 + Math.sin((angle * Math.PI) / 180) * 58,
                    y = 51 - Math.cos((angle * Math.PI) / 180) * 44;
                  const owner =
                    step > 0 && angle <= 90 && angle > 20
                      ? 'D'
                      : angle <= 150 && angle > 20
                        ? 'B'
                        : angle <= 270 && angle > 150
                          ? 'C'
                          : 'A';
                  return (
                    <text
                      className={step > 1 && owner === 'D' ? 'demo-changed' : ''}
                      key={angle}
                      x={x}
                      y={y}
                    >
                      k→{owner}
                    </text>
                  );
                })}
              </>
            ) : lesson.kind === 'bits' ? (
              <>
                {Array.from({ length: 10 }, (_, i) => (
                  <g key={i}>
                    <rect
                      className={step > 0 && [1, 4, 7].includes(i) ? 'demo-highlight' : ''}
                      x={8 + i * 25}
                      y="31"
                      width="20"
                      height="25"
                      rx="3"
                    />
                    <text x={15 + i * 25} y="48">
                      {step > 0 && [1, 4, 7].includes(i) ? '1' : '0'}
                    </text>
                    <text x={15 + i * 25} y="69">
                      {i}
                    </text>
                  </g>
                ))}
                <text x="15" y="92">
                  {step >= 2 ? 'MAYBE PRESENT ≠ DEFINITELY PRESENT' : 'hash(key) → 1, 4, 7'}
                </text>
              </>
            ) : lesson.kind === 'tree' ? (
              <>
                <path
                  className="demo-connection"
                  d="M135 15L67 45M135 15L203 45M67 45L30 82M67 45L103 82M203 45L168 82M203 45L243 82"
                />
                {[
                  [135, 15, 50],
                  [67, 45, 25],
                  [203, 45, 75],
                  [30, 82, 10],
                  [103, 82, 35],
                  [168, 82, 60],
                  [243, 82, 90],
                ].map(([x, y, value], i) => (
                  <g key={value}>
                    <rect
                      className={
                        (step === 0 && i === 0) || (step === 1 && i === 2) || (step >= 2 && i === 5)
                          ? 'demo-highlight'
                          : ''
                      }
                      x={x - 14}
                      y={y - 10}
                      width="28"
                      height="20"
                      rx="4"
                    />
                    <text x={x} y={y + 3} textAnchor="middle">
                      {value}
                    </text>
                  </g>
                ))}
              </>
            ) : lesson.kind === 'queue' ? (
              <>
                {['P0', 'P1', 'P2'].map((name, i) => (
                  <g key={name}>
                    <text x="12" y={25 + i * 29}>
                      {id === 'lsm-tree' ? ['MEM', 'L0', 'L1'][i] : name}
                    </text>
                    {[0, 1, 2, 3].map((j) => (
                      <rect
                        key={j}
                        className={
                          i === (id === 'lsm-tree' ? Math.min(2, step) : 1) &&
                          j <= Math.min(3, step + 1)
                            ? 'demo-highlight'
                            : ''
                        }
                        x={45 + j * 31}
                        y={12 + i * 29}
                        width="25"
                        height="17"
                        rx="3"
                      />
                    ))}
                  </g>
                ))}
                <text x="183" y="42">
                  {id === 'lsm-tree'
                    ? step >= 2
                      ? 'SORT + MERGE'
                      : 'WRITE BUFFER'
                    : id === 'sharding'
                      ? 'user-42 → P1'
                      : step >= 2
                        ? 'GROUP A ✓'
                        : 'user-42'}
                </text>
                <text x="183" y="72">
                  {id === 'lsm-tree'
                    ? step >= 3
                      ? 'L1 COMPACTED'
                      : 'FLUSH → L0'
                    : id === 'sharding'
                      ? step >= 3
                        ? 'ALL KEYS → ALL'
                        : 'ONE OWNER'
                      : step >= 3
                        ? 'GROUP B ✓'
                        : 'offset 0'}
                </text>
              </>
            ) : lesson.kind === 'breaker' ? (
              <>
                {['CLOSED', 'OPEN', 'HALF OPEN'].map((name, i) => (
                  <g key={name}>
                    <rect
                      className={i === (step === 3 ? 0 : step) ? 'demo-highlight' : ''}
                      x={8 + i * 87}
                      y="25"
                      width="78"
                      height="35"
                      rx="6"
                    />
                    <text x={47 + i * 87} y="46" textAnchor="middle">
                      {name}
                    </text>
                  </g>
                ))}
                <text x="58" y="88">
                  {step === 1
                    ? 'FAIL FAST · WAIT FOR COOLDOWN'
                    : step === 2
                      ? 'ONE BOUNDED PROBE'
                      : 'REQUEST → DEPENDENCY'}
                </text>
              </>
            ) : lesson.kind === 'regions' ? (
              <>
                {[
                  [44, 40, 'EDGE'],
                  [134, 40, 'ORIGIN'],
                  [224, 40, 'CLIENT'],
                ].map(([x, y, label], i) => (
                  <g key={String(label)}>
                    <rect
                      className={
                        (step === 1 && i === 1) || (step >= 2 && i === 0) ? 'demo-highlight' : ''
                      }
                      x={Number(x) - 34}
                      y={Number(y) - 20}
                      width="68"
                      height="40"
                      rx="7"
                    />
                    <text x={Number(x)} y={Number(y) + 3} textAnchor="middle">
                      {label}
                    </text>
                  </g>
                ))}
                <path d={step === 1 ? 'M78 40h22' : 'M78 73h146V60'} className="demo-connection" />
                <text x="76" y="96">
                  {step >= 2 ? 'HIT · ORIGIN SKIPPED' : 'MISS · FETCH ORIGIN'}
                </text>
              </>
            ) : (
              <>
                {[0, 1, 2].map((i) => (
                  <g key={i}>
                    <rect
                      className={
                        step >= 1 && i === 0 && !(id === 'load-balancer' && step === 3)
                          ? 'demo-failed'
                          : (step >= 2 && i === 1) || (step === 0 && i === 0)
                            ? 'demo-highlight'
                            : ''
                      }
                      x={9 + i * 87}
                      y="25"
                      width="77"
                      height="39"
                      rx="6"
                    />
                    <text x={47 + i * 87} y="42" textAnchor="middle">
                      {id === 'load-balancer'
                        ? `SERVER ${'ABC'[i]}`
                        : id === 'raft'
                          ? i === (step >= 3 ? 1 : 0)
                            ? 'LEADER'
                            : 'FOLLOWER'
                          : i === (step >= 2 ? 1 : 0)
                            ? 'PRIMARY'
                            : `REPLICA ${i}`}
                    </text>
                    <text x={47 + i * 87} y="55" textAnchor="middle">
                      {step >= 1 && i === 0 && !(id === 'load-balancer' && step === 3)
                        ? 'UNREACHABLE'
                        : step >= 2 && i === 1
                          ? id === 'load-balancer'
                            ? 'ROUTED'
                            : id === 'raft'
                              ? step === 2
                                ? 'CANDIDATE'
                                : 'ELECTED'
                              : 'PROMOTED'
                          : 'HEALTHY'}
                    </text>
                  </g>
                ))}
                <path d="M47 70v12h87V70m0 12h87V70" className="demo-connection" />
              </>
            )}
          </svg>
          <p aria-live="polite">{lesson.frames[step]}</p>
          <div className="demo-controls">
            <button
              aria-label="Previous concept step"
              disabled={step === 0}
              onClick={() => {
                setRunning(false);
                setStep(step - 1);
              }}
            >
              <ChevronLeft size={13} />
            </button>
            <button
              aria-label={running ? 'Pause concept demonstration' : 'Resume concept demonstration'}
              onClick={() => setRunning(!running)}
            >
              {running ? <Pause size={12} /> : <Play size={12} />}
            </button>
            <span>
              {step + 1} / {lesson.frames.length}
            </span>
            <button
              aria-label="Next concept step"
              disabled={step === lesson.frames.length - 1}
              onClick={() => {
                setRunning(false);
                setStep(step + 1);
              }}
            >
              <ChevronRight size={13} />
            </button>
            <button
              aria-label="Reset concept demonstration"
              onClick={() => {
                setRunning(false);
                setStep(-1);
              }}
            >
              <RotateCcw size={12} />
            </button>
          </div>
        </>
      )}
    </section>
  );
}
