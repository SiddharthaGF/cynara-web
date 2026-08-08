import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { listEncounters, type EncounterDto } from '@/api/encounters.ts';
import { listForms } from '@/api/forms.ts';
import { queryKeys } from '@/api/query-keys.ts';
import { listWorkflows } from '@/api/workflows.ts';
import { Badge } from '@/components/ui/badge.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import {
  formatEncounterDateTime,
  formatEncounterType,
} from '@/features/encounters/encounterForm.ts';
import type { FormSummary } from '@/features/forms/types.ts';
import type { WorkflowSummary } from '@/features/workflows/types.ts';
import { useCapabilities } from '@/hooks/use-capabilities.ts';
import { cn } from '@/lib/utils.ts';

const RECENT_PAGE_SIZE = 5;

function formStatusLabel(
  status: string | null,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
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
    case null: {
      return t('list.noDraft');
    }
    default: {
      return t('list.noDraft');
    }
  }
}

function SectionHeading({ children }: { children: string }): JSX.Element {
  return (
    <h2 className='mb-3 font-heading text-xs font-medium tracking-widest text-muted-foreground uppercase'>
      {children}
    </h2>
  );
}

function SectionList({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div className='divide-y divide-border overflow-hidden rounded-lg border border-border/60 bg-card/60'>
      {children}
    </div>
  );
}

function EmptyRow({ children }: { children: string }): JSX.Element {
  return <p className='px-4 py-3 text-sm text-muted-foreground'>{children}</p>;
}

