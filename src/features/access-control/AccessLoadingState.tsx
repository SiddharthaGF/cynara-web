import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { StatusState } from '@/components/status-state.tsx';

export function AccessLoadingState(): JSX.Element {
  const { t } = useTranslation('common');

  return (
    <div
      className='flex min-h-svh items-center justify-center'
      data-testid='access-loading'
    >
      <StatusState
        kind='loading'
        title={t('access.checking')}
      />
    </div>
  );
}
