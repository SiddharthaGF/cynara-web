import { Link, useParams } from '@tanstack/react-router';
import { ArrowLeft, ShieldX } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { AppShell } from '@/components/app-shell.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty.tsx';
import { useCapabilities } from '@/hooks/use-capabilities.ts';

export function AccessDeniedPage(): JSX.Element {
  const { t } = useTranslation('common');
  const { locale } = useParams({ from: '/$locale' });
  const { can } = useCapabilities();

  let backTarget: '/$locale/forms' | '/$locale/patients' | null = null;
  if (can('read', 'Form')) {
    backTarget = '/$locale/forms';
  } else if (can('read', 'Patient')) {
    backTarget = '/$locale/patients';
  }

  return (
    <AppShell variant='catalog'>
      <div className='mx-auto flex min-h-[60svh] w-full max-w-2xl items-center px-6 py-10 pb-20'>
        <Empty
          className='min-h-64 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10'
          data-testid='access-denied'
        >
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <ShieldX className='size-4 text-destructive' />
            </EmptyMedia>
            <EmptyTitle className='text-lg'>
              {t('access.deniedTitle')}
            </EmptyTitle>
            <EmptyDescription>{t('access.deniedDescription')}</EmptyDescription>
          </EmptyHeader>
          {backTarget ? (
            <Link
              to={backTarget}
              params={{ locale }}
            >
              <Button variant='outline'>
                <ArrowLeft className='size-4' />
                {t('access.backToStart')}
              </Button>
            </Link>
          ) : null}
        </Empty>
      </div>
    </AppShell>
  );
}
