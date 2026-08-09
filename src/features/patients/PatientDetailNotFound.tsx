import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { AppShell } from '@/components/app-shell.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty.tsx';

interface PatientDetailNotFoundProps {
  locale: string;
  error: string | null;
}

export function PatientDetailNotFound({
  locale,
  error,
}: PatientDetailNotFoundProps): JSX.Element {
  const { t } = useTranslation(['patients', 'api', 'common']);

  return (
    <AppShell variant='catalog'>
      <div className='mx-auto max-w-3xl px-6 py-6'>
        <Empty className='min-h-48 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10'>
          <EmptyHeader>
            <EmptyTitle className='text-lg'>{t('detail.notFound')}</EmptyTitle>
            <EmptyDescription>
              {error ?? t('detail.loadError')}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
        <div className='mt-4'>
          <Button
            variant='ghost'
            nativeButton={false}
            render={
              <Link
                to='/$locale/patients'
                params={{ locale }}
              />
            }
          >
            <ArrowLeft className='size-4' />
            {t('detail.backToList')}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
