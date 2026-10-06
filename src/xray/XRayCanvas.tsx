import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStore,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Expand,
  Pause,
  Play,
  RotateCcw,
  ScanLine,
  X,
} from 'lucide-react';
import { loadXRay, xrayCatalog } from './registry';
import { useXRay } from './state';
import type { XRayConcept, XRayDemo, XRayLayer, XRayNode as InternalNode } from './types';
import { useReducedMotion } from '../utils/useReducedMotion';
import { useWorld } from '../architectures/state';
import { useUniverse } from '../state/universe';
import { useChallenge } from '../challenges/state';
import { useTimeMachine } from '../time-machine/state';
import { useExperience } from '../experience/preferences';
import { clockElapsed } from '../experience/useAnimationClock';
import './xray.css';

type InternalFlowNode = Node<
  {
    item: InternalNode;
    value?: string;
    active: boolean;
    failed: boolean;
    inspect: (id: string) => void;
  },
  'internal'
>;
const InternalNodeView = memo(function InternalNodeView({
  data,
  selected,
}: NodeProps<InternalFlowNode>) {
  const far = useStore((s) => s.transform[2] < 0.6);
  return (
    <div
      className={`xray-node ${far ? 'xray-node-far' : ''} ${selected ? 'selected' : ''} ${data.active ? 'active' : ''} ${data.failed ? 'failed' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={`Inspect ${data.item.name}`}
      aria-pressed={selected}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          data.inspect(data.item.id);
        }
      }}
    >
      <Handle type="target" position={Position.Left} id="left" />
      <Handle type="target" position={Position.Top} id="top" />
      <Handle type="target" position={Position.Bottom} id="bottom" />
      <Handle type="target" position={Position.Right} id="right" />
      <span className="xray-node-type">
        {data.item.plane === 'control' ? 'CONTROL PLANE' : 'INTERNAL COMPONENT'}
        {data.item.next && <ChevronRight size={12} />}
      </span>
      <strong>{data.item.name}</strong>
      <small>{data.item.role}</small>
      {data.value && <code>{data.value}</code>}
      <Handle type="source" position={Position.Right} id="right" />
      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="source" position={Position.Top} id="top" />
      <Handle type="source" position={Position.Left} id="left" />
    </div>
  );
});
const nodeTypes = { internal: InternalNodeView };

/** Uses the same elapsed-clock convention as the outer flow; no graph-wide animation RAF. */
function useDemoPlayer(demo: XRayDemo | undefined, layerId: string) {
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const elapsed = useRef(0);
  const startedAt = useRef(0);
  const reset = () => {
    setPlaying(false);
    setIndex(-1);
    elapsed.current = 0;
  };
  useEffect(reset, [demo?.id, layerId]);
  useEffect(() => {
    if (!playing || !demo) return;
    startedAt.current = performance.now();
    const timer = window.setTimeout(
      () => {
        elapsed.current = 0;
        if (index >= demo.frames.length - 1) setPlaying(false);
        else setIndex(index + 1);
      },
      Math.max(0, 1900 - elapsed.current),
    );
    return () => window.clearTimeout(timer);
  }, [playing, index, demo]);
  const toggle = () => {
    if (playing) {
      elapsed.current = clockElapsed({
        key: 'xray',
        duration: 1900,
        elapsed: elapsed.current,
        startedAt: startedAt.current,
        speed: 1,
        running: true,
        reduced: false,
      });
      setPlaying(false);
    } else {
      if (index < 0 || index === (demo?.frames.length || 1) - 1) {
        setIndex(0);
        elapsed.current = 0;
      }
      setPlaying(true);
    }
  };
  const step = (offset: number) => {
    setPlaying(false);
    elapsed.current = 0;
    setIndex((i) => Math.max(-1, Math.min((demo?.frames.length || 1) - 1, i + offset)));
  };
  const sampled = useMemo(() => {
    if (!demo || index < 0) return undefined;
    return {
      ...demo.frames[index],
      values: Object.assign({}, ...demo.frames.slice(0, index + 1).map((f) => f.values)) as Record<
        string,
        string
      >,
    };
  }, [demo, index]);
  return { index, playing, toggle, reset, step, frame: sampled };
}

function LayerCanvas({
  concept,
  layer,
  navigate,
}: {
  concept: XRayConcept;
  layer: XRayLayer;
  navigate: (id: string) => void;
}) {
  const flow = useReactFlow();
  const reduced = useReducedMotion();
  const theme = useExperience((s) => s.theme);
  const [selected, setSelected] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [demoId, setDemoId] = useState(layer.demos[0]?.id);
  const [plane, setPlane] = useState<'all' | 'data' | 'control'>('all');
  const currentDemo = layer.demos.find((d) => d.id === demoId) || layer.demos[0];
  const player = useDemoPlayer(currentDemo, layer.id);
  const item = layer.nodes.find((n) => n.id === selected);
  const nodes = useMemo(
    () =>
      layer.nodes.map((n, i) => ({
        id: n.id,
        type: 'internal' as const,
        position: { x: (i % 3) * 290, y: Math.floor(i / 3) * 190 },
        selected: selected === n.id,
        style: { opacity: plane === 'all' || (n.plane || 'data') === plane ? 1 : 0.18 },
        data: {
          item: n,
          value: player.frame?.values[n.id],
          active: player.playing && !!player.frame?.active.includes(n.id),
          failed: !!player.frame?.failed?.includes(n.id),
          inspect: setSelected,
        },
      })),
    [layer, selected, player.frame, player.playing, plane],
  );
  const edges = useMemo(
    () =>
      layer.edges.map((e, i) => {
        const from = layer.nodes.findIndex((n) => n.id === e.from),
          to = layer.nodes.findIndex((n) => n.id === e.to);
        const sameRow = Math.floor(from / 3) === Math.floor(to / 3);
        const forward = to > from;
        const skip = sameRow && Math.abs(to - from) > 1;
        return {
          id: `${e.from}-${e.to}-${i}`,
          source: e.from,
          target: e.to,
          type: 'smoothstep',
          label: e.label,
          sourceHandle: skip
            ? 'bottom'
            : sameRow
              ? forward
                ? 'right'
                : 'left'
              : forward
                ? 'bottom'
                : 'top',
          targetHandle: skip
            ? 'bottom'
            : sameRow
              ? forward
                ? 'left'
                : 'right'
              : forward
                ? 'top'
                : 'bottom',
          animated: !reduced && player.playing && !!player.frame?.active.includes(e.to),
          style: {
            stroke: e.kind === 'control' ? '#9672ba' : e.kind === 'async' ? '#3f8d89' : '#7188ab',
            strokeWidth: 1.7,
            strokeDasharray: e.kind === 'sync' ? undefined : '5 5',
          },
          labelStyle: { fontSize: 10, fill: theme === 'dark' ? '#c4c7d8' : '#52627c' },
          labelBgStyle: { fill: theme === 'dark' ? '#202333' : '#f2f5fb', fillOpacity: 0.95 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#7188ab' },
        };
      }),
    [layer, player.playing, player.frame, reduced, theme],
  );
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    const timer = window.setTimeout(() => {
      if (window.innerWidth <= 650) void flow.setCenter(112, 90, { zoom: 0.95, duration: 0 });
      else void flow.fitView({ padding: 0.18, maxZoom: 1, duration: reduced ? 0 : 450 });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [layer.id, flow, reduced]);
  useEffect(() => {
    if (window.innerWidth > 650 || !player.frame) return;
    const id = player.frame.active.at(-1);
    const index = layer.nodes.findIndex((n) => n.id === id);
    if (index < 0) return;
    void flow.setCenter((index % 3) * 290 + 112, Math.floor(index / 3) * 190 + 80, {
      zoom: 0.95,
      duration: reduced ? 0 : 350,
    });
  }, [player.index, layer, flow, reduced]);
  return (
    <>
      <div className="xray-layer-heading">
        <span>INSIDE {concept.name.toUpperCase()}</span>
        <h2 ref={heading} tabIndex={-1}>
          {layer.name}
        </h2>
        <p>{layer.summary}</p>
      </div>
      <div
        className="xray-graph"
        onKeyDown={(event) => {
          if (event.key === ' ' && !(event.target as HTMLElement).closest('button,select,input')) {
            event.preventDefault();
            event.stopPropagation();
            player.toggle();
          }
        }}
      >
        <ReactFlow<InternalFlowNode>
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          colorMode={theme}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable={false}
          zoomOnDoubleClick={false}
          minZoom={0.35}
          maxZoom={1.7}
          fitView
          fitViewOptions={{ padding: 0.18, maxZoom: 1 }}
          proOptions={{ hideAttribution: true }}
          onNodeClick={(_, node) => setSelected(node.id)}
          onNodeDoubleClick={(_, node) => {
            if (node.data.item.next && concept.layers[node.data.item.next])
              navigate(node.data.item.next);
          }}
          onPaneClick={() => setSelected(null)}
          aria-label={`${layer.name} internal architecture`}
        >
          <Background gap={24} size={0.7} color={theme === 'dark' ? '#35374a' : '#bbc8dc'} />
        </ReactFlow>
        <div className="xray-graph-tools">
          {layer.nodes.some((n) => n.plane === 'control') && (
            <select
              aria-label="Show data or control plane"
              value={plane}
              onChange={(event) => setPlane(event.target.value as typeof plane)}
            >
              <option value="all">All paths</option>
              <option value="data">Data plane</option>
              <option value="control">Control plane</option>
            </select>
          )}
          <button
            aria-label="Fit internals"
            onClick={() =>
              void flow.fitView({ padding: 0.18, maxZoom: 1, duration: reduced ? 0 : 350 })
            }
          >
            <Expand size={14} />
          </button>
        </div>
        <div className="xray-legend">
          <span>— Synchronous</span>
          <span>┄ Async / background</span>
          <span>┄ Control</span>
        </div>
      </div>
      <aside className="xray-inspector" aria-label="X-Ray concept inspector">
        <div className="xray-inspector-label">{item ? 'COMPONENT' : 'ESSENTIAL'}</div>
        <h3>{item?.name || layer.name}</h3>
        <dl>
          <dt>ROLE</dt>
          <dd>{item?.role || (layer.id === 'overview' ? concept.role : layer.summary)}</dd>
          {item && (
            <>
              <dt>HOW</dt>
              <dd>{item.how}</dd>
            </>
          )}
          <dt>TRADE-OFF</dt>
          <dd>{item?.tradeoff || layer.scope || concept.tradeoffs[0]}</dd>
        </dl>
        {item?.next && concept.layers[item.next] && (
          <button className="xray-primary" onClick={() => navigate(item.next!)}>
            Dive deeper <ArrowRight size={13} />
          </button>
        )}
        {currentDemo && (
          <button className="xray-entry" onClick={player.toggle}>
            {player.playing ? <Pause size={13} /> : <Play size={13} />}{' '}
            {player.playing ? 'Pause demo' : 'Show me'}
          </button>
        )}
        <details>
          <summary>Deep dive</summary>
          <dl>
            <dt>WHY USE IT</dt>
            <dd>{concept.whenToUse}</dd>
            <dt>CONSISTENCY</dt>
            <dd>{concept.consistencyModel}</dd>
            <dt>AT SCALE</dt>
            {concept.scalingStrategies.map((s) => (
              <dd key={s}>{s}</dd>
            ))}
            <dt>AVOID WHEN</dt>
            <dd>{concept.whenNotToUse}</dd>
            <dt>ALTERNATIVES</dt>
            {concept.alternatives.map((s) => (
              <dd key={s}>{s}</dd>
            ))}
            <dt>MISCONCEPTION CHECK</dt>
            {concept.misconceptions.map((s) => (
              <dd key={s}>{s}</dd>
            ))}
          </dl>
        </details>
        <details>
          <summary>Failure modes</summary>
          {concept.failureModes.map((f) => (
            <dl key={f.symptom}>
              <dt>SYMPTOM</dt>
              <dd>{f.symptom}</dd>
              <dt>CAUSE</dt>
              <dd>{f.cause}</dd>
              <dt>IMPACT</dt>
              <dd>{f.impact}</dd>
              <dt>MITIGATION</dt>
              <dd>{f.mitigation}</dd>
            </dl>
          ))}
        </details>
        <details>
          <summary>Internals & algorithms</summary>
          <div className="xray-related">
            {Object.values(concept.layers)
              .filter(
                (l) =>
                  l.id !== 'overview' &&
                  l.id !== layer.id &&
                  l.nodes !== concept.layers.overview.nodes,
              )
              .map((l) => (
                <button key={l.id} onClick={() => navigate(l.id)}>
                  {l.name}
                  <ChevronRight size={12} />
                </button>
              ))}
          </div>
        </details>
        <details>
          <summary>Sources & scope</summary>
          <p>{layer.scope || concept.versionContext}</p>
          <p>{concept.implementationNotes}</p>
          <small>
            Conceptual diagram · documented concepts
            <br />
            Reviewed {concept.lastReviewed}
          </small>
          {(layer.sources || concept.sources).map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noreferrer">
              {s.title} ↗
            </a>
          ))}
        </details>
        <details>
          <summary>Related concepts</summary>
          <div className="xray-related">
            {concept.relatedConcepts.map((id) => {
              const related = xrayCatalog.find((c) => c.id === id);
              return (
                related && (
                  <button
                    key={id}
                    onClick={() =>
                      useXRay
                        .getState()
                        .open(
                          related.id,
                          'overview',
                          useXRay.getState().request?.sourceId,
                          useXRay.getState().request?.label,
                        )
                    }
                  >
                    {related.name}
                    <ChevronRight size={12} />
                  </button>
                )
              );
            })}
          </div>
        </details>
      </aside>
      <section className="xray-demo" aria-label="X-Ray demonstration">
        <div className="xray-demo-controls">
          <button className="xray-primary" onClick={player.toggle} disabled={!currentDemo}>
            {player.playing ? <Pause size={14} /> : <Play size={14} />}{' '}
            {player.playing ? 'Pause' : 'Show me'}
          </button>
          <select
            aria-label="Choose demonstration"
            value={currentDemo?.id || ''}
            onChange={(event) => setDemoId(event.target.value)}
          >
            {layer.demos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.failure ? 'Break it · ' : ''}
                {d.name}
              </option>
            ))}
          </select>
          <button
            aria-label="Previous demonstration step"
            onClick={() => player.step(-1)}
            disabled={player.index < 0}
          >
            <ArrowLeft size={14} />
          </button>
          <button
            aria-label="Next demonstration step"
            onClick={() => player.step(1)}
            disabled={player.index >= (currentDemo?.frames.length || 1) - 1}
          >
            <ArrowRight size={14} />
          </button>
          <button aria-label="Reset demonstration" onClick={player.reset}>
            <RotateCcw size={14} />
          </button>
        </div>
        <div className="xray-demo-caption" role="status" aria-live="polite">
          <span>
            {player.index < 0
              ? 'ILLUSTRATIVE DEMO'
              : `${player.index + 1} / ${currentDemo?.frames.length}`}
          </span>
          <strong>{player.frame?.title || 'Follow the mechanism'}</strong>
          <p>
            {player.frame?.explanation ||
              'Play a short demonstration, or step through each decision.'}
          </p>
        </div>
      </section>
    </>
  );
}

export function XRayCanvas() {
  const request = useXRay((s) => s.request)!;
  const outerFlow = useReactFlow();
  const reduced = useReducedMotion();
  const [concept, setConcept] = useState<XRayConcept | null>(null);
  const [path, setPath] = useState<string[]>(['overview']);
  const [error, setError] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const returnLabel = useChallenge.getState().challengeId
    ? 'Return to Challenge'
    : useTimeMachine.getState().active
      ? 'Return to Time Machine'
      : 'Return to architecture';
  useLayoutEffect(() => {
    const viewport = outerFlow.getViewport();
    const focused = request.returnFocus;
    const siblings = Array.from(document.querySelector('.universe-app')?.children || []).filter(
      (el) => !el.classList.contains('xray-shell') && !el.classList.contains('search-backdrop'),
    ) as HTMLElement[];
    const inertBefore = siblings.map((el) => el.inert);
    siblings.forEach((el) => {
      el.inert = true;
    });
    useWorld.getState().pause();
    const u = useUniverse.getState();
    if (u.running) u.set({ running: false, elapsed: u.elapsed + performance.now() - u.startedAt });
    const source = request.sourceId && outerFlow.getNode(request.sourceId);
    if (source)
      void outerFlow.setCenter(source.position.x + 100, source.position.y + 60, {
        zoom: Math.max(viewport.zoom, 1.1),
        duration: reduced ? 0 : 650,
      });
    closeButton.current?.focus();
    return () => {
      siblings.forEach((el, i) => {
        el.inert = inertBefore[i];
      });
      void outerFlow.setViewport(viewport, { duration: 0 });
      requestAnimationFrame(() => {
        if (!useXRay.getState().request && focused?.isConnected)
          focused.focus({ preventScroll: true });
      });
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    setError(false);
    setConcept(null);
    loadXRay(request.id)
      .then((c) => {
        if (cancelled) return;
        setConcept(c);
        const target = c.layers[request.layer] ? request.layer : 'overview';
        setPath(target === 'overview' ? ['overview'] : ['overview', target]);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [request]);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || useUniverse.getState().searchOpen) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (path.length > 1) setPath((p) => p.slice(0, -1));
      else useXRay.getState().close();
    };
    window.addEventListener('keydown', handle, true);
    return () => window.removeEventListener('keydown', handle, true);
  }, [path]);
  const current = concept?.layers[path.at(-1)!];
  const navigate = (id: string) =>
    setPath((p) => (p.includes(id) ? p.slice(0, p.indexOf(id) + 1) : [...p, id]));
  return (
    <section className="xray-shell" role="region" aria-label="X-Ray mode">
      <header className="xray-header">
        <nav aria-label="X-Ray breadcrumb">
          <ScanLine size={16} />
          <button onClick={() => useXRay.getState().close()}>{request.label}</button>
          {path.map((id, i) => (
            <span key={id}>
              <ChevronRight size={12} />
              <button
                aria-current={i === path.length - 1 ? 'page' : undefined}
                onClick={() => setPath((p) => p.slice(0, i + 1))}
              >
                {concept?.layers[id]?.name || request.id}
              </button>
            </span>
          ))}
        </nav>
        <button ref={closeButton} className="xray-exit" onClick={() => useXRay.getState().close()}>
          {returnLabel}
          <X size={15} />
        </button>
      </header>
      {error ? (
        <div className="xray-loading" role="alert">
          Could not load these internals. Close X-Ray and try again.
        </div>
      ) : current && concept ? (
        <ReactFlowProvider key={`${concept.id}/${current.id}`}>
          <LayerCanvas concept={concept} layer={current} navigate={navigate} />
        </ReactFlowProvider>
      ) : (
        <div className="xray-loading" role="status">
          Opening internals…
        </div>
      )}
    </section>
  );
}
