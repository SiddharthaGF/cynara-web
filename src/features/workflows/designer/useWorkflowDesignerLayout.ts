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
  nodeIdFromName,
  outgoingEdges,
  removeEdgeByKey,
  removeNode,
  renameNode,
  updateEdge,
  updateEdgeCondition,
  updateInputs,
  updateNode,
} from '@/features/workflows/model/workflowGraph.ts';
import type {
  WorkflowEdge,
  WorkflowExpression,
  WorkflowNode,
  WorkflowNodeType,
  WorkflowVersion,
} from '@/features/workflows/types.ts';

import { migrateWorkflowPositions } from './flow/workflowCanvasStorage.ts';
import {
  createEscapeKeyHandler,
  createShortcutKeyHandler,
  edgeIndexFromKey,
  remapEdgeKey,
  targetOptions,
} from './useWorkflowDesignerLayout.helpers.ts';

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
  /** Re-ids a task/decision node from its name (called when a name edit commits). */
  handleCommitNodeName: (nodeId: string, name: string) => void;
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
    const handleKeyDown = createEscapeKeyHandler(() => {
      setSelectedNodeId(null);
      setSelectedEdgeKey(null);
      setShowInspector(false);
    });
    window.addEventListener('keydown', handleKeyDown);
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNodeId, selectedEdgeKey]);

  // Editor shortcuts (see `createShortcutKeyHandler`): Ctrl/Cmd+S saves,
  // Ctrl/Cmd+Z undoes, Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y redo. Undo/redo apply
  // To the whole graph even when the focus is in an inspector input (typing
  // Bursts are coalesced into one history step), but yield to native behavior
  // While an overlay is open.
  useEffect(() => {
    const handleKeyDown = createShortcutKeyHandler({
      isReadOnly: draft.isReadOnly,
      redo: draft.redo,
      saveNow: draft.saveNow,
      undo: draft.undo,
    });
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

  const availableTargets = useMemo(
    () => (selectedNode ? targetOptions(draft.graph, selectedNode) : []),
    [draft.graph, selectedNode],
  );

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

  function handleCommitNodeName(nodeId: string, name: string): void {
    if (draft.isReadOnly) {
      return;
    }
    const nextId = nodeIdFromName(draft.graph, nodeId, name);
    if (nextId === null) {
      return;
    }
    draft.setGraph((current) => renameNode(current, nodeId, nextId));
    // The renamed node keeps its persisted canvas position.
    migrateWorkflowPositions(`${code}:${initialDraft.id}`, nodeId, nextId);
    // Selection survives the id change: keep the node (and any selected edge
    // Touching it) pointed at the renamed id.
    if (selectedNodeId === nodeId) {
      selectNode(nextId);
    }
    if (selectedEdgeKey) {
      const nextKey = remapEdgeKey(selectedEdgeKey, nodeId, nextId);
      if (nextKey !== selectedEdgeKey) {
        selectEdge(nextKey);
      }
    }
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
    handleCommitNodeName,
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
