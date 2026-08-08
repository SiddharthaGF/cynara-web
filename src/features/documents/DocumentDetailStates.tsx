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

export function DocumentDetailLoading(): JSX.Element {
  return (
    <AppShell variant='catalog'>
      <div className='mx-auto max-w-3xl px-6 py-10 pb-20'>
        <Skeleton className='mb-4 h-8 w-48' />
        <Skeleton className='h-64 w-full' />
      </div>
    </AppShell>
  );
}

export function DocumentDetailUnavailable({
  title,
  description,
  locale,
  patientId,
  encounterId,
}: {
  title: string;
  description: string;
  locale: string;
  patientId: string;
  encounterId: string;
}): JSX.Element {
  const { t } = useTranslation(['documents']);

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
                to='/$locale/patients/$id/encounters/$encounterId'
                params={{ locale, id: patientId, encounterId }}
              />
            }
          >
            <ArrowLeft className='size-4' />
            {t('detail.backToEncounter')}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

export function DocumentDetailShell({
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
