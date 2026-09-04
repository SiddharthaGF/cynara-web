import { MarkerType } from '@xyflow/react';
import type { Edge, Node } from '@xyflow/react';

import { describeExpression } from '@/features/workflows/model/workflowExpression.ts';
import {
  edgeKey,
  outgoingEdges,
} from '@/features/workflows/model/workflowGraph.ts';
import type {
  WorkflowEdge,
  WorkflowGraph,
  WorkflowNode,
  WorkflowNodeType,
} from '@/features/workflows/types.ts';

import { computeDagreLayout } from './autoLayout.ts';

export interface WorkflowFlowNodeData extends Record<string, unknown> {
  /** Domain node this flow node represents. */
  node: WorkflowNode;
  /** Outgoing domain edges; decision nodes render one source handle per branch. */
  outgoing: WorkflowEdge[];
  /** Nodes this node may still connect to, excluding self and current targets. */
  availableTargets: WorkflowNode[];
  readOnly: boolean;
  hasErrors: boolean;
  onAddStep: (nodeId: string) => void;
  onOpenSettings: (nodeId: string) => void;
  /** Renames this node (blank becomes undefined). */
  onChangeName: (value: string) => void;
  /** Called when a name edit commits (blur/Enter); re-ids the node from its name. */
  onCommitName: (value: string) => void;
  /** Creates a transition from this node to the given target. */
  onConnectNodes: (targetId: string) => void;
}

export interface WorkflowFlowEdgeData extends Record<string, unknown> {
  /** Resolved label rendered next to the edge. */
  label: string | null;
  isConditional: boolean;
  isDefault: boolean;
  readOnly: boolean;
}

export type WorkflowFlowNode = Node<WorkflowFlowNodeData, WorkflowNodeType>;
export type WorkflowFlowEdge = Edge<WorkflowFlowEdgeData>;

export interface DomainGraphToFlowOptions {
  /**
   * Session positions, keyed by node id. Restored from the browser store on
   * mount and kept in sync by `useWorkflowFlow`; wins over the computed layout
   * so dragged layouts survive re-projection.
   */
  positions: ReadonlyMap<string, { x: number; y: number }>;
  selectedNodeId: string | null;
  selectedEdgeKey: string | null;
  readOnly: boolean;
  nodeIssueCounts: ReadonlyMap<string, number>;
  defaultBranchLabel: string;
  onAddStep: (nodeId: string) => void;
  onOpenSettings: (nodeId: string) => void;
  onUpdateNode: (nodeId: string, patch: Partial<WorkflowNode>) => void;
  onCommitNodeName: (nodeId: string, name: string) => void;
  onConnectNodes: (from: string, to: string) => void;
}

/** Resolved label for a transition, mirroring the designer tooltip rules. */
export function workflowEdgeLabel(
  edge: WorkflowEdge,
  isDecisionSource: boolean,
  defaultBranchLabel: string,
): string | null {
  const explicit = edge.label?.trim();
  if (explicit) {
    return explicit;
  }
  if (edge.condition) {
    const described = describeExpression(edge.condition);
    return described || null;
  }
  if (isDecisionSource) {
    return defaultBranchLabel;
  }
  return null;
}

/**
 * Maps the persisted domain graph to the React Flow view model. The domain
 * model is the single source of truth; positions are session-only visual state
 * that wins over the computed layout and lives in the browser, never the
 * schema. Nodes without a saved position fall back to a dagre layout re-run
 * with measured sizes once React Flow has rendered them.
 */
export function domainGraphToFlow(
  graph: WorkflowGraph,
  options: DomainGraphToFlowOptions,
): { nodes: WorkflowFlowNode[]; edges: WorkflowFlowEdge[] } {
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const needsLayout = graph.nodes.some(
    (node) => !options.positions.has(node.id),
  );
  const layout = needsLayout ? computeDagreLayout(graph, new Map()) : null;

  const nodes: WorkflowFlowNode[] = graph.nodes.map((node) => {
    const position = options.positions.get(node.id) ?? layout?.get(node.id);
    const outgoing = outgoingEdges(graph, node.id);
    const outgoingIds = new Set(outgoing.map((edge) => edge.to));
    const availableTargets = graph.nodes.filter(
      (candidate) => candidate.id !== node.id && !outgoingIds.has(candidate.id),
    );
    return {
      id: node.id,
      type: node.type,
      position: position ?? { x: 0, y: 0 },
      selected: options.selectedNodeId === node.id,
      data: {
        node,
        outgoing,
        availableTargets,
        readOnly: options.readOnly,
        hasErrors: (options.nodeIssueCounts.get(node.id) ?? 0) > 0,
        onAddStep: options.onAddStep,
        onOpenSettings: options.onOpenSettings,
        onChangeName: (value) =>
          options.onUpdateNode(node.id, {
            name: value.trim() ? value : undefined,
          }),
        onCommitName: (value) => options.onCommitNodeName(node.id, value),
        onConnectNodes: (targetId) => options.onConnectNodes(node.id, targetId),
      },
    };
  });

  const edges: WorkflowFlowEdge[] = graph.edges.map((edge) => {
    const source = nodesById.get(edge.from);
    const isDecisionSource = source?.type === 'decision';
    const isConditional = edge.condition !== undefined;
    const isDefault = isDecisionSource && !isConditional;
    const key = edgeKey(edge.from, edge.to);
    return {
      id: key,
      source: edge.from,
      target: edge.to,
      // One source handle per branch; the id mirrors the target so edges stay anchored.
      sourceHandle: isDecisionSource ? edge.to : null,
      type: 'workflow',
      selected: options.selectedEdgeKey === key,
      deletable: !options.readOnly,
      // Bind the arrowhead to the stroke token so it tracks the edge theme, not a fixed gray.
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 16,
        height: 16,
        color: 'var(--xy-edge-stroke)',
      },
      data: {
        label: workflowEdgeLabel(
          edge,
          isDecisionSource,
          options.defaultBranchLabel,
        ),
        isConditional,
        isDefault,
        readOnly: options.readOnly,
      },
    };
  });

  return { nodes, edges };
}
