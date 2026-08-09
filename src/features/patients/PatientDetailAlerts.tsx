import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { InsufficientPermissionNotice } from '@/features/access-control/InsufficientPermissionNotice.tsx';

interface PatientDetailAlertsProps {
  mutationForbidden: boolean;
  canWrite: boolean;
  deleteError: string | null;
  deleteSuccess: boolean;
}

export function PatientDetailAlerts({
  mutationForbidden,
  canWrite,
  deleteError,
  deleteSuccess,
}: PatientDetailAlertsProps): JSX.Element {
  const { t } = useTranslation(['patients', 'api', 'common']);

  return (
    <>
      {mutationForbidden ? (
        <Alert
          variant='destructive'
          className='mb-6'
          data-testid='patient-detail-forbidden'
        >
          <AlertDescription>
            {t('permissions.forbiddenMutate')}
          </AlertDescription>
        </Alert>
      ) : null}

      {!canWrite && !mutationForbidden ? (
        <InsufficientPermissionNotice descriptionKey='access.patientsWriteMissing' />
      ) : null}

      {deleteError || deleteSuccess ? (
        <Alert
          variant={deleteSuccess ? 'default' : 'destructive'}
          className='mb-6'
        >
          <AlertDescription>
            {deleteSuccess ? t('detail.deleteSuccess') : deleteError}
          </AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}
