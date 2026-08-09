import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
} from '@xyflow/react';
import type { JSX } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  ContextMenu,
  ContextMenuTrigger,
} from '@/components/ui/context-menu.tsx';
import { outgoingEdges } from '@/features/workflows/model/workflowGraph.ts';
import type {
  WorkflowGraph,
  WorkflowNode,
  WorkflowNodeType,
  WorkflowValidationIssue,
} from '@/features/workflows/types.ts';
import { useLongPress } from '@/hooks/use-long-press.ts';
import { useTheme } from '@/hooks/use-theme.ts';

import {
  canAddStepAfterTarget,
  resolveContextMenuTarget,
  type WorkflowContextMenuTarget,
} from './flow/contextMenuTarget.ts';
import { WorkflowFlowEdge } from './flow/FlowEdge.tsx';
import { WorkflowFlowNode } from './flow/FlowNode.tsx';
import { useWorkflowFlow } from './flow/useWorkflowFlow.ts';
import {
  WorkflowCanvasContextMenu,
  type WorkflowContextMenuAction,
} from './flow/WorkflowCanvasContextMenu.tsx';
import {
  WorkflowCanvasDeleteDialog,
  type WorkflowCanvasDeleteTarget,
} from './WorkflowCanvasDeleteDialog.tsx';
import { WorkflowCanvasGuidance } from './WorkflowCanvasGuidance.tsx';
import { WorkflowCanvasToolbar } from './WorkflowCanvasToolbar.tsx';

const NODE_TYPES = {
  start: WorkflowFlowNode,
  end: WorkflowFlowNode,
  task: WorkflowFlowNode,
  decision: WorkflowFlowNode,
};

const EDGE_TYPES = {
  workflow: WorkflowFlowEdge,
};

interface WorkflowCanvasProps {
  graph: WorkflowGraph;
  validationIssues: WorkflowValidationIssue[];
  selectedNodeId: string | null;
  selectedEdgeKey: string | null;
  readOnly: boolean;
  onSelectNode: (nodeId: string | null) => void;
  onSelectEdge: (key: string | null) => void;
  onAddStep: (nodeId: string) => void;
  onAddNode: (type: WorkflowNodeType) => void;
  onDuplicateNode: (nodeId: string) => void;
  onOpenSettings: (nodeId: string) => void;
  onUpdateNode: (nodeId: string, patch: Partial<WorkflowNode>) => void;
  /** Re-ids a task/decision node from its name when a name edit commits. */
  onCommitNodeName: (nodeId: string, name: string) => void;
  onConnectNodes: (from: string, to: string) => void;
  onRemoveNode: (nodeId: string) => void;
  onRemoveEdge: (key: string) => void;
  onInsertNodeInEdge: (key: string, type: WorkflowNodeType) => void;
  /** Storage key (workflow code + draft id) for the browser-persisted layout. */
  positionsKey: string;
}

