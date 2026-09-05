import { Link } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import type { ComponentProps, JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { UserDirectoryPagination } from '@/features/users/UserDirectoryPagination.tsx';
import { UserDirectoryResults } from '@/features/users/UserDirectoryResults.tsx';
import type { UserDirectoryResultsStatus } from '@/features/users/userListSearch.ts';

/**
 * Results area for the directory: loading skeletons, stale-aware rows,
 * invite-guarded empty state, and pagination. The branch decision arrives
 * as one precomputed status; only presentational flags stay as props.
 */
export function UserDirectoryResultsSection({
  status,
  isFetching,
  staleRows,
  items,
  locale,
  canInvite,
  page,
  pageSize,
  totalCount,
  onPageChange,
}: {
  status: UserDirectoryResultsStatus;
  isFetching: boolean;
  staleRows: boolean;
  items: ComponentProps<typeof UserDirectoryResults>['items'];
  locale: string;
  canInvite: boolean;
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (nextPage: number) => void;
}): JSX.Element {
  const { t } = useTranslation('users');
  return (
    <>
      {status === 'loading' ? (
        <div
          className='grid gap-3'
          aria-busy='true'
        >
          <Skeleton className='h-9 w-full' />
          <Skeleton className='h-9 w-full' />
          <Skeleton className='h-9 w-full' />
          <Skeleton className='h-9 w-full' />
        </div>
      ) : null}
      {status === 'rows' ? (
        <>
          {isFetching ? (
            <p className='mb-2 flex items-center gap-1.5 text-sm text-muted-foreground'>
              <Loader2 className='size-3.5 animate-spin' />
              {t('stale.refreshing')}
            </p>
          ) : null}
          <UserDirectoryResults
            items={items}
            locale={locale}
            stale={staleRows}
          />
        </>
      ) : null}
      {status === 'empty' ? (
        <Empty className='min-h-48 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10'>
          <EmptyHeader>
            <EmptyTitle className='text-lg'>{t('empty.title')}</EmptyTitle>
            <EmptyDescription>{t('empty.description')}</EmptyDescription>
            <EmptyDescription>{t('empty.help')}</EmptyDescription>
          </EmptyHeader>
          {canInvite ? (
            <div className='mt-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                nativeButton={false}
                render={
                  <Link
                    to='/$locale/admin/invitations'
                    params={{ locale }}
                  />
                }
              >
                {t('empty.action')}
              </Button>
            </div>
          ) : null}
        </Empty>
      ) : null}
      {status === 'loading' ? null : (
        <UserDirectoryPagination
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={onPageChange}
        />
      )}
    </>
  );
}
