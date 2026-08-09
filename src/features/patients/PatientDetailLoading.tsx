import type { JSX } from 'react';

import { AppShell } from '@/components/app-shell.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';

export function PatientDetailLoading(): JSX.Element {
  return (
    <AppShell variant='catalog'>
      <div className='mx-auto max-w-3xl px-6 py-6'>
        <Skeleton className='mb-4 h-8 w-48' />
        <Skeleton className='mb-2 h-6 w-96' />
        <Skeleton className='h-64 w-full' />
      </div>
    </AppShell>
  );
}
