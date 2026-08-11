import { useQuery } from '@tanstack/react-query';
import { Link, createFileRoute, useParams } from '@tanstack/react-router';
import { ArrowLeft, LogOut, RefreshCw } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { AppShell } from '@/components/app-shell.tsx';
import { PageHeader } from '@/components/page-header.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { isAppLocale, type AppLocale } from '@/lib/locale.ts';
import { getMe } from '@/server/auth.ts';

const AUTH_SPIKE_ME_KEY = ['auth-spike', 'me'] as const;

export const Route = createFileRoute('/$locale/auth-spike')({
  component: AuthSpikePage,
});

function AuthSpikePage(): JSX.Element {
  const { t } = useTranslation('auth');
  const { locale: rawLocale } = useParams({ from: '/$locale' });
  const locale: AppLocale = isAppLocale(rawLocale) ? rawLocale : 'en';
  const meQuery = useQuery({
    queryKey: AUTH_SPIKE_ME_KEY,
    queryFn: async () => getMe(),
    staleTime: 0,
  });

  const me = meQuery.data;

  return (
    <AppShell variant='minimal'>
      <div className='mx-auto max-w-3xl px-6 py-6 pb-12'>
        <PageHeader
          className='mb-6'
          title={t('spike.title')}
          subtitle={t('spike.subtitle')}
          actions={
            <>
              <Button
                variant='outline'
                size='sm'
                onClick={() => void meQuery.refetch()}
                disabled={meQuery.isFetching}
              >
                <RefreshCw
                  className={
                    meQuery.isFetching ? 'size-3.5 animate-spin' : 'size-3.5'
                  }
                />
                {t('spike.refresh')}
              </Button>
              <Button
                variant='outline'
                size='sm'
                nativeButton={false}
                render={
                  <Link
                    to='/$locale/logout'
                    params={{ locale }}
                  />
                }
              >
                <LogOut className='size-3.5' />
                {t('spike.logout')}
              </Button>
              <Button
                variant='ghost'
                size='sm'
                nativeButton={false}
                render={
                  <Link
                    to='/$locale/forms'
                    params={{ locale }}
                  />
                }
              >
                <ArrowLeft className='size-3.5' />
                {t('spike.backToStart')}
              </Button>
            </>
          }
        />

        {meQuery.isPending ? (
          <div className='grid gap-3'>
            <Skeleton className='h-10 w-full' />
            <Skeleton className='h-10 w-full' />
            <Skeleton className='h-10 w-2/3' />
          </div>
        ) : null}

        {meQuery.isError && !meQuery.isPending ? (
          <Empty className='min-h-48 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10'>
            <EmptyHeader>
              <EmptyTitle className='text-lg'>
                {t('spike.loadFailed', {
                  detail:
                    meQuery.error instanceof Error
                      ? meQuery.error.message
                      : String(meQuery.error),
                })}
              </EmptyTitle>
              <EmptyDescription>{t('spike.subtitle')}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}

        {me ? (
          <dl className='grid gap-3 rounded-xl border border-border/60 p-4'>
            <div className='grid grid-cols-1 gap-1 sm:grid-cols-2'>
              <dt className='text-xs font-medium tracking-widest text-muted-foreground uppercase'>
                {t('spike.actorLabel')}
              </dt>
              <dd className='font-medium'>{me.actorId}</dd>
            </div>
            <div className='grid grid-cols-1 gap-1 sm:grid-cols-2'>
              <dt className='text-xs font-medium tracking-widest text-muted-foreground uppercase'>
                {t('spike.hospitalLabel')}
              </dt>
              <dd className='font-medium'>{me.hospital ?? '—'}</dd>
            </div>
            <div className='grid grid-cols-1 gap-1 sm:grid-cols-2'>
              <dt className='text-xs font-medium tracking-widest text-muted-foreground uppercase'>
                {t('spike.capabilitiesLabel')}
              </dt>
              <dd className='flex flex-wrap gap-1.5'>
                {me.capabilities.length > 0 ? (
                  me.capabilities.map((capability) => (
                    <Badge
                      key={capability}
                      variant='secondary'
                    >
                      {capability}
                    </Badge>
                  ))
                ) : (
                  <span className='text-sm text-muted-foreground'>
                    {t('spike.noCapabilities')}
                  </span>
                )}
              </dd>
            </div>
          </dl>
        ) : null}
      </div>
    </AppShell>
  );
}
