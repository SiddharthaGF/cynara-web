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
 * Bridges the persisted domain graph and the React Flow view model.
 *
 * The domain graph remains the source of truth for persisted data; this hook
 * only holds the visual state React Flow owns: node positions and the
 * selection-driven `selected` flags. Positions are stored in the browser (not
 * in the workflow schema, which the backend validates strictly) and restored on
 * mount, so dragged layouts survive reloads and re-projections.
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

  // Restore the layout stored for this draft from the browser (never from the
  // Workflow schema, which the backend validates strictly). Falls back to an
  // Empty map so the first projection computes the dagre auto layout.
  const initialPositions = useMemo(
    () =>
      loadWorkflowPositions(positionsKey) ??
      new Map<string, { x: number; y: number }>(),
    [positionsKey],
  );
  const positionsRef = useRef(initialPositions);

  // React Flow only reports the real node dimensions after it renders them,
  // And dagre needs those sizes, so the layout pass is gated on the measured
  // State exposed by `useNodesInitialized` (see the effect below).
  const nodesInitialized = useNodesInitialized();
  const { getNodes } = useReactFlow<WorkflowFlowNode, WorkflowFlowEdge>();

  const measureNodes = useCallback((): Map<string, FlowNodeSize> => {
    const sizes = new Map<string, FlowNodeSize>();
    for (const node of getNodes()) {
      const width = node.measured?.width;
      const height = node.measured?.height;
      if (width !== undefined && height !== undefined) {
        sizes.set(node.id, { width, height });
      }
    }
    return sizes;
  }, [getNodes]);

  // Callbacks are forwarded through refs so the projection stays stable
  // Across parent re-renders (e.g. autosave state changes) without
  // Clobbering a live drag.
  const callbacksRef = useRef({
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

  const stableAddStep = useCallback(
    (nodeId: string) => callbacksRef.current.onAddStep(nodeId),
    [],
  );
  const stableOpenSettings = useCallback(
    (nodeId: string) => callbacksRef.current.onOpenSettings(nodeId),
    [],
  );
  const stableUpdateNode = useCallback(
    (nodeId: string, patch: Partial<WorkflowNode>) =>
      callbacksRef.current.onUpdateNode(nodeId, patch),
    [],
  );
  const stableCommitNodeName = useCallback(
    (nodeId: string, name: string) =>
      callbacksRef.current.onCommitNodeName(nodeId, name),
    [],
  );
  const stableConnectNodes = useCallback(
    (from: string, to: string) => callbacksRef.current.onConnectNodes(from, to),
    [],
  );
  const nodeIssueCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const issue of validationIssues) {
      if (issue.nodeId) {
        map.set(issue.nodeId, (map.get(issue.nodeId) ?? 0) + 1);
      }
    }
    return map;
  }, [validationIssues]);

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

  // Places nodes without a saved position once React Flow has measured them,
  // Using their real sizes so the initial auto layout never stacks. Dragged
  // Positions stay untouched; new nodes get a spot on the next render.
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

  // Re-arranges the whole flow whenever a node is added, so new steps and
  // Branches land in a clean dagre layout. The initial projection (before this
  // Hook has mounted) is skipped so restored positions are not clobbered on
  // Load; only later node additions trigger an arrange.
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

  // A committed rename re-ids a node. The persisted layout was migrated by the
  // Commit handler (old id → new id), so re-read the store to keep the node on
  // The canvas at its saved spot instead of falling back to the auto layout.
  const previousNodeIdsRef = useRef(
    graph.nodes.map((node) => node.id).join('\u0000'),
  );
  useEffect(() => {
    const previousIds = previousNodeIdsRef.current;
    const nextIds = graph.nodes.map((node) => node.id).join('\u0000');
    previousNodeIdsRef.current = nextIds;
    if (previousIds === nextIds) {
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
        onAddStep: stableAddStep,
        onOpenSettings: stableOpenSettings,
        onUpdateNode: stableUpdateNode,
        onCommitNodeName: stableCommitNodeName,
        onConnectNodes: stableConnectNodes,
      }),
    [
      graph,
      selectedNodeId,
      selectedEdgeKey,
      readOnly,
      nodeIssueCounts,
      defaultBranchLabel,
      layoutVersion,
      stableAddStep,
      stableOpenSettings,
      stableUpdateNode,
      stableCommitNodeName,
      stableConnectNodes,
    ],
  );

  const [flowNodes, setFlowNodes] = useState<WorkflowFlowNode[]>(
    projected.nodes,
  );
  const [flowEdges, setFlowEdges] = useState<WorkflowFlowEdge[]>(
    projected.edges,
  );

  // Re-project whenever the domain model or selection changes. Live drag
  // Positions are tracked in `positionsRef` (see `handleNodesChange`) so a
  // Re-projection mid-drag cannot reset them; drag stop persists the final
  // Position to the browser store.
  useEffect(() => {
    setFlowNodes(projected.nodes);
    setFlowEdges(projected.edges);
  }, [projected]);

  const handleNodesChange = useCallback(
    (changes: NodeChange<WorkflowFlowNode>[]): void => {
      const stateChanges: NodeChange<WorkflowFlowNode>[] = [];
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          // Track the live position for persistence. Every pointermove flows
          // Through the controlled `nodes` prop so the store adopts the node
          // Once per frame. Pushing straight into the store instead re-enters
          // `onNodesChange` with a `replace` change: React Flow diffs the queue
          // Output by reference, and `applyNodeChanges` always rebuilds the
          // Dragged node object.
          positionsRef.current.set(change.id, {
            x: change.position.x,
            y: change.position.y,
          });
        } else if (change.type === 'remove') {
          positionsRef.current.delete(change.id);
          saveWorkflowPositions(positionsKey, positionsRef.current);
          callbacksRef.current.onRemoveNode(change.id);
        }
        stateChanges.push(change);
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
      for (const change of changes) {
        if (change.type === 'remove') {
          callbacksRef.current.onRemoveEdge(change.id);
        }
      }
    },
    [],
  );

  const handleSelectionChange = useCallback(
    (
      params: OnSelectionChangeParams<WorkflowFlowNode, WorkflowFlowEdge>,
    ): void => {
      const { nodes, edges } = params;
      if (nodes.length > 0) {
        callbacksRef.current.onSelectNode(nodes[0]?.id ?? null);
        return;
      }
      if (edges.length > 0) {
        callbacksRef.current.onSelectEdge(edges[0]?.id ?? null);
        return;
      }
      callbacksRef.current.onSelectNode(null);
      callbacksRef.current.onSelectEdge(null);
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
      positionsRef.current.set(node.id, position);
      saveWorkflowPositions(positionsKey, positionsRef.current);
      // The controlled `nodes` prop skipped every per-pixel position change, so
      // Bring the dragged node up to date (and clear the live drag flag) here.
      setFlowNodes((nodes) =>
        nodes.map((item) =>
          item.id === node.id ? { ...item, position, dragging: false } : item,
        ),
      );
    },
    [positionsKey],
  );

  const isValidConnection = useCallback(
    (connection: Connection | WorkflowFlowEdge): boolean => {
      if (
        !connection.source ||
        !connection.target ||
        connection.source === connection.target
      ) {
        return false;
      }
      // The domain model keys edges by (from, to); parallel edges are invalid.
      return !graph.edges.some(
        (edge) =>
          edge.from === connection.source && edge.to === connection.target,
      );
    },
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
