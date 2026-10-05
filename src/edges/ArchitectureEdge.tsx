import { memo, useState } from 'react';
import type { PacketKind } from '../architectures/types';
import type { StepVisual } from '../experience/types';
import { PacketTravel } from '../experience/PacketTravel';
import { useWorld } from '../architectures/state';
import { useUniverse } from '../state/universe';
import { useExperience } from '../experience/preferences';
import { concepts } from '../knowledge/catalog';
import { useChallenge } from '../challenges/state';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
  type Edge,
} from '@xyflow/react';
import type { Relationship } from '../knowledge/types';
export type FlowEdge = Edge<
  {
    relationship: Relationship;
    active: boolean;
    reverse: boolean;
    dimmed: boolean;
    showLabel: boolean;
    reducedMotion: boolean;
    visited?: boolean;
    connected?: boolean;
    boot?: boolean;
    suppressed?: boolean;
    challengeActionable?: boolean;
    challengeInvestigate?: boolean;
    challengeSpotlight?: boolean;
    playback?: {
      key: string;
      duration: number;
      elapsed: number;
      speed: number;
      running: boolean;
      kind: PacketKind;
      startedAt?: number;
      visual?: StepVisual;
    };
  },
  'architecture'
>;
export const ArchitectureEdge = memo(function ArchitectureEdge(props: EdgeProps<FlowEdge>) {
  const [hovered, setHovered] = useState(false);
  const theme = useExperience((state) => state.theme);
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected } =
    props;
  const [path, x, y] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 14,
    offset: 23,
  });
  const kind = data?.relationship.kind;
  const dashed = [
    'event',
    'stream',
    'publish',
    'consume',
    'replication',
    'telemetry',
    'CDC',
    'backup',
    'synchronization',
    'contains',
    'alternative',
  ].includes(kind || '');
  const structural = kind === 'contains' || kind === 'alternative';
  const architecture = useWorld.getState().architecture;
  const sourceName =
    architecture?.nodes.find((node) => node.id === data?.relationship.source)?.label ||
    concepts[data?.relationship.source || '']?.name ||
    data?.relationship.source;
  const targetName =
    architecture?.nodes.find((node) => node.id === data?.relationship.target)?.label ||
    concepts[data?.relationship.target || '']?.name ||
    data?.relationship.target;
  const edgeType =
    kind === 'telemetry' ? 'TELEMETRY' : dashed && !structural ? 'ASYNC EVENT' : 'REQUEST';
  const color =
    theme === 'dark'
      ? data?.active
        ? '#bca4f6'
        : selected || hovered || data?.connected
          ? '#a78cdb'
          : data?.visited
            ? '#6e657e'
            : structural
              ? '#353640'
              : kind === 'telemetry'
                ? '#40505a'
                : dashed
                  ? '#5d5140'
                  : '#454852'
      : data?.active
        ? '#7654c2'
        : selected || hovered || data?.connected
          ? '#6d4fb1'
          : data?.visited
            ? '#9186a4'
            : structural
              ? '#c8c2d2'
              : kind === 'telemetry'
                ? '#8fadb4'
                : dashed
                  ? '#c5a574'
                  : '#b8bdc8';
  return (
    <g
      tabIndex={data?.challengeActionable ? 0 : undefined}
      role={data?.challengeActionable ? 'button' : undefined}
      aria-label={
        data?.challengeActionable ? `Modify flow: ${sourceName} to ${targetName}` : undefined
      }
      className={`architecture-edge ${data?.active ? 'edge-active' : ''} ${data?.visited ? 'edge-visited' : ''} ${hovered ? 'edge-hovered' : ''} ${data?.boot ? 'edge-boot' : ''} ${data?.challengeActionable ? 'challenge-actionable-edge' : ''} ${data?.challengeSpotlight ? 'challenge-spotlight-edge' : ''}`}
      style={{
        opacity:
          data?.dimmed && !data.visited && !hovered && !data.connected
            ? data.challengeInvestigate
              ? 0.8
              : 0.5
            : 1,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onKeyDown={(event) => {
        if (data?.challengeActionable && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          event.stopPropagation();
          useChallenge.getState().openTarget(id, 'edge');
        }
      }}
    >
      <BaseEdge
        id={id}
        path={path}
        interactionWidth={18}
        style={{
          stroke: color,
          strokeWidth:
            data?.active || selected || (hovered && data?.challengeActionable) ? 2 : 1.25,
          strokeDasharray: structural ? '2 5' : dashed ? '4 5' : undefined,
        }}
        markerStart={data?.reverse ? props.markerEnd : undefined}
        markerEnd={data?.reverse ? undefined : props.markerEnd}
      />
      {data?.active && !data.reducedMotion && data.playback && !data.suppressed && (
        <PacketTravel
          key={data.playback.key}
          path={path}
          reverse={data.reverse}
          clock={{
            ...data.playback,
            startedAt: data.playback.startedAt || performance.now(),
            reduced: false,
          }}
          visual={
            data.playback.visual || {
              packet: 'request',
              payload: data.relationship.label,
              arrival: 'process',
              caption: 'REQUEST',
              phase: 'REQUEST',
              latencyMs: 12,
            }
          }
          onInspect={() => {
            useWorld.getState().pause();
            useUniverse.getState().set({ running: false });
            useWorld.getState().set({
              packetInspection: {
                edge: id,
                label: data.playback?.visual?.payload || data.relationship.label,
                kind: data.playback?.visual?.packet || 'request',
              },
            });
            useUniverse.getState().inspectEdge(id);
          }}
        />
      )}
      {data?.active && !data.reducedMotion && !data.playback && (
        <circle r="3.5" fill="#dbceff" className="request-packet">
          <animateMotion
            dur="1.1s"
            repeatCount="indefinite"
            path={path}
            keyPoints={data.reverse ? '1;0' : '0;1'}
            keyTimes="0;1"
            calcMode="linear"
          />
        </circle>
      )}
      {(data?.showLabel || selected || data?.active || hovered) && (
        <EdgeLabelRenderer>
          <span
            className={`edge-label ${data?.active ? 'active' : ''}`}
            style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
          >
            {(hovered || selected) && !data?.active ? (
              <>
                <b>{data?.challengeActionable ? 'MODIFY FLOW' : edgeType}</b>
                <span>
                  {sourceName} → {targetName}
                </span>
                <small>{data?.relationship.label}</small>
              </>
            ) : (
              data?.relationship.label
            )}
          </span>
        </EdgeLabelRenderer>
      )}
    </g>
  );
});
