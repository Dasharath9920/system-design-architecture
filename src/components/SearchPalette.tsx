import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, CornerDownLeft, Search, X } from 'lucide-react';
import { concepts, getAncestors, searchConcepts } from '../knowledge/catalog';
import { presets } from '../scenarios/presets';
import { useUniverse } from '../state/universe';
import { Icon } from './Icon';
import { revealConcept } from '../utils/revealConcept';
import { searchArchitectures } from '../architectures/search';
import { useWorld } from '../architectures/state';
export function SearchPalette() {
  const open = useUniverse((s) => s.searchOpen);
  const set = useUniverse((s) => s.set);
  const setPreset = useUniverse((s) => s.setPreset);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const architectureResults = useMemo(() => searchArchitectures(query), [query]);
  const results = useMemo(
    () =>
      query.trim()
        ? searchConcepts(query).slice(0, 9)
        : ['cache', 'database', 'kafka', 'services', 'infrastructure', 'observability']
            .map((id) => concepts[id])
            .filter(Boolean),
    [query],
  );
  const intent = /netflix|video|youtube/i.test(query)
    ? 'video'
    : /chat|whatsapp|collaborat/i.test(query)
      ? 'chat'
      : /shop|commerce|order|payment/i.test(query)
        ? 'ecommerce'
        : /shorten|tinyurl/i.test(query)
          ? 'url-shortener'
          : /analytics|warehouse/i.test(query)
            ? 'analytics'
            : null;
  const preset = architectureResults.length ? undefined : presets.find((p) => p.id === intent);
  useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
      setTimeout(() => input.current?.focus(), 30);
    }
  }, [open]);
  const choose = (id: string) => {
    if (useWorld.getState().architecture) useWorld.getState().leave();
    revealConcept(id);
  };
  const chooseArchitecture = (i: number) => {
    const result = architectureResults[i];
    if (result) void useWorld.getState().activate(result.family, result.company, result.scenario);
  };
  if (!open) return null;
  return (
    <div
      className="search-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) set({ searchOpen: false });
      }}
    >
      <div
        className="search-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Search the universe"
        onKeyDown={(e) => {
          if (e.key === 'Escape') set({ searchOpen: false });
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setIndex((i) => Math.min(i + 1, results.length + architectureResults.length - 1));
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setIndex((i) => Math.max(0, i - 1));
          }
          if (e.key === 'Enter') {
            if (index < architectureResults.length) chooseArchitecture(index);
            else if (preset) {
              setPreset(preset.id);
              set({ searchOpen: false });
            } else if (results[index - architectureResults.length])
              choose(results[index - architectureResults.length].id);
          }
          if (e.key === 'Tab') {
            e.preventDefault();
            input.current?.focus();
          }
        }}
      >
        <div className="search-input-wrap">
          <Search size={20} />
          <input
            ref={input}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            placeholder="Find a concept, technology, or architecture…"
            aria-label="Search concepts"
          />
          <button
            className="icon-button"
            onClick={() => set({ searchOpen: false })}
            aria-label="Close search"
          >
            <X size={16} />
          </button>
        </div>
        <div className="search-results">
          <div className="search-label">
            {query ? 'EXPLORE THE UNIVERSE' : 'A FEW PLACES TO START'}
            <span>{Object.keys(concepts).length} concepts</span>
          </div>
          {preset && (
            <button
              className="search-result preset-result"
              onClick={() => {
                setPreset(preset.id);
                set({ searchOpen: false });
              }}
            >
              <span className="search-result-icon">
                <Icon name={preset.icon} />
              </span>
              <span>
                <strong>Explore {preset.name}</strong>
                <small>{preset.description}</small>
              </span>
              <CornerDownLeft size={15} />
            </button>
          )}
          {architectureResults.map((result, i) => (
            <button
              key={`${result.family}-${result.company}`}
              className={`search-result preset-result ${index === i ? 'active' : ''}`}
              onMouseEnter={() => setIndex(i)}
              onClick={() => chooseArchitecture(i)}
            >
              <span className="search-result-icon">
                <Icon name={result.icon} />
              </span>
              <span>
                <strong>Explore {result.label}</strong>
                <small>{result.detail}</small>
              </span>
              <CornerDownLeft size={15} />
            </button>
          ))}
          {results.map((c, i) => (
            <button
              key={c.id}
              className={`search-result domain-${c.domain} ${i + architectureResults.length === index ? 'active' : ''}`}
              onMouseEnter={() => setIndex(i + architectureResults.length)}
              onClick={() => choose(c.id)}
            >
              <span className="search-result-icon">
                <Icon name={c.icon} size={19} />
              </span>
              <span>
                <strong>{c.name}</strong>
                <small>
                  {getAncestors(c.id)
                    .map((id) => concepts[id]?.name)
                    .join(' / ') || c.subtitle}
                </small>
              </span>
              <span className="search-kind">{c.kind}</span>
              {i + architectureResults.length === index && <CornerDownLeft size={13} />}
            </button>
          ))}
          {!results.length && !preset && !architectureResults.length && (
            <div className="search-empty">
              <Search size={28} />
              <strong>No matching concepts yet</strong>
              <p>Try a broader term, like “replication”, “cache”, or “security”.</p>
            </div>
          )}
        </div>
        <div className="search-footer">
          <span>
            <kbd>
              <ArrowUp size={10} />
            </kbd>
            <kbd>
              <ArrowDown size={10} />
            </kbd>{' '}
            to navigate
          </span>
          <span>
            <kbd>↵</kbd> to explore
          </span>
          <span>
            <kbd>esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
}
