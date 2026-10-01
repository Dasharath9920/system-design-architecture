import type { Concept, Relationship } from '../knowledge/types';

export const NODE_WIDTH = 188;
export const NODE_HEIGHT = 104;

const COLUMN_GAP = 76;
const ROW_GAP = 20;
const MARGIN_X = 48;
const MARGIN_TOP = 40;
const MARGIN_BOTTOM = 20;
const MAX_ROWS = 4;

export interface LayoutPosition {
  x: number;
  y: number;
}
export interface LayoutBand {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  domain: string;
}
export interface ArchitectureLayout {
  positions: Record<string, LayoutPosition>;
  width: number;
  height: number;
  bands: LayoutBand[];
}

// These are architectural layers, not coordinates assigned to individual nodes.
const STAGES = [
  { label: '01 CLIENT', domain: 'client' },
  { label: '02 EDGE & NETWORK', domain: 'network' },
  { label: '03 TRAFFIC & ACCESS', domain: 'security' },
  { label: '04 APPLICATION', domain: 'compute' },
  { label: '05 DATA & EVENTS', domain: 'data' },
  { label: '06 DELIVERY', domain: 'events' },
];
const DOMAIN_STAGE: Record<Concept['domain'], number> = {
  client: 0,
  network: 1,
  security: 2,
  compute: 3,
  data: 4,
  events: 4,
  operations: 6,
};

// Replies and cross-cutting control traffic should not turn a request graph
// into one enormous strongly connected component.
const CONTROL_EDGES = new Set<Relationship['kind']>([
  'response',
  'telemetry',
  'health check',
  'cache fill',
  'failover',
  'synchronization',
]);

interface FlowGraph {
  incoming: Map<string, Set<string>>;
  outgoing: Map<string, Set<string>>;
}

function flowGraph(ids: string[], relationships: Relationship[]): FlowGraph {
  const incoming = new Map(ids.map((id) => [id, new Set<string>()]));
  const outgoing = new Map(ids.map((id) => [id, new Set<string>()]));
  for (const edge of relationships) {
    if (edge.source === edge.target || CONTROL_EDGES.has(edge.kind)) continue;
    if (!incoming.has(edge.target) || !outgoing.has(edge.source)) continue;
    incoming.get(edge.target)!.add(edge.source);
    outgoing.get(edge.source)!.add(edge.target);
  }
  return { incoming, outgoing };
}

/** Condense cycles before finding longest-path ranks in the resulting DAG. */
function topologicalRanks(ids: string[], graph: FlowGraph): Map<string, number> {
  let cursor = 0;
  const indices = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const stacked = new Set<string>();
  const components: string[][] = [];
  const visit = (id: string) => {
    indices.set(id, cursor);
    low.set(id, cursor++);
    stack.push(id);
    stacked.add(id);
    for (const target of graph.outgoing.get(id)!) {
      if (!indices.has(target)) {
        visit(target);
        low.set(id, Math.min(low.get(id)!, low.get(target)!));
      } else if (stacked.has(target)) {
        low.set(id, Math.min(low.get(id)!, indices.get(target)!));
      }
    }
    if (low.get(id) !== indices.get(id)) return;
    const component: string[] = [];
    let member: string;
    do {
      member = stack.pop()!;
      stacked.delete(member);
      component.push(member);
    } while (member !== id);
    components.push(component);
  };
  for (const id of ids) if (!indices.has(id)) visit(id);

  const componentOf = new Map<string, number>();
  components.forEach((members, index) => members.forEach((id) => componentOf.set(id, index)));
  const successors = components.map(() => new Set<number>());
  const indegree = components.map(() => 0);
  for (const id of ids) {
    const source = componentOf.get(id)!;
    for (const targetId of graph.outgoing.get(id)!) {
      const target = componentOf.get(targetId)!;
      if (source !== target && !successors[source].has(target)) {
        successors[source].add(target);
        indegree[target]++;
      }
    }
  }
  const queue = indegree.flatMap((value, index) => (value === 0 ? [index] : []));
  const ranks = components.map(() => 0);
  for (let index = 0; index < queue.length; index++) {
    const source = queue[index];
    for (const target of successors[source]) {
      ranks[target] = Math.max(ranks[target], ranks[source] + 1);
      if (--indegree[target] === 0) queue.push(target);
    }
  }
  return new Map(ids.map((id) => [id, ranks[componentOf.get(id)!]]));
}

/** A few stable barycenter sweeps reduce crossings without moving layers. */
function orderColumns(
  columns: string[][],
  graph: FlowGraph,
  order: Map<string, number>,
): string[][] {
  const result = columns.map((column) => [...column]);
  const layer = new Map<string, number>();
  result.forEach((column, index) => column.forEach((id) => layer.set(id, index)));
  const normalizedY = new Map<string, number>();
  const update = (column: string[]) =>
    column.forEach((id, row) => {
      normalizedY.set(id, (row + 0.5) / column.length);
    });
  result.forEach(update);
  for (let sweep = 0; sweep < 4; sweep++) {
    const forward = sweep % 2 === 0;
    const indices = result.map((_, index) => index);
    if (!forward) indices.reverse();
    for (const index of indices) {
      const column = result[index];
      const scores = new Map<string, number>();
      for (const id of column) {
        const neighbors = forward ? graph.incoming.get(id)! : graph.outgoing.get(id)!;
        const ys: number[] = [];
        for (const neighbor of neighbors) {
          const neighborLayer = layer.get(neighbor);
          if (
            neighborLayer === undefined ||
            (forward ? neighborLayer >= index : neighborLayer <= index)
          )
            continue;
          ys.push(normalizedY.get(neighbor)!);
        }
        scores.set(
          id,
          ys.length ? ys.reduce((sum, value) => sum + value, 0) / ys.length : normalizedY.get(id)!,
        );
      }
      column.sort((a, b) => scores.get(a)! - scores.get(b)! || order.get(a)! - order.get(b)!);
      update(column);
    }
  }
  return result;
}

