import { Link, useParams } from '@tanstack/react-router';
import type { TFunction } from 'i18next';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge.tsx';
import { buttonVariants } from '@/components/ui/button.tsx';
import { CatalogFilterBar } from '@/components/catalog-filter-bar.tsx';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty.tsx';
import { CatalogTableHeader } from '@/components/catalog-table-header.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table.tsx';
import type { FormSummary } from '@/features/forms/types.ts';
import { useCapabilities } from '@/hooks/use-capabilities.ts';
import { cn } from '@/lib/utils.ts';

import { FormListPagination } from './FormListPagination.tsx';
import type { FormFilterStatus } from './formListSearch.ts';

/** Maps the raw server status enum to a localized label. */
function formatFormEditableStatus(status: string | null, t: TFunction): string {
  if (status === null) {
    return t('list.noDraft');
  }
  switch (status) {
    case 'draft': {
      return t('list.status.draft');
    }
    case 'review': {
      return t('list.status.review');
    }
    case 'published': {
      return t('list.status.published');
    }
    default: {
      return status;
    }
  }
}

function formatUpdatedAt(iso: string, locale: string): string {
  if (!iso) {
    return '—';
  }
  const formatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  });
  return formatter.format(new Date(iso));
}

interface FormsCatalogTableProps {
  forms: FormSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  query: string;
  status: FormFilterStatus;
  onQueryChange: (query: string) => void;
  onStatusChange: (status: FormFilterStatus) => void;
  onPageChange: (page: number) => void;
}

export function FormsCatalogTable({
  forms,
  totalCount,
  page,
  pageSize,
  isLoading,
  query,
  status,
  onQueryChange,
  onStatusChange,
  onPageChange,
}: FormsCatalogTableProps): JSX.Element {
  const { t } = useTranslation('forms');
  const { locale } = useParams({ from: '/$locale' });
  const { can } = useCapabilities();
  const canDesign = can('write', 'Catalog');

  const hasFilters = query.trim() !== '' || status !== 'all';

  const statusItems = [
    { value: 'all' as const, label: t('list.filterAll') },
    { value: 'draft' as const, label: t('list.status.draft') },
    { value: 'review' as const, label: t('list.status.review') },
    { value: 'published' as const, label: t('list.status.published') },
  ];

  if (isLoading) {
    return (
      <div className='grid gap-3'>
        <Skeleton className='h-10 w-full' />
        <Skeleton className='h-12 w-full' />
        <Skeleton className='h-12 w-full' />
        <Skeleton className='h-12 w-full' />
      </div>
    );
  }

  return (
    <div className='flex min-w-0 flex-col gap-3'>
      <CatalogFilterBar
        query={query}
        onQueryChange={onQueryChange}
        searchPlaceholder={t('list.searchPlaceholder')}
        statusItems={statusItems}
        status={status}
        onStatusChange={(value) => {
          onStatusChange(value ?? 'all');
        }}
        filterStatusLabel={t('list.filterStatus')}
      />

      {forms.length === 0 && !hasFilters ? (
        <Empty className='min-h-48 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10'>
          <EmptyHeader>
            <EmptyTitle className='text-lg'>{t('list.emptyTitle')}</EmptyTitle>
            <EmptyDescription>{t('list.emptyDescription')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {forms.length === 0 && hasFilters ? (
        <Empty className='min-h-48 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10'>
          <EmptyHeader>
            <EmptyTitle className='text-lg'>
              {t('list.filteredEmptyTitle')}
            </EmptyTitle>
            <EmptyDescription>
              {t('list.filteredEmptyDescription')}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {forms.length > 0 ? (
        <>
          <div className='overflow-hidden rounded-lg border border-border/60'>
            <Table className='min-w-[42rem]'>
              <CatalogTableHeader
                columns={[
                  { id: 'name', label: t('list.name') },
                  { id: 'code', label: t('list.code') },
                  { id: 'status', label: t('list.columnStatus') },
                  { id: 'published', label: t('list.columnPublished') },
                  { id: 'updated', label: t('list.columnUpdated') },
                ]}
                actionsLabel={t('list.columnActions')}
              />
              <TableBody>
                {forms.map((form) => {
                  const formStatus =
                    form.editableStatus ??
                    (form.publishedVersions.length > 0 ? 'published' : null);
                  return (
                    <TableRow
                      key={form.code}
                      data-form-code={form.code}
                    >
                      <TableCell className='font-medium'>{form.name}</TableCell>
                      <TableCell>
                        <code className='text-xs text-muted-foreground'>
                          {form.code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant='secondary'
                          className={cn(
                            formStatus === 'published' &&
                              'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                            formStatus === 'review' &&
                              'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                          )}
                        >
                          {formatFormEditableStatus(formStatus, t)}
                        </Badge>
                      </TableCell>
                      <TableCell className='text-xs text-muted-foreground'>
                        {form.publishedVersions.length > 0
                          ? form.publishedVersions
                              .map((version) => `v${version}`)
                              .join(' · ')
                          : '—'}
                      </TableCell>
                      <TableCell className='text-xs text-muted-foreground'>
                        {formatUpdatedAt(form.updatedAt, locale)}
                      </TableCell>
                      <TableCell className='text-right'>
                        {form.editableVersionId !== null &&
                        form.editableVersionId !== '' &&
                        form.editableStatus !== null &&
                        form.editableStatus !== '' &&
                        canDesign ? (
                          <Link
                            to='/$locale/forms/$code/designer/$draftId'
                            params={{
                              locale,
                              code: form.code,
                              draftId: form.editableVersionId,
                            }}
                            className={buttonVariants({ size: 'sm' })}
                          >
                            {t('list.openDesigner')}
                          </Link>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {hasFilters ? (
            <p className='text-sm text-muted-foreground'>
              {t('list.filteredCount', {
                count: forms.length,
                total: totalCount,
              })}
            </p>
          ) : (
            <FormListPagination
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              onPageChange={onPageChange}
            />
          )}
        </>
      ) : null}
    </div>
  );
}
