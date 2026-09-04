import {
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type IsValidConnection,
  type NodeChange,
  type OnNodeDrag,
  type OnSelectionChangeParams,
  useNodesInitialized,
  useReactFlow,
} from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  WorkflowGraph,
  WorkflowNode,
  WorkflowValidationIssue,
} from '@/features/workflows/types.ts';

import { computeDagreLayout, type FlowNodeSize } from './autoLayout.ts';
import {
  domainGraphToFlow,
  type WorkflowFlowEdge,
  type WorkflowFlowNode,
} from './flowTransform.ts';
import {
  canConnectNodes,
  countIssuesPerNode,
  loadInitialPositions,
  measureFlowNodeSizes,
  planNodeChangeActions,
  removedEdgeIds,
  selectionChangeAction,
  settleNodePosition,
  stableCallbacksFor,
  type FlowCallbacks,
} from './useWorkflowFlow.helpers.ts';
import {
  loadWorkflowPositions,
  saveWorkflowPositions,
} from './workflowCanvasStorage.ts';

export interface WorkflowFlowHandlers {
  /** Controlled nodes projected from the domain graph. */
  nodes: WorkflowFlowNode[];
  /** Controlled edges projected from the domain graph. */
  edges: WorkflowFlowEdge[];
  /** Bumped whenever the auto layout has been applied. */
  layoutVersion: number;
  /** Recomputes the layered layout and applies it as the visual positions. */
  autoLayout: (graph: WorkflowGraph) => void;
  onNodesChange: (changes: NodeChange<WorkflowFlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<WorkflowFlowEdge>[]) => void;
  onSelectionChange: (
    params: OnSelectionChangeParams<WorkflowFlowNode, WorkflowFlowEdge>,
  ) => void;
  onConnect: (connection: Connection) => void;
  onNodeDragStop: OnNodeDrag<WorkflowFlowNode>;
  isValidConnection: IsValidConnection<WorkflowFlowEdge>;
}

export interface UseWorkflowFlowOptions {
  graph: WorkflowGraph;
  validationIssues: WorkflowValidationIssue[];
  selectedNodeId: string | null;
  selectedEdgeKey: string | null;
  readOnly: boolean;
  defaultBranchLabel: string;
  /** Storage key (workflow code + draft id) for the browser-persisted layout. */
  positionsKey: string;
  onSelectNode: (nodeId: string | null) => void;
  onSelectEdge: (key: string | null) => void;
  onAddStep: (nodeId: string) => void;
  onOpenSettings: (nodeId: string) => void;
  onUpdateNode: (nodeId: string, patch: Partial<WorkflowNode>) => void;
  /** Re-ids a task/decision node from its name when a name edit commits. */
  onCommitNodeName: (nodeId: string, name: string) => void;
  onConnectNodes: (from: string, to: string) => void;
  onRemoveNode: (nodeId: string) => void;
  onRemoveEdge: (key: string) => void;
}

/**
 * Bridges the domain graph (source of truth) and the React Flow view model,
 * holding only visual state: node positions and selection flags. Positions are
 * persisted in the browser — never in the workflow schema (backend validates
 * it strictly) — so layouts survive reloads and re-projections.
 */
