import type {
  WorkflowEdge,
  WorkflowExpression,
  WorkflowGraph,
  WorkflowNode,
  WorkflowNodeType,
} from '@/features/workflows/types.ts';

import {
  createNode,
  duplicateNodeId,
  nextNodeId,
} from './workflowGraphHelpers.ts';

export {
  DATA_CODE_PATTERN,
  NODE_ID_PATTERN,
  WORKFLOW_SCHEMA_URI,
  WORKFLOW_SCHEMA_VERSION,
  createDefaultWorkflowGraph,
  createNode,
  nextNodeId,
  nodeIdFromName,
  parseWorkflowGraph,
  serializeWorkflowGraph,
  slugifyNodeName,
} from './workflowGraphHelpers.ts';

/**
 * Re-ids a node and rewires every edge that referenced the old id. The rest of
 * the graph (other nodes, conditions, labels) is untouched.
 */
export function renameNode(
  graph: WorkflowGraph,
  nodeId: string,
  nextId: string,
): WorkflowGraph {
  if (nodeId === nextId) {
    return graph;
  }
  return {
    ...graph,
    nodes: graph.nodes.map((node) =>
      node.id === nodeId ? { ...node, id: nextId } : node,
    ),
    edges: graph.edges.map((edge) =>
      edge.from === nodeId || edge.to === nodeId
        ? {
            ...edge,
            from: edge.from === nodeId ? nextId : edge.from,
            to: edge.to === nodeId ? nextId : edge.to,
          }
        : edge,
    ),
  };
}

export function outgoingEdges(
  graph: WorkflowGraph,
  nodeId: string,
): WorkflowEdge[] {
  return graph.edges.filter((edge) => edge.from === nodeId);
}

export function incomingEdges(
  graph: WorkflowGraph,
  nodeId: string,
): WorkflowEdge[] {
  return graph.edges.filter((edge) => edge.to === nodeId);
}

export function edgeKey(from: string, to: string): string {
  return `${from}\u0000${to}`;
}

export function edgeIndex(
  graph: WorkflowGraph,
  from: string,
  to: string,
): number {
  return graph.edges.findIndex((edge) => edge.from === from && edge.to === to);
}

/**
 * Adds a node to the graph. When `afterNodeId` is given and the source node
 * can have an outgoing edge, the new node is connected with an edge. A
 * decision keeps exactly one default (unconditional) branch: if it already has
 * one, the new branch is created conditional, waiting for its condition.
 */
export function addNode(
  graph: WorkflowGraph,
  type: WorkflowNodeType,
  afterNodeId?: string | null,
): { graph: WorkflowGraph; node: WorkflowNode } {
  const id = nextNodeId(graph, type);
  const node = createNode(type, id);
  const nodes = [...graph.nodes, node];
  const source = afterNodeId ? typeOfNodeAt(graph, afterNodeId) : undefined;
  const edges =
    afterNodeId && source && canHaveOutgoingEdge(source)
      ? [...graph.edges, connectionEdge(graph, source, afterNodeId, id)]
      : graph.edges;
  return { graph: { ...graph, nodes, edges }, node };
}

/** Edge created by `addNode`: a decision that already has a default branch gets a conditional one (empty comparison the user completes), so the graph never ends up with more than one default. */
function connectionEdge(
  graph: WorkflowGraph,
  source: WorkflowNode,
  from: string,
  to: string,
): WorkflowEdge {
  const hasDefaultBranch = outgoingEdges(graph, source.id).some(
    (edge) => edge.condition === undefined,
  );
  if (source.type === 'decision' && hasDefaultBranch) {
    return {
      from,
      to,
      condition: { op: 'eq', args: [{ ref: '' }, { lit: '' }] },
    };
  }
  return { from, to };
}

export function updateNode(
  graph: WorkflowGraph,
  nodeId: string,
  patch: Partial<WorkflowNode>,
): WorkflowGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((node) =>
      node.id === nodeId ? { ...node, ...patch } : node,
    ),
  };
}

export function changeNodeType(
  graph: WorkflowGraph,
  nodeId: string,
  type: WorkflowNodeType,
): WorkflowGraph {
  const node = graph.nodes.find((item) => item.id === nodeId);
  if (!node || node.type === type) {
    return graph;
  }
  const next: WorkflowNode = { ...node, type };
  // Conditions only make sense on decision outputs; strip them when the source
  // Stops being a decision, so the graph keeps no orphaned conditions.
  const edges =
    type === 'decision'
      ? graph.edges
      : graph.edges.map((edge) =>
          edge.from === nodeId && edge.condition
            ? { from: edge.from, to: edge.to, label: edge.label }
            : edge,
        );
  return { ...graph, nodes: replaceNode(graph, next), edges };
}

