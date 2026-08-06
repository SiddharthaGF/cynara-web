import { CircleAlert, RefreshCw } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { AppShell } from '@/components/app-shell.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty.tsx';
import { useCapabilities } from '@/hooks/use-capabilities.ts';

export function AccessUnavailablePage(): JSX.Element {
  const { t } = useTranslation('common');
  const { refresh, isFetching } = useCapabilities();

  return (
    <AppShell variant='catalog'>
      <div className='mx-auto flex min-h-[60svh] w-full max-w-2xl items-center px-6 py-10 pb-20'>
        <Empty
          className='min-h-64 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10'
          data-testid='access-unavailable'
        >
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <CircleAlert className='size-4 text-destructive' />
            </EmptyMedia>
            <EmptyTitle className='text-lg'>
              {t('access.unavailableTitle')}
            </EmptyTitle>
            <EmptyDescription>
              {t('access.unavailableDescription')}
            </EmptyDescription>
          </EmptyHeader>
          <Button
            variant='outline'
            disabled={isFetching}
            onClick={refresh}
          >
            <RefreshCw className='size-4' />
            {t('access.retry')}
          </Button>
        </Empty>
      </div>
    </AppShell>
  );
}
