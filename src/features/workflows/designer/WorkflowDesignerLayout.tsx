import type { JSX } from 'react';
import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppShell } from '@/components/app-shell.tsx';
import { StatusState } from '@/components/status-state.tsx';
import { DocumentMeta } from '@/components/theme-toggle.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import type { WorkflowVersion } from '@/features/workflows/types.ts';
import { useIsMobile } from '@/hooks/use-mobile.ts';

import { useWorkflowDesignerLayout } from './useWorkflowDesignerLayout.ts';
import { WorkflowCanvas } from './WorkflowCanvas.tsx';
import { WorkflowCanvasStatus } from './WorkflowCanvasStatus.tsx';
import { WorkflowDesignerToolbar } from './WorkflowDesignerToolbar.tsx';
import { WorkflowInspector, type InspectorMode } from './WorkflowInspector.tsx';
import { WorkflowNodeTypeBadge } from './WorkflowNodeTypeBadge.tsx';

const LazyWorkflowPreviewDialog = lazy(async () => {
  const module = await import('../preview/WorkflowPreviewDialog.tsx');
  return { default: module.WorkflowPreviewDialog };
});

interface WorkflowDesignerLayoutProps {
  code: string;
  initialDraft: WorkflowVersion;
}

export function WorkflowDesignerLayout({
  code,
  initialDraft,
}: WorkflowDesignerLayoutProps): JSX.Element {
  const { t } = useTranslation('workflows');
  const layout = useWorkflowDesignerLayout(code, initialDraft);
  const isMobile = useIsMobile();
  const { draft } = layout;
  const [previewOpen, setPreviewOpen] = useState(false);

  const isBootstrapping = draft.isLoading || draft.loadError !== null;

  function handleSelectNode(nodeId: string | null): void {
    if (nodeId === null) {
      layout.setSelectedNodeId(null);
      layout.setShowInspector(false);
      return;
    }
    layout.setSelectedNodeId(nodeId);
    layout.setShowInspector(true);
  }

  function handleSelectEdge(key: string | null): void {
    if (key === null) {
      layout.setSelectedEdgeKey(null);
      layout.setShowInspector(false);
      return;
    }
    layout.setSelectedEdgeKey(key);
    layout.setShowInspector(true);
  }

  function handleOpenSettings(): void {
    layout.setSelectedNodeId(null);
    layout.setSelectedEdgeKey(null);
    layout.setShowInspector(true);
  }

  function handleCloseInspector(): void {
    layout.setShowInspector(false);
    layout.setSelectedNodeId(null);
    layout.setSelectedEdgeKey(null);
  }

  const inspectorMode: InspectorMode = (() => {
    if (layout.selectedEdge) {
      return 'edge';
    }
    if (layout.selectedNode) {
      return 'node';
    }
    return 'workflow';
  })();
  const inspectorOpen =
    !isBootstrapping &&
    (layout.showInspector ||
      layout.selectedNode !== null ||
      layout.selectedEdge !== null);

  const nodeTitle = ((): string => {
    const name = layout.selectedNode?.name?.trim();
    if (name) {
      return name;
    }
    const type = layout.selectedNode ? layout.selectedNode.type : 'task';
    return t('node.unnamed', { type: t(`node.${type}`) });
  })();
  const edgeTitle =
    layout.selectedEdge?.edge.label?.trim() || t('inspector.transitions');

  const inspectorTitle = ((): string => {
    if (inspectorMode === 'edge') {
      return edgeTitle;
    }
    if (inspectorMode === 'node') {
      return nodeTitle;
    }
    return t('inspector.workflowSettings');
  })();

  const inspectorSubtitle = ((): string | null => {
    if (inspectorMode === 'node' && layout.selectedNode) {
      return layout.selectedNode.id;
    }
    if (inspectorMode === 'edge' && layout.selectedEdge) {
      return `${layout.selectedEdge.edge.from} → ${layout.selectedEdge.edge.to}`;
    }
    return null;
  })();

  function renderMain(): JSX.Element {
    if (draft.isLoading) {
      return (
        <StatusState
          kind='loading'
          title={t('loading.title')}
          description={t('loading.description')}
        />
      );
    }
    if (draft.loadError !== null) {
      return (
        <StatusState
          kind='error'
          title={t('loadError.title')}
          description={draft.loadError}
          actionLabel={t('loadError.retry')}
          onAction={() => {
            void draft.reloadDraft();
          }}
        />
      );
    }
    return (
      <div className='flex min-h-0 flex-1'>
        <div className='flex min-w-0 flex-1 flex-col'>
          <header className='flex shrink-0 items-end justify-between gap-4 border-b border-border/60 px-4 py-3 md:px-6'>
            <div className='grid min-w-0 gap-0.5'>
              <p className='text-[0.625rem] font-medium tracking-[0.14em] text-primary uppercase'>
                {t('header.workflowDraft')}
              </p>
              <h1 className='truncate font-heading text-xl font-medium tracking-tight'>
                {t('canvas.title')}
              </h1>
            </div>
            <span className='shrink-0 font-mono text-xs text-muted-foreground'>
              {t('canvas.nodesCount', { count: draft.graph.nodes.length })}
            </span>
          </header>

          <div className='relative min-h-0 flex-1'>
            <WorkflowCanvas
              graph={draft.graph}
              validationIssues={draft.validationIssues}
              selectedNodeId={layout.selectedNodeId}
              selectedEdgeKey={layout.selectedEdgeKey}
              readOnly={draft.isReadOnly}
              onSelectNode={handleSelectNode}
              onSelectEdge={handleSelectEdge}
              onAddStep={layout.handleAddStepAfter}
              onAddNode={layout.handleAddNode}
              onDuplicateNode={layout.handleDuplicateNode}
              onOpenSettings={(nodeId) => {
                layout.setSelectedNodeId(nodeId);
                layout.setShowInspector(true);
              }}
              onUpdateNode={layout.handleUpdateNode}
              onCommitNodeName={layout.handleCommitNodeName}
              onConnectNodes={(from, to) => {
                layout.handleAddEdge(from, to);
                layout.setShowInspector(true);
              }}
              onRemoveNode={layout.handleRemoveNode}
              onRemoveEdge={layout.handleRemoveEdge}
              onInsertNodeInEdge={layout.handleInsertNodeInEdge}
              positionsKey={`${code}:${initialDraft.id}`}
            />
            <div className='pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center'>
              <WorkflowCanvasStatus
                issues={draft.validationIssues}
                saveState={draft.saveState}
                saveError={draft.saveError}
                onSelectIssue={(issue) => {
                  if (issue.nodeId) {
                    handleSelectNode(issue.nodeId);
                  }
                }}
              />
            </div>
          </div>
        </div>

        {inspectorOpen ? (
          <WorkflowInspector
            key={(() => {
              if (inspectorMode === 'edge' && layout.selectedEdge) {
                return `edge-${layout.selectedEdge.edge.from}-${layout.selectedEdge.edge.to}`;
              }
              if (inspectorMode === 'node' && layout.selectedNode) {
                return `node-${layout.selectedNode.id}`;
              }
              return 'workflow';
            })()}
            open={inspectorOpen}
            onOpenChange={(open) => {
              if (!open) {
                handleCloseInspector();
              }
            }}
            mode={inspectorMode}
            title={inspectorTitle}
            subtitle={inspectorSubtitle}
            badges={(() => {
              if (inspectorMode === 'node' && layout.selectedNode) {
                return (
                  <WorkflowNodeTypeBadge type={layout.selectedNode.type} />
                );
              }
              if (inspectorMode === 'edge' && layout.selectedEdge) {
                return (
                  <Badge
                    variant='secondary'
                    className='font-normal'
                  >
                    {layout.selectedEdge.edge.condition
                      ? t('inspector.condition')
                      : t('inspector.defaultBranch')}
                  </Badge>
                );
              }
              return undefined;
            })()}
            bodyProps={{
              graph: draft.graph,
              inputs: draft.graph.inputs ?? [],
              readOnly: draft.isReadOnly,
              selectedNode: layout.selectedNode,
              selectedEdge: layout.selectedEdge,
              onChangeNode: (patch) => {
                if (layout.selectedNode) {
                  layout.handleUpdateNode(layout.selectedNode.id, patch);
                }
              },
              onChangeNodeType: (type) => {
                if (layout.selectedNode) {
                  layout.handleChangeNodeType(layout.selectedNode.id, type);
                }
              },
              onCommitNodeName: (nodeId, name) => {
                layout.handleCommitNodeName(nodeId, name);
              },
              onRemoveNode: () => {
                if (layout.selectedNode) {
                  layout.handleRemoveNode(layout.selectedNode.id);
                  handleCloseInspector();
                }
              },
              outgoing: layout.outgoing,
              incoming: layout.incoming,
              availableTargets: layout.availableTargets,
              onAddEdge: (to) => {
                if (layout.selectedNode) {
                  layout.handleAddEdge(layout.selectedNode.id, to);
                }
              },
              onSelectEdge: (key) => {
                handleSelectEdge(key);
              },
              onRemoveEdge: (key) => {
                layout.handleRemoveEdge(key);
                handleCloseInspector();
              },
              onChangeEdgeLabel: (key, label) => {
                layout.handleUpdateEdgeLabel(key, label);
              },
              onSetEdgeCondition: (key, condition) => {
                layout.handleSetEdgeCondition(key, condition);
              },
              onAddInput: layout.handleAddInput,
              onRemoveInput: layout.handleRemoveInput,
              onUpdateInput: layout.handleUpdateInput,
            }}
          />
        ) : null}
      </div>
    );
  }

  const headerSubtitle = ((): string => {
    if (draft.isLoading) {
      return t('loading.title');
    }
    if (draft.isReadOnly) {
      if (initialDraft.status === 'published') {
        return t('header.publishedSnapshot');
      }
      return t('header.readOnlyReview');
    }
    return t('header.editingDraft');
  })();

  return (
    <AppShell variant='minimal'>
      <DocumentMeta />
      <div className='flex h-[calc(100svh-3.5rem)] min-h-0 flex-col overflow-hidden bg-background'>
        <WorkflowDesignerToolbar
          code={code}
          subtitle={headerSubtitle}
          isBootstrapping={isBootstrapping}
          draft={draft}
          isMobile={isMobile}
          onOpenSettings={handleOpenSettings}
          onOpenPreview={() => {
            setPreviewOpen(true);
          }}
        />

        {renderMain()}

        {previewOpen && !isBootstrapping ? (
          <Suspense fallback={null}>
            <LazyWorkflowPreviewDialog
              open={previewOpen}
              onOpenChange={setPreviewOpen}
              code={code}
              graph={draft.graph}
              validationIssues={draft.validationIssues}
            />
          </Suspense>
        ) : null}
      </div>
    </AppShell>
  );
}
