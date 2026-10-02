import { lazy, Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Background,
  BackgroundVariant,
  MarkerType,
  ReactFlow,
  useReactFlow,
  useStore,
} from '@xyflow/react';
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Crosshair,
  Home,
  Maximize,
  Minus,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react';
import { concepts, getAncestors, relationships, rootIds } from './knowledge/catalog';
import { layoutArchitecture, NODE_HEIGHT, NODE_WIDTH } from './layout/architecture';
import { ArchitectureNode, type FlowNode } from './nodes/ArchitectureNode';
import { ArchitectureEdge, type FlowEdge } from './edges/ArchitectureEdge';
import { presets } from './scenarios/presets';
import { failureExplanations, getScenarios, trafficLevels } from './simulation/scenarios';
import { useUniverse } from './state/universe';
import { Header } from './components/Header';
import { SimulationControls } from './components/SimulationControls';
import { useReducedMotion } from './utils/useReducedMotion';
import { selectVisibleRelationships } from './graph/visibility';
import { getDetailScenario } from './simulation/details';
import { useWorld, restoreWorldRoute } from './architectures/state';
import {
  architectureConcepts,
  architectureRelationships,
  lensMatches,
} from './architectures/adapter';
import { compareArchitectures, compileFrames } from './architectures/engine';
import { WorldContext } from './architectures/components/WorldContext';
import { WorldPlayer } from './architectures/components/WorldPlayer';
import { WorldInspector, SourcesDrawer } from './architectures/components/WorldInspector';
import './architectures/world.css';
import { useMorphNodes } from './architectures/useMorphNodes';
import { useExperience } from './experience/preferences';
import { presentationAt } from './experience/presentation';
import type { NodeStory } from './experience/types';
import { ExitCinema } from './experience/ExperienceControls';
import { TracePanel } from './experience/TracePanel';
import { storyLayout } from './experience/storyLayout';
import './experience/experience.css';
import { useFlowCamera } from './experience/useFlowCamera';
import { legacyVisual } from './experience/legacy';
import { ChallengeSelector } from './challenges/ChallengeSelector';
import { ChallengePanel } from './challenges/ChallengePanel';
import { challengeActions } from './challenges/actions';
import { challenges } from './challenges/data';
import { useChallenge } from './challenges/state';

const ArchitectureExplorer = lazy(() =>
  import('./architectures/components/ArchitectureExplorer').then((m) => ({
    default: m.ArchitectureExplorer,
  })),
);

