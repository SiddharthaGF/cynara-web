import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
import { InsufficientPermissionNotice } from '@/features/access-control/InsufficientPermissionNotice.tsx';

interface DocumentFormAlertsProps {
  mutationForbidden: boolean;
  canWrite: boolean;
  staleError: boolean;
  actionError: string | null;
  saveError: string | null;
  transitionError: string | null;
  terminal: boolean;
  onDismissStale: () => void;
}

export function DocumentFormAlerts({
  mutationForbidden,
  canWrite,
  staleError,
  actionError,
  saveError,
  transitionError,
  terminal,
  onDismissStale,
}: DocumentFormAlertsProps): JSX.Element {
  const { t } = useTranslation('documents');

  return (
    <>
      {mutationForbidden ? (
        <Alert
          variant='destructive'
          className='mb-6'
        >
          <AlertDescription>{t('detail.forbiddenMutate')}</AlertDescription>
        </Alert>
      ) : null}

      {!canWrite && !mutationForbidden ? (
        <InsufficientPermissionNotice descriptionKey='access.documentsWriteMissing' />
      ) : null}

      {staleError ? (
        <Alert
          variant='destructive'
          className='mb-6'
        >
          <AlertDescription className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <span>{t('detail.stale')}</span>
            <Button
              size='sm'
              variant='outline'
              onClick={onDismissStale}
            >
              {t('detail.reload')}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {actionError || saveError || transitionError ? (
        <Alert
          variant='destructive'
          className='mb-6'
        >
          <AlertDescription>
            {actionError ?? saveError ?? transitionError}
          </AlertDescription>
        </Alert>
      ) : null}

      {terminal ? (
        <Alert className='mb-6'>
          <AlertDescription>{t('detail.terminalBanner')}</AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}
