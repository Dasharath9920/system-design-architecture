import { create } from 'zustand';
export type MotionPreference = 'system' | 'full' | 'reduced' | 'off';
export type ThemePreference = 'light' | 'dark';

function savedTheme(): ThemePreference {
  try {
    return localStorage.getItem('sdu-theme') === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

const initialTheme = savedTheme();
if (typeof document !== 'undefined') document.documentElement.dataset.theme = initialTheme;

function savedMotion(): MotionPreference {
  try {
    const value = localStorage.getItem('sdu-motion');
    return ['full', 'reduced', 'off'].includes(value || '')
      ? (value as MotionPreference)
      : 'system';
  } catch {
    return 'system';
  }
}
export const useExperience = create<{
  theme: ThemePreference;
  motion: MotionPreference;
  cinema: boolean;
  explain: boolean;
  trace: boolean;
  autoFollow: boolean;
  cameraMoving: boolean;
  hovered: string | null;
  setTheme: (theme: ThemePreference) => void;
  setMotion: (motion: MotionPreference) => void;
  set: (
    value: Partial<{
      cinema: boolean;
      explain: boolean;
      trace: boolean;
      autoFollow: boolean;
      cameraMoving: boolean;
      hovered: string | null;
    }>,
  ) => void;
}>((set) => ({
  theme: initialTheme,
  motion: savedMotion(),
  cinema: false,
  explain: true,
  trace: false,
  autoFollow: true,
  cameraMoving: false,
  hovered: null,
  set,
  setTheme: (theme) => {
    set({ theme });
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('sdu-theme', theme);
    } catch {
      /* Private browsing still supports in-session preferences. */
    }
  },
  setMotion: (motion) => {
    set({ motion });
    try {
      localStorage.setItem('sdu-motion', motion);
    } catch {
      /* Private browsing still supports in-session preferences. */
    }
  },
}));