const nodeTypes = { architecture: ArchitectureNode };
const edgeTypes = { architecture: ArchitectureEdge };
const Inspector = lazy(() =>
  import('./components/Inspector').then((module) => ({ default: module.Inspector })),
);
const SearchPalette = lazy(() =>
  import('./components/SearchPalette').then((module) => ({ default: module.SearchPalette })),
);
export function App() {
  const state = useUniverse();
  const world = useWorld();
  const experience = useExperience();
  const challengeState = useChallenge();
  const activeChallenge = challenges.find((item) => item.id === challengeState.challengeId);
  const {
    depthId,
    selectedId,
    selectedEdge,
    focused,
    presetId,
    failedNodes,
    traffic,
    scenarioId,
    step: universeStep,
    showTelemetry,
    select,
    explore,
    set,
  } = state;
  const worldArchitecture = world.architecture;
  const worldActive = !!worldArchitecture && !depthId;
  const step = worldActive ? world.step : universeStep;
  const graphConcepts = useMemo(
    () => (worldActive ? architectureConcepts(worldArchitecture!) : concepts),
    [worldActive, worldArchitecture],
  );
  const worldScenario = worldArchitecture?.scenarios.find((s) => s.id === world.scenarioId);
  const worldFrames = useMemo(
    () => (worldScenario ? compileFrames(worldScenario, world.debug, world.sandbox) : []),
    [worldScenario, world.debug, world.sandbox],
  );
  const worldFrame = worldActive ? worldFrames[world.step] : undefined;
  const comparison = useMemo(
    () =>
      worldArchitecture && world.compare
        ? compareArchitectures(worldArchitecture, world.compare)
        : null,
    [worldArchitecture, world.compare],
  );
  const scenarioNodes = useMemo(() => new Set(worldFrames.flatMap((f) => f.nodes)), [worldFrames]);
  useEffect(() => {
    restoreWorldRoute();
    const resumeChallenge = window.setTimeout(() => {
      try {
        const saved = sessionStorage.getItem('sdu-challenge-active-difficulty');
        if (saved === 'easy' || saved === 'medium' || saved === 'hard')
          void useChallenge.getState().chooseDifficulty(saved);
      } catch {
        /* optional */
      }
    }, 0);
    window.addEventListener('popstate', restoreWorldRoute);
    return () => {
      window.clearTimeout(resumeChallenge);
      window.removeEventListener('popstate', restoreWorldRoute);
    };
  }, []);
  const flow = useReactFlow<FlowNode, FlowEdge>();
  const detailZoom = useStore((s) =>
    s.transform[2] > 1.05 ? 1.1 : s.transform[2] > 0.48 ? 1 : 0.4,
  );
  const reduced = useReducedMotion();
  const presentation = useMemo(
    () => presentationAt(worldFrames, world.starting ? -1 : world.step, world.completed),
    [worldFrames, world.step, world.completed, world.starting],
  );
  const blocked =
    world.sandbox.consumersPaused && !!worldFrame?.steps.some((s) => s.from === 'rw-events');
  const stories = useMemo(() => {
    const result: Record<string, NodeStory> = {};
    if (!worldActive || world.starting || blocked) return result;
    for (const s of worldFrame?.steps || []) {
      if (!s.visual) continue;
      const clock = {
        key: `${world.epoch}-${s.id}`,
        duration: s.duration,
        elapsed: world.elapsed,
        startedAt: world.startedAt,
        speed: world.speed,
        running: world.running && !experience.cameraMoving,
        reduced: reduced || world.speed === 0,
      };
      result[s.from] ??= { visual: s.visual, clock, receiving: false };
      result[s.to] = { visual: s.visual, clock, receiving: true };
      if (s.visual.client)
        result[s.visual.client.node] = { visual: s.visual, clock, receiving: true };
    }
    return result;
  }, [
    worldActive,
    world.starting,
    worldFrame,
    world.epoch,
    world.elapsed,
    world.startedAt,
    world.speed,
    world.running,
    experience.cameraMoving,
    reduced,
    blocked,
  ]);
  const graphRef = useRef<HTMLDivElement>(null);
  const lastDepthChange = useRef(0);
  const previousZoom = useRef(1);
  const preset = presets.find((p) => p.id === presetId) || presets[0];
  const depth = depthId ? concepts[depthId] : null;
  const ids = useMemo(
    () =>
      worldActive
        ? worldArchitecture!.nodes.map((n) => n.id)
        : depth
          ? [depth.id, ...depth.children.filter((id) => concepts[id])]
          : preset?.nodes || rootIds,
    [depth, preset, worldActive, worldArchitecture],
  );
  const detailScenario = getDetailScenario(depthId);
  const scenarios = useMemo(
    () => (detailScenario ? [detailScenario] : getScenarios(failedNodes, presetId)),
    [detailScenario, failedNodes, presetId],
  );
  const scenario = scenarios.find((s) => s.id === scenarioId) || scenarios[0];
  const legacyStories = useMemo(() => {
    const current = scenario?.steps[step];
    const result: Record<string, NodeStory> = {};
    if (worldActive || !current) return result;
    const visual = legacyVisual(
      current,
      relationships.find((r) => r.id === current.edges[0]),
    );
    const clock = {
      key: `legacy-${state.runEpoch}-${step}`,
      duration: Math.max(2400, current.duration || 0),
      elapsed: state.elapsed,
      startedAt: state.startedAt,
      speed: 1,
      running: state.running && !experience.cameraMoving,
      reduced,
    };
    current.nodes.forEach((id, i) => {
      result[id] = { visual, clock, receiving: i > 0 };
    });
    return result;
  }, [
    worldActive,
    scenario,
    step,
    state.runEpoch,
    state.elapsed,
    state.startedAt,
    state.running,
    experience.cameraMoving,
    reduced,
  ]);
  const currentStep = useMemo(
    () =>
      worldActive
        ? worldFrame && !world.starting
          ? { nodes: worldFrame.nodes, edges: worldFrame.edgeIds }
          : undefined
        : scenario?.steps[step],
    [worldActive, worldFrame, scenario, step, world.starting],
  );
  const allEdges = useMemo(() => {
    if (worldActive) return architectureRelationships(worldArchitecture!);
    const visible = new Set(ids);
    const actual = relationships.filter((e) => visible.has(e.source) && visible.has(e.target));
    if (depth) {
      for (const child of depth.children) {
        if (!visible.has(child) || actual.some((e) => e.target === child)) continue;
        actual.push({
          id: `contains-${depth.id}-${child}`,
          source: depth.id,
          target: child,
          kind: 'contains',
          label: concepts[child].tier === 'alternative' ? 'alternative' : 'includes',
          description: `${concepts[child].name} is an explorable part or implementation choice within ${depth.name}. This dotted line describes the architecture, not a runtime request.`,
        });
      }
    }
    return actual;
  }, [ids, depth, worldActive, worldArchitecture]);
  const visibleEdges = useMemo(
    () =>
      worldActive
        ? allEdges.filter(
            (e) =>
              e.kind !== 'telemetry' ||
              showTelemetry ||
              world.lens === 'observability' ||
              currentStep?.edges.includes(e.id),
          )
        : selectVisibleRelationships(allEdges, {
            depth: !!depth,
            preset: presetId,
            selected: selectedId,
            selectedRelationship: selectedEdge,
            telemetry: showTelemetry,
            active: currentStep?.edges || [],
          }),
    [
      allEdges,
      depth,
      presetId,
      showTelemetry,
      selectedId,
      selectedEdge,
      currentStep,
      worldActive,
      world.lens,
    ],
  );
  const layout = useMemo(() => {
    const base = layoutArchitecture(ids, allEdges, graphConcepts, depth ? 'detail' : 'overview');
    return worldActive ? storyLayout(base, worldArchitecture!, step >= 0 || world.completed) : base;
  }, [
    ids,
    allEdges,
    depth,
    graphConcepts,
    worldActive,
    worldArchitecture,
    step >= 0,
    world.completed,
  ]);
  const activeNodes = useMemo(() => new Set(currentStep?.nodes || []), [currentStep]);
  const connectedNodes = useMemo(() => {
    const connected = new Set([selectedId]);
    visibleEdges.forEach((e) => {
      if (e.source === selectedId) connected.add(e.target);
      if (e.target === selectedId) connected.add(e.source);
    });
    return connected;
  }, [selectedId, visibleEdges]);
  const level = trafficLevels[traffic] || trafficLevels[0];
  const nodes: FlowNode[] = useMemo(
    () =>
      ids.map((id) => ({
        id,
        type: 'architecture',
        position: layout.positions[id] || { x: 0, y: 0 },
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        selected: selectedId === id,
        data: {
          concept: graphConcepts[id],
          expanded: depthId === id,
          active: activeNodes.has(id),
          failed: failedNodes.includes(id),
          dimmed: worldActive
            ? (step >= 0 && !(world.starting ? scenarioNodes : activeNodes).has(id)) ||
              (world.lens === 'flow' && !scenarioNodes.has(id)) ||
              !lensMatches(graphConcepts[id].domain, world.lens)
            : focused && !connectedNodes.has(id),
          worldConceptId: worldActive
            ? worldArchitecture!.nodes.find((n) => n.id === id)?.conceptId
            : undefined,
          insight:
            worldActive && world.insights
              ? worldArchitecture!.nodes.find((n) => n.id === id)?.insight
              : undefined,
          comparison: worldActive ? comparison?.get(id) : undefined,
          family: worldActive ? worldArchitecture!.familyId : undefined,
          clientState: worldActive
            ? world.debug === 'offline' && id === 'rw-recipient' && !presentation.clients[id]
              ? 'offline'
              : presentation.clients[id]
            : undefined,
          story: worldActive ? stories[id] : legacyStories[id],
          visited: worldActive && presentation.visitedNodes.has(id),
          zoom: detailZoom,
          queue: Math.max(
            0,
            world.sandbox.burst +
              traffic * 2 +
              presentation.enqueued -
              presentation.consumed * world.sandbox.consumers,
          ),
          unavailable:
            worldActive &&
            ((id === 'rw-service' && world.sandbox.failedServer) ||
              (id === 'rw-recipient' && world.debug === 'offline') ||
              (id === 'rw-events' && world.sandbox.consumersPaused)),
          challengeSignal:
            challengeState.phase !== 'briefing' &&
            activeChallenge?.symptoms.some((symptom) => symptom.nodeId === id)
              ? challengeState.evaluation
                ? `${challengeState.evaluation.metrics[0]?.label} ${challengeState.evaluation.metrics[0]?.value}`
                : activeChallenge.symptoms.find((symptom) => symptom.nodeId === id)?.label
              : undefined,
          challengeModified: activeChallenge
            ? challengeState.appliedActions
                .map((actionId) => challengeActions[actionId])
                .find((action) => action?.nodeIds.includes(id))?.label
            : undefined,
          arrival: worldActive && !!worldFrame?.steps.some((s) => s.to === id),
          paused: experience.cameraMoving || (worldActive ? !world.running : !state.running),
          showDetails: detailZoom > 0.48,
          instances:
            id === 'services' || (worldActive && id === 'rw-service')
              ? level.serviceInstances + (worldActive ? world.sandbox.extraServers : 0)
              : undefined,
          replicas:
            id === 'database' || (worldActive && traffic > 1 && id === 'rw-database')
              ? level.dbReplicas
              : undefined,
          backlog: traffic > 1 && id === 'kafka' ? level.queueDepth : undefined,
          metric:
            traffic > 1
              ? id === 'services'
                ? `${level.serviceInstances} instances · autoscaled`
                : id === 'database'
                  ? `${level.dbReplicas} read replicas`
                  : id === 'cache'
                    ? `${Math.round(level.cacheHitRate * 100)}% illustrative hit rate`
                    : undefined
              : undefined,
        },
      })),
    [
      ids,
      depthId,
      layout,
      selectedId,
      activeNodes,
      failedNodes,
      focused,
      connectedNodes,
      detailZoom,
      traffic,
      level,
      graphConcepts,
      worldActive,
      worldArchitecture,
      world.lens,
      world.insights,
      world.running,
      experience.cameraMoving,
      activeChallenge,
      challengeState.appliedActions,
      worldFrame,
      scenarioNodes,
      step,
      comparison,
      world.starting,
      world.debug,
      world.sandbox,
      presentation,
      stories,
      legacyStories,
      state.running,
      experience.cameraMoving,
    ],
  );
  const displayedNodes = useMorphNodes(
    nodes,
    worldActive
      ? `${worldArchitecture!.familyId}/${worldArchitecture!.id}`
      : `universe:${presetId}:${depthId || 'root'}`,
    reduced,
  );
  const edges: FlowEdge[] = useMemo(
    () =>
      visibleEdges.map((r) => {
        const source = layout.positions[r.source];
        const target = layout.positions[r.target];
        const vertical = source && target && Math.abs(source.x - target.x) < NODE_WIDTH;
        const active = !!currentStep?.edges.includes(r.id);
        const sourceIndex = currentStep?.nodes.indexOf(r.source) ?? -1;
        const targetIndex = currentStep?.nodes.indexOf(r.target) ?? -1;
        return {
          id: r.id,
          source: r.source,
          target: r.target,
          sourceHandle: vertical
            ? target.y < source.y
              ? 'top-out'
              : 'bottom-out'
            : target.x < source.x
              ? 'left-out'
              : 'out',
          targetHandle: vertical
            ? target.y < source.y
              ? 'bottom-in'
              : 'top-in'
            : target.x < source.x
              ? 'right-in'
              : 'in',
          type: 'architecture',
          selected: selectedEdge === r.id,
          zIndex: active ? 3 : 0,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 11,
            height: 11,
            color: active
              ? experience.theme === 'dark'
                ? '#bca4f6'
                : '#7654c2'
              : experience.theme === 'dark'
                ? '#4b4e59'
                : '#c8cbd2',
          },
          data: {
            visited: worldActive && presentation.visitedEdges.has(r.id),
            connected: experience.hovered === r.source || experience.hovered === r.target,
            suppressed: experience.cameraMoving || (worldActive && (world.starting || blocked)),
            relationship:
              worldActive && active && worldFrame
                ? {
                    ...r,
                    label:
                      worldFrame.steps.find((s) => s.from === r.source && s.to === r.target)
                        ?.action || r.label,
                  }
                : r,
            active,
            reverse: !worldActive && sourceIndex > targetIndex && targetIndex >= 0,
            dimmed: worldActive
              ? (step >= 0 && !active) ||
                (!lensMatches(graphConcepts[r.source].domain, world.lens) &&
                  !lensMatches(graphConcepts[r.target].domain, world.lens))
              : focused && r.source !== selectedId && r.target !== selectedId,
            playback:
              worldActive && active && worldFrame
                ? {
                    key: `${world.epoch}-${worldFrame.id}`,
                    duration:
                      worldFrame.steps.find((s) => s.from === r.source && s.to === r.target)
                        ?.duration || worldFrame.duration,
                    elapsed: world.elapsed,
                    speed: world.speed,
                    running: world.running && !experience.cameraMoving,
                    startedAt: world.startedAt,
                    visual: worldFrame.steps.find((s) => s.from === r.source && s.to === r.target)
                      ?.visual,
                    kind:
                      worldFrame.steps.find((s) => s.from === r.source && s.to === r.target)
                        ?.edgeType || 'request',
                  }
                : !worldActive && active && scenario?.steps[step]
                  ? {
                      key: `legacy-${state.runEpoch}-${step}`,
                      duration: Math.max(2400, scenario.steps[step].duration || 0),
                      elapsed: state.elapsed,
                      startedAt: state.startedAt,
                      speed: 1,
                      running: state.running && !experience.cameraMoving,
                      kind: 'request' as const,
                      visual: legacyVisual(scenario.steps[step], r),
                    }
                  : undefined,
            showLabel:
              r.kind === 'contains' ||
              (selectedId !== null && (r.source === selectedId || r.target === selectedId)),
            reducedMotion: reduced || (worldActive && world.speed === 0),
          },
        };
      }),
    [
      visibleEdges,
      layout,
      currentStep,
      selectedEdge,
      selectedId,
      focused,
      reduced,
      worldActive,
      worldFrame,
      world.epoch,
      world.elapsed,
      world.speed,
      world.running,
      experience.cameraMoving,
      world.lens,
      step,
      graphConcepts,
      presentation,
      experience.hovered,
      world.starting,
      world.startedAt,
      blocked,
      scenario,
      state.runEpoch,
      state.elapsed,
      state.startedAt,
      state.running,
      experience.cameraMoving,
    ],
  );
  const flowCamera = useFlowCamera(graphRef, {
    architecture: worldActive
      ? `${worldArchitecture!.familyId}/${worldArchitecture!.id}`
      : `${presetId}/${depthId || 'root'}`,
    context: worldActive
      ? `${worldArchitecture!.familyId}/${worldArchitecture!.id}/${world.scenarioId}/${world.debug}`
      : `${presetId}/${depthId || 'root'}/${scenario.id}`,
    step,
    running: worldActive ? world.running : state.running,
    completed: worldActive ? world.completed : state.completed,
    nodeIds: worldActive ? worldFrame?.nodes || [] : currentStep?.nodes || [],
    positions: layout.positions,
    world: worldActive,
    deep: !!depth,
    reduced,
    instant: worldActive && world.speed === 0,
  });
  const fit = useCallback(() => {
    lastDepthChange.current = Date.now();
    return flow.fitView({
      nodes: ids.map((id) => ({ id })),
      padding: 0.13,
      minZoom: window.innerWidth <= 650 ? 0.3 : 0.2,
      maxZoom: 1.08,
      duration: reduced ? 0 : 550,
    });
  }, [flow, reduced, ids]);
  const frameArchitecture = useCallback(() => {
    if (flowCamera.ownsViewport()) return;
    void fit();
  }, [fit, flowCamera.ownsViewport]);
  useEffect(() => {
    lastDepthChange.current = Date.now();
    const timer = setTimeout(frameArchitecture, 80);
    return () => clearTimeout(timer);
  }, [depthId, presetId, frameArchitecture]);
  useEffect(() => {
    if (!focused || !selectedId || flowCamera.ownsViewport()) return;
    void flow.fitView({
      nodes: [{ id: selectedId }],
      padding: 1.7,
      maxZoom: 1.35,
      duration: reduced ? 0 : 550,
    });
  }, [focused, selectedId, flow, reduced]);
  useEffect(() => {
    if (!selectedId || focused || window.innerWidth <= 600 || flowCamera.ownsViewport()) return;
    const position = layout.positions[selectedId];
    if (!position) return;
    const timer = setTimeout(() => {
      const width = graphRef.current?.clientWidth || window.innerWidth;
      const height = graphRef.current?.clientHeight || 500;
      const zoom = Math.max(flow.getZoom(), 0.95);
      void flow.setViewport(
        {
          x: width * 0.44 - (position.x + NODE_WIDTH / 2) * zoom,
          y: height * 0.45 - (position.y + NODE_HEIGHT / 2) * zoom,
          zoom,
        },
        { duration: reduced ? 0 : 450 },
      );
    }, 220);
    return () => clearTimeout(timer);
  }, [selectedId, focused, layout, flow, reduced]);
  useEffect(() => {
    if (!graphRef.current) return;
    const observer = new ResizeObserver(() => {
      if (!state.selectedId) frameArchitecture();
    });
    observer.observe(graphRef.current);
    return () => observer.disconnect();
  }, [frameArchitecture, state.selectedId]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if ((event.target as HTMLElement).closest('[role="dialog"]')) return;
      const typing = (event.target as HTMLElement).matches(
        'input,textarea,select,[contenteditable="true"]',
      );
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        set({ searchOpen: !useUniverse.getState().searchOpen });
        return;
      }
      if (typing) return;
      if (event.key === 'Escape') {
        if (useExperience.getState().cinema) {
          useExperience.getState().set({ cinema: false });
          return;
        }
        if (useWorld.getState().sourcesOpen) {
          world.set({ sourcesOpen: false });
          return;
        }
        if (state.searchOpen) set({ searchOpen: false });
        else if (selectedId || selectedEdge)
          set({ selectedId: null, selectedEdge: null, focused: false });
        else if (depth) explore(depth.parent || null);
      }
      if (event.key.toLowerCase() === 'f' && !event.metaKey) {
        event.preventDefault();
        flowCamera.interrupt();
        void fit();
      }
      if (event.key === ' ' && !(event.target as HTMLElement).closest('button')) {
        event.preventDefault();
        if (worldActive) {
          world.toggle();
          return;
        }
        if (depth && !detailScenario) explore(null);
        set({
          running: !state.running,
          step: step < 0 ? 0 : step,
        });
      }
      if ((event.target as HTMLElement).closest('.react-flow__node')) return;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        flowCamera.interrupt();
        const v = flow.getViewport();
        void flow.setViewport(
          {
            ...v,
            x: v.x + (event.key === 'ArrowLeft' ? 80 : event.key === 'ArrowRight' ? -80 : 0),
            y: v.y + (event.key === 'ArrowUp' ? 80 : event.key === 'ArrowDown' ? -80 : 0),
          },
          { duration: reduced ? 0 : 150 },
        );
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [
    state.searchOpen,
    state.running,
    experience.cameraMoving,
    selectedId,
    selectedEdge,
    depth,
    detailScenario,
    scenario,
    step,
    flow,
    fit,
    set,
    explore,
    reduced,
    worldActive,
    world.toggle,
  ]);
  const navigateUp = () => explore(depth?.parent || null);
  const onZoomEnd = (zoom: number) => {
    const previous = previousZoom.current;
    previousZoom.current = zoom;
    if (Date.now() - lastDepthChange.current < 1100) return;
    if (depth && zoom < 0.36 && previous > zoom) {
      navigateUp();
      return;
    }
    if (selectedId && zoom > 1.65 && previous < zoom && concepts[selectedId]?.children.length) {
      explore(selectedId);
    }
  };
  const ancestors = depthId ? [...getAncestors(depthId), depthId] : [];
  return (
    <main
      className={`universe-app theme-${experience.theme} ${selectedId || selectedEdge ? 'has-inspector' : ''} ${step >= 0 ? 'is-visualizing' : ''} ${worldArchitecture ? 'world-mode' : ''} ${worldFrame?.parallel ? 'world-parallel' : ''} ${experience.cinema ? 'cinema-mode' : ''} ${experience.explain ? '' : 'explain-off'} ${reduced || (worldActive && world.speed === 0) ? 'motion-reduced' : ''} ${experience.motion === 'off' ? 'motion-off' : ''} ${world.completed ? 'flow-completed' : ''} ${activeChallenge ? 'challenge-mode' : ''} family-${worldArchitecture?.familyId || 'universe'}`}
    >
      <Header />
      <ChallengeSelector />
      <ChallengePanel />
      <ExitCinema />
      {worldArchitecture ? (
        <WorldContext />
      ) : depth ? (
        <div className="canvas-heading">
          <div className="breadcrumb">
            <button onClick={() => explore(null)}>
              <Home size={12} /> Universe
            </button>
            <ChevronRight size={12} />
            {ancestors.length
              ? ancestors.map((id, i) => (
                  <span key={id}>
                    <button
                      className={i === ancestors.length - 1 ? 'current' : ''}
                      onClick={() => explore(id)}
                    >
                      {concepts[id]?.name}
                    </button>
                    {i < ancestors.length - 1 && <ChevronRight size={11} />}
                  </span>
                ))
              : null}
          </div>
          <h1>Inside {depth.name}</h1>
        </div>
      ) : null}
      <div
        className="canvas-container"
        ref={graphRef}
        onPointerDownCapture={flowCamera.interrupt}
        onWheelCapture={flowCamera.interrupt}
      >
        <ReactFlow<FlowNode, FlowEdge>
          nodes={displayedNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          minZoom={0.08}
          maxZoom={2.2}
          colorMode={experience.theme}
          fitView
          fitViewOptions={{
            padding: 0.13,
            minZoom: window.innerWidth <= 650 ? 0.3 : 0.2,
            maxZoom: 1.08,
          }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          panOnDrag
          zoomOnScroll
          zoomOnPinch
          zoomOnDoubleClick={false}
          preventScrolling
          proOptions={{ hideAttribution: true }}
          onNodeClick={(_, node) => {
            flowCamera.interrupt();
            if (worldActive) world.pause();
            else set({ running: false });
            select(node.id);
          }}
          onNodeMouseEnter={(_, node) => experience.set({ hovered: node.id })}
          onNodeMouseLeave={() => experience.set({ hovered: null })}
          onNodeDoubleClick={(_, node) =>
            worldActive
              ? (world.pause(),
                explore(worldArchitecture!.nodes.find((n) => n.id === node.id)!.conceptId))
              : node.id === depthId
                ? explore(concepts[node.id].parent || null)
                : concepts[node.id]?.children.length
                  ? explore(node.id)
                  : set({ selectedId: node.id, focused: true })
          }
          onPaneClick={() => set({ selectedId: null, selectedEdge: null, focused: false })}
          onEdgeClick={(_, edge) => {
            flowCamera.interrupt();
            if (worldActive) world.pause();
            else set({ running: false });
            const relationship = allEdges.find((r) => r.id === edge.id);
            if (relationship?.kind === 'contains') select(relationship.target);
            else state.inspectEdge(edge.id);
          }}
          onMoveStart={(event) => {
            if (event) flowCamera.interrupt();
          }}
          onMoveEnd={(event, v) => {
            if (event) onZoomEnd(v.zoom);
          }}
          onlyRenderVisibleElements={ids.length > 80}
          aria-label="Interactive system architecture canvas"
        >
          <Background
            variant={BackgroundVariant.Dots}
            color={experience.theme === 'dark' ? '#292b34' : '#d7d9e0'}
            gap={26}
            size={0.65}
          />
        </ReactFlow>
      </div>
      <div className="canvas-tools">
        <button
          className="icon-button"
          aria-label="Zoom out"
          onClick={() => {
            flowCamera.interrupt();
            void flow
              .zoomOut({ duration: reduced ? 0 : 200 })
              .then(() => onZoomEnd(flow.getZoom()));
          }}
        >
          <Minus size={16} />
        </button>
        <button
          className="icon-button"
          aria-label="Zoom in"
          onClick={() => {
            flowCamera.interrupt();
            void flow.zoomIn({ duration: reduced ? 0 : 200 }).then(() => onZoomEnd(flow.getZoom()));
          }}
        >
          <Plus size={16} />
        </button>
        <button
          className="icon-button"
          aria-label="Fit architecture"
          title="Fit architecture (F)"
          onClick={() => {
            flowCamera.interrupt();
            void fit();
          }}
        >
          <Maximize size={16} />
        </button>
        <button
          className="icon-button"
          aria-label="Reset universe"
          title="Reset universe"
          onClick={() => {
            if (worldArchitecture) world.leave();
            else state.reset();
            void fit();
          }}
        >
          <RotateCcw size={14} />
        </button>
      </div>
      {focused && (
        <button className="focus-indicator" onClick={() => set({ focused: false })}>
          <Crosshair size={13} /> Focus mode <X size={12} />
        </button>
      )}
      {failedNodes.length > 0 && (
        <div className="failure-notice" role="status">
          <span className="failure-dot" />
          <div>
            <strong>
              {failureExplanations[failedNodes.at(-1)!]?.title || 'Component degraded'}
            </strong>
            <p>
              {failureExplanations[failedNodes.at(-1)!]?.description ||
                'Visualize a request to explore the impact.'}
            </p>
          </div>
          <button onClick={() => set({ failedNodes: [], step: -1, running: false })}>
            <RotateCcw size={12} /> Recover
          </button>
        </div>
      )}
      {traffic > 1 && !failedNodes.length && !worldArchitecture && (
        <div className="scale-notice">
          <Check size={13} />
          {level.serviceInstances} service instances <span>·</span> {level.dbReplicas} read replicas{' '}
          <span>·</span> illustrative scale <ArrowUpRight size={12} />
        </div>
      )}
      <Suspense
        fallback={
          <div className="loading-context" role="status">
            Opening context…
          </div>
        }
      >
        {(selectedId || selectedEdge) && (worldActive ? <WorldInspector /> : <Inspector />)}
        {worldArchitecture && world.sourcesOpen && <SourcesDrawer />}
        {world.explorerOpen && <ArchitectureExplorer />}
        {state.searchOpen && <SearchPalette />}
      </Suspense>
      {worldActive ? <WorldPlayer /> : <SimulationControls />}
      {worldActive && (experience.trace || world.lens === 'observability') && (
        <TracePanel frames={worldFrames} />
      )}
      {world.error && !world.explorerOpen && (
        <div className="world-route-error" role="alert">
          {world.error}
          <button onClick={() => world.set({ explorerOpen: true, error: null })}>
            Explore architectures
          </button>
        </div>
      )}
    </main>
  );
}
