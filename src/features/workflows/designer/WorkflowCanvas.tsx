import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
} from '@xyflow/react';
import { LayoutGrid, Maximize2 } from 'lucide-react';
import type { JSX } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import { outgoingEdges } from '@/features/workflows/model/workflowGraph.ts';
import type {
  WorkflowGraph,
  WorkflowNodeType,
  WorkflowValidationIssue,
} from '@/features/workflows/types.ts';
import { useTheme } from '@/hooks/use-theme.ts';

import { WorkflowFlowEdge } from './flow/FlowEdge.tsx';
import { WorkflowFlowNode } from './flow/FlowNode.tsx';
import { useWorkflowFlow } from './flow/useWorkflowFlow.ts';
import {
  WorkflowCanvasContextMenu,
  type WorkflowContextMenuAction,
  type WorkflowContextMenuTarget,
} from './flow/WorkflowCanvasContextMenu.tsx';

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
    return () => cancelAnimationFrame(id);
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
        onRemoveNode(action.nodeId);
        break;
      }
      case 'edit-edge': {
        onSelectEdge(action.edgeKey);
        break;
      }
      case 'delete-edge': {
        onRemoveEdge(action.edgeKey);
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
  const contextMenuCanAddStepAfter = (() => {
    if (contextMenu?.kind !== 'node') {
      return false;
    }
    const node = graph.nodes.find((item) => item.id === contextMenu.nodeId);
    if (!node || node.type === 'end') {
      return false;
    }
    if (node.type === 'decision') {
      return true;
    }
    return outgoingEdges(graph, node.id).length === 0;
  })();
  const contextMenuVisible =
    contextMenu !== null &&
    (contextMenu.kind !== 'node' || contextMenuNodeType !== null);

  return (
    <div
      className='relative h-full w-full bg-background'
      data-testid='workflow-canvas'
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
        onMoveStart={() => {
          setContextMenu(null);
        }}
        onPaneContextMenu={(event) => {
          event.preventDefault();
          setContextMenu({ kind: 'pane', x: event.clientX, y: event.clientY });
        }}
        onNodeContextMenu={(event, node) => {
          event.preventDefault();
          setContextMenu({
            kind: 'node',
            nodeId: node.id,
            x: event.clientX,
            y: event.clientY,
          });
        }}
        onEdgeContextMenu={(event, edge) => {
          event.preventDefault();
          setContextMenu({
            kind: 'edge',
            edgeKey: edge.id,
            x: event.clientX,
            y: event.clientY,
          });
        }}
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
        <Panel position='top-center'>
          <div className='flex items-center gap-1 rounded-lg border border-border/70 bg-card/90 p-1 shadow-sm backdrop-blur-sm'>
            <Button
              type='button'
              variant='ghost'
              size='icon-sm'
              aria-label={t('canvas.fitView')}
              title={t('canvas.fitView')}
              onClick={() => {
                void fitView({ padding: 0.2, duration: 300 });
              }}
            >
              <Maximize2 />
            </Button>
            <Button
              type='button'
              variant='ghost'
              size='icon-sm'
              aria-label={t('canvas.autoLayout')}
              title={t('canvas.autoLayout')}
              onClick={() => {
                flow.autoLayout(graph);
              }}
            >
              <LayoutGrid />
            </Button>
          </div>
        </Panel>
      </ReactFlow>
      {contextMenuVisible && contextMenu ? (
        <WorkflowCanvasContextMenu
          target={contextMenu}
          nodeType={contextMenuNodeType}
          canAddStepAfter={contextMenuCanAddStepAfter}
          readOnly={readOnly}
          onSelect={handleContextMenuAction}
          onClose={() => {
            setContextMenu(null);
          }}
        />
      ) : null}
    </div>
  );
}
