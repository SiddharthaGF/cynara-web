import type { ErrorComponentProps } from '@tanstack/react-router';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/api/client.ts';
import { StatusState } from '@/components/status-state.tsx';
import { AccessDeniedPage } from '@/features/access-control/AccessDeniedPage.tsx';

export function RouteAccessError({ error }: ErrorComponentProps): JSX.Element {
  const { t } = useTranslation('common');

  if (
    error instanceof ApiError &&
    (error.status === 401 || error.status === 403)
  ) {
    return <AccessDeniedPage />;
  }

  return (
    <StatusState
      kind='error'
      title={t('access.loadFailedTitle')}
      description={error instanceof Error ? error.message : undefined}
    />
  );
}
