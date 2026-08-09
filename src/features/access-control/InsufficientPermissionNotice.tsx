import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@/components/ui/alert.tsx';

interface InsufficientPermissionNoticeProps {
  descriptionKey: string;
}

export function InsufficientPermissionNotice({
  descriptionKey,
}: InsufficientPermissionNoticeProps): JSX.Element {
  const { t } = useTranslation('common');

  return (
    <Alert className='mb-6'>
      <AlertDescription>
        <span className='font-medium'>{t('access.insufficientTitle')}</span>
        <span className='ml-1.5 text-muted-foreground'>
          {t(descriptionKey)}
        </span>
      </AlertDescription>
    </Alert>
  );
}
