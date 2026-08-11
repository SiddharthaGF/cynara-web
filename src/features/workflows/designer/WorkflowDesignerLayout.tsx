import type { JSX } from 'react';
import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppShell } from '@/components/app-shell.tsx';
import { StatusState } from '@/components/status-state.tsx';
import { DocumentMeta } from '@/components/theme-toggle.tsx';
import type { WorkflowVersion } from '@/features/workflows/types.ts';
import { useIsMobile } from '@/hooks/use-mobile.ts';

import { useWorkflowDesignerLayout } from './useWorkflowDesignerLayout.ts';
import { WorkflowCanvas } from './WorkflowCanvas.tsx';
import { WorkflowCanvasStatus } from './WorkflowCanvasStatus.tsx';
import { WorkflowDesignerHeader } from './WorkflowDesignerHeader.tsx';
import { WorkflowDesignerInspector } from './WorkflowDesignerInspector.tsx';
import { WorkflowDesignerToolbar } from './WorkflowDesignerToolbar.tsx';

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

  const inspectorOpen =
    !isBootstrapping &&
    (layout.showInspector ||
      layout.selectedNode !== null ||
      layout.selectedEdge !== null);

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
          <WorkflowDesignerHeader nodeCount={draft.graph.nodes.length} />

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
          <WorkflowDesignerInspector
            layout={layout}
            open={inspectorOpen}
            onOpenChange={(open) => {
              if (!open) {
                handleCloseInspector();
              }
            }}
            onSelectEdge={handleSelectEdge}
            onClose={handleCloseInspector}
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
