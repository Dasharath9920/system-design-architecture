import { useEffect, useRef, useState } from 'react';
import type { FlowNode } from '../nodes/ArchitectureNode';

/** Retain departing cards briefly while stable IDs move on the same React Flow instance. */
export function useMorphNodes(nodes: FlowNode[], architectureKey: string | null, reduced: boolean) {
  const previous = useRef(nodes);
  const previousKey = useRef(architectureKey);
  const latest = useRef(nodes);
  latest.current = nodes;
  const [departing, setDeparting] = useState<FlowNode[]>([]);
  useEffect(() => {
    const changed = previousKey.current !== architectureKey;
    const canMorph = changed && previousKey.current && architectureKey && !reduced;
    previousKey.current = architectureKey;
    if (!canMorph) {
      setDeparting([]);
      return;
    }
    const nextIds = new Set(latest.current.map((n) => n.id));
    setDeparting(
      previous.current
        .filter((n) => !nextIds.has(n.id))
        .map((n) => ({
          ...n,
          selected: false,
          selectable: false,
          focusable: false,
          zIndex: -1,
          data: { ...n.data, active: false, arrival: false, departing: true },
        })),
    );
    const timer = window.setTimeout(() => setDeparting([]), 750);
    return () => window.clearTimeout(timer);
  }, [architectureKey, reduced]);
  useEffect(() => {
    previous.current = nodes;
  }, [nodes]);
  return architectureKey
    ? [...nodes, ...departing.filter((n) => !nodes.some((current) => current.id === n.id))]
    : nodes;
}
