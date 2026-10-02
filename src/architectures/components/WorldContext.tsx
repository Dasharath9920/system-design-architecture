import { ArrowLeft } from 'lucide-react';
import { useUniverse } from '../../state/universe';
import { useWorld } from '../state';

export function WorldContext() {
  const world = useWorld();
  const depth = useUniverse((state) => state.depthId);
  if (!depth) return null;
  return (
    <div className="world-context world-deep-context">
      <button onClick={() => useUniverse.getState().explore(null)}>
        <ArrowLeft size={13} /> Return to {world.architecture?.company || 'architecture'}
      </button>
    </div>
  );
}
