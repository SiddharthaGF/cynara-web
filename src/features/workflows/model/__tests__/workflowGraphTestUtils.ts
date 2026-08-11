import type {
  WorkflowEdge,
  WorkflowGraph,
  WorkflowNode,
} from '@/features/workflows/types.ts';

export function graph(
  nodes: WorkflowGraph['nodes'],
  edges: WorkflowGraph['edges'],
): WorkflowGraph {
  return { schemaVersion: '1.0.0', nodes, edges };
}

export interface InsertResult {
  graph: WorkflowGraph;
  node: WorkflowNode;
}

export function requireResult(result: InsertResult | null): InsertResult {
  if (result === null) {
    throw new Error('expected insertNodeBetween to return a result');
  }
  return result;
}

export function requireEdge(
  source: WorkflowGraph,
  from: string,
  to: string,
): WorkflowEdge {
  const edge = source.edges.find(
    (item) => item.from === from && item.to === to,
  );
  if (edge === undefined) {
    throw new Error(`expected edge ${from} → ${to}`);
  }
  return edge;
}

export function requireTaskNode(
  node: WorkflowNode,
): Extract<WorkflowNode, { type: 'task' }> {
  if (node.type !== 'task') {
    throw new Error(`expected a task node, got ${node.type}`);
  }
  return node;
}
