import { Link, useParams } from '@tanstack/react-router';
import { RefreshCw } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { AppShell } from '@/components/app-shell.tsx';
import { PageBreadcrumbs } from '@/components/page-breadcrumbs.tsx';
import { PageHeader } from '@/components/page-header.tsx';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardHeader } from '@/components/ui/card.tsx';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { UserDetailView } from '@/features/users/UserDetailView.tsx';
import { DEFAULT_USER_PAGE_SIZE } from '@/features/users/userListSearch.ts';
import { UserNotFoundState } from '@/features/users/UserNotFoundState.tsx';
import { useUserDetail } from '@/features/users/useUsersDirectory.ts';
import { cn } from '@/lib/utils.ts';

/**
 * Directory detail route page. Implements the full states matrix: loading,
 * forbidden (zero row data), the shared no-hint 404 collapse, destructive
 * error alerts with retry, stale refetches over cached content, and the
 * DTO-only detail rendering.
 */
export function UserDetailPage(): JSX.Element {
  const { t } = useTranslation(['users', 'common']);
  const { locale, userId } = useParams({
    from: '/$locale/admin/users/$userId',
  });
  const { user, isLoading, isFetching, error, isForbidden, isNotFound, retry } =
    useUserDetail(userId);

  const heading = user?.userName || user?.email || t('title');

  let content = (
    <>
      {error ? (
        <Alert
          variant='destructive'
          className='mb-6'
        >
          <AlertTitle>{t('error.title')}</AlertTitle>
          <AlertDescription className='flex flex-wrap items-center justify-between gap-2'>
            <span>{error}</span>
            <Button
              type='button'
              size='sm'
              variant='outline'
              onClick={retry}
            >
              <RefreshCw data-icon='inline-start' />
              {t('error.retry')}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      {user ? (
        <div
          className={cn(
            'transition-opacity',
            (isFetching || Boolean(error)) && 'opacity-60',
          )}
        >
          <UserDetailView
            user={user}
            locale={locale}
          />
        </div>
      ) : null}
    </>
  );

  if (isNotFound) {
    // Identical collapse for unknown and out-of-scope ids; no hint leaks.
    content = <UserNotFoundState locale={locale} />;
  } else if (isForbidden) {
    content = (
      <Empty className='min-h-48 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10'>
        <EmptyHeader>
          <EmptyTitle className='text-lg'>{t('forbidden.title')}</EmptyTitle>
          <EmptyDescription>{t('forbidden.description')}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  } else if (isLoading) {
    content = (
      <Card
        className='border-border/70 shadow-sm'
        aria-busy='true'
      >
        <CardHeader>
          <Skeleton className='h-6 w-48' />
          <Skeleton className='mt-2 h-4 w-56' />
        </CardHeader>
        <CardContent>
          <div className='grid gap-3'>
            <Skeleton className='h-9 w-full' />
            <Skeleton className='h-9 w-full' />
            <Skeleton className='h-24 w-full' />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <AppShell variant='catalog'>
      <div className='mx-auto max-w-3xl px-6 py-6 pb-12'>
        <PageBreadcrumbs
          className='mb-4'
          items={[
            {
              key: 'home',
              label: t('common:nav.home'),
              link: (
                <Link
                  to='/$locale'
                  params={{ locale }}
                />
              ),
            },
            {
              key: 'users',
              label: t('title'),
              link: (
                <Link
                  to='/$locale/admin/users'
                  params={{ locale }}
                  search={{ page: 1, pageSize: DEFAULT_USER_PAGE_SIZE }}
                />
              ),
            },
            { key: 'detail', label: heading },
          ]}
        />
        <PageHeader
          className='mb-6'
          title={t('detail.title')}
          subtitle={t('detail.subtitle')}
        />
        {content}
      </div>
    </AppShell>
  );
}
