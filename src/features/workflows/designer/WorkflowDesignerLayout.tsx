import { Link, useParams } from '@tanstack/react-router';
import { ArrowLeft, Redo2, Settings2, Undo2 } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { AppShell } from '@/components/app-shell.tsx';
import { StatusState } from '@/components/status-state.tsx';
import { DocumentMeta } from '@/components/theme-toggle.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { TooltipIconButton } from '@/components/ui/tooltip-button.tsx';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx';
import type { WorkflowVersion } from '@/features/workflows/types.ts';
import { useIsMobile } from '@/hooks/use-mobile.ts';
import { cn } from '@/lib/utils.ts';

import { useWorkflowDesignerLayout } from './useWorkflowDesignerLayout.ts';
import { WorkflowCanvas } from './WorkflowCanvas.tsx';
import { WorkflowCanvasStatus } from './WorkflowCanvasStatus.tsx';
import { WorkflowInspector, type InspectorMode } from './WorkflowInspector.tsx';
import { WorkflowNodeTypeBadge } from './WorkflowNodeTypeBadge.tsx';
import { WorkflowSaveButton } from './WorkflowSaveButton.tsx';
import { WorkflowSaveStatusBanner } from './WorkflowSaveStatusBanner.tsx';

interface WorkflowDesignerLayoutProps {
  code: string;
  initialDraft: WorkflowVersion;
}

export function WorkflowDesignerLayout({
  code,
  initialDraft,
}: WorkflowDesignerLayoutProps): JSX.Element {
  const { t } = useTranslation('workflows');
  const { locale } = useParams({ from: '/$locale' });
  const layout = useWorkflowDesignerLayout(code, initialDraft);
  const isMobile = useIsMobile();
  const { draft } = layout;

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

  const nodeTitle = (() => {
    const name = layout.selectedNode?.name?.trim();
    if (name) {
      return name;
    }
    const type = layout.selectedNode ? layout.selectedNode.type : 'task';
    return t('node.unnamed', { type: t(`node.${type}`) });
  })();
  const edgeTitle =
    layout.selectedEdge?.edge.label?.trim() || t('inspector.transitions');

  const inspectorTitle = (() => {
    if (inspectorMode === 'edge') {
      return edgeTitle;
    }
    if (inspectorMode === 'node') {
      return nodeTitle;
    }
    return t('inspector.workflowSettings');
  })();

  const inspectorSubtitle = (() => {
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

  const headerSubtitle = (() => {
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
        <div className='flex h-12 shrink-0 items-center gap-2 border-b border-border/60 bg-card/70 px-3 backdrop-blur-md md:gap-3 md:px-4'>
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  to='/$locale/workflows'
                  params={{ locale }}
                  aria-label={t('toolbar.workflows')}
                  className='inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-[min(var(--radius-md),12px)] border border-transparent px-2 text-[0.8rem] font-medium whitespace-nowrap transition-colors outline-none select-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:pointer-events-none [&_svg]:shrink-0'
                >
                  <ArrowLeft className='size-4' />
                  <span className='hidden sm:inline'>
                    {t('toolbar.workflows')}
                  </span>
                </Link>
              }
            />
            <TooltipContent side='bottom'>
              {t('toolbar.workflows')}
            </TooltipContent>
          </Tooltip>

          <div className='min-w-0 flex-1 sm:border-l sm:border-border/50 sm:pl-3'>
            <p className='truncate font-heading text-sm font-medium'>{code}</p>
            <p className='hidden truncate text-xs text-muted-foreground sm:block'>
              {headerSubtitle}
            </p>
          </div>

          {isBootstrapping ? null : (
            <>
              <TooltipIconButton
                type='button'
                variant='ghost'
                size='sm'
                aria-label={t('toolbar.undo')}
                label={t('toolbar.undoHint')}
                disabled={draft.isReadOnly || !draft.canUndo}
                onClick={() => {
                  draft.undo();
                }}
                className='shrink-0'
              >
                <Undo2 className='size-3.5' />
              </TooltipIconButton>
              <TooltipIconButton
                type='button'
                variant='ghost'
                size='sm'
                aria-label={t('toolbar.redo')}
                label={t('toolbar.redoHint')}
                disabled={draft.isReadOnly || !draft.canRedo}
                onClick={() => {
                  draft.redo();
                }}
                className='shrink-0'
              >
                <Redo2 className='size-3.5' />
              </TooltipIconButton>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                disabled={draft.isReadOnly && !isMobile}
                onClick={handleOpenSettings}
                className={cn('shrink-0 gap-1.5')}
              >
                <Settings2 className='size-3.5' />
                <span className='hidden sm:inline'>
                  {t('toolbar.settings')}
                </span>
              </Button>
              <WorkflowSaveButton
                state={draft.saveState}
                disabled={draft.isReadOnly}
                hint={t('toolbar.saveHint')}
                onClick={() => {
                  void draft.saveNow();
                }}
              />
            </>
          )}
        </div>

        {draft.saveState === 'conflict' ? (
          <div className='shrink-0 border-b bg-card px-4 py-2'>
            <WorkflowSaveStatusBanner
              state={draft.saveState}
              error={draft.saveError}
              defaultConcurrencyMessage={t('concurrency.defaultMessage')}
              onReload={() => {
                void draft.reloadDraft();
              }}
              onDismissConflict={draft.dismissConflict}
            />
          </div>
        ) : null}

        {renderMain()}
      </div>
    </AppShell>
  );
}
