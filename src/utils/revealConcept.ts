import { concepts } from '../knowledge/catalog';
import { presets } from '../scenarios/presets';
import { useUniverse } from '../state/universe';

/** Reveal every required parent and restore an overview that contains root results. */
export function revealConcept(id: string) {
  const concept = concepts[id];
  if (!concept) return;
  const state = useUniverse.getState();
  const outsidePreset =
    !concept.parent && !presets.find((p) => p.id === state.presetId)?.nodes.includes(id);
  state.set({
    depthId: concept.parent || null,
    selectedId: id,
    selectedEdge: null,
    searchOpen: false,
    focused: false,
    running: false,
    step: -1,
    ...(outsidePreset ? { presetId: 'production' } : {}),
  });
}
