import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

import { useWorkflowDraft } from '@/features/workflows/designer/useWorkflowDraft.ts';
import {
  addEdge,
  addNode,
  changeNodeType,
  duplicateNode,
  edgeIndex,
  edgeKey,
  incomingEdges,
  insertNodeBetween,
  outgoingEdges,
  removeEdgeByKey,
  removeNode,
  updateEdge,
  updateEdgeCondition,
  updateInputs,
  updateNode,
} from '@/features/workflows/model/workflowGraph.ts';
import type {
  WorkflowEdge,
  WorkflowExpression,
  WorkflowGraph,
  WorkflowNode,
  WorkflowNodeType,
  WorkflowVersion,
} from '@/features/workflows/types.ts';

const OPEN_OVERLAY_SELECTOR =
  '[data-slot="select-content"][data-open], [data-slot="dropdown-menu-content"][data-open], [data-slot="popover-content"][data-open], [data-slot="dialog-content"]';

/** True when a select/popover/dialog overlay is open and owns the keys. */
function hasOpenOverlay(): boolean {
  return document.querySelector(OPEN_OVERLAY_SELECTOR) !== null;
}

export interface WorkflowDesignerLayout {
  draft: ReturnType<typeof useWorkflowDraft>;
  selectedNodeId: string | null;
  setSelectedNodeId: (nodeId: string | null) => void;
  selectedEdgeKey: string | null;
  setSelectedEdgeKey: (key: string | null) => void;
  showInspector: boolean;
  setShowInspector: Dispatch<SetStateAction<boolean>>;
  selectedNode: WorkflowNode | null;
  selectedEdge: { edge: WorkflowEdge; index: number } | null;
  outgoing: WorkflowEdge[];
  incoming: WorkflowEdge[];
  availableTargets: WorkflowNode[];
  handleAddStepAfter: (nodeId: string) => void;
  handleAddBranch: (nodeId: string) => void;
  handleAddNode: (type: WorkflowNodeType) => void;
  handleDuplicateNode: (nodeId: string) => void;
  handleUpdateNode: (nodeId: string, patch: Partial<WorkflowNode>) => void;
  handleChangeNodeType: (nodeId: string, type: WorkflowNodeType) => void;
  handleRemoveNode: (nodeId: string) => void;
  handleAddEdge: (from: string, to: string) => void;
  handleRemoveEdge: (key: string) => void;
  handleInsertNodeInEdge: (key: string, type: WorkflowNodeType) => void;
  handleUpdateEdgeLabel: (key: string, label: string) => void;
  handleSetEdgeCondition: (
    key: string,
    condition: WorkflowExpression | undefined,
  ) => void;
  handleAddInput: () => void;
  handleRemoveInput: (index: number) => void;
  handleUpdateInput: (index: number, value: string) => void;
}