function RecentForms(): JSX.Element | null {
  const { t } = useTranslation(['home', 'forms']);
  const { locale } = useParams({ from: '/$locale' });
  const { can } = useCapabilities();

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.forms.list({ page: 1, pageSize: RECENT_PAGE_SIZE }),
    queryFn: async () => listForms({ page: 1, pageSize: RECENT_PAGE_SIZE }),
    enabled: can('read', 'Catalog'),
  });

  if (!can('read', 'Catalog')) {
    return null;
  }

  return (
    <section>
      <SectionHeading>{t('recent.forms', { ns: 'home' })}</SectionHeading>
      {isLoading ? (
        <div className='space-y-2'>
          <Skeleton className='h-9 w-full' />
          <Skeleton className='h-9 w-full' />
        </div>
      ) : null}
      {!isLoading && (isError || !data || data.forms.length === 0) ? (
        <EmptyRow>{t('recent.emptyForms', { ns: 'home' })}</EmptyRow>
      ) : null}
      {!isLoading && !isError && data !== undefined && data.forms.length > 0 ? (
        <SectionList>
          {data.forms.map((form: FormSummary) => {
            const canOpenDesigner =
              form.editableVersionId !== null &&
              form.editableVersionId !== '' &&
              can('write', 'Catalog');
            return (
              <Link
                key={form.code}
                to={
                  canOpenDesigner
                    ? '/$locale/forms/$code/designer/$draftId'
                    : '/$locale/forms'
                }
                params={
                  form.editableVersionId !== null &&
                  form.editableVersionId !== ''
                    ? {
                        locale,
                        code: form.code,
                        draftId: form.editableVersionId,
                      }
                    : { locale }
                }
                data-testid='home-recent-form'
                className='group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40'
              >
                <span className='min-w-0 flex-1'>
                  <span className='block truncate text-sm font-medium'>
                    {form.name}
                  </span>
                  <span className='block truncate font-mono text-xs text-muted-foreground'>
                    {form.code}
                  </span>
                </span>
                <Badge
                  variant='secondary'
                  className={cn(
                    form.editableStatus === 'published' &&
                      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                    form.editableStatus === 'review' &&
                      'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                  )}
                >
                  {formStatusLabel(form.editableStatus, (key) =>
                    t(key, { ns: 'forms' }),
                  )}
                </Badge>
                <ArrowRight className='size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5' />
              </Link>
            );
          })}
        </SectionList>
      ) : null}
    </section>
  );
}

function RecentWorkflows(): JSX.Element | null {
  const { t } = useTranslation(['home', 'workflows']);
  const { locale } = useParams({ from: '/$locale' });
  const { can } = useCapabilities();

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.workflowDefinitions.list(),
    queryFn: listWorkflows,
    enabled: can('read', 'Workflow'),
  });

  if (!can('read', 'Workflow')) {
    return null;
  }

  const workflows = (data ?? []).slice(0, RECENT_PAGE_SIZE);

  return (
    <section>
      <SectionHeading>{t('recent.workflows', { ns: 'home' })}</SectionHeading>
      {isLoading ? (
        <div className='space-y-2'>
          <Skeleton className='h-9 w-full' />
          <Skeleton className='h-9 w-full' />
        </div>
      ) : null}
      {!isLoading && (isError || workflows.length === 0) ? (
        <EmptyRow>{t('recent.emptyWorkflows', { ns: 'home' })}</EmptyRow>
      ) : null}
      {!isLoading && !isError && workflows.length > 0 ? (
        <SectionList>
          {workflows.map((workflow: WorkflowSummary) => {
            const hasEditableDraft =
              workflow.editableVersionId !== null &&
              workflow.editableVersionId !== '';
            const status =
              workflow.editableStatus ??
              (workflow.publishedVersions.length > 0 ? 'published' : null);
            return (
              <Link
                key={workflow.code}
                to={
                  hasEditableDraft
                    ? '/$locale/workflows/$code/designer'
                    : '/$locale/workflows'
                }
                params={{ locale, code: workflow.code }}
                data-testid='home-recent-workflow'
                className='group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40'
              >
                <span className='min-w-0 flex-1'>
                  <span className='block truncate text-sm font-medium'>
                    {workflow.name}
                  </span>
                  <span className='block truncate font-mono text-xs text-muted-foreground'>
                    {workflow.code}
                  </span>
                </span>
                <Badge
                  variant='secondary'
                  className={cn(
                    status === 'published' &&
                      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                    status === 'review' &&
                      'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                  )}
                >
                  {formStatusLabel(status, (key) =>
                    t(key, { ns: 'workflows' }),
                  )}
                </Badge>
                <ArrowRight className='size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5' />
              </Link>
            );
          })}
        </SectionList>
      ) : null}
    </section>
  );
}

function ActiveEncounters(): JSX.Element | null {
  const { t } = useTranslation(['home', 'encounters']);
  const { locale } = useParams({ from: '/$locale' });
  const { can } = useCapabilities();

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.encounters.list({ status: 'open' }),
    queryFn: async () => listEncounters({ status: 'open' }),
    enabled: can('read', 'Encounter'),
  });

  if (!can('read', 'Encounter')) {
    return null;
  }

  const encounters = (data?.encounters ?? [])
    .filter(
      (encounter): encounter is EncounterDto =>
        encounter.id !== undefined &&
        encounter.patientId !== undefined &&
        encounter.type !== undefined &&
        encounter.startedAt !== undefined,
    )
    .slice(0, RECENT_PAGE_SIZE);

  return (
    <section>
      <SectionHeading>{t('recent.encounters', { ns: 'home' })}</SectionHeading>
      {isLoading ? (
        <div className='space-y-2'>
          <Skeleton className='h-9 w-full' />
          <Skeleton className='h-9 w-full' />
        </div>
      ) : null}
      {!isLoading && (isError || encounters.length === 0) ? (
        <EmptyRow>{t('recent.emptyEncounters', { ns: 'home' })}</EmptyRow>
      ) : null}
      {!isLoading && !isError && encounters.length > 0 ? (
        <SectionList>
          {encounters.map((encounter) => (
            <Link
              key={encounter.id}
              to='/$locale/patients/$id/encounters/$encounterId'
              params={{
                locale,
                id: encounter.patientId,
                encounterId: encounter.id,
              }}
              data-testid='home-recent-encounter'
              className='group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40'
            >
              <span className='min-w-0 flex-1'>
                <span className='block truncate text-sm font-medium'>
                  {formatEncounterType(encounter.type, t)}
                </span>
                <span className='block truncate text-xs text-muted-foreground'>
                  {formatEncounterDateTime(encounter.startedAt, locale)}
                </span>
              </span>
              <ArrowRight className='size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5' />
            </Link>
          ))}
        </SectionList>
      ) : null}
    </section>
  );
}

/**
 * Work dashboard content: recent form drafts, workflows, and active
 * consultations. Sections are capability-gated and degrade to a quiet empty
 * row when there is no data yet.
 */
export function HomeDashboard(): JSX.Element {
  return (
    <div
      className='grid gap-6 lg:grid-cols-2'
      data-testid='home-dashboard'
    >
      <RecentForms />
      <RecentWorkflows />
      <ActiveEncounters />
    </div>
  );
}
