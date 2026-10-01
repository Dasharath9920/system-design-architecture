import { ArrowLeft, BookOpen, ChevronDown, Sparkles } from 'lucide-react';
import { useWorld } from '../state';
import { getFamily } from '../registry';
import { useUniverse } from '../../state/universe';
import type { Lens } from '../types';
import { FamilyMark } from '../../experience/ExperienceControls';
const lenses: Lens[] = [
  'architecture',
  'flow',
  'data',
  'reliability',
  'infrastructure',
  'observability',
];
const lensDescriptions: Record<Lens, string> = {
  architecture: 'The full system and its boundaries.',
  flow: 'The selected scenario’s participating components.',
  data: 'State ownership, stores, and asynchronous events.',
  reliability: 'Durability, consistency, authorization, and recovery boundaries.',
  infrastructure: 'Regional placement and network entry points.',
  observability: 'Cross-cutting operational visibility. Inspect nodes for signals and trade-offs.',
};
export function WorldContext() {
  const w = useWorld();
  const depth = useUniverse((s) => s.depthId);
  const a = w.architecture!;
  const f = getFamily(a.familyId)!;
  return (
    <div className="world-context">
      <div className="world-context-line">
        <button
          className="subtle-button"
          onClick={() => w.leave()}
          aria-label="Back to component universe"
        >
          <ArrowLeft size={13} />
          <span>Universe</span>
        </button>
        <span className="world-context-divider">/</span>
        <FamilyMark family={a.familyId} name={a.company} />
        <strong>{a.company === 'Generic Pattern' ? f.name : a.company}</strong>
        <span className="world-family-tag">{f.name}</span>
        <button
          className="world-source-button"
          onClick={() => {
            w.pause();
            w.set({ sourcesOpen: true });
          }}
        >
          <BookOpen size={13} /> Evidence & sources
        </button>
      </div>
      {depth ? (
        <button className="world-return" onClick={() => useUniverse.getState().explore(null)}>
          <ArrowLeft size={13} /> Return to {a.company} architecture
        </button>
      ) : (
        <>
          <div className="world-context-options">
            <div className="world-variants" aria-label="Architecture variants">
              {[
                { id: 'generic', name: 'Generic Pattern', available: true },
                ...f.companies.filter((c) => c.available),
              ].map((c) => (
                <button
                  key={c.id}
                  className={a.id === c.id ? 'active' : ''}
                  onClick={() => void w.activate(f.id, c.id, w.scenarioId)}
                >
                  {c.name}
                </button>
              ))}
              <button
                aria-label="Explore more implementations"
                onClick={() => w.set({ explorerOpen: true })}
              >
                <ChevronDown size={12} />
              </button>
            </div>
            <div className="world-lens-controls">
              <label>
                <span className="sr-only">Architecture lens</span>
                <select
                  aria-label="Architecture lens"
                  value={w.lens}
                  onChange={(e) => w.set({ lens: e.target.value as Lens })}
                >
                  {lenses.map((l) => (
                    <option key={l} value={l}>
                      {l[0].toUpperCase() + l.slice(1)} lens
                    </option>
                  ))}
                </select>
              </label>
              <button
                className={w.insights ? 'active' : ''}
                aria-pressed={w.insights}
                onClick={() => w.set({ insights: !w.insights })}
              >
                <Sparkles size={12} /> Insights
              </button>
              <select
                aria-label="Compare architecture"
                value={w.compare?.id || ''}
                onChange={(e) => void w.setCompare(e.target.value)}
              >
                <option value="">Compare with…</option>
                {[{ id: 'generic', name: 'Generic Pattern', available: true }, ...f.companies]
                  .filter((c) => c.available && c.id !== a.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          {w.compare ? (
            <div className="world-lens-caption">
              Comparing with {w.compare.company} <span>○ Shared</span>
              <span className="compare-different">◈ Different decision / evidence</span>
              <span>＋ Only in this view</span>
            </div>
          ) : (
            w.lens !== 'architecture' && (
              <div className="world-lens-caption">{lensDescriptions[w.lens]}</div>
            )
          )}
        </>
      )}
    </div>
  );
}
