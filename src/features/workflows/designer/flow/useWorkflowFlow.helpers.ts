import type {
  Connection,
  EdgeChange,
  NodeChange,
  OnSelectionChangeParams,
} from '@xyflow/react';

import type {
  WorkflowEdge,
  WorkflowNode,
  WorkflowValidationIssue,
} from '@/features/workflows/types.ts';

import type { FlowNodeSize } from './autoLayout.ts';
import type { WorkflowFlowEdge, WorkflowFlowNode } from './flowTransform.ts';
import {
  loadWorkflowPositions,
  saveWorkflowPositions,
  type WorkflowCanvasPosition,
} from './workflowCanvasStorage.ts';

/** Validation issue counts keyed by node id, for the error badge. */
export function countIssuesPerNode(
  issues: WorkflowValidationIssue[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const issue of issues) {
    if (issue.nodeId) {
      counts.set(issue.nodeId, (counts.get(issue.nodeId) ?? 0) + 1);
    }
  }
  return counts;
}

/** Collects the measured React Flow node sizes that dagre needs. */
export function measureFlowNodeSizes(
  nodes: WorkflowFlowNode[],
): Map<string, FlowNodeSize> {
  const sizes = new Map<string, FlowNodeSize>();
  for (const node of nodes) {
    const width = node.measured?.width;
    const height = node.measured?.height;
    if (width !== undefined && height !== undefined) {
      sizes.set(node.id, { width, height });
    }
  }
  return sizes;
}

/** Restores the stored layout for `key`, defaulting to an empty position map. */
export function loadInitialPositions(
  key: string,
): Map<string, WorkflowCanvasPosition> {
  return (
    loadWorkflowPositions(key) ?? new Map<string, WorkflowCanvasPosition>()
  );
}

/** All callbacks the flow projection needs, forwarded through a live ref. */
export interface FlowCallbacks {
  onSelectNode: (nodeId: string | null) => void;
  onSelectEdge: (key: string | null) => void;
  onAddStep: (nodeId: string) => void;
  onOpenSettings: (nodeId: string) => void;
  onUpdateNode: (nodeId: string, patch: Partial<WorkflowNode>) => void;
  onCommitNodeName: (nodeId: string, name: string) => void;
  onConnectNodes: (from: string, to: string) => void;
  onRemoveNode: (nodeId: string) => void;
  onRemoveEdge: (key: string) => void;
  measureNodes: () => Map<string, FlowNodeSize>;
}

/** The subset of callbacks threaded into the projection with stable identity. */
export type StableFlowCallbacks = Pick<
  FlowCallbacks,
  | 'onAddStep'
  | 'onOpenSettings'
  | 'onUpdateNode'
  | 'onCommitNodeName'
  | 'onConnectNodes'
>;

/** Callbacks with stable identity that always dispatch through the latest ref. */
export function stableCallbacksFor(
  getCallbacks: () => FlowCallbacks,
): StableFlowCallbacks {
  return {
    onAddStep: (nodeId) => getCallbacks().onAddStep(nodeId),
    onOpenSettings: (nodeId) => getCallbacks().onOpenSettings(nodeId),
    onUpdateNode: (nodeId, patch) => getCallbacks().onUpdateNode(nodeId, patch),
    onCommitNodeName: (nodeId, name) =>
      getCallbacks().onCommitNodeName(nodeId, name),
    onConnectNodes: (from, to) => getCallbacks().onConnectNodes(from, to),
  };
}

/** A single queued node change split into the side effects it triggers. */
export type NodeChangeAction =
  | { kind: 'position'; id: string; position: { x: number; y: number } }
  | { kind: 'remove'; id: string };

/** Splits changes into React Flow state updates and side effects; order is kept so a later remove wins in the positions map. */
export function planNodeChangeActions(
  changes: NodeChange<WorkflowFlowNode>[],
): {
  stateChanges: NodeChange<WorkflowFlowNode>[];
  actions: NodeChangeAction[];
} {
  const stateChanges: NodeChange<WorkflowFlowNode>[] = [];
  const actions: NodeChangeAction[] = [];
  for (const change of changes) {
    if (change.type === 'position' && change.position) {
      // Track live positions here; a store write would re-enter `onNodesChange`
      // With a `replace` change that React Flow diffs by reference, rebuilding
      // The dragged node object every frame.
      actions.push({
        kind: 'position',
        id: change.id,
        position: { x: change.position.x, y: change.position.y },
      });
    } else if (change.type === 'remove') {
      actions.push({ kind: 'remove', id: change.id });
    }
    stateChanges.push(change);
  }
  return { stateChanges, actions };
}

/** Ids of the edges React Flow wants removed in this change batch. */
export function removedEdgeIds(
  changes: EdgeChange<WorkflowFlowEdge>[],
): string[] {
  const ids: string[] = [];
  for (const change of changes) {
    if (change.type === 'remove') {
      ids.push(change.id);
    }
  }
  return ids;
}

/** Single selection outcome derived from a React Flow selection change. */
export type SelectionChangeAction =
  | { kind: 'node'; id: string }
  | { kind: 'edge'; id: string }
  | { kind: 'clear' };

/** Reduces a selection change to one node/edge selection (or a clear). */
export function selectionChangeAction(
  params: OnSelectionChangeParams<WorkflowFlowNode, WorkflowFlowEdge>,
): SelectionChangeAction {
  if (params.nodes.length > 0) {
    return { kind: 'node', id: params.nodes[0]?.id ?? '' };
  }
  if (params.edges.length > 0) {
    return { kind: 'edge', id: params.edges[0]?.id ?? '' };
  }
  return { kind: 'clear' };
}

/** Whether a new connection is structurally allowed against the domain edges. */
export function canConnectNodes(
  connection: Connection | WorkflowFlowEdge,
  edges: WorkflowEdge[],
): boolean {
  if (
    !connection.source ||
    !connection.target ||
    connection.source === connection.target
  ) {
    return false;
  }
  return !edges.some(
    (edge) => edge.from === connection.source && edge.to === connection.target,
  );
}

/** Persists a node's final position after a drag stops. */
export function settleNodePosition(
  key: string,
  node: WorkflowFlowNode,
  positions: Map<string, WorkflowCanvasPosition>,
): void {
  positions.set(node.id, { x: node.position.x, y: node.position.y });
  saveWorkflowPositions(key, positions);
}
