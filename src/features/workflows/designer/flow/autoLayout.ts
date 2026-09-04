import { graphlib, layout } from '@dagrejs/dagre';
import type { EdgeLabel, Graph, GraphLabel, NodeLabel } from '@dagrejs/dagre';

import type { WorkflowGraph } from '@/features/workflows/types.ts';

export interface FlowNodeSize {
  width: number;
  height: number;
}

/** Fallback size before measurement, so the first paint never stacks nodes in a corner. */
export const DEFAULT_FLOW_NODE_SIZE: FlowNodeSize = {
  width: 232,
  height: 104,
};

/**
 * Forward longest-path ranking: each node's rank is its longest distance from
 * a source, so a decision's branches share one row. Dagre's built-in rankers
 * minimize total edge length, which sinks short branches and crosses edges.
 * Runs on dagre's internal rank graph, where edge `minlen` is already doubled.
 */
function forwardLongestPath(g: Graph<GraphLabel, NodeLabel, EdgeLabel>): void {
  const visited = new Set<string>();
  const rankOf = (v: string): number => {
    if (visited.has(v)) {
      return g.node(v).rank ?? 0;
    }
    visited.add(v);
    const predecessors = (g.predecessors(v) ?? []).filter(
      (pred) => pred !== '_root',
    );
    let rank = 0;
    for (const pred of predecessors) {
      rank = Math.max(rank, rankOf(pred) + (g.edge(pred, v)?.minlen ?? 1));
    }
    g.node(v).rank = rank;
    return rank;
  };
  for (const v of g.nodes()) {
    if (v !== '_root') {
      rankOf(v);
    }
  }
}

const LAYOUT_OPTIONS = {
  rankdir: 'TB',
  nodesep: 56,
  ranksep: 84,
  marginx: 28,
  marginy: 40,
  /** Keep the initial DFS order so a decision's branches land in creation order instead of crossed pairs. */
  disableOptimalOrderHeuristic: true,
} as const;

/**
 * Ranked top-to-bottom layout for the whole graph (React Flow's top-left
 * anchor convention). Edges referencing unknown nodes are skipped so a
 * partially invalid workflow still lays out without crashing.
 */
export function computeDagreLayout(
  graph: WorkflowGraph,
  sizes: ReadonlyMap<string, FlowNodeSize>,
): Map<string, { x: number; y: number }> {
  const dagreGraph = new graphlib.Graph<GraphLabel, NodeLabel, EdgeLabel>();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph(LAYOUT_OPTIONS);
  // Dagre dispatches `ranker` at runtime but its types only list string rankers,
  // So thread the function through the graph label's index signature.
  (dagreGraph.graph() as Record<string, unknown>).ranker = forwardLongestPath;

  const knownNodes = new Set<string>();
  for (const node of graph.nodes) {
    knownNodes.add(node.id);
    const size = sizes.get(node.id) ?? DEFAULT_FLOW_NODE_SIZE;
    dagreGraph.setNode(node.id, { width: size.width, height: size.height });
  }

  for (const edge of graph.edges) {
    if (knownNodes.has(edge.from) && knownNodes.has(edge.to)) {
      dagreGraph.setEdge(edge.from, edge.to);
    }
  }

  layout(dagreGraph, LAYOUT_OPTIONS);

  const positions = new Map<string, { x: number; y: number }>();
  for (const node of graph.nodes) {
    const placed = dagreGraph.node(node.id);
    const width = placed.width ?? DEFAULT_FLOW_NODE_SIZE.width;
    const height = placed.height ?? DEFAULT_FLOW_NODE_SIZE.height;
    // Dagre anchors nodes at their center; React Flow anchors at the top-left.
    positions.set(node.id, {
      x: (placed.x ?? 0) - width / 2,
      y: (placed.y ?? 0) - height / 2,
    });
  }
  return positions;
}
