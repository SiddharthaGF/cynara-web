import { Link, useParams } from '@tanstack/react-router';
import type { TFunction } from 'i18next';
import { Workflow, FilePlus2 } from 'lucide-react';
import { m } from 'motion/react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge.tsx';
import { buttonVariants } from '@/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import type { WorkflowSummary } from '@/features/workflows/types.ts';
import { useCapabilities } from '@/hooks/use-capabilities.ts';
import { cn } from '@/lib/utils.ts';

/** Maps the raw server status enum to a localized label. */
function formatWorkflowEditableStatus(
  status: string | null,
  t: TFunction,
): string {
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

interface WorkflowsCatalogCardProps {
  workflows: WorkflowSummary[];
  isLoading: boolean;
  isCreatingDraft: boolean;
  reduceMotion: boolean | null;
  onCreateDraft: (code: string) => void;
}

export function WorkflowsCatalogCard({
  workflows,
  isLoading,
  isCreatingDraft,
  reduceMotion,
  onCreateDraft,
}: WorkflowsCatalogCardProps): JSX.Element {
  const { t } = useTranslation('workflows');
  const { locale } = useParams({ from: '/$locale' });
  const { can } = useCapabilities();
  const canDesign = can('write', 'Catalog');

  function renderCatalogBody(): JSX.Element {
    if (isLoading) {
      return (
        <div className='grid gap-3'>
          <Skeleton className='h-20 w-full' />
          <Skeleton className='h-20 w-full' />
          <Skeleton className='h-20 w-full' />
        </div>
      );
    }

    if (workflows.length === 0) {
      return (
        <Empty className='min-h-48 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10'>
          <EmptyHeader>
            <EmptyTitle className='text-lg'>{t('list.emptyTitle')}</EmptyTitle>
            <EmptyDescription>{t('list.emptyDescription')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      );
    }

    return (
      <ScrollArea className='h-full'>
        <ul className='grid gap-3 pr-3'>
          {workflows.map((workflow, index) => {
            const hasEditableDraft =
              workflow.editableVersionId !== null &&
              workflow.editableVersionId !== '';
            const status =
              workflow.editableStatus ??
              (workflow.publishedVersions.length > 0
                ? 'published'
                : t('list.noDraft'));

            function renderAction(): JSX.Element | null {
              if (!canDesign) {
                return null;
              }
              if (hasEditableDraft) {
                return (
                  <Link
                    to='/$locale/workflows/$code/designer'
                    params={{
                      locale,
                      code: workflow.code,
                    }}
                    className={cn(
                      buttonVariants({ size: 'sm' }),
                      'opacity-90 transition-opacity group-hover:opacity-100',
                    )}
                  >
                    {t('list.openDesigner')}
                  </Link>
                );
              }
              return (
                <button
                  type='button'
                  disabled={isCreatingDraft}
                  onClick={() => {
                    onCreateDraft(workflow.code);
                  }}
                  className={cn(
                    buttonVariants({ size: 'sm', variant: 'outline' }),
                    'gap-1.5 opacity-90 transition-opacity group-hover:opacity-100',
                  )}
                >
                  {isCreatingDraft ? (
                    <Spinner data-icon='inline-start' />
                  ) : (
                    <FilePlus2 className='size-3.5' />
                  )}
                  {t('list.newDraftAction')}
                </button>
              );
            }

            return (
              <m.li
                key={workflow.code}
                initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : {
                        duration: 0.35,
                        delay: 0.05 * index,
                        ease: [0.22, 1, 0.36, 1],
                      }
                }
              >
                <article className='group rounded-xl border border-border/70 bg-card p-4 transition-[border-color,box-shadow] hover:border-primary/35 hover:shadow-sm'>
                  <div className='flex flex-wrap items-start justify-between gap-3'>
                    <div className='grid gap-1'>
                      <strong className='font-heading text-base font-medium'>
                        {workflow.name}
                      </strong>
                      <code className='text-xs text-muted-foreground'>
                        {workflow.code}
                      </code>
                    </div>
                    {renderAction()}
                  </div>
                  <div className='mt-3 flex flex-wrap items-center gap-2'>
                    <Badge
                      variant='secondary'
                      className={cn(
                        status === 'published' &&
                          'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                        status === 'review' &&
                          'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                      )}
                    >
                      {formatWorkflowEditableStatus(status, t)}
                    </Badge>
                    {workflow.publishedVersions.length > 0 ? (
                      <span className='text-xs text-muted-foreground'>
                        {t('list.published', {
                          versions: workflow.publishedVersions.join(', '),
                        })}
                      </span>
                    ) : null}
                  </div>
                </article>
              </m.li>
            );
          })}
        </ul>
      </ScrollArea>
    );
  }

  return (
    <m.div
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : {
              duration: 0.45,
              delay: 0.14,
              ease: [0.22, 1, 0.36, 1],
            }
      }
    >
      <Card className='flex h-full flex-col border-border/70 shadow-sm'>
        <CardHeader className='shrink-0'>
          <CardTitle className='flex items-center gap-2 font-heading text-lg'>
            <Workflow className='size-4 text-muted-foreground' />
            {t('list.yourWorkflows')}
          </CardTitle>
          <CardDescription>
            {t('list.yourWorkflowsDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className='min-h-0 flex-1 overflow-hidden'>
          {renderCatalogBody()}
        </CardContent>
      </Card>
    </m.div>
  );
}
