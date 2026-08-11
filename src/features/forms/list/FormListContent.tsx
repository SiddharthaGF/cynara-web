import { Link, useParams } from '@tanstack/react-router';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { PageBreadcrumbs } from '@/components/page-breadcrumbs.tsx';
import { PageHeader } from '@/components/page-header.tsx';
import type { FormSummary } from '@/features/forms/types.ts';

import { CreateFormCard, CreateFormErrorAlert } from './CreateFormCard.tsx';
import type { FormFilterStatus } from './formListSearch.ts';
import { FormsCatalogTable } from './FormsCatalogTable.tsx';

interface FormListContentProps {
  forms: FormSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
  error: string | null;
  isCreating: boolean;
  isLoading: boolean;
  canCreate: boolean;
  query: string;
  status: FormFilterStatus;
  onPageChange: (page: number) => void;
  onQueryChange: (query: string) => void;
  onStatusChange: (status: FormFilterStatus) => void;
  onCreate: (values: { code: string; name: string }) => Promise<void>;
}

export function FormListContent({
  forms,
  totalCount,
  page,
  pageSize,
  error,
  isCreating,
  isLoading,
  canCreate,
  query,
  status,
  onPageChange,
  onQueryChange,
  onStatusChange,
  onCreate,
}: FormListContentProps): JSX.Element {
  const { t } = useTranslation(['forms', 'common']);
  const { locale } = useParams({ from: '/$locale' });

  return (
    <div className='mx-auto max-w-6xl px-6 py-6 pb-12'>
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
          { key: 'title', label: t('list.title') },
        ]}
      />
      <PageHeader
        className='mb-6'
        title={t('list.title')}
        subtitle={t('list.subtitle')}
        actions={
          <span className='text-sm text-muted-foreground'>
            {t('list.count', { count: totalCount })}
          </span>
        }
      />

      {error !== null && error !== '' ? (
        <CreateFormErrorAlert message={error} />
      ) : null}

      <div className='grid gap-6 lg:grid-cols-[minmax(17rem,20rem)_minmax(0,1fr)]'>
        {canCreate ? (
          <CreateFormCard
            isCreating={isCreating}
            onSubmit={onCreate}
          />
        ) : null}
        <FormsCatalogTable
          forms={forms}
          totalCount={totalCount}
          page={page}
          pageSize={pageSize}
          isLoading={isLoading}
          query={query}
          status={status}
          onQueryChange={onQueryChange}
          onStatusChange={onStatusChange}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}
