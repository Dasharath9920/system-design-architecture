import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Search, X } from 'lucide-react';
import { families, getFamily } from '../registry';
import { useWorld } from '../state';
import { useUniverse } from '../../state/universe';
import { presets } from '../../scenarios/presets';
import { Icon } from '../../components/Icon';
import { useDialogFocus } from './useDialogFocus';
export function ArchitectureExplorer() {
  const world = useWorld();
  const [familyId, setFamily] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, () => world.set({ explorerOpen: false }));
  const family = familyId ? getFamily(familyId) : null;
  useEffect(() => {
    ref.current?.querySelector('input')?.focus();
  }, [familyId]);
  const term = query.trim().toLowerCase();
  return (
    <div
      className="search-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) world.set({ explorerOpen: false });
      }}
    >
      <div
        ref={ref}
        className="search-palette architecture-explorer"
        role="dialog"
        aria-modal="true"
        aria-label="Explore real-world architectures"
        onKeyDown={(e) => {
          if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) return;
          const options = [
            ...ref.current!.querySelectorAll<HTMLButtonElement>('[data-option]:not(:disabled)'),
          ];
          const current = options.indexOf(document.activeElement as HTMLButtonElement);
          if (e.key === 'Enter' && current < 0) {
            e.preventDefault();
            options[0]?.click();
          } else if (e.key !== 'Enter') {
            e.preventDefault();
            options[
              (current + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length
            ]?.focus();
          }
        }}
      >
        <div className="world-explorer-title">
          <span>EXPLORE REAL-WORLD ARCHITECTURES</span>
          <button
            className="icon-button"
            aria-label="Close architecture explorer"
            onClick={() => world.set({ explorerOpen: false })}
          >
            <X size={17} />
          </button>
        </div>
        <div className="search-input-wrap">
          <Search size={19} />
          <input
            aria-label="Search architectures"
            placeholder="Search a problem, company, or flow…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="world-explorer-scroll">
          {family && (
            <button
              className="world-family-back"
              onClick={() => {
                setFamily(null);
                setQuery('');
              }}
            >
              <ArrowLeft size={14} /> All architectures <span>/ {family.name}</span>
            </button>
          )}
          {family ? (
            <>
              <p className="world-family-description">{family.description}</p>
              {[{ id: 'generic', name: 'Generic Pattern', available: true }, ...family.companies]
                .filter((c) => !term || c.name.toLowerCase().includes(term))
                .map((c) => (
                  <button
                    data-option
                    key={c.id}
                    disabled={!c.available}
                    className="search-result"
                    onClick={() => void world.activate(family.id, c.id)}
                  >
                    <span className="search-result-icon">
                      <Icon name={family.icon} />
                    </span>
                    <span>
                      <strong>{c.name}</strong>
                      <small>
                        {c.id === 'generic'
                          ? 'Start with the general pattern'
                          : c.available
                            ? 'Explore flows, decisions, and evidence'
                            : 'Research planned · no company diagram yet'}
                      </small>
                    </span>
                    {world.architecture?.id === c.id &&
                    world.architecture.familyId === family.id ? (
                      <Check size={16} />
                    ) : (
                      <ArrowRight size={14} />
                    )}
                  </button>
                ))}
              <div className="world-challenges">
                <span>THE HARD PARTS</span>
                {family.keyChallenges.map((c) => (
                  <small key={c}>{c}</small>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="search-label">TEN PROBLEMS. MANY ENGINEERING DECISIONS.</div>
              {families
                .filter(
                  (f) =>
                    !term ||
                    [
                      f.name,
                      f.description,
                      ...f.companies.map((c) => c.name),
                      ...f.scenarioNames,
                      ...f.keyChallenges,
                    ]
                      .join(' ')
                      .toLowerCase()
                      .includes(term),
                )
                .map((f) => (
                  <button
                    data-option
                    className="search-result"
                    key={f.id}
                    onClick={() => {
                      setFamily(f.id);
                      setQuery('');
                    }}
                  >
                    <span className="search-result-icon">
                      <Icon name={f.icon} />
                    </span>
                    <span>
                      <strong>{f.name}</strong>
                      <small>
                        {f.companies
                          .filter((c) => c.available)
                          .map((c) => c.name)
                          .join(' · ')}
                      </small>
                    </span>
                    <ArrowRight size={15} />
                  </button>
                ))}
              <div className="search-label world-classic-label">THE COMPONENT UNIVERSE</div>
              {presets
                .filter((p) => !term || p.name.toLowerCase().includes(term))
                .map((p) => (
                  <button
                    data-option
                    className="search-result world-classic"
                    key={p.id}
                    onClick={() => {
                      world.leave();
                      useUniverse.getState().setPreset(p.id);
                    }}
                  >
                    <span className="search-result-icon">
                      <Icon name={p.icon} />
                    </span>
                    <span>
                      <strong>{p.name}</strong>
                      <small>{p.description}</small>
                    </span>
                  </button>
                ))}
            </>
          )}
        </div>
        {world.error && (
          <p role="alert" className="world-error">
            {world.error}
          </p>
        )}
        <div className="search-footer">
          <span>↑ ↓ to navigate · ↵ to explore</span>
          <span>Generic first. Evidence always.</span>
        </div>
      </div>
    </div>
  );
}