export function WorkflowCanvas(props: WorkflowCanvasProps): JSX.Element {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

function WorkflowCanvasInner({
  graph,
  validationIssues,
  selectedNodeId,
  selectedEdgeKey,
  readOnly,
  onSelectNode,
  onSelectEdge,
  onAddStep,
  onAddNode,
  onDuplicateNode,
  onOpenSettings,
  onUpdateNode,
  onCommitNodeName,
  onConnectNodes,
  onRemoveNode,
  onRemoveEdge,
  onInsertNodeInEdge,
  positionsKey,
}: WorkflowCanvasProps): JSX.Element {
  const { t } = useTranslation('workflows');
  const { theme } = useTheme();
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const hasFitOnMount = useRef(false);
  const [contextMenu, setContextMenu] =
    useState<WorkflowContextMenuTarget | null>(null);
  // Holds the touched surface from our long-press hook until the menu opens.
  const pendingTouchTargetRef = useRef<WorkflowContextMenuTarget | null>(null);
  // Context-menu deletes confirm first, reusing the inspector dialogs.
  const [pendingDelete, setPendingDelete] =
    useState<WorkflowCanvasDeleteTarget | null>(null);

  const flow = useWorkflowFlow({
    graph,
    validationIssues,
    selectedNodeId,
    selectedEdgeKey,
    readOnly,
    defaultBranchLabel: t('inspector.defaultBranch'),
    onSelectNode,
    onSelectEdge,
    onAddStep,
    onOpenSettings,
    onUpdateNode,
    onCommitNodeName,
    onConnectNodes,
    onRemoveNode,
    onRemoveEdge,
    positionsKey,
  });

  // Fit the auto layout into view once nodes have been measured.
  useEffect(() => {
    if (hasFitOnMount.current || !nodesInitialized) {
      return undefined;
    }
    hasFitOnMount.current = true;
    const id = requestAnimationFrame(() => {
      void fitView({ padding: 0.2, duration: 300 });
    });
    return (): void => cancelAnimationFrame(id);
  }, [nodesInitialized, fitView]);

  // Refit after the user triggers an auto layout.
  useEffect(() => {
    if (flow.layoutVersion > 0) {
      void fitView({ padding: 0.2, duration: 400 });
    }
  }, [flow.layoutVersion, fitView]);

  function handleContextMenuAction(action: WorkflowContextMenuAction): void {
    setContextMenu(null);
    switch (action.type) {
      case 'add-task': {
        onAddNode('task');
        break;
      }
      case 'add-decision': {
        onAddNode('decision');
        break;
      }
      case 'add-step-after': {
        onAddStep(action.nodeId);
        break;
      }
      case 'add-branch': {
        onAddStep(action.nodeId);
        break;
      }
      case 'insert-step': {
        onInsertNodeInEdge(action.edgeKey, 'task');
        break;
      }
      case 'duplicate-node': {
        onDuplicateNode(action.nodeId);
        break;
      }
      case 'edit-node': {
        onOpenSettings(action.nodeId);
        break;
      }
      case 'delete-node': {
        setPendingDelete({ kind: 'node', nodeId: action.nodeId });
        break;
      }
      case 'edit-edge': {
        onSelectEdge(action.edgeKey);
        break;
      }
      case 'delete-edge': {
        setPendingDelete({ kind: 'edge', edgeKey: action.edgeKey });
        break;
      }
      case 'auto-layout': {
        flow.autoLayout(graph);
        break;
      }
      case 'fit-view': {
        void fitView({ padding: 0.2, duration: 300 });
        break;
      }
      default: {
        break;
      }
    }
  }

  const contextMenuNodeType =
    contextMenu?.kind === 'node'
      ? (graph.nodes.find((node) => node.id === contextMenu.nodeId)?.type ??
        null)
      : null;
  const contextMenuCanAddStepAfter = contextMenu
    ? canAddStepAfterTarget(graph, contextMenu)
    : false;
  const contextMenuVisible =
    contextMenu !== null &&
    (contextMenu.kind !== 'node' || contextMenuNodeType !== null);

  // Fresh drafts arrive with only the Start and End nodes. Guide the first
  // Composition step on the canvas itself, like the form designer's empty
  // State: a visible prompt with real buttons instead of a hidden gesture.
  const showGuidance =
    !readOnly &&
    graph.nodes.filter((node) => node.type !== 'start' && node.type !== 'end')
      .length === 0;
  const startNode = graph.nodes.find((node) => node.type === 'start');
  const handleGuidanceAddStep = (): void => {
    if (startNode && outgoingEdges(graph, startNode.id).length === 0) {
      onAddStep(startNode.id);
    } else {
      onAddNode('task');
    }
  };

  // Touch devices have no right-click, so a held press opens the same context
  // Menu. This hook only records which surface was held; it also swallows the
  // Click that follows the lift so the press does not select a node behind it.
  const longPress = useLongPress({
    shouldIgnore: (target) =>
      target instanceof Element &&
      target.closest(
        '.react-flow__handle, .nodrag, .react-flow__controls, .react-flow__minimap, .react-flow__panel, button, [role="menu"]',
      ) !== null,
    onLongPress: ({ x, y, target }) => {
      pendingTouchTargetRef.current = resolveContextMenuTarget(x, y, target);
    },
  });

  return (
    <ContextMenu
      open={contextMenu !== null}
      onOpenChange={(open) => {
        if (!open) {
          setContextMenu(null);
          return;
        }
        const pending = pendingTouchTargetRef.current;
        pendingTouchTargetRef.current = null;
        if (pending) {
          setContextMenu(pending);
        }
      }}
    >
      <ContextMenuTrigger
        className='relative h-full w-full bg-background'
        {...longPress}
      >
        <ReactFlow
          nodes={flow.nodes}
          edges={flow.edges}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          colorMode={theme}
          onNodesChange={flow.onNodesChange}
          onEdgesChange={flow.onEdgesChange}
          onSelectionChange={flow.onSelectionChange}
          onConnect={flow.onConnect}
          onNodeDragStop={flow.onNodeDragStop}
          isValidConnection={flow.isValidConnection}
          onPaneClick={() => {
            setContextMenu(null);
            onSelectNode(null);
            onSelectEdge(null);
          }}
          onPaneContextMenu={(event) =>
            setContextMenu({
              kind: 'pane',
              x: event.clientX,
              y: event.clientY,
            })
          }
          onNodeContextMenu={(event, node) =>
            setContextMenu({
              kind: 'node',
              nodeId: node.id,
              x: event.clientX,
              y: event.clientY,
            })
          }
          onEdgeContextMenu={(event, edge) =>
            setContextMenu({
              kind: 'edge',
              edgeKey: edge.id,
              x: event.clientX,
              y: event.clientY,
            })
          }
          connectionLineType={ConnectionLineType.SmoothStep}
          connectionLineStyle={{ stroke: 'var(--primary)', strokeWidth: 1.5 }}
          deleteKeyCode={['Backspace', 'Delete']}
          edgesReconnectable={false}
          minZoom={0.25}
          maxZoom={1.75}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          nodesFocusable={!readOnly}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            color='var(--canvas-grid)'
          />
          <Controls showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            className='overflow-hidden rounded-lg border border-border/70 shadow-sm'
          />
          <WorkflowCanvasToolbar
            readOnly={readOnly}
            onAddNode={onAddNode}
            onFitView={() => {
              void fitView({ padding: 0.2, duration: 300 });
            }}
            onAutoLayout={() => {
              flow.autoLayout(graph);
            }}
          />
        </ReactFlow>
        {showGuidance ? (
          <WorkflowCanvasGuidance
            onAddStep={handleGuidanceAddStep}
            onAddNode={onAddNode}
          />
        ) : null}
      </ContextMenuTrigger>
      {contextMenuVisible && contextMenu ? (
        <WorkflowCanvasContextMenu
          target={contextMenu}
          nodeType={contextMenuNodeType}
          canAddStepAfter={contextMenuCanAddStepAfter}
          readOnly={readOnly}
          onSelect={handleContextMenuAction}
        />
      ) : null}

      <WorkflowCanvasDeleteDialog
        pendingDelete={pendingDelete}
        onCancel={() => {
          setPendingDelete(null);
        }}
        onRemoveNode={onRemoveNode}
        onRemoveEdge={onRemoveEdge}
      />
    </ContextMenu>
  );
}
