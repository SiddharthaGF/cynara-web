import { Link, useParams } from '@tanstack/react-router';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { PageBreadcrumbs } from '@/components/page-breadcrumbs.tsx';
import { PageHeader } from '@/components/page-header.tsx';
import type { WorkflowSummary } from '@/features/workflows/types.ts';

import {
  CreateWorkflowCard,
  CreateWorkflowErrorAlert,
} from './CreateWorkflowCard.tsx';
import { WorkflowsCatalogTable } from './WorkflowsCatalogTable.tsx';

export type WorkflowCreationState = 'idle' | 'creating' | 'creating-draft';

interface WorkflowListContentProps {
  workflows: WorkflowSummary[];
  error: string | null;
  creationState: WorkflowCreationState;
  isLoading: boolean;
  canCreate: boolean;
  onCreate: (values: { code: string; name: string }) => Promise<void>;
  onCreateDraft: (code: string) => void;
}

export function WorkflowListContent({
  workflows,
  error,
  creationState,
  isLoading,
  canCreate,
  onCreate,
  onCreateDraft,
}: WorkflowListContentProps): JSX.Element {
  const { t } = useTranslation(['workflows', 'common']);
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
            {t('list.count', { count: workflows.length })}
          </span>
        }
      />

      {error !== null && error !== '' ? (
        <CreateWorkflowErrorAlert message={error} />
      ) : null}

      <div className='grid gap-6 lg:grid-cols-[minmax(17rem,20rem)_minmax(0,1fr)]'>
        {canCreate ? (
          <CreateWorkflowCard
            isCreating={creationState === 'creating'}
            onSubmit={onCreate}
          />
        ) : null}
        <WorkflowsCatalogTable
          workflows={workflows}
          isLoading={isLoading}
          isCreatingDraft={creationState === 'creating-draft'}
          onCreateDraft={onCreateDraft}
        />
      </div>
    </div>
  );
}
