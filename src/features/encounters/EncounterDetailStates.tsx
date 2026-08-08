import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import type { JSX, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { AppShell } from '@/components/app-shell.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';

export function EncounterDetailLoading(): JSX.Element {
  return (
    <AppShell variant='catalog'>
      <div className='mx-auto max-w-3xl px-6 py-10 pb-20'>
        <Skeleton className='mb-4 h-8 w-48' />
        <Skeleton className='h-64 w-full' />
      </div>
    </AppShell>
  );
}

export function EncounterDetailUnavailable({
  title,
  description,
  locale,
  patientId,
}: {
  title: string;
  description: string;
  locale: string;
  patientId: string;
}): JSX.Element {
  const { t } = useTranslation(['encounters']);

  return (
    <AppShell variant='catalog'>
      <div className='mx-auto max-w-3xl px-6 py-10 pb-20'>
        <Empty className='min-h-48 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10'>
          <EmptyHeader>
            <EmptyTitle>{title}</EmptyTitle>
            <EmptyDescription>{description}</EmptyDescription>
          </EmptyHeader>
        </Empty>
        <div className='mt-4'>
          <Button
            variant='ghost'
            nativeButton={false}
            render={
              <Link
                to='/$locale/patients/$id'
                params={{ locale, id: patientId }}
              />
            }
          >
            <ArrowLeft className='size-4' />
            {t('detail.backToPatient')}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

export function EncounterDetailShell({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return (
    <AppShell variant='catalog'>
      <div className='mx-auto max-w-3xl px-6 py-10 pb-20'>{children}</div>
    </AppShell>
  );
}
