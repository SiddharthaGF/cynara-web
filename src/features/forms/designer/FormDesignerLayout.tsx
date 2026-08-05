import { Link, useParams } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import type { JSX } from 'react';
import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppShell } from '@/components/app-shell.tsx';
import { StatusState } from '@/components/status-state.tsx';
import { DocumentMeta } from '@/components/theme-toggle.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx';
import type { FormDraftModel } from '@/features/forms/types.ts';
import { useIsMobile } from '@/hooks/use-mobile.ts';

import { FormPreviewTrigger } from '../preview/FormPreviewTrigger.tsx';
import type { FormVersion } from '../types.ts';
import { ChatAiTrigger as FormAiChatTrigger } from './ai-chat/ChatMentionLists.tsx';
import { FieldCanvas } from './FieldCanvas.tsx';
import { FieldInspector } from './FieldInspector.tsx';
import { MobileDesignerFab } from './MobileDesignerFab.tsx';
import { SaveButton } from './SaveButton.tsx';
import { SaveStatusBanner } from './SaveStatusBanner.tsx';
import { useFormDesignerLayout } from './useFormDesignerLayout.ts';
import { ValidationPanel } from './ValidationPanel.tsx';

const LazyFormAiChatSheet = lazy(async () => {
  const module = await import('./ai-chat/FormAiChatSheet.tsx');
  return { default: module.FormAiChatSheet };
});

const LazyFormPreviewDialog = lazy(async () => {
  const module = await import('../preview/FormPreviewDialog.tsx');
  return { default: module.FormPreviewDialog };
});

interface FormDesignerLayoutProps {
  code: string;
  initialDraft: FormVersion;
}

