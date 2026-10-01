import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react';
import { useReactFlow, getViewportForBounds, type Viewport, type XYPosition } from '@xyflow/react';
import { flowStepBounds, focusFlowStep } from './flowCamera';
import { useExperience } from './preferences';
import { useWorld } from '../architectures/state';
import { useUniverse } from '../state/universe';

type Options = {
  architecture: string;
  context: string;
  step: number;
  running: boolean;
  completed: boolean;
  nodeIds: string[];
  positions: Record<string, XYPosition>;
  world: boolean;
  deep: boolean;
  reduced: boolean;
  instant: boolean;
};
const ease = (t: number) => t * t * (3 - 2 * t);

/** One viewport owner for classic, deep and real-world playback. No per-frame React state. */
export function useFlowCamera(container: RefObject<HTMLDivElement | null>, options: Options) {
  const flow = useReactFlow();
  const enabled = useExperience((s) => s.autoFollow);
  const live = useRef(options);
  live.current = options;
  const previous = useRef({ ...options, step: -1, running: false, completed: false });
  const original = useRef<Viewport | null>(null);
  const capturedGeometry = useRef({
    positions: options.positions,
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const interrupted = useRef(false);
  const generation = useRef(0);
  const returning = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clockHeld = useRef(false);

  const releaseClock = useCallback((finishIntro = false) => {
    if (!clockHeld.current) return;
    clockHeld.current = false;
    const now = performance.now();
    if (live.current.world)
      useWorld.getState().set({ startedAt: now, ...(finishIntro ? { starting: false } : {}) });
    else useUniverse.getState().set({ startedAt: now });
    useExperience.getState().set({ cameraMoving: false });
  }, []);
  const cancel = useCallback(() => {
    generation.current++;
    if (returning.current) clearTimeout(returning.current);
    returning.current = null;
    void flow.setViewport(flow.getViewport(), { duration: 0 });
    releaseClock();
  }, [flow, releaseClock]);
  const interrupt = useCallback(() => {
    interrupted.current = true;
    cancel();
  }, [cancel]);
  const ownsViewport = useCallback(() => live.current.step >= 0 || original.current !== null, []);

  const focus = useCallback(
    (newStep = false) => {
      const s = live.current,
        el = container.current;
      if (
        !el ||
        !s.running ||
        s.step < 0 ||
        interrupted.current ||
        !useExperience.getState().autoFollow
      )
        return;
      const bounds = flowStepBounds(s.nodeIds, s.positions);
      if (!bounds) return;
      const target = focusFlowStep(
        bounds,
        { width: el.clientWidth, height: el.clientHeight },
        flow.getViewport(),
        s.deep,
      );
      if (!target) return;
      cancel();
      const token = generation.current;
      const duration = s.reduced || s.instant ? 0 : 550;
      if (duration) {
        const store = s.world ? useWorld.getState() : useUniverse.getState();
        const elapsed =
          newStep || (s.world && useWorld.getState().starting)
            ? 0
            : store.elapsed +
              (performance.now() - store.startedAt) *
                (s.world ? useWorld.getState().speed || 1 : 1);
        store.set({ elapsed, startedAt: performance.now() });
        clockHeld.current = true;
        useExperience.getState().set({ cameraMoving: true });
      }
      void flow.setViewport(target, { duration, ease, interpolate: 'linear' }).then(() => {
        if (token === generation.current) releaseClock(true);
      });
    },
    [flow, container, cancel, releaseClock],
  );
  const restore = useCallback(
    (natural: boolean) => {
      cancel();
      let saved = original.current;
      if (!saved) return;
      if (natural && (!useExperience.getState().autoFollow || interrupted.current)) {
        original.current = null;
        return;
      }
      // Restore the exact transform unless browser size or architecture geometry changed.
      const el = container.current;
      const captured = capturedGeometry.current;
      const changed =
        captured.width !== window.innerWidth ||
        captured.height !== window.innerHeight ||
        Object.entries(live.current.positions).some(
          ([id, p]) => p.x !== captured.positions[id]?.x || p.y !== captured.positions[id]?.y,
        );
      if (el && changed) {
        const bounds = flow.getNodesBounds(flow.getNodes());
        saved = getViewportForBounds(bounds, el.clientWidth, el.clientHeight, 0.08, 1.08, 0.13);
      }
      const destination = saved;
      const token = generation.current;
      const run = () => {
        returning.current = null;
        void flow
          .setViewport(destination, {
            duration: live.current.reduced ? 0 : natural ? 750 : 550,
            ease,
            interpolate: 'linear',
          })
          .then(() => {
            if (token === generation.current) original.current = null;
          });
      };
      if (natural && !live.current.reduced) returning.current = setTimeout(run, 1000);
      else run();
    },
    [flow, cancel, container],
  );

  useLayoutEffect(() => {
    const prev = previous.current,
      s = live.current;
    previous.current = { ...s };
    if (prev.context !== s.context) {
      cancel();
      interrupted.current = false;
      if (original.current && prev.architecture === s.architecture && s.step < 0) {
        restore(false);
        return;
      }
      original.current = null;
    }
    if (s.step >= 0 && (prev.step < 0 || prev.context !== s.context)) {
      // Canvas geometry may resize for the player; its transform is still the pre-flow view.
      if (!original.current) {
        original.current = { ...flow.getViewport() };
        capturedGeometry.current = {
          positions: prev.positions,
          width: window.innerWidth,
          height: window.innerHeight,
        };
      }
      interrupted.current = false;
      if (s.running && enabled) focus(true);
      return;
    }
    if (s.step < 0 && original.current && (prev.step >= 0 || (prev.completed && !s.completed))) {
      restore(s.completed);
      return;
    }
    if (!enabled || !s.running) {
      cancel();
      return;
    }
    if (!prev.running) {
      // Pause keeps this frame exactly where the user left it; follow the NEXT step.
      interrupted.current = false;
      return;
    }
    if (s.step !== prev.step) focus(true);
  }, [
    options.context,
    options.step,
    options.running,
    options.completed,
    enabled,
    flow,
    focus,
    cancel,
    restore,
  ]);

  useLayoutEffect(() => {
    const el = container.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout>;
    let width = el.clientWidth,
      height = el.clientHeight;
    const observer = new ResizeObserver(() => {
      if (width === el.clientWidth && height === el.clientHeight) return;
      width = el.clientWidth;
      height = el.clientHeight;
      clearTimeout(timer);
      timer = setTimeout(() => focus(), 100);
    });
    observer.observe(el);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [container, focus]);
  useLayoutEffect(
    () => () => {
      cancel();
      original.current = null;
    },
    [cancel],
  );
  return { interrupt, ownsViewport };
}