export function useWorkflowDesignerLayout(
  code: string,
  initialDraft: WorkflowVersion,
): WorkflowDesignerLayout {
  const draft = useWorkflowDraft(code, initialDraft);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeKey, setSelectedEdgeKey] = useState<string | null>(null);
  const [showInspector, setShowInspector] = useState(false);

  useEffect(() => {
    if (!selectedNodeId && !selectedEdgeKey) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Escape') {
        return;
      }
      if (hasOpenOverlay()) {
        return;
      }
      setSelectedNodeId(null);
      setSelectedEdgeKey(null);
      setShowInspector(false);
    }

    window.addEventListener('keydown', handleKeyDown);
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNodeId, selectedEdgeKey]);

  /*
   * Editor shortcuts: Ctrl/Cmd+S saves, Ctrl/Cmd+Z undoes, Ctrl/Cmd+Shift+Z
   * and Ctrl/Cmd+Y redo. Undo/redo apply to the whole graph even when the
   * focus is in an inspector input (typing bursts are coalesced into one
   * history step), but yield to native behavior while an overlay is open.
   */
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod || event.altKey) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === 's') {
        event.preventDefault();
        if (!draft.isReadOnly) {
          void draft.saveNow();
        }
        return;
      }
      if (hasOpenOverlay()) {
        return;
      }
      if (key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          draft.redo();
        } else {
          draft.undo();
        }
        return;
      }
      if (key === 'y' && !event.shiftKey) {
        event.preventDefault();
        draft.redo();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [draft.isReadOnly, draft.redo, draft.saveNow, draft.undo]);

  const selectedNode = useMemo(
    () => draft.graph.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [draft.graph.nodes, selectedNodeId],
  );

  const selectedEdge = useMemo(() => {
    if (!selectedEdgeKey) {
      return null;
    }
    const [from, to] = selectedEdgeKey.split('\u0000');
    const index = edgeIndex(draft.graph, from, to);
    if (index === -1) {
      return null;
    }
    return { edge: draft.graph.edges[index], index };
  }, [draft.graph, selectedEdgeKey]);

  const outgoing = useMemo(
    () => (selectedNode ? outgoingEdges(draft.graph, selectedNode.id) : []),
    [draft.graph, selectedNode],
  );

  const incoming = useMemo(
    () => (selectedNode ? incomingEdges(draft.graph, selectedNode.id) : []),
    [draft.graph, selectedNode],
  );

  const availableTargets = useMemo(() => {
    if (!selectedNode) {
      return [];
    }
    const existingTargets = new Set(
      outgoingEdges(draft.graph, selectedNode.id).map((edge) => edge.to),
    );
    return draft.graph.nodes.filter(
      (node) => node.id !== selectedNode.id && !existingTargets.has(node.id),
    );
  }, [draft.graph, selectedNode]);

  function selectNode(nodeId: string | null): void {
    setSelectedNodeId(nodeId);
    setSelectedEdgeKey(null);
  }

  function selectEdge(key: string | null): void {
    setSelectedEdgeKey(key);
    setSelectedNodeId(null);
  }

  function handleAddStepAfter(nodeId: string): void {
    const type: WorkflowNodeType = 'task';
    draft.setGraph((current) => {
      const result = addNode(current, type, nodeId);
      return result.graph;
    });
  }

  function handleAddBranch(nodeId: string): void {
    draft.setGraph((current) => {
      const result = addNode(current, 'task', nodeId);
      return result.graph;
    });
  }

  function handleAddNode(type: WorkflowNodeType): void {
    let addedNodeId: string | null = null;
    draft.setGraph((current) => {
      const result = addNode(current, type);
      addedNodeId = result.node.id;
      return result.graph;
    });
    if (addedNodeId !== null) {
      selectNode(addedNodeId);
      setShowInspector(true);
    }
  }

  function handleDuplicateNode(nodeId: string): void {
    let copiedNodeId: string | null = null;
    draft.setGraph((current) => {
      const result = duplicateNode(current, nodeId);
      if (result === null) {
        return current;
      }
      copiedNodeId = result.node.id;
      return result.graph;
    });
    if (copiedNodeId !== null) {
      selectNode(copiedNodeId);
      setShowInspector(true);
    }
  }

  function handleUpdateNode(
    nodeId: string,
    patch: Partial<WorkflowNode>,
  ): void {
    draft.setGraph((current) => updateNode(current, nodeId, patch));
  }

  function handleChangeNodeType(nodeId: string, type: WorkflowNodeType): void {
    draft.setGraph((current) => changeNodeType(current, nodeId, type));
  }

  function handleRemoveNode(nodeId: string): void {
    draft.setGraph((current) => removeNode(current, nodeId));
    if (selectedNodeId === nodeId) {
      selectNode(null);
      setShowInspector(false);
    }
  }

  function handleAddEdge(from: string, to: string): void {
    draft.setGraph((current) => addEdge(current, from, to));
    setSelectedEdgeKey(edgeKey(from, to));
  }

  function handleRemoveEdge(key: string): void {
    draft.setGraph((current) => removeEdgeByKey(current, key));
    if (selectedEdgeKey === key) {
      selectEdge(null);
      setShowInspector(false);
    }
  }

  function handleInsertNodeInEdge(key: string, type: WorkflowNodeType): void {
    const [from, to] = key.split('\u0000');
    let insertedNodeId: string | null = null;
    draft.setGraph((current) => {
      const result = insertNodeBetween(current, type, from, to);
      if (result === null) {
        return current;
      }
      insertedNodeId = result.node.id;
      return result.graph;
    });
    if (insertedNodeId !== null) {
      selectNode(insertedNodeId);
      setShowInspector(true);
    }
  }

  function handleUpdateEdgeLabel(key: string, label: string): void {
    draft.setGraph((current) => {
      const index = edgeIndexFromKey(current, key);
      if (index === -1) {
        return current;
      }
      const trimmed = label.trim();
      return updateEdge(current, index, {
        label: trimmed.length > 0 ? trimmed : undefined,
      });
    });
  }

  function handleSetEdgeCondition(
    key: string,
    condition: WorkflowExpression | undefined,
  ): void {
    draft.setGraph((current) => {
      const index = edgeIndexFromKey(current, key);
      if (index === -1) {
        return current;
      }
      return updateEdgeCondition(current, index, condition);
    });
  }

  function handleAddInput(): void {
    draft.setGraph((current) => {
      const inputs = [...(current.inputs ?? []), ''];
      return updateInputs(current, inputs);
    });
  }

  function handleRemoveInput(index: number): void {
    draft.setGraph((current) => {
      const inputs = [...(current.inputs ?? [])];
      inputs.splice(index, 1);
      return updateInputs(current, inputs);
    });
  }

  function handleUpdateInput(index: number, value: string): void {
    draft.setGraph((current) => {
      const inputs = [...(current.inputs ?? [])];
      inputs[index] = value;
      return updateInputs(current, inputs);
    });
  }

  return {
    draft,
    selectedNodeId,
    setSelectedNodeId: selectNode,
    selectedEdgeKey,
    setSelectedEdgeKey: selectEdge,
    showInspector,
    setShowInspector,
    selectedNode,
    selectedEdge,
    outgoing,
    incoming,
    availableTargets,
    handleAddStepAfter,
    handleAddBranch,
    handleAddNode,
    handleDuplicateNode,
    handleUpdateNode,
    handleChangeNodeType,
    handleRemoveNode,
    handleAddEdge,
    handleRemoveEdge,
    handleInsertNodeInEdge,
    handleUpdateEdgeLabel,
    handleSetEdgeCondition,
    handleAddInput,
    handleRemoveInput,
    handleUpdateInput,
  };
}

function edgeIndexFromKey(graph: WorkflowGraph, key: string): number {
  const [from, to] = key.split('\u0000');
  return edgeIndex(graph, from, to);
}
