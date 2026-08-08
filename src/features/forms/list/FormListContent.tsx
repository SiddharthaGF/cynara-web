import { Link, useParams } from '@tanstack/react-router';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { PageBreadcrumbs } from '@/components/page-breadcrumbs.tsx';
import { PageHeader } from '@/components/page-header.tsx';
import type { FormSummary } from '@/features/forms/types.ts';

import { CreateFormCard, CreateFormErrorAlert } from './CreateFormCard.tsx';
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
  onPageChange: (page: number) => void;
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
  onPageChange,
  onCreate,
}: FormListContentProps): JSX.Element {
  const { t } = useTranslation(['forms', 'common']);
  const { locale } = useParams({ from: '/$locale' });

  return (
    <div
      className='mx-auto max-w-6xl px-6 py-6 pb-12'
      data-testid='form-list-content'
    >
      <PageBreadcrumbs
        className='mb-4'
        items={[
          {
            label: t('common:nav.home'),
            link: (
              <Link
                to='/$locale'
                params={{ locale }}
              />
            ),
          },
          { label: t('list.title') },
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
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}
