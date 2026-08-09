import { Link, useParams } from '@tanstack/react-router';
import type { TFunction } from 'i18next';
import { Search } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge.tsx';
import { buttonVariants } from '@/components/ui/button.tsx';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty.tsx';
import { Input } from '@/components/ui/input.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
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
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
        <div className='relative min-w-0 flex-1'>
          <Search
            aria-hidden
            className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground'
          />
          <Input
            type='search'
            value={query}
            onChange={(event) => {
              onQueryChange(event.target.value);
            }}
            placeholder={t('list.searchPlaceholder')}
            aria-label={t('list.searchPlaceholder')}
            className='pl-8'
          />
        </div>
        <Select
          items={statusItems}
          value={status}
          onValueChange={(value) => {
            onStatusChange(value ?? 'all');
          }}
        >
          <SelectTrigger
            className='w-full sm:w-44'
            aria-label={t('list.filterStatus')}
          >
            <SelectValue placeholder={t('list.filterStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>{t('list.filterAll')}</SelectItem>
            <SelectItem value='draft'>{t('list.status.draft')}</SelectItem>
            <SelectItem value='review'>{t('list.status.review')}</SelectItem>
            <SelectItem value='published'>
              {t('list.status.published')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

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
              <TableHeader>
                <TableRow>
                  <TableHead>{t('list.name')}</TableHead>
                  <TableHead>{t('list.code')}</TableHead>
                  <TableHead>{t('list.columnStatus')}</TableHead>
                  <TableHead>{t('list.columnPublished')}</TableHead>
                  <TableHead>{t('list.columnUpdated')}</TableHead>
                  <TableHead className='text-right'>
                    <span className='sr-only'>{t('list.columnActions')}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
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
