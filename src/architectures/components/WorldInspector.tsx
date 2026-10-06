import { ArrowRight, ArrowUpRight, BookOpen, X } from 'lucide-react';
import { useWorld } from '../state';
import { useUniverse } from '../../state/universe';
import { concepts } from '../../knowledge/catalog';
import { Icon } from '../../components/Icon';
import { SandboxActions } from '../../experience/SandboxActions';
import { ConceptDemo } from '../../experience/ConceptDemo';
import { useChallenge } from '../../challenges/state';
import { XRayAction } from '../../xray/XRayAction';
const symbols = { verified: '✓', inferred: '~', conceptual: '◇' };
export function WorldInspector() {
  const w = useWorld();
  const u = useUniverse();
  const challengeId = useChallenge((state) => state.challengeId);
  const a = w.architecture!;
  const node = a.nodes.find((n) => n.id === u.selectedId);
  const edge = a.edges.find((e) => e.id === u.selectedEdge);
  const item = node || edge;
  if (!item) return null;
  const evidence = a.sources.filter((s) => item.sourceIds.includes(s.id));
  return (
    <aside
      className="inspector world-inspector"
      aria-label={`${node?.label || edge?.label} inspector`}
    >
      <div className="inspector-topline">
        <span>{node ? 'COMPONENT IN CONTEXT' : 'CONNECTION IN CONTEXT'}</span>
        <button
          className="icon-button"
          aria-label="Close inspector"
          onClick={() => u.set({ selectedId: null, selectedEdge: null })}
        >
          <X size={16} />
        </button>
      </div>
      <div className="inspector-heading">
        {node && (
          <div className="inspector-icon">
            <Icon name={concepts[node.conceptId].icon} size={25} />
          </div>
        )}
        <div>
          <h2>{node?.label || edge?.label}</h2>
          <span className={`world-confidence ${item.confidence}`}>
            {symbols[item.confidence]} {item.confidence}
          </span>
        </div>
      </div>
      {edge && (
        <div className="connection-route">
          <button onClick={() => u.select(edge.source)}>
            {a.nodes.find((n) => n.id === edge.source)?.label}
          </button>
          <ArrowRight size={13} />
          <button onClick={() => u.select(edge.target)}>
            {a.nodes.find((n) => n.id === edge.target)?.label}
          </button>
        </div>
      )}
      <p className="inspector-description">{item.description}</p>
      {node && (
        <XRayAction
          conceptId={node.technology || node.conceptId}
          sourceId={node.id}
          label={node.label}
        />
      )}
      <div className="inspector-scroll">
        {edge && w.packetInspection?.edge === edge.id && (
          <section className="inspector-section packet-inspection">
            <h3>PAYLOAD · {w.packetInspection.kind.toUpperCase()}</h3>
            <code>{w.packetInspection.label}</code>
            <p>Illustrative payload carried by the selected operation.</p>
          </section>
        )}
        {node && (
          <>
            {!challengeId && <SandboxActions node={node} />}
            <ConceptDemo id={node.conceptId} />
          </>
        )}
        {node && (
          <>
            <section className="inspector-section">
              <h3>WHY IT EXISTS</h3>
              <p>{node.why}</p>
            </section>
            <section className="inspector-section">
              <h3>THE TRADE-OFF</h3>
              <p>{node.tradeoff}</p>
            </section>
            {node.insight && (
              <section className="inspector-section">
                <h3>{node.insight}</h3>
                <p>{node.role}</p>
              </section>
            )}
            <section className="inspector-section">
              <h3>IN THIS SYSTEM</h3>
              <p>{a.summary}</p>
              {node.technology && <span className="kind-tag">{node.technology}</span>}
            </section>
          </>
        )}
        <section className="inspector-section">
          <h3>EVIDENCE & SCOPE</h3>
          <p>
            {item.confidence === 'verified'
              ? 'Documented within the source’s stated date and scope.'
              : item.confidence === 'inferred'
                ? 'An architectural inference, not a confirmed internal topology.'
                : 'A teaching abstraction. Implementation and exact company boundaries are not publicly confirmed here.'}
          </p>
          {evidence.map((source) => (
            <a
              className="world-source-link"
              href={source.url}
              target="_blank"
              rel="noreferrer"
              key={source.id}
            >
              {source.title}
              <ArrowUpRight size={12} />
              <small>
                {source.publisher} · {source.date}
              </small>
            </a>
          ))}
          <small className="world-evidence-era">{a.era}</small>
        </section>
        {node && (
          <section className="inspector-section">
            <h3>CONNECTED COMPONENTS</h3>
            <div className="concept-options">
              {a.edges
                .filter((e) => e.source === node.id || e.target === node.id)
                .map((e) => {
                  const id = e.source === node.id ? e.target : e.source;
                  return (
                    <button key={e.id} onClick={() => u.inspectEdge(e.id)}>
                      <span>{a.nodes.find((n) => n.id === id)?.label}</span>
                      <small>{e.type}</small>
                      <ArrowRight size={12} />
                    </button>
                  );
                })}
            </div>
          </section>
        )}
      </div>
      {node && (
        <button
          className="panel-primary"
          onClick={() => {
            w.pause();
            u.explore(node.conceptId);
          }}
        >
          Explore {concepts[node.conceptId].name} concepts <ArrowUpRight size={14} />
        </button>
      )}
      <button className="world-inspector-sources" onClick={() => w.set({ sourcesOpen: true })}>
        <BookOpen size={13} /> View architecture sources
      </button>
    </aside>
  );
}
export function SourcesDrawer() {
  const w = useWorld();
  const a = w.architecture!;
  return (
    <aside className="inspector world-sources" aria-label="Architecture sources">
      <div className="inspector-topline">
        <span>EVIDENCE, NOT GUESSWORK</span>
        <button
          className="icon-button"
          aria-label="Close sources"
          onClick={() => w.set({ sourcesOpen: false })}
        >
          <X size={16} />
        </button>
      </div>
      <h2>{a.company} · sources</h2>
      <p className="inspector-description">{a.summary}</p>
      <div className="world-evidence-key">
        <span>✓ Verified · documented component</span>
        <span>~ Inferred · defensible reconstruction</span>
        <span>◇ Conceptual · teaching abstraction</span>
      </div>
      <div className="inspector-scroll">
        {a.sources.length ? (
          a.sources.map((source) => (
            <section key={source.id} className="inspector-section">
              <h3>
                {source.publisher} · {source.type}
              </h3>
              <a className="world-source-link" href={source.url} target="_blank" rel="noreferrer">
                {source.title}
                <ArrowUpRight size={12} />
              </a>
              <small className="world-evidence-era">Published: {source.date}</small>
              <p>{source.scope}</p>
            </section>
          ))
        ) : (
          <section className="inspector-section">
            <p>
              This is a generic teaching pattern. Select a company variant to inspect its supporting
              public sources. Unlabeled implementation choices are conceptual.
            </p>
          </section>
        )}
        <section className="inspector-section">
          <h3>HISTORICAL CONTEXT</h3>
          <p>{a.era}</p>
          <p>
            Last reviewed: {a.lastReviewed}. A publication documents its own scope and date; it does
            not verify the entire present-day company architecture.
          </p>
        </section>
      </div>
    </aside>
  );
}
