import { RotateCcw } from 'lucide-react';
import { useWorld } from '../architectures/state';
import { useUniverse } from '../state/universe';
import { defaultSandbox } from './types';
import type { ArchitectureNode, DebugCondition } from '../architectures/types';
export function SandboxActions({ node }: { node: ArchitectureNode }) {
  const w = useWorld();
  const a = w.architecture!;
  const candidates: { label: string; run: () => void }[] = [];
  const branch = (label: string, debug: DebugCondition) => {
    const scenario =
      a.scenarios.find((s) => s.id === w.scenarioId && s.debugOptions.includes(debug)) ||
      a.scenarios.find((s) => s.debugOptions.includes(debug));
    if (!scenario) return;
    candidates.push({
      label,
      run: () => {
        if (w.scenarioId !== scenario.id) w.chooseScenario(scenario.id);
        w.setDebug(debug);
        useUniverse.getState().select(node.id);
      },
    });
  };
  if (/cache|cdn/.test(node.id)) {
    branch('Force cache hit', 'cache-hit');
    branch('Clear cache / force miss', 'cache-miss');
  }
  if (/database|metadata|ledger|posts|shard/.test(node.id))
    candidates.push({
      label: w.sandbox.databaseSlow ? 'Restore database latency' : 'Increase database latency',
      run: () => w.changeSandbox({ databaseSlow: !w.sandbox.databaseSlow }),
    });
  if (/events|fanout|workers/.test(node.id)) {
    candidates.push(
      {
        label: w.sandbox.consumersPaused ? 'Resume consumers' : 'Pause consumers',
        run: () => w.changeSandbox({ consumersPaused: !w.sandbox.consumersPaused }),
      },
      {
        label: `Add consumer (${w.sandbox.consumers})`,
        run: () =>
          w.changeSandbox({
            consumers: Math.min(6, w.sandbox.consumers + 1),
            consumersPaused: false,
          }),
      },
      {
        label: 'Produce a burst',
        run: () => w.changeSandbox({ burst: Math.min(99, w.sandbox.burst + 12) }),
      },
    );
  }
  if (node.id === 'rw-service')
    candidates.push(
      {
        label: w.sandbox.failedServer ? 'Restore server' : 'Stop one server',
        run: () => w.changeSandbox({ failedServer: !w.sandbox.failedServer }),
      },
      {
        label: 'Add service instance',
        run: () => w.changeSandbox({ extraServers: Math.min(3, w.sandbox.extraServers + 1) }),
      },
    );
  if (/connection|presence|recipient/.test(node.id)) branch('Disconnect recipient', 'offline');
  if (/payment|processor/.test(node.id)) branch('Simulate processor timeout', 'payment-timeout');
  if (node.id === 'rw-inventory') branch('Reject inventory reservation', 'inventory-failure');
  if (!candidates.length) return null;
  return (
    <section className="inspector-section sandbox-actions">
      <h3>
        TOUCH THE SYSTEM <span>SIMULATED</span>
      </h3>
      <div>
        {candidates.map((c) => (
          <button key={c.label} onClick={c.run}>
            {c.label}
          </button>
        ))}
      </div>
      <p>Changes apply to this teaching model. Playback pauses while you adjust it.</p>
      <button
        className="sandbox-reset"
        onClick={() => {
          w.changeSandbox({ ...defaultSandbox });
          w.setDebug('normal');
          useUniverse.getState().select(node.id);
        }}
      >
        <RotateCcw size={11} /> Reset conditions
      </button>
    </section>
  );
}
export function ImpactChain() {
  const w = useWorld();
  const [chain, label] = w.sandbox.consumersPaused
    ? [['Consumer paused', 'Events retained', 'Delivery waits'], 'Backpressure']
    : w.sandbox.databaseSlow
      ? [['Slow store', 'Longer spans', 'Later response'], 'Dependency latency']
      : w.sandbox.failedServer
        ? [
            ['One server stopped', 'Health check excludes it', 'Healthy instance selected'],
            'Redundant service pool',
          ]
        : w.debug === 'cache-miss'
          ? [['Cache miss', 'Origin / store read', 'Cache warmed'], 'Cold path']
          : w.debug === 'inventory-failure'
            ? [['Reservation rejected', 'Payment skipped', 'Order not confirmed'], 'Saga rejection']
            : w.debug === 'payment-timeout'
              ? [
                  ['Reply missing', 'Outcome unknown', 'Reconcile original attempt'],
                  'Uncertain outcome',
                ]
              : w.debug === 'offline'
                ? [
                    ['Socket absent', 'Message retained', 'History recovered on reconnect'],
                    'Offline delivery',
                  ]
                : w.debug === 'consumer-lag'
                  ? [
                      ['Consumer behind', 'Backlog retained', 'Catch up from checkpoint'],
                      'Consumer lag',
                    ]
                  : w.debug === 'network-degraded'
                    ? [
                        ['Network slows', 'Smaller / newer payload', 'Continuity preserved'],
                        'Network degradation',
                      ]
                    : [[], ''];
  if (!chain.length) return null;
  return (
    <details className="impact-chain">
      <summary>
        Why did this happen? <span>{label} · SIMULATED</span>
      </summary>
      <div>
        {chain.map((step, i) => (
          <span key={step}>
            {i > 0 && <b>→</b>}
            {step}
          </span>
        ))}
      </div>
    </details>
  );
}
