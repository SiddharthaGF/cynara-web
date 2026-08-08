import { ArrowUpIcon, SquareIcon } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { TooltipIconButton } from '@/components/ui/tooltip-button.tsx';

interface ChatComposerActionsProps {
  canSubmit: boolean;
  isBusy: boolean;
  composerHint: string | null;
  onStop: () => void;
}

export function ChatComposerActions({
  canSubmit,
  isBusy,
  composerHint,
  onStop,
}: ChatComposerActionsProps): JSX.Element {
  const { t } = useTranslation('designer');

  return (
    <div className='mt-1 flex items-center justify-between gap-2 px-0.5 pt-1'>
      <p className='truncate text-[10px] tracking-wide text-muted-foreground uppercase'>
        {composerHint}
      </p>
      <div className='flex items-center gap-1.5'>
        {isBusy ? (
          <>
            {canSubmit ? (
              <TooltipIconButton
                type='submit'
                size='icon-sm'
                variant='secondary'
                className='rounded-full'
                label={t('ai.queue')}
              >
                <ArrowUpIcon className='size-3.5' />
              </TooltipIconButton>
            ) : null}
            <TooltipIconButton
              type='button'
              size='icon-sm'
              variant='default'
              className='rounded-full'
              label={t('ai.stop')}
              onClick={onStop}
            >
              <SquareIcon className='size-3 fill-current' />
            </TooltipIconButton>
          </>
        ) : (
          <TooltipIconButton
            type='submit'
            size='icon-sm'
            variant='default'
            disabled={!canSubmit}
            className='rounded-full'
            label={t('ai.send')}
          >
            <ArrowUpIcon className='size-3.5' />
          </TooltipIconButton>
        )}
      </div>
    </div>
  );
}
