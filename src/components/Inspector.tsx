import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Crosshair,
  Link2,
  Minus,
  RotateCcw,
  TriangleAlert,
  X,
} from 'lucide-react';
import { concepts, getAncestors, relationships } from '../knowledge/catalog';
import { failureExplanations } from '../simulation/scenarios';
import { useUniverse } from '../state/universe';
import { Icon } from './Icon';
import { revealConcept } from '../utils/revealConcept';
import { ConceptDemo } from '../experience/ConceptDemo';
import { XRayAction } from '../xray/XRayAction';

export function Inspector() {
  const { selectedId, selectedEdge, focused, failedNodes, explore, toggleFailure, set } =
    useUniverse();
  const [tab, setTab] = useState<'overview' | 'connections'>('overview');
  const concept = selectedId ? concepts[selectedId] : null;
  const edge = relationships.find((e) => e.id === selectedEdge);
  if (!concept && !edge) return null;
  const relatedEdges = concept
    ? relationships.filter((e) => e.source === concept.id || e.target === concept.id)
    : [];
  const close = () => set({ selectedId: null, selectedEdge: null, focused: false });
  const navigate = (id: string) => {
    revealConcept(id);
    setTab('overview');
  };
  if (edge)
    return (
      <aside className="inspector edge-inspector" aria-label="Connection inspector">
        <div className="inspector-topline">
          <span>
            <Link2 size={13} /> CONNECTION
          </span>
          <button className="icon-button" aria-label="Close inspector" onClick={close}>
            <X size={16} />
          </button>
        </div>
        <div className="connection-route">
          <button onClick={() => navigate(edge.source)}>{concepts[edge.source]?.name}</button>
          <ArrowRight size={15} />
          <button onClick={() => navigate(edge.target)}>{concepts[edge.target]?.name}</button>
        </div>
        <h2>{edge.label}</h2>
        <span className="kind-tag">{edge.kind}</span>
        <p className="inspector-description">{edge.description}</p>
        <div className="inspector-section">
          <h3>READ THE CONNECTION</h3>
          <p>
            {['event', 'publish', 'consume', 'CDC', 'stream'].includes(edge.kind)
              ? 'The producer and consumer can progress independently. Consider ordering, retry behavior, and what happens when the consumer falls behind.'
              : edge.kind === 'telemetry'
                ? 'Telemetry observes the system. It is not a synchronous dependency of the user request.'
                : edge.kind === 'replication'
                  ? 'The destination maintains a copy of source data. Freshness and recovery depend on replication and failover configuration.'
                  : 'This direction shows who initiates the interaction. Timeouts, authorization, and failure handling belong on this boundary.'}
          </p>
        </div>
        <button className="panel-primary" onClick={() => navigate(edge.source)}>
          Explore source component <ArrowUpRight size={14} />
        </button>
      </aside>
    );
  if (!concept) return null;
  const root = getAncestors(concept.id)[0] || concept.id;
  const failure = failureExplanations[concept.id];
  return (
    <aside
      className={`inspector domain-${concept.domain}`}
      aria-label={`${concept.name} inspector`}
      key={concept.id}
    >
      <div className="inspector-topline">
        <span>
          {concept.parent ? (
            <>
              <button onClick={() => navigate(concept.parent!)} aria-label="Inspect parent">
                <ArrowLeft size={13} />
              </button>
              {concepts[concept.parent]?.name}
            </>
          ) : (
            <>
              <span className="small-dot" />
              COMPONENT DETAILS
            </>
          )}
        </span>
        <button className="icon-button" aria-label="Close inspector" onClick={close}>
          <X size={16} />
        </button>
      </div>
      <div className="inspector-heading">
        <div className="inspector-icon">
          <Icon name={concept.icon} size={27} />
        </div>
        <div>
          <h2>{concept.name}</h2>
          <span className="kind-tag">{concept.kind}</span>
          <span className="tier-tag">{concept.tier || 'optional'}</span>
        </div>
      </div>
      <p className="inspector-description">{concept.description}</p>
      <XRayAction conceptId={concept.id} sourceId={concept.id} label={concept.name} />
      <div className="inspector-tabs">
        <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>
          Overview
        </button>
        <button
          className={tab === 'connections' ? 'active' : ''}
          onClick={() => setTab('connections')}
        >
          Connections <span>{relatedEdges.length}</span>
        </button>
      </div>
      <div className="inspector-scroll">
        <ConceptDemo id={concept.id} />
        {tab === 'overview' ? (
          <>
            <section className="inspector-section">
              <h3>WHY IT EXISTS</h3>
              <ul>
                {concept.why.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            </section>
            <section className="inspector-section">
              <h3>WHEN TO USE</h3>
              <ul>
                {concept.when.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            </section>
            {concept.children.length > 0 && (
              <section className="inspector-section">
                <h3>
                  EXPLORE THE ARCHITECTURE <span>{concept.children.length}</span>
                </h3>
                <div className="concept-options">
                  {concept.children.slice(0, 7).map(
                    (id) =>
                      concepts[id] && (
                        <button key={id} onClick={() => navigate(id)}>
                          <Icon name={concepts[id].icon} size={15} />
                          <span>{concepts[id].name}</span>
                          <ChevronRight size={13} />
                        </button>
                      ),
                  )}
                  {concept.children.length > 7 && (
                    <button onClick={() => explore(concept.id)}>
                      <span>View all {concept.children.length} concepts</span>
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              </section>
            )}
            {concept.options.length > 0 && (
              <section className="inspector-section">
                <h3>COMMON OPTIONS</h3>
                <div className="option-tags">
                  {concept.options.map((option) => {
                    const target = Object.values(concepts).find(
                      (c) => c.id === option || c.name.toLowerCase() === option.toLowerCase(),
                    );
                    return target ? (
                      <button key={option} onClick={() => navigate(target.id)}>
                        {target.name}
                        <ArrowUpRight size={10} />
                      </button>
                    ) : (
                      <span key={option}>{option}</span>
                    );
                  })}
                </div>
              </section>
            )}
            <section className="inspector-section">
              <h3>THE TRADE-OFFS</h3>
              <ul className="tradeoffs">
                {concept.tradeoffs.map((v) => (
                  <li key={v}>
                    <Minus size={11} />
                    {v}
                  </li>
                ))}
              </ul>
            </section>
            {concept.related.length > 0 && (
              <section className="inspector-section">
                <h3>CONNECTED IDEAS</h3>
                <div className="option-tags">
                  {concept.related.map(
                    (id) =>
                      concepts[id] && (
                        <button key={id} onClick={() => navigate(id)}>
                          {concepts[id].name}
                          <ArrowUpRight size={10} />
                        </button>
                      ),
                  )}
                </div>
              </section>
            )}
            {concept.source && (
              <a className="source-link" href={concept.source} target="_blank" rel="noreferrer">
                Read the primary source <ArrowUpRight size={12} />
              </a>
            )}
          </>
        ) : (
          <div className="connections-list">
            {relatedEdges.length ? (
              relatedEdges.map((e) => (
                <button key={e.id} onClick={() => set({ selectedId: null, selectedEdge: e.id })}>
                  <span>
                    {concepts[e.source]?.name}
                    <ArrowRight size={11} />
                    {concepts[e.target]?.name}
                  </span>
                  <strong>{e.label}</strong>
                  <p>{e.description}</p>
                </button>
              ))
            ) : (
              <p>
                This concept is part of{' '}
                <button className="text-button" onClick={() => navigate(concept.parent || root)}>
                  {concepts[concept.parent || root]?.name}
                </button>
                . Explore its parent to see the surrounding flow.
              </p>
            )}
          </div>
        )}
      </div>
      <div className="inspector-actions">
        {concept.children.length > 0 && (
          <button className="panel-primary" onClick={() => explore(concept.id)}>
            Explore {concept.children.length} concepts <ArrowRight size={15} />
          </button>
        )}
        <div className="secondary-actions">
          <button onClick={() => set({ focused: !focused })}>
            <Crosshair size={14} />
            {focused ? 'Exit focus' : 'Focus component'}
          </button>
          {failure && (
            <button
              className={failedNodes.includes(concept.id) ? 'recovery-action' : 'failure-action'}
              onClick={() => toggleFailure(concept.id)}
            >
              {failedNodes.includes(concept.id) ? (
                <RotateCcw size={13} />
              ) : (
                <TriangleAlert size={13} />
              )}{' '}
              {failedNodes.includes(concept.id) ? 'Recover' : 'Simulate failure'}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
