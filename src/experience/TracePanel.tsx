import { X } from 'lucide-react';
import { traceFor } from './presentation';
import { useExperience } from './preferences';
import { useWorld } from '../architectures/state';
import type { PlaybackFrame } from '../architectures/types';
export function TracePanel({ frames }: { frames: PlaybackFrame[] }) {
  const w = useWorld();
  const spans = traceFor(frames);
  const total = Math.max(1, ...spans.map((s) => s.start + s.duration));
  const visible = w.completed ? spans : spans.filter((s) => s.frame <= w.step);
  return (
    <aside className="trace-panel" aria-label="Simulated distributed trace">
      <div className="trace-heading">
        <span>TRACE · DEMO-{w.scenarioId.toUpperCase()}</span>
        <button
          className="icon-button"
          aria-label="Close trace"
          onClick={() => {
            useExperience.getState().set({ trace: false });
            if (w.lens === 'observability') w.set({ lens: 'architecture' });
          }}
        >
          <X size={14} />
        </button>
      </div>
      <p>SIMULATED LATENCY · {Math.round(total)} ms · illustration, not production telemetry</p>
      <div className="trace-scale">
        <span>0</span>
        <span>{Math.round(total / 2)} ms</span>
        <span>{total} ms</span>
      </div>
      <div className="trace-spans">
        {visible.length ? (
          visible.map((span) => (
            <button
              key={span.id}
              onClick={() => {
                w.seek(span.frame);
              }}
              className={span.frame === w.step ? 'current' : ''}
            >
              <span className="trace-name">
                {w.architecture?.nodes.find((n) => n.id === span.to)?.label}
                <small>{span.name}</small>
              </span>
              <span className="trace-track">
                <i
                  style={{
                    left: `${(span.start / total) * 100}%`,
                    width: `${Math.max(1, (span.duration / total) * 100)}%`,
                  }}
                />
              </span>
              <small>{span.duration} ms</small>
            </button>
          ))
        ) : (
          <div className="trace-empty">Play a flow to build its trace, or scrub to any step.</div>
        )}
      </div>
      <footer>Parallel spans share a start time. Click a span to inspect its step.</footer>
    </aside>
  );
}
