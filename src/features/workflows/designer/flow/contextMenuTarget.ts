import { outgoingEdges } from '@/features/workflows/model/workflowGraph.ts';
import type { WorkflowGraph } from '@/features/workflows/types.ts';

export type WorkflowContextMenuTarget =
  | { kind: 'pane'; x: number; y: number }
  | { kind: 'node'; nodeId: string; x: number; y: number }
  | { kind: 'edge'; edgeKey: string; x: number; y: number };

/**
 * Maps the element under a pointer to the workflow surface that was pressed:
 * React Flow stamps node and edge ids on their wrapper elements (`data-id`).
 */
export function resolveContextMenuTarget(
  x: number,
  y: number,
  target: EventTarget | null,
): WorkflowContextMenuTarget {
  const element = target instanceof Element ? target : null;
  const node = element?.closest<HTMLElement>('.react-flow__node');
  const nodeId = node?.dataset.id;
  if (node && nodeId) {
    return { kind: 'node', nodeId, x, y };
  }
  const edge = element?.closest<HTMLElement>('.react-flow__edge');
  const edgeKey = edge?.dataset.id;
  if (edge && edgeKey) {
    return { kind: 'edge', edgeKey, x, y };
  }
  return { kind: 'pane', x, y };
}

/**
 * Whether the target node can still accept another outgoing transition, which
 * decides if the "add step after" item is shown in the node context menu.
 */
export function canAddStepAfterTarget(
  graph: WorkflowGraph,
  target: WorkflowContextMenuTarget,
): boolean {
  if (target.kind !== 'node') {
    return false;
  }
  const node = graph.nodes.find((item) => item.id === target.nodeId);
  if (!node || node.type === 'end') {
    return false;
  }
  if (node.type === 'decision') {
    return true;
  }
  return outgoingEdges(graph, node.id).length === 0;
}
