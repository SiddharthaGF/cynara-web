import { ArrowUpIcon, RotateCwIcon, SquareIcon } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';

interface ChatComposerActionsProps {
  canRetry: boolean;
  canSubmit: boolean;
  isBusy: boolean;
  composerHint: string | null;
  onRetry: () => void;
  onStop: () => void;
}

export function ChatComposerActions({
  canRetry,
  canSubmit,
  isBusy,
  composerHint,
  onRetry,
  onStop,
}: ChatComposerActionsProps): JSX.Element {
  const { t } = useTranslation('designer');

  return (
    <div className='mt-1 flex items-center justify-between gap-2 px-0.5 pt-1'>
      <p className='truncate text-[10px] tracking-wide text-muted-foreground uppercase'>
        {composerHint}
      </p>
      <div className='flex items-center gap-1.5'>
        {canRetry ? (
          <Button
            type='button'
            size='sm'
            variant='ghost'
            className='h-8 gap-1.5 rounded-full px-2.5 text-xs'
            onClick={onRetry}
          >
            <RotateCwIcon className='size-3.5' />
            {t('ai.retry')}
          </Button>
        ) : null}
        {isBusy ? (
          <>
            {canSubmit ? (
              <Button
                type='submit'
                size='icon-sm'
                variant='secondary'
                className='rounded-full'
                aria-label={t('ai.queue')}
                title={t('ai.queue')}
              >
                <ArrowUpIcon className='size-3.5' />
              </Button>
            ) : null}
            <Button
              type='button'
              size='icon-sm'
              variant='default'
              className='rounded-full'
              aria-label={t('ai.stop')}
              onClick={onStop}
            >
              <SquareIcon className='size-3 fill-current' />
            </Button>
          </>
        ) : (
          <Button
            type='submit'
            size='icon-sm'
            variant='default'
            disabled={!canSubmit}
            className='rounded-full'
            aria-label={t('ai.send')}
          >
            <ArrowUpIcon className='size-3.5' />
          </Button>
        )}
      </div>
    </div>
  );
}
