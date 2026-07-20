import { AlertTriangle } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';

interface ConcurrencyBannerProps {
  message: string;
  onReload: () => void;
  onDismiss: () => void;
}

export function ConcurrencyBanner({
  message,
  onReload,
  onDismiss,
}: ConcurrencyBannerProps): JSX.Element {
  const { t } = useTranslation('designer');

  return (
    <Alert
      className='mb-4 border-amber-500/25 bg-amber-500/8'
      role='alert'
    >
      <AlertTriangle className='text-amber-600 dark:text-amber-400' />
      <AlertTitle>{t('concurrency.title')}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
      <div className='col-span-full mt-2 flex flex-wrap gap-2'>
        <Button
          type='button'
          size='sm'
          onClick={onReload}
        >
          {t('concurrency.reload')}
        </Button>
        <Button
          type='button'
          size='sm'
          variant='outline'
          onClick={onDismiss}
        >
          {t('concurrency.keepEditing')}
        </Button>
      </div>
    </Alert>
  );
}
