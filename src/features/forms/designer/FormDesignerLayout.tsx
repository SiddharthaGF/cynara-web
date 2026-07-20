import { Link } from '@tanstack/react-router';
import { ArrowLeft, Cloud, CloudOff, Loader2, Save } from 'lucide-react';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CynaraMark } from '@/components/cynara-mark.tsx';
import { LocaleToggle } from '@/components/locale-toggle.tsx';
import { DocumentMeta, ThemeToggle } from '@/components/theme-toggle.tsx';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx';
import { cn } from '@/lib/utils.ts';

import { ConcurrencyBanner } from './ConcurrencyBanner.tsx';
import { FieldCanvas } from './FieldCanvas.tsx';
import { FieldInspector } from './FieldInspector.tsx';
import { DesignerSidebar } from './FieldPalette.tsx';
import {
  FormPreviewDialog,
  FormPreviewTrigger,
} from '../preview/FormPreviewDialog.tsx';
import { useFormDesignerLayout } from './useFormDesignerLayout.ts';
import { ValidationPanel } from './ValidationPanel.tsx';

interface FormDesignerPageProps {
  code: string;
}

export function FormDesignerLayout({ code }: FormDesignerPageProps): JSX.Element {
  const { t } = useTranslation('designer');
  const { t: tc } = useTranslation('common');
  const { t: tv } = useTranslation('validation');
  const { setOpenMobile } = useSidebar();
  const layout = useFormDesignerLayout(code, setOpenMobile);
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <>
      <DesignerSidebar
        onAdd={layout.handleAddField}
        disabled={layout.draft.isReadOnly}
      />

      <SidebarInset className='grain ambient-bg flex h-svh flex-col overflow-hidden'>
        <DocumentMeta />
        <header className='flex h-14 shrink-0 items-center gap-2 border-b border-border/60 bg-background/80 px-3 backdrop-blur-md md:gap-3 md:px-4'>
          {layout.draft.isReadOnly ? null : (
            <Tooltip>
              <TooltipTrigger
                render={<SidebarTrigger className='shrink-0 md:hidden' />}
              />
              <TooltipContent side='bottom'>
                {t('palette.title')}
              </TooltipContent>
            </Tooltip>
          )}

          <Button
            variant='ghost'
            size='sm'
            className='shrink-0 gap-1.5 px-2 md:px-3'
            render={<Link to='/forms' />}
            nativeButton={false}
          >
            <ArrowLeft className='size-4' />
            <span className='hidden sm:inline'>{tc('actions.forms')}</span>
          </Button>

          <CynaraMark className='hidden sm:flex' />

          <div className='min-w-0 flex-1 sm:border-l sm:border-border/50 sm:pl-3'>
            <p className='truncate font-heading text-sm font-medium'>{code}</p>
            <p className='hidden truncate text-xs text-muted-foreground sm:block'>
              {layout.draft.isReadOnly
                ? t('header.readOnlyReview')
                : t('header.editingDraft')}
            </p>
          </div>

          <SaveIndicator state={layout.draft.saveState} />

          <FormPreviewTrigger
            onOpen={() => {
              setPreviewOpen(true);
            }}
          />

          {layout.draft.isReadOnly ? null : (
            <Button
              type='button'
              size='sm'
              className='shrink-0 gap-1.5 px-2.5 sm:px-3'
              onClick={() => {
                void layout.draft.saveNow();
              }}
            >
              <Save className='size-3.5' />
              <span className='hidden sm:inline'>{tc('actions.save')}</span>
            </Button>
          )}

          <div className='hidden shrink-0 items-center gap-1 sm:flex md:gap-2'>
            <LocaleToggle />
            <ThemeToggle />
          </div>
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
                onOpenAdvanced={layout.handleOpenAdvanced}
                readOnly={layout.draft.isReadOnly}
              />
              <ValidationPanel issues={layout.draft.validationIssues} />
            </main>
          </ScrollArea>

          {layout.selectedField ? (
            <FieldInspector
              open={layout.showAdvanced}
              onOpenChange={layout.setShowAdvanced}
              field={layout.selectedField}
              presentation={layout.selectedPresentation}
              rules={layout.selectedRules}
              fieldCodes={layout.fieldCodes}
              components={layout.components}
              readOnly={layout.draft.isReadOnly}
              onChangeField={layout.handleInspectorChangeField}
              onChangePresentation={layout.handleInspectorChangePresentation}
              onChangeRules={layout.handleInspectorChangeRules}
            />
          ) : null}
        </div>
      </SidebarInset>

      {previewOpen ? (
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

function SaveIndicator({ state }: { state: string }): JSX.Element {
  const { t } = useTranslation('designer');
  const label = saveStateLabel(state, t);
  const icon = saveStateIcon(state);

  const badge = (
    <Badge
      variant='secondary'
      className={cn(
        'gap-1.5 font-normal',
        state === 'error' || state === 'conflict'
          ? 'text-destructive'
          : undefined,
        state === 'saved' ? 'text-primary' : undefined,
      )}
    >
      {icon}
      <span className='hidden sm:inline'>{label}</span>
    </Badge>
  );

  return (
    <Tooltip>
      <TooltipTrigger render={badge} />
      <TooltipContent
        side='bottom'
        className='sm:hidden'
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function saveStateIcon(state: string): JSX.Element {
  if (state === 'saving') {
    return <Loader2 className='size-3.5 animate-spin' />;
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
