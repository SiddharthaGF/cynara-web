import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
import { InsufficientPermissionNotice } from '@/features/access-control/InsufficientPermissionNotice.tsx';

interface EncounterDetailAlertsProps {
  mutationForbidden: boolean;
  canWrite: boolean;
  staleError: boolean;
  actionError: string | null;
  transitionError: string | null;
  historical: boolean;
  onDismissStale: () => void;
}

export function EncounterDetailAlerts({
  mutationForbidden,
  canWrite,
  staleError,
  actionError,
  transitionError,
  historical,
  onDismissStale,
}: EncounterDetailAlertsProps): JSX.Element {
  const { t } = useTranslation('encounters');

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
        <InsufficientPermissionNotice descriptionKey='access.encountersWriteMissing' />
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

      {actionError || transitionError ? (
        <Alert
          variant='destructive'
          className='mb-6'
        >
          <AlertDescription>{actionError ?? transitionError}</AlertDescription>
        </Alert>
      ) : null}

      {historical ? (
        <Alert className='mb-6'>
          <AlertDescription>{t('detail.historicalBanner')}</AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}