export function useWorkflowFlow(
  options: UseWorkflowFlowOptions,
): WorkflowFlowHandlers {
  const {
    graph,
    validationIssues,
    selectedNodeId,
    selectedEdgeKey,
    readOnly,
    defaultBranchLabel,
    positionsKey,
    onSelectNode,
    onSelectEdge,
    onAddStep,
    onOpenSettings,
    onUpdateNode,
    onCommitNodeName,
    onConnectNodes,
    onRemoveNode,
    onRemoveEdge,
  } = options;

  // Positions come from the browser store, never the Workflow schema: the
  // Backend validates it strictly, and an empty map makes the first projection
  // Auto-layout.
  const initialPositions = useMemo(
    () => loadInitialPositions(positionsKey),
    [positionsKey],
  );
  const positionsRef = useRef(initialPositions);

  // Dagre needs real node sizes, which React Flow only reports after render.
  const nodesInitialized = useNodesInitialized();
  const { getNodes } = useReactFlow<WorkflowFlowNode, WorkflowFlowEdge>();

  const measureNodes = useCallback(
    (): Map<string, FlowNodeSize> => measureFlowNodeSizes(getNodes()),
    [getNodes],
  );

  // Refs keep callbacks stable across re-renders so a live drag is never clobbered.
  const callbacksRef = useRef<FlowCallbacks>({
    onSelectNode,
    onSelectEdge,
    onAddStep,
    onOpenSettings,
    onUpdateNode,
    onCommitNodeName,
    onConnectNodes,
    onRemoveNode,
    onRemoveEdge,
    measureNodes: (): Map<string, FlowNodeSize> => new Map(),
  });
  // Ref writes happen after commit so render stays pure.
  useEffect(() => {
    callbacksRef.current = {
      onSelectNode,
      onSelectEdge,
      onAddStep,
      onOpenSettings,
      onUpdateNode,
      onCommitNodeName,
      onConnectNodes,
      onRemoveNode,
      onRemoveEdge,
      measureNodes,
    };
  });

  const stableCallbacks = useMemo(
    () => stableCallbacksFor(() => callbacksRef.current),
    [],
  );

  const nodeIssueCounts = useMemo(
    () => countIssuesPerNode(validationIssues),
    [validationIssues],
  );

  const [layoutVersion, setLayoutVersion] = useState(0);

  const autoLayout = useCallback(
    (graphToLayout: WorkflowGraph): void => {
      const next = computeDagreLayout(
        graphToLayout,
        callbacksRef.current.measureNodes(),
      );
      positionsRef.current = next;
      saveWorkflowPositions(positionsKey, next);
      setLayoutVersion((version) => version + 1);
    },
    [positionsKey],
  );

  // Only nodes without a saved position are auto-placed, once sizes are measured.
  useEffect(() => {
    if (!nodesInitialized) {
      return;
    }
    const next = computeDagreLayout(graph, callbacksRef.current.measureNodes());
    let changed = false;
    for (const node of graph.nodes) {
      const position = next.get(node.id);
      if (position && !positionsRef.current.has(node.id)) {
        positionsRef.current.set(node.id, position);
        changed = true;
      }
    }
    if (changed) {
      saveWorkflowPositions(positionsKey, positionsRef.current);
      setLayoutVersion((version) => version + 1);
    }
  }, [graph, nodesInitialized, positionsKey]);

  // Re-layout only when a node is added after mount, so restored positions survive load.
  const hasMountedRef = useRef(false);
  const previousNodeCountRef = useRef(graph.nodes.length);
  useEffect(() => {
    const wasMounted = hasMountedRef.current;
    hasMountedRef.current = true;
    const previousCount = previousNodeCountRef.current;
    previousNodeCountRef.current = graph.nodes.length;
    if (!wasMounted || readOnly || graph.nodes.length <= previousCount) {
      return;
    }
    autoLayout(graph);
  }, [graph, readOnly, autoLayout]);

  // A rename migrates layout ids, so re-read the store to keep the node at its saved spot.
  const previousNodeIdsRef = useRef<string | null>(null);
  useEffect(() => {
    const previousIds = previousNodeIdsRef.current;
    const nextIds = graph.nodes.map((node) => node.id).join('\u0000');
    previousNodeIdsRef.current = nextIds;
    if (previousIds === null || previousIds === nextIds) {
      return;
    }
    const stored = loadWorkflowPositions(positionsKey);
    if (stored === null) {
      return;
    }
    positionsRef.current = stored;
    setLayoutVersion((version) => version + 1);
  }, [graph.nodes, positionsKey]);

  const projected = useMemo(
    () =>
      domainGraphToFlow(graph, {
        positions: positionsRef.current,
        selectedNodeId,
        selectedEdgeKey,
        readOnly,
        nodeIssueCounts,
        defaultBranchLabel,
        onAddStep: stableCallbacks.onAddStep,
        onOpenSettings: stableCallbacks.onOpenSettings,
        onUpdateNode: stableCallbacks.onUpdateNode,
        onCommitNodeName: stableCallbacks.onCommitNodeName,
        onConnectNodes: stableCallbacks.onConnectNodes,
      }),
    [
      graph,
      selectedNodeId,
      selectedEdgeKey,
      readOnly,
      nodeIssueCounts,
      defaultBranchLabel,
      layoutVersion,
      stableCallbacks,
    ],
  );

  const [flowNodes, setFlowNodes] = useState<WorkflowFlowNode[]>(
    projected.nodes,
  );
  const [flowEdges, setFlowEdges] = useState<WorkflowFlowEdge[]>(
    projected.edges,
  );

  // Live drag positions live in positionsRef so a mid-drag re-projection can't reset them.
  useEffect(() => {
    setFlowNodes(projected.nodes);
    setFlowEdges(projected.edges);
  }, [projected]);

  const handleNodesChange = useCallback(
    (changes: NodeChange<WorkflowFlowNode>[]): void => {
      const { stateChanges, actions } = planNodeChangeActions(changes);
      for (const action of actions) {
        if (action.kind === 'position') {
          positionsRef.current.set(action.id, action.position);
        } else {
          positionsRef.current.delete(action.id);
          saveWorkflowPositions(positionsKey, positionsRef.current);
          callbacksRef.current.onRemoveNode(action.id);
        }
      }
      if (stateChanges.length > 0) {
        setFlowNodes((nodes) => applyNodeChanges(stateChanges, nodes));
      }
    },
    [positionsKey],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<WorkflowFlowEdge>[]): void => {
      setFlowEdges((edges) => applyEdgeChanges(changes, edges));
      for (const id of removedEdgeIds(changes)) {
        callbacksRef.current.onRemoveEdge(id);
      }
    },
    [],
  );

  const handleSelectionChange = useCallback(
    (
      params: OnSelectionChangeParams<WorkflowFlowNode, WorkflowFlowEdge>,
    ): void => {
      const action = selectionChangeAction(params);
      if (action.kind === 'node') {
        callbacksRef.current.onSelectNode(action.id);
      } else if (action.kind === 'edge') {
        callbacksRef.current.onSelectEdge(action.id);
      } else {
        callbacksRef.current.onSelectNode(null);
        callbacksRef.current.onSelectEdge(null);
      }
    },
    [],
  );

  const handleConnect = useCallback((connection: Connection): void => {
    if (!connection.source || !connection.target) {
      return;
    }
    callbacksRef.current.onConnectNodes(connection.source, connection.target);
  }, []);

  const handleNodeDragStop = useCallback(
    (
      _event: globalThis.MouseEvent | globalThis.TouchEvent,
      node: WorkflowFlowNode,
    ): void => {
      const position = { x: node.position.x, y: node.position.y };
      settleNodePosition(positionsKey, node, positionsRef.current);
      // Controlled nodes skipped per-pixel changes; sync the final position and drag flag here.
      setFlowNodes((nodes) =>
        nodes.map((item) =>
          item.id === node.id ? { ...item, position, dragging: false } : item,
        ),
      );
    },
    [positionsKey],
  );

  const isValidConnection = useCallback(
    (connection: Connection | WorkflowFlowEdge): boolean =>
      canConnectNodes(connection, graph.edges),
    [graph.edges],
  );

  return {
    nodes: flowNodes,
    edges: flowEdges,
    layoutVersion,
    autoLayout,
    onNodesChange: handleNodesChange,
    onEdgesChange: handleEdgesChange,
    onSelectionChange: handleSelectionChange,
    onConnect: handleConnect,
    onNodeDragStop: handleNodeDragStop,
    isValidConnection,
  };
}
