import { create } from 'zustand';
export type MotionPreference = 'system' | 'full' | 'reduced' | 'off';
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
  motion: MotionPreference;
  cinema: boolean;
  explain: boolean;
  trace: boolean;
  autoFollow: boolean;
  cameraMoving: boolean;
  hovered: string | null;
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
  motion: savedMotion(),
  cinema: false,
  explain: true,
  trace: false,
  autoFollow: true,
  cameraMoving: false,
  hovered: null,
  set,
  setMotion: (motion) => {
    set({ motion });
    try {
      localStorage.setItem('sdu-motion', motion);
    } catch {
      /* Private browsing still supports in-session preferences. */
    }
  },
}));
