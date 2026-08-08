import { Workflow } from 'lucide-react';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import type { WorkflowSummary } from '@/features/workflows/types.ts';

import {
  CreateWorkflowCard,
  CreateWorkflowErrorAlert,
} from './CreateWorkflowCard.tsx';
import { WorkflowsCatalogCard } from './WorkflowsCatalogCard.tsx';

interface WorkflowListContentProps {
  workflows: WorkflowSummary[];
  error: string | null;
  isCreating: boolean;
  isCreatingDraft: boolean;
  isLoading: boolean;
  canCreate: boolean;
  onCreate: (values: { code: string; name: string }) => Promise<void>;
  onCreateDraft: (code: string) => void;
}

export function WorkflowListContent({
  workflows,
  error,
  isCreating,
  isCreatingDraft,
  isLoading,
  canCreate,
  onCreate,
  onCreateDraft,
}: WorkflowListContentProps): JSX.Element {
  const { t } = useTranslation('workflows');
  const reduceMotion = useReducedMotion();

  return (
    <LazyMotion features={domAnimation}>
      <div
        className='mx-auto max-w-4xl px-6 py-10 pb-20'
        data-testid='workflow-list-content'
      >
        <m.header
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
          }
          className='mb-10 grid gap-6 md:grid-cols-[1fr_auto] md:items-end'
        >
          <div>
            <p className='mb-3 inline-flex items-center gap-1.5 text-xs font-medium tracking-[0.2em] text-accent uppercase'>
              <Workflow className='size-3' />
              {t('list.eyebrow')}
            </p>
            <h1 className='font-display text-balance text-4xl font-semibold tracking-tight md:text-5xl'>
              {t('list.title')}
              <span className='text-primary'>{t('list.titleAccent')}</span>
            </h1>
            <p className='mt-3 max-w-lg text-base leading-relaxed text-muted-foreground'>
              {t('list.subtitle')}
            </p>
          </div>
          <div className='hidden md:block'>
            <div className='rounded-2xl border border-primary/15 bg-primary/5 px-5 py-4 text-right'>
              <p className='font-display text-3xl font-semibold text-primary'>
                {workflows.length}
              </p>
              <p className='text-xs tracking-wide text-muted-foreground uppercase'>
                {t('list.draftCount', { count: workflows.length })}
              </p>
            </div>
          </div>
        </m.header>

        {error !== null && error !== '' ? (
          <m.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={reduceMotion ? { duration: 0 } : undefined}
          >
            <CreateWorkflowErrorAlert message={error} />
          </m.div>
        ) : null}

        <div className='grid gap-6 lg:grid-cols-[1fr_1.2fr]'>
          {canCreate ? (
            <CreateWorkflowCard
              isCreating={isCreating}
              reduceMotion={reduceMotion}
              onSubmit={onCreate}
            />
          ) : null}
          <WorkflowsCatalogCard
            workflows={workflows}
            isLoading={isLoading}
            isCreatingDraft={isCreatingDraft}
            reduceMotion={reduceMotion}
            onCreateDraft={onCreateDraft}
          />
        </div>
      </div>
    </LazyMotion>
  );
}
