import { useState } from 'react';
import {
  ChevronDown,
  Command,
  Ellipsis,
  Expand,
  HelpCircle,
  Moon,
  Search,
  ScanLine,
  Sun,
  X,
} from 'lucide-react';
import { getFamily } from '../architectures/registry';
import { useWorld } from '../architectures/state';
import type { Lens } from '../architectures/types';
import { useChallenge } from '../challenges/state';
import { useExperience, type MotionPreference } from '../experience/preferences';
import { presets } from '../scenarios/presets';
import { useUniverse } from '../state/universe';
import { UniverseLogo } from './Icon';

export function Header() {
  const universe = useUniverse();
  const world = useWorld();
  const challenge = useChallenge();
  const experience = useExperience();
  const [moreOpen, setMoreOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const preset = presets.find((item) => item.id === universe.presetId) || presets[0];
  const family = world.architecture ? getFamily(world.architecture.familyId) : null;
  const architectureName = world.architecture
    ? `${family?.name || world.architecture.familyId} · ${world.architecture.company}`
    : preset?.name || 'Production system';
  const explore = () => {
    if (challenge.challengeId) challenge.exit();
    else world.leave();
  };

  return (
    <>
      <header className="app-header">
        <a
          className="brand"
          href="#"
          aria-label="System Design Universe home"
          onClick={(event) => {
            event.preventDefault();
            explore();
          }}
        >
          <span className="brand-mark">
            <UniverseLogo />
          </span>
          <strong>
            System Design <span>Universe</span>
          </strong>
        </a>
        <nav className="primary-nav" aria-label="Primary navigation">
          <button className={!challenge.challengeId ? 'active' : ''} onClick={explore}>
            Explore
          </button>
          <button
            className={challenge.challengeId ? 'active' : ''}
            aria-label="Challenges"
            onClick={challenge.openSelector}
          >
            Challenges
          </button>
        </nav>
        <div className="header-actions">
          <button
            className="search-trigger"
            aria-label="Find anything"
            onClick={() => universe.set({ searchOpen: true })}
          >
            <Search size={15} />
            <span>Search concepts, systems…</span>
            <kbd>
              <Command size={10} /> K
            </kbd>
          </button>
          <button
            className={`preset-trigger ${world.explorerOpen ? 'active' : ''}`}
            aria-label="Choose architecture preset"
            onClick={() => world.set({ explorerOpen: !world.explorerOpen })}
            aria-expanded={world.explorerOpen}
          >
            <span>{architectureName}</span>
            <ChevronDown size={13} />
          </button>
          <button
            className="icon-button theme-toggle"
            aria-label={`Switch to ${experience.theme === 'light' ? 'dark' : 'light'} theme`}
            title={`Use ${experience.theme === 'light' ? 'dark' : 'light'} theme`}
            onClick={() => experience.setTheme(experience.theme === 'light' ? 'dark' : 'light')}
          >
            {experience.theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <button
            className="icon-button more-trigger"
            aria-label="More options"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((open) => !open)}
          >
            <Ellipsis size={19} />
          </button>
        </div>
      </header>
      {moreOpen && (
        <div className="nav-more-menu" role="menu" aria-label="More options">
          {world.architecture && (
            <>
              <button
                role="menuitem"
                onClick={() => {
                  world.pause();
                  world.set({ sourcesOpen: true });
                  setMoreOpen(false);
                }}
              >
                Sources
              </button>
              <label>
                <span>View</span>
                <select
                  aria-label="Architecture lens"
                  value={world.lens}
                  onChange={(event) => {
                    world.set({ lens: event.target.value as Lens });
                    setMoreOpen(false);
                  }}
                >
                  <option value="architecture">Architecture</option>
                  <option value="flow">Flow path</option>
                  <option value="data">Data</option>
                  <option value="reliability">Reliability</option>
                  <option value="infrastructure">Infrastructure</option>
                  <option value="observability">Observability</option>
                </select>
              </label>
              {family && (
                <label>
                  <span>Compare</span>
                  <select
                    aria-label="Compare architecture"
                    value={world.compare?.id || ''}
                    onChange={(event) => {
                      void world.setCompare(event.target.value);
                      setMoreOpen(false);
                    }}
                  >
                    <option value="">Off</option>
                    {[
                      { id: 'generic', name: 'Generic Pattern', available: true },
                      ...family.companies,
                    ]
                      .filter((item) => item.available && item.id !== world.architecture?.id)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              <button
                role="menuitem"
                onClick={() => {
                  experience.set({ trace: !experience.trace });
                  setMoreOpen(false);
                }}
              >
                <ScanLine size={14} /> View trace
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  experience.set({ cinema: !experience.cinema });
                  setMoreOpen(false);
                }}
              >
                <Expand size={14} /> Cinema mode
              </button>
            </>
          )}
          <label>
            <span>Motion</span>
            <select
              aria-label="Motion preference"
              value={experience.motion}
              onChange={(event) => {
                experience.setMotion(event.target.value as MotionPreference);
                setMoreOpen(false);
              }}
            >
              <option value="system">System</option>
              <option value="full">Full</option>
              <option value="reduced">Reduced</option>
              <option value="off">Off</option>
            </select>
          </label>
          <button
            role="menuitem"
            onClick={() => {
              setHelpOpen(true);
              setMoreOpen(false);
            }}
          >
            <HelpCircle size={14} /> Keyboard shortcuts
          </button>
        </div>
      )}
      {helpOpen && (
        <div className="help-panel">
          <div className="popover-heading">
            Keyboard shortcuts
            <button
              className="icon-button"
              aria-label="Close keyboard shortcuts"
              onClick={() => setHelpOpen(false)}
            >
              <X size={14} />
            </button>
          </div>
          <dl>
            <div>
              <dt>Search</dt>
              <dd>⌘ / Ctrl K</dd>
            </div>
            <div>
              <dt>Fit architecture</dt>
              <dd>F</dd>
            </div>
            <div>
              <dt>Play or pause</dt>
              <dd>Space</dd>
            </div>
            <div>
              <dt>Pan canvas</dt>
              <dd>Arrow keys</dd>
            </div>
            <div>
              <dt>Go back</dt>
              <dd>Esc</dd>
            </div>
          </dl>
        </div>
      )}
    </>
  );
}
