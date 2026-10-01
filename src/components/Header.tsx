import { useState } from 'react';
import { ChevronDown, Command, GitBranch, HelpCircle, Search, X } from 'lucide-react';
import { presets } from '../scenarios/presets';
import { useUniverse } from '../state/universe';
import { UniverseLogo } from './Icon';
import { useWorld } from '../architectures/state';

export function Header() {
  const { presetId, set } = useUniverse();
  const world = useWorld();
  const menu = world.explorerOpen;
  const [help, setHelp] = useState(false);
  const preset = presets.find((p) => p.id === presetId) || presets[0];
  return (
    <>
      <header className="app-header">
        <a
          className="brand"
          href="#"
          aria-label="System Design Universe home"
          onClick={(e) => {
            e.preventDefault();
            world.leave();
          }}
        >
          <span className="brand-mark">
            <UniverseLogo />
          </span>
          <span>
            <strong>
              SYSTEM DESIGN <span>UNIVERSE</span>
            </strong>
            <small>Explore how everything connects.</small>
          </span>
        </a>
        <div className="header-actions">
          <span className="explorer-tag">
            <span className="live-dot" /> INTERACTIVE EXPLORER
          </span>
          <button
            className="search-trigger"
            aria-label="Find anything"
            onClick={() => set({ searchOpen: true })}
          >
            <Search size={15} />
            <span>Find anything</span>
            <kbd>
              <Command size={10} /> K
            </kbd>
          </button>
          <div className="preset-wrap">
            <button
              className={`preset-trigger ${menu ? 'active' : ''}`}
              aria-label="Choose architecture preset"
              onClick={() => world.set({ explorerOpen: !menu })}
              aria-expanded={menu}
            >
              <GitBranch size={15} />
              <span>{world.architecture?.company || preset?.name || 'Production system'}</span>
              <ChevronDown size={13} />
            </button>
          </div>
          <button
            className="icon-button help-trigger"
            aria-label="Open keyboard shortcuts"
            onClick={() => setHelp(!help)}
          >
            <HelpCircle size={18} />
          </button>
        </div>
      </header>
      {help && (
        <div className="help-panel">
          <div className="popover-heading">
            MAKE YOURSELF AT HOME
            <button
              className="icon-button"
              aria-label="Close keyboard shortcuts"
              onClick={() => setHelp(false)}
            >
              <X size={14} />
            </button>
          </div>
          <p>Follow connections. Open a component. Go deeper.</p>
          <dl>
            <div>
              <dt>Explore the canvas</dt>
              <dd>Drag</dd>
            </div>
            <div>
              <dt>Zoom in and out</dt>
              <dd>Scroll / pinch</dd>
            </div>
            <div>
              <dt>Inspect a component</dt>
              <dd>Click</dd>
            </div>
            <div>
              <dt>Explore its architecture</dt>
              <dd>Double-click / +</dd>
            </div>
            <div>
              <dt>Search the universe</dt>
              <dd>
                <kbd>⌘ / Ctrl</kbd> <kbd>K</kbd>
              </dd>
            </div>
            <div>
              <dt>Fit architecture</dt>
              <dd>
                <kbd>F</kbd>
              </dd>
            </div>
            <div>
              <dt>Go up one level</dt>
              <dd>
                <kbd>Esc</kbd>
              </dd>
            </div>
            <div>
              <dt>Pan with keyboard</dt>
              <dd>
                <kbd>Arrow keys</kbd>
              </dd>
            </div>
            <div>
              <dt>Play / pause request</dt>
              <dd>
                <kbd>Space</kbd>
              </dd>
            </div>
          </dl>
          <p className="help-note">
            This is one possible production architecture. Components and capacity depend on your
            workload.
          </p>
        </div>
      )}
    </>
  );
}