export function removeNode(
  graph: WorkflowGraph,
  nodeId: string,
): WorkflowGraph {
  return {
    ...graph,
    nodes: graph.nodes.filter((node) => node.id !== nodeId),
    edges: graph.edges.filter(
      (edge) => edge.from !== nodeId && edge.to !== nodeId,
    ),
  };
}

export function addEdge(
  graph: WorkflowGraph,
  from: string,
  to: string,
  label?: string,
  condition?: WorkflowExpression,
): WorkflowGraph {
  if (edgeIndex(graph, from, to) !== -1) {
    return graph;
  }
  return {
    ...graph,
    edges: [
      ...graph.edges,
      {
        from,
        to,
        ...(label ? { label } : {}),
        ...(condition ? { condition } : {}),
      },
    ],
  };
}

export function removeEdgeByKey(
  graph: WorkflowGraph,
  key: string,
): WorkflowGraph {
  const [from, to] = key.split('\u0000');
  return {
    ...graph,
    edges: graph.edges.filter(
      (edge) => !(edge.from === from && edge.to === to),
    ),
  };
}

/**
 * Splits the edge `from → to` by inserting a new node in the middle. The
 * original transition's branch metadata (condition and label) moves to the new
 * `from → node` edge, so decision branch semantics are preserved. Returns
 * `null` when the edge does not exist.
 */
export function insertNodeBetween(
  graph: WorkflowGraph,
  type: WorkflowNodeType,
  from: string,
  to: string,
): { graph: WorkflowGraph; node: WorkflowNode } | null {
  const index = edgeIndex(graph, from, to);
  if (index === -1) {
    return null;
  }
  const original = graph.edges[index];
  const id = nextNodeId(graph, type);
  const node = createNode(type, id);
  const incoming: WorkflowEdge = {
    from,
    to: id,
    ...(original.label ? { label: original.label } : {}),
    ...(original.condition ? { condition: original.condition } : {}),
  };
  const edges = [
    ...graph.edges.slice(0, index),
    incoming,
    { from: id, to },
    ...graph.edges.slice(index + 1),
  ];
  return { graph: { ...graph, nodes: [...graph.nodes, node], edges }, node };
}

/**
 * Copies a node with a fresh id and rewires every edge touching the original
 * (incoming and outgoing) to the copy, preserving branch labels and conditions.
 * A named copy keeps a readable id derived from its name. Returns `null` when
 * the node does not exist.
 */
export function duplicateNode(
  graph: WorkflowGraph,
  nodeId: string,
): { graph: WorkflowGraph; node: WorkflowNode } | null {
  const source = graph.nodes.find((node) => node.id === nodeId);
  if (!source) {
    return null;
  }
  const id = duplicateNodeId(graph, source);
  const node: WorkflowNode = { ...source, id };
  const incoming: WorkflowEdge[] = [];
  const outgoing: WorkflowEdge[] = [];
  for (const edge of graph.edges) {
    if (edge.to === nodeId) {
      incoming.push({ ...edge, to: id });
    }
    if (edge.from === nodeId) {
      outgoing.push({ ...edge, from: id });
    }
  }
  return {
    graph: {
      ...graph,
      nodes: [...graph.nodes, node],
      edges: [...graph.edges, ...incoming, ...outgoing],
    },
    node,
  };
}

export function updateEdge(
  graph: WorkflowGraph,
  index: number,
  patch: Partial<Pick<WorkflowEdge, 'label' | 'condition'>>,
): WorkflowGraph {
  return {
    ...graph,
    edges: graph.edges.map((edge, i) =>
      i === index ? { ...edge, ...patch } : edge,
    ),
  };
}

export function updateEdgeCondition(
  graph: WorkflowGraph,
  index: number,
  condition: WorkflowExpression | undefined,
): WorkflowGraph {
  return {
    ...graph,
    edges: graph.edges.map((edge, i) =>
      i === index
        ? { ...edge, ...(condition ? { condition } : { label: edge.label }) }
        : edge,
    ),
  };
}

export function updateInputs(
  graph: WorkflowGraph,
  inputs: string[],
): WorkflowGraph {
  return { ...graph, inputs };
}

export function canHaveOutgoingEdge(node: WorkflowNode | undefined): boolean {
  return node !== undefined && node.type !== 'end';
}

function typeOfNodeAt(
  graph: WorkflowGraph,
  nodeId: string,
): WorkflowNode | undefined {
  return graph.nodes.find((node) => node.id === nodeId);
}

function replaceNode(graph: WorkflowGraph, next: WorkflowNode): WorkflowNode[] {
  return graph.nodes.map((node) => (node.id === next.id ? next : node));
}