function splitBalanced(ids: string[]): string[][] {
  if (!ids.length) return [];
  const count = Math.ceil(ids.length / MAX_ROWS);
  const columns: string[][] = [];
  let offset = 0;
  for (let column = 0; column < count; column++) {
    const size = Math.ceil((ids.length - offset) / (count - column));
    columns.push(ids.slice(offset, offset + size));
    offset += size;
  }
  return columns;
}

function stackHeight(count: number): number {
  return count > 0 ? count * NODE_HEIGHT + (count - 1) * ROW_GAP : 0;
}

function positionColumns(
  columns: string[][],
  top: number,
  positions: Record<string, LayoutPosition>,
): number {
  const contentHeight = stackHeight(Math.max(0, ...columns.map((column) => column.length)));
  columns.forEach((column, index) => {
    const offsetY = top + (contentHeight - stackHeight(column.length)) / 2;
    column.forEach((id, row) => {
      positions[id] = {
        x: MARGIN_X + index * (NODE_WIDTH + COLUMN_GAP),
        y: offsetY + row * (NODE_HEIGHT + ROW_GAP),
      };
    });
  });
  return contentHeight;
}

/** Pure, deterministic layout for the currently visible level of the universe. */
export function layoutArchitecture(
  ids: string[],
  relationships: Relationship[],
  concepts: Record<string, Concept>,
  mode: 'overview' | 'detail' = 'overview',
): ArchitectureLayout {
  const visible = [...new Set(ids)].filter((id) =>
    Object.prototype.hasOwnProperty.call(concepts, id),
  );
  if (!visible.length) return { positions: {}, width: 0, height: 0, bands: [] };
  const positions: Record<string, LayoutPosition> = {};
  const order = new Map(visible.map((id, index) => [id, index]));
  const graph = flowGraph(visible, relationships);

  if (mode === 'detail') {
    const ranks = topologicalRanks(visible, graph);
    const groups = new Map<number, string[]>();
    for (const id of visible) {
      const rank = ranks.get(id)!;
      if (!groups.has(rank)) groups.set(rank, []);
      groups.get(rank)!.push(id);
    }
    const columns = [...groups.entries()]
      .sort(([a], [b]) => a - b)
      .flatMap(([, group]) => splitBalanced(group));
    const ordered = orderColumns(columns, graph, order);
    const contentHeight = positionColumns(ordered, MARGIN_TOP, positions);
    return {
      positions,
      width: MARGIN_X * 2 + columns.length * NODE_WIDTH + (columns.length - 1) * COLUMN_GAP,
      height: MARGIN_TOP + contentHeight + MARGIN_BOTTOM,
      bands: [],
    };
  }

  const stages = STAGES.map(() => [] as string[]);
  const operations: string[] = [];
  for (const id of visible) {
    const concept = concepts[id];
    const stage =
      typeof concept.stage === 'number' && Number.isFinite(concept.stage)
        ? Math.max(0, Math.min(6, Math.floor(concept.stage)))
        : DOMAIN_STAGE[concept.domain];
    if (stage === 6) operations.push(id);
    else stages[stage].push(id);
  }

  // Keep the semantic columns in place when a preset hides a layer. A stage
  // grows automatically if an expanded view includes more than four peers.
  const columns: string[][] = [];
  const stageSpans = stages.map((group) => {
    const first = columns.length;
    columns.push(...(group.length ? splitBalanced(group) : [[]]));
    return { first, count: columns.length - first };
  });
  const ordered = orderColumns(columns, graph, order);
  const contentHeight = positionColumns(ordered, MARGIN_TOP, positions);
  const width = MARGIN_X * 2 + columns.length * NODE_WIDTH + (columns.length - 1) * COLUMN_GAP;
  const bands: LayoutBand[] = STAGES.map((stage, index) => ({
    id: `stage-${index}`,
    label: stage.label,
    domain: stage.domain,
    x: MARGIN_X + stageSpans[index].first * (NODE_WIDTH + COLUMN_GAP) - 20,
    y: MARGIN_TOP - 28,
    width: stageSpans[index].count * (NODE_WIDTH + COLUMN_GAP) - COLUMN_GAP + 40,
    height: contentHeight + 44,
  }));
  let height = MARGIN_TOP + contentHeight + MARGIN_BOTTOM;
  if (operations.length) {
    const railTop = MARGIN_TOP + contentHeight + 44;
    const railColumns = Math.min(columns.length, operations.length);
    const railRows = Math.ceil(operations.length / railColumns);
    const railWidth = railColumns * NODE_WIDTH + (railColumns - 1) * COLUMN_GAP;
    const railLeft = (width - railWidth) / 2;
    operations.forEach((id, index) => {
      positions[id] = {
        x: railLeft + (index % railColumns) * (NODE_WIDTH + COLUMN_GAP),
        y: railTop + Math.floor(index / railColumns) * (NODE_HEIGHT + ROW_GAP),
      };
    });
    bands.push({
      id: 'operations',
      label: 'OPERATIONS & INFRASTRUCTURE',
      domain: 'operations',
      x: MARGIN_X - 20,
      y: railTop - 32,
      width: width - MARGIN_X * 2 + 40,
      height: stackHeight(railRows) + 48,
    });
    height = railTop + stackHeight(railRows) + MARGIN_BOTTOM;
  }
  return { positions, width, height, bands };
}
