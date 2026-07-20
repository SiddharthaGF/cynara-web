import { Link, useParams } from '@tanstack/react-router';
import { ArrowLeft, Cloud, CloudOff } from 'lucide-react';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SettingsMenu } from '@/components/settings-menu.tsx';
import { DocumentMeta } from '@/components/theme-toggle.tsx';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';

import {
  FormPreviewDialog,
  FormPreviewTrigger,
} from '../preview/FormPreviewDialog.tsx';
import type { FormVersion } from '../types.ts';
import { ConcurrencyBanner } from './ConcurrencyBanner.tsx';
import { FieldCanvas } from './FieldCanvas.tsx';
import { FieldInspector } from './FieldInspector.tsx';
import {
  FormAiChatSheet,
  FormAiChatTrigger,
} from './ai-chat/FormAiChatSheet.tsx';
import { useFormDesignerLayout } from './useFormDesignerLayout.ts';
import { ValidationPanel } from './ValidationPanel.tsx';

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
  const { t: tv } = useTranslation('validation');
  const { locale } = useParams({ from: '/$locale' });
  const layout = useFormDesignerLayout(code, initialDraft);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);

  const isBootstrapping =
    layout.draft.isLoading || layout.draft.loadError !== null;

  function renderMain(): JSX.Element {
    if (layout.draft.isLoading) {
      return (
        <div className='flex min-h-0 flex-1 items-center justify-center px-6'>
          <div
            className='flex flex-col items-center gap-3 text-center'
            role='status'
            aria-live='polite'
          >
            <Spinner className='size-8 text-primary' />
            <div className='space-y-1'>
              <p className='font-heading text-sm font-medium'>
                {t('loading.title')}
              </p>
              <p className='text-sm text-muted-foreground'>
                {t('loading.description')}
              </p>
            </div>
          </div>
        </div>
      );
    }
    if (layout.draft.loadError !== null) {
      return (
        <div className='flex min-h-0 flex-1 items-center justify-center px-6'>
          <div className='flex max-w-sm flex-col items-center gap-4 text-center'>
            <div className='space-y-1'>
              <p className='font-heading text-sm font-medium'>
                {t('loadError.title')}
              </p>
              <p className='text-sm text-muted-foreground'>
                {layout.draft.loadError}
              </p>
            </div>
            <Button
              type='button'
              size='sm'
              onClick={() => {
                void layout.draft.reloadDraft();
              }}
            >
              {t('loadError.retry')}
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className='flex min-h-0 flex-1'>
        <ScrollArea className='canvas-grid min-w-0 flex-1'>
          <main className='min-w-0 max-w-full overflow-x-clip px-3 py-4 md:px-6 md:py-6'>
            <FieldCanvas
              formCode={code}
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

        {aiChatOpen ? (
          <FormAiChatSheet
            open={aiChatOpen}
            onOpenChange={(open) => {
              setAiChatOpen(open);
              if (open) {
                layout.setShowAdvanced(false);
              }
            }}
            formCode={code}
            locale={locale}
            model={layout.draft.model}
            readOnly={layout.draft.isReadOnly}
            onApplyDraft={(next) => {
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
        ) : null}

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
      </div>
    );
  }

  return (
    <>
      <div className='grain ambient-bg flex h-svh flex-col overflow-hidden bg-background'>
        <DocumentMeta />
        <header className='flex h-14 shrink-0 items-center gap-2 border-b border-border/60 bg-background/80 px-3 backdrop-blur-md md:gap-3 md:px-4'>
          <Button
            variant='ghost'
            size='sm'
            className='shrink-0 gap-1.5 px-2'
            render={
              <Link
                to='/$locale/forms'
                params={{ locale }}
              />
            }
            nativeButton={false}
          >
            <ArrowLeft className='size-4' />
            <span className='hidden sm:inline'>{tc('actions.forms')}</span>
          </Button>

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
              <FormAiChatTrigger
                disabled={layout.draft.isReadOnly}
                onOpen={() => {
                  setAiChatOpen((open) => {
                    const next = !open;
                    if (next) {
                      layout.setShowAdvanced(false);
                    }
                    return next;
                  });
                }}
              />

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

          <SettingsMenu className='shrink-0' />
        </header>

        {(layout.draft.saveState === 'conflict' ||
          (layout.draft.saveState === 'error' && layout.draft.saveError)) && (
          <div className='shrink-0 border-b bg-card px-4 py-2'>
            {layout.draft.saveState === 'conflict' ? (
              <ConcurrencyBanner
                message={
                  layout.draft.saveError ?? t('concurrency.defaultMessage')
                }
                onReload={() => {
                  void layout.draft.reloadDraft();
                }}
                onDismiss={layout.draft.dismissConflict}
              />
            ) : null}
            {layout.draft.saveState === 'error' && layout.draft.saveError ? (
              <Alert variant='destructive'>
                <AlertDescription>
                  {translateSaveError(layout.draft.saveError, tv)}
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        )}

        {renderMain()}
      </div>

      {previewOpen && !isBootstrapping ? (
        <FormPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          formCode={code}
          model={layout.draft.model}
        />
      ) : null}
    </>
  );
}

function SaveButton({
  state,
  disabled,
  onClick,
}: {
  state: string;
  disabled?: boolean;
  onClick: () => void;
}): JSX.Element {
  const { t } = useTranslation('designer');
  const label = saveStateLabel(state, t);
  const icon = saveStateIcon(state);

  let variant: 'default' | 'secondary' | 'destructive' | 'ghost' = 'default';
  if (state === 'saved') {
    variant = 'secondary';
  } else if (state === 'error' || state === 'conflict') {
    variant = 'destructive';
  }

  return (
    <Button
      type='button'
      size='sm'
      variant={variant}
      disabled={disabled || state === 'saving'}
      onClick={onClick}
      className='shrink-0 gap-1.5 px-2.5 sm:px-3'
    >
      {icon}
      <span className='hidden sm:inline'>{label}</span>
    </Button>
  );
}

function saveStateIcon(state: string): JSX.Element {
  if (state === 'saving') {
    return <Spinner className='size-3.5' />;
  }
  if (state === 'saved') {
    return <Cloud className='size-3.5' />;
  }
  if (state === 'error' || state === 'conflict') {
    return <CloudOff className='size-3.5' />;
  }
  return <Cloud className='size-3.5 opacity-60' />;
}

function saveStateLabel(
  state: string,
  t: ReturnType<typeof useTranslation<'designer'>>['t'],
): string {
  switch (state) {
    case 'saving': {
      return t('saveState.saving');
    }
    case 'saved': {
      return t('saveState.saved');
    }
    case 'conflict': {
      return t('saveState.conflict');
    }
    case 'error': {
      return t('saveState.error');
    }
    default: {
      return t('saveState.unsaved');
    }
  }
}

function translateSaveError(
  error: string,
  t: ReturnType<typeof useTranslation<'validation'>>['t'],
): string {
  const known: Record<string, string> = {
    'Fix validation issues before saving.': t('save.fixBeforeSave'),
    'Save failed.': t('save.failed'),
  };
  return known[error] ?? error;
}
