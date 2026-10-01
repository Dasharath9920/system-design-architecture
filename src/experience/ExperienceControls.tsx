import { useEffect, useState } from 'react';
import { Expand, MessageSquareText, ScanLine, X } from 'lucide-react';
import { useExperience, type MotionPreference } from './preferences';
import { useReducedMotion } from '../utils/useReducedMotion';

export function ExperienceControls() {
  const e = useExperience();
  return (
    <div className="experience-controls">
      <AutoFollowControl />
      <button
        aria-label="Explain while playing"
        aria-pressed={e.explain}
        onClick={() => e.set({ explain: !e.explain })}
      >
        <MessageSquareText size={12} />
        <span>Explain</span>
        <i className={e.explain ? 'on' : ''} />
      </button>
      <button
        aria-label="Cinema mode"
        aria-pressed={e.cinema}
        onClick={() => e.set({ cinema: !e.cinema })}
      >
        <Expand size={12} />
        <span>Cinema</span>
      </button>
      <button
        aria-label="View simulated trace"
        aria-pressed={e.trace}
        onClick={() => e.set({ trace: !e.trace })}
      >
        <ScanLine size={12} />
        <span>Trace</span>
      </button>
      <label>
        Motion{' '}
        <select
          aria-label="Motion preference"
          value={e.motion}
          onChange={(event) => e.setMotion(event.target.value as MotionPreference)}
        >
          <option value="system">System</option>
          <option value="full">Full</option>
          <option value="reduced">Reduced</option>
          <option value="off">Off</option>
        </select>
      </label>
    </div>
  );
}
export function AutoFollowControl() {
  const enabled = useExperience((s) => s.autoFollow);
  return (
    <button
      className="auto-follow-control"
      aria-label="Auto follow flow"
      aria-pressed={enabled}
      onClick={() => useExperience.getState().set({ autoFollow: !enabled })}
    >
      Auto Follow {enabled ? '✓' : '—'}
    </button>
  );
}
export function ExitCinema() {
  const cinema = useExperience((s) => s.cinema);
  return cinema ? (
    <button className="exit-cinema" onClick={() => useExperience.getState().set({ cinema: false })}>
      <X size={13} /> Exit cinema <kbd>Esc</kbd>
    </button>
  ) : null;
}
export function FamilyMark({ family, name }: { family: string; name: string }) {
  const marks: Record<string, string> = {
    social: '◎',
    chat: '··',
    video: '▶',
    ride: '⌖',
    commerce: '□',
    search: '⌕',
    files: '▤',
    music: '♫',
    gaming: '⌘',
    payments: '↔',
  };
  return (
    <span
      className={`family-mark mark-${family}`}
      title={`${name} · illustrative product mark`}
      aria-hidden="true"
    >
      {name === 'Generic Pattern' ? marks[family] : name.replace('-style', '').slice(0, 1)}
      <i />
    </span>
  );
}
export function useBoot(enabled: boolean) {
  const reduced = useReducedMotion();
  const [eligible] = useState(() => {
    try {
      return !sessionStorage.getItem('sdu-visited') && !localStorage.getItem('sdu-visited');
    } catch {
      return true;
    }
  });
  const [boot, setBoot] = useState(eligible && enabled && !reduced);
  useEffect(() => {
    if (!eligible || !enabled || reduced) {
      setBoot(false);
      return;
    }
    const stop = () => {
      setBoot(false);
      try {
        localStorage.setItem('sdu-visited', '1');
        sessionStorage.setItem('sdu-visited', '1');
      } catch {
        /* Optional visit memory. */
      }
    };
    const timer = setTimeout(stop, 2250);
    window.addEventListener('click', stop, { once: true });
    window.addEventListener('keydown', stop, { once: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', stop);
      window.removeEventListener('keydown', stop);
    };
  }, [eligible, enabled, reduced]);
  return boot && enabled && !reduced;
}
export function BootCaption() {
  return (
    <div className="boot-caption" role="status">
      <i />
      <span>Architecture online</span>
      <small>Routing · services · data</small>
    </div>
  );
}