export function FormDesignerLayout({
  code,
  initialDraft,
}: FormDesignerLayoutProps): JSX.Element {
  const { t } = useTranslation('designer');
  const { t: tc } = useTranslation('common');
  const { locale } = useParams({ from: '/$locale' });
  const layout = useFormDesignerLayout(code, initialDraft);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const isMobile = useIsMobile();

  const isBootstrapping =
    layout.draft.isLoading || layout.draft.loadError !== null;

  function openChat(): void {
    layout.setShowAdvanced(false);
    setAiChatOpen(true);
  }

  function renderMain(): JSX.Element {
    if (layout.draft.isLoading) {
      return (
        <StatusState
          kind='loading'
          title={t('loading.title')}
          description={t('loading.description')}
        />
      );
    }
    if (layout.draft.loadError !== null) {
      return (
        <StatusState
          kind='error'
          title={t('loadError.title')}
          description={layout.draft.loadError}
          actionLabel={t('loadError.retry')}
          onAction={() => {
            void layout.draft.reloadDraft();
          }}
        />
      );
    }
    return (
      <div className='flex min-h-0 flex-1'>
        <ScrollArea className='canvas-grid min-w-0 flex-1'>
          <main className='min-w-0 max-w-full overflow-x-clip px-3 py-4 md:px-6 md:py-6'>
            <FieldCanvas
              fields={layout.draft.model.clinical.fields}
              presentations={layout.draft.model.ui.fields}
              fieldRules={layout.draft.model.rules.fields}
              selectedFieldId={layout.selectedFieldId}
              validationIssues={layout.draft.validationIssues}
              onSelect={layout.setSelectedFieldId}
              onMoveUp={layout.handleMoveUp}
              onMoveDown={layout.handleMoveDown}
              onRemove={layout.handleRemove}
              onChangePresentation={layout.handleChangePresentation}
              onChangeFieldType={layout.handleChangeFieldType}
              onToggleRequired={layout.handleToggleRequired}
              onOpenAdvanced={(fieldId) => {
                setAiChatOpen(false);
                layout.handleOpenAdvanced(fieldId);
              }}
              onAddField={layout.handleAddField}
              readOnly={layout.draft.isReadOnly}
            />
            <ValidationPanel issues={layout.draft.validationIssues} />
          </main>
        </ScrollArea>

        {isBootstrapping ? null : (
          <Suspense fallback={null}>
            <LazyFormAiChatSheet
              open={aiChatOpen}
              onOpenChange={(open: boolean) => {
                setAiChatOpen(open);
                if (open) {
                  layout.setShowAdvanced(false);
                }
              }}
              formCode={code}
              locale={locale}
              model={layout.draft.model}
              readOnly={layout.draft.isReadOnly}
              onApplyDraft={(next: FormDraftModel) => {
                layout.setSelectedFieldId(null);
                layout.setShowAdvanced(false);
                layout.draft.setModel(() => next);
                // Let the canvas paint first; sync work + PUT must not block apply.
                requestAnimationFrame(() => {
                  window.setTimeout(() => {
                    void layout.draft.saveNow();
                  }, 0);
                });
              }}
            />
          </Suspense>
        )}

        {layout.selectedField ? (
          <FieldInspector
            open={layout.showAdvanced}
            onOpenChange={(open) => {
              layout.setShowAdvanced(open);
              if (open) {
                setAiChatOpen(false);
              }
            }}
            field={layout.selectedField}
            presentation={layout.selectedPresentation}
            rules={layout.selectedRules}
            fieldIndex={layout.selectedFieldIndex}
            fieldOptions={layout.ruleFieldOptions}
            components={layout.components}
            readOnly={layout.draft.isReadOnly}
            onChangeField={layout.handleInspectorChangeField}
            onChangePresentation={layout.handleInspectorChangePresentation}
            onChangeRules={layout.handleInspectorChangeRules}
          />
        ) : null}

        {/* Mobile floating action buttons: chat (always visible) and field
            settings (only when a question is selected). The desktop toolbar
            trigger is hidden below `md`, so the FAB is the sole entry point
            on small viewports. */}
        {isMobile && !isBootstrapping ? (
          <MobileDesignerFab
            layout={layout}
            aiChatOpen={aiChatOpen}
            onOpenChat={openChat}
          />
        ) : null}
      </div>
    );
  }

  return (
    <AppShell variant='minimal'>
      <DocumentMeta />
      <div className='flex h-[calc(100svh-3.5rem)] min-h-0 flex-col overflow-hidden bg-background'>
        {/* Designer sub-toolbar: lives inside the page content so the global
            shell can stay headerless. The same actions that used to sit in the
            header are still one click away. */}
        <div className='flex h-12 shrink-0 items-center gap-2 border-b border-border/60 bg-card/70 px-3 backdrop-blur-md md:gap-3 md:px-4'>
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  to='/$locale/forms'
                  params={{ locale }}
                  aria-label={tc('actions.forms')}
                  className='inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-[min(var(--radius-md),12px)] border border-transparent px-2 text-[0.8rem] font-medium whitespace-nowrap transition-colors outline-none select-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:pointer-events-none [&_svg]:shrink-0'
                >
                  <ArrowLeft className='size-4' />
                  <span className='hidden sm:inline'>
                    {tc('actions.forms')}
                  </span>
                </Link>
              }
            />
            <TooltipContent side='bottom'>{tc('actions.forms')}</TooltipContent>
          </Tooltip>

          <div className='min-w-0 flex-1 sm:border-l sm:border-border/50 sm:pl-3'>
            <p className='truncate font-heading text-sm font-medium'>{code}</p>
            <p className='hidden truncate text-xs text-muted-foreground sm:block'>
              {(() => {
                if (layout.draft.isLoading) {
                  return t('loading.title');
                }
                if (layout.draft.isReadOnly) {
                  return t('header.readOnlyReview');
                }
                return t('header.editingDraft');
              })()}
            </p>
          </div>

          {isBootstrapping ? null : (
            <>
              {/* The toolbar chat trigger is desktop-only. The mobile FAB at
                  the bottom of the canvas replaces it on small viewports. */}
              <div className='hidden md:block'>
                <FormAiChatTrigger
                  disabled={layout.draft.isReadOnly}
                  onOpen={() => {
                    if (aiChatOpen) {
                      setAiChatOpen(false);
                    } else {
                      openChat();
                    }
                  }}
                />
              </div>

              <FormPreviewTrigger
                onOpen={() => {
                  setPreviewOpen(true);
                }}
              />

              <SaveButton
                state={layout.draft.saveState}
                disabled={layout.draft.isReadOnly}
                onClick={() => {
                  void layout.draft.saveNow();
                }}
              />
            </>
          )}
        </div>

        {layout.draft.saveState === 'conflict' ||
        (layout.draft.saveState === 'error' && layout.draft.saveError) ? (
          <div className='shrink-0 border-b bg-card px-4 py-2'>
            <SaveStatusBanner
              state={layout.draft.saveState}
              error={layout.draft.saveError}
              defaultConcurrencyMessage={t('concurrency.defaultMessage')}
              onReload={() => {
                void layout.draft.reloadDraft();
              }}
              onDismissConflict={layout.draft.dismissConflict}
            />
          </div>
        ) : null}

        {renderMain()}
      </div>

      {previewOpen && !isBootstrapping ? (
        <Suspense fallback={null}>
          <LazyFormPreviewDialog
            open={previewOpen}
            onOpenChange={setPreviewOpen}
            formCode={code}
            model={layout.draft.model}
          />
        </Suspense>
      ) : null}
    </AppShell>
  );
}
