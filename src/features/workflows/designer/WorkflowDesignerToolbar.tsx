import { Link, useParams } from '@tanstack/react-router';
import { ArrowLeft, Redo2, Settings2, Undo2 } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import { TooltipIconButton } from '@/components/ui/tooltip-button.tsx';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx';
import type { UseWorkflowDraftResult } from '@/features/workflows/designer/useWorkflowDraft.ts';
import { cn } from '@/lib/utils.ts';

import { WorkflowSaveButton } from './WorkflowSaveButton.tsx';
import { WorkflowSaveStatusBanner } from './WorkflowSaveStatusBanner.tsx';

interface WorkflowDesignerToolbarProps {
  code: string;
  subtitle: string;
  isBootstrapping: boolean;
  draft: UseWorkflowDraftResult;
  isMobile: boolean;
  onOpenSettings: () => void;
}

export function WorkflowDesignerToolbar({
  code,
  subtitle,
  isBootstrapping,
  draft,
  isMobile,
  onOpenSettings,
}: WorkflowDesignerToolbarProps): JSX.Element {
  const { t } = useTranslation('workflows');
  const { locale } = useParams({ from: '/$locale' });

  return (
    <>
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
            {subtitle}
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
              onClick={onOpenSettings}
              className={cn('shrink-0 gap-1.5')}
            >
              <Settings2 className='size-3.5' />
              <span className='hidden sm:inline'>{t('toolbar.settings')}</span>
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
    </>
  );
}
