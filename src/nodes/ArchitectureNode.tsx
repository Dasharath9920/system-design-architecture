import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { ChevronRight, Minus, Plus, TriangleAlert, Wrench } from 'lucide-react';
import type { Concept } from '../knowledge/types';
import { Icon } from '../components/Icon';
import { useUniverse } from '../state/universe';
import { useWorld } from '../architectures/state';
import type { NodeStory } from '../experience/types';
import { useArrival } from '../experience/useAnimationClock';
import { ClientPreview } from '../experience/ClientPreview';
import { NodeActivity, InstancePool } from '../experience/NodeActivity';

export type ArchitectureNodeData = {
  concept: Concept;
  active: boolean;
  failed: boolean;
  dimmed: boolean;
  showDetails: boolean;
  expanded?: boolean;
  metric?: string;
  instances?: number;
  replicas?: number;
  backlog?: number;
  worldConceptId?: string;
  insight?: string;
  comparison?: string;
  arrival?: boolean;
  paused?: boolean;
  departing?: boolean;
  family?: string;
  clientState?: string;
  story?: NodeStory;
  visited?: boolean;
  zoom?: number;
  bootDelay?: number;
  queue?: number;
  unavailable?: boolean;
  challengeSignal?: string;
  challengeModified?: string;
  challengeActionable?: boolean;
  challengeInvestigate?: boolean;
  challengeSpotlight?: boolean;
  challengeDimmed?: boolean;
};
export type FlowNode = Node<ArchitectureNodeData, 'architecture'>;
export const ArchitectureNode = memo(function ArchitectureNode({
  data,
  selected,
}: NodeProps<FlowNode>) {
  const {
    concept,
    active,
    failed,
    dimmed,
    showDetails,
    expanded,
    metric,
    instances,
    replicas,
    backlog,
  } = data;
  const explore = useUniverse((s) => s.explore);
  const arrived = useArrival(data.story?.clock);
  const preview =
    !!data.family &&
    ['rw-client', 'rw-recipient', 'rw-device', 'rw-driver', 'rw-peer'].includes(concept.id);
  const changed = data.story?.visual.client;
  const clientState = arrived && changed?.node === concept.id ? changed.state : data.clientState;
  const effect = data.story;
  const idleQueue =
    !effect && ['rw-events', 'kafka', 'apache-kafka'].includes(concept.id) && showDetails;
  return (
    <div
      className={`architecture-node domain-${concept.domain} ${selected ? 'is-selected' : ''} ${active ? 'is-active' : ''} ${failed ? 'is-failed' : ''} ${dimmed ? 'is-dimmed' : ''} ${!showDetails ? 'is-compact' : ''} ${replicas ? 'has-replicas' : ''} ${data.worldConceptId ? 'world-node' : ''} ${data.comparison ? `compare-${data.comparison}` : ''} ${arrived && effect?.receiving ? 'node-arrived' : ''} ${effect && !arrived ? 'node-processing' : ''} ${data.paused ? 'world-paused' : ''} ${data.departing ? 'world-departing' : ''} ${preview ? 'has-client-preview' : ''} ${data.visited ? 'node-visited' : ''} ${effect || idleQueue ? 'has-node-activity' : ''} ${(data.zoom || 1) > 1.05 ? 'node-near' : ''} ${data.unavailable ? 'node-unavailable' : ''} ${data.challengeSignal ? 'challenge-problem' : ''} ${data.challengeModified ? 'challenge-modified' : ''} ${data.challengeActionable ? 'challenge-actionable' : ''} ${data.challengeInvestigate ? 'challenge-investigate' : ''} ${data.challengeSpotlight ? 'challenge-spotlight' : ''} ${data.challengeDimmed ? 'challenge-dimmed' : ''}`}
      data-testid={`concept-${concept.id}`}
      style={{ animationDelay: data.bootDelay !== undefined ? `${data.bootDelay}ms` : undefined }}
    >
      <Handle type="target" position={Position.Left} id="in" />
      <Handle type="source" position={Position.Right} id="out" />
      <Handle type="target" position={Position.Top} id="top-in" />
      <Handle type="source" position={Position.Bottom} id="bottom-out" />
      <Handle type="source" position={Position.Top} id="top-out" />
      <Handle type="target" position={Position.Bottom} id="bottom-in" />
      <Handle type="source" position={Position.Left} id="left-out" />
      <Handle type="target" position={Position.Right} id="right-in" />
      <div className="node-top">
        <span className="node-icon">
          <Icon name={concept.icon} size={22} />
        </span>
        {instances ? (
          <InstancePool count={instances} failed={failed || data.unavailable} active={active} />
        ) : replicas ? (
          <span className="instance-array replicas" aria-label={`${replicas} read replicas`}>
            {Array.from({ length: replicas }, (_, i) => (
              <i key={i} />
            ))}
          </span>
        ) : backlog ? (
          <span className="backlog-meter">
            <i />
            <i />
            <i />
            <i />
            <span>{backlog}</span>
          </span>
        ) : null}
        {failed && <TriangleAlert size={13} className="failed-icon" />}
      </div>
      <div className="node-name">{concept.name}</div>
      {data.challengeActionable && (
        <span className="challenge-modify-affordance">
          <Wrench size={10} /> Modify
        </span>
      )}
      {data.challengeSignal && (
        <div className="challenge-node-signal">
          {data.challengeSignal}
          <small>SIMULATED</small>
        </div>
      )}
      {data.challengeModified && (
        <span className="challenge-node-modified">{data.challengeModified}</span>
      )}
      {preview && (
        <ClientPreview family={data.family!} state={clientState} active={active && !data.paused} />
      )}
      {!preview && effect && (
        <NodeActivity
          key={effect.clock.key}
          kind={effect.visual.arrival}
          caption={
            effect.receiving
              ? arrived
                ? effect.visual.caption
                : 'PROCESSING'
              : effect.visual.caption
          }
          arrived={arrived}
          paused={!effect.clock.running}
          reduced={effect.clock.reduced}
          queue={data.queue}
        />
      )}
      {idleQueue && (
        <NodeActivity
          kind="enqueue"
          caption={data.unavailable ? 'CONSUMERS PAUSED' : `${data.queue || 0} PENDING · SIMULATED`}
          arrived={false}
          paused
          reduced
          queue={data.queue}
        />
      )}
      <div className="node-bottom">
        <span>{failed ? 'Degraded · explore recovery' : metric || concept.subtitle}</span>
        {concept.children.length > 0 ? (
          <button
            className="expand-node nodrag nopan"
            aria-label={`${expanded ? 'Collapse' : 'Explore'} ${concept.name}`}
            title={
              expanded
                ? 'Return to parent architecture'
                : `Explore ${concept.children.length} concepts`
            }
            onClick={(e) => {
              e.stopPropagation();
              if (data.worldConceptId) useWorld.getState().pause();
              explore(data.worldConceptId || (expanded ? concept.parent || null : concept.id));
            }}
          >
            {expanded ? <Minus size={11} /> : <Plus size={11} />}
          </button>
        ) : null}
      </div>
      {data.insight && <span className="world-node-insight">{data.insight}</span>}
      {data.comparison === 'different' && (
        <span className="world-node-comparison" title="Different decision or supporting evidence">
          ◈
        </span>
      )}
      <div className="node-tooltip" role="tooltip">
        <strong>{concept.name}</strong>
        <span>{concept.description}</span>
        <small>
          Click to inspect{' '}
          {concept.children.length > 0 && (
            <>
              <span>·</span> Double-click to explore <ChevronRight size={10} />
            </>
          )}
        </small>
      </div>
    </div>
  );
});
