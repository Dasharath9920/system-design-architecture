import { create } from 'zustand';
import type { XRayId } from './registry';
interface XRayState {
  request: {
    id: XRayId;
    layer: string;
    sourceId?: string;
    label: string;
    returnFocus?: HTMLElement | null;
  } | null;
  open: (id: XRayId, layer?: string, sourceId?: string, label?: string) => void;
  close: () => void;
}
export const useXRay = create<XRayState>((set, get) => ({
  request: null,
  open: (id, layer = 'overview', sourceId, label = 'Architecture') =>
    set({
      request: {
        id,
        layer,
        sourceId,
        label,
        returnFocus:
          get().request?.returnFocus ||
          (typeof document !== 'undefined' ? (document.activeElement as HTMLElement) : null),
      },
    }),
  close: () => set({ request: null }),
}));
