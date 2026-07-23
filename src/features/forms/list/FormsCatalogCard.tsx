import { Link, useParams } from '@tanstack/react-router';
import { FileText } from 'lucide-react';
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
import type { FormSummary } from '@/features/forms/types.ts';
import { cn } from '@/lib/utils.ts';

interface FormsCatalogCardProps {
  forms: FormSummary[];
  isLoading: boolean;
  reduceMotion: boolean | null;
}

export function FormsCatalogCard({
  forms,
  isLoading,
  reduceMotion,
}: FormsCatalogCardProps): JSX.Element {
  const { t } = useTranslation('forms');
  const { locale } = useParams({ from: '/$locale' });

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

    if (forms.length === 0) {
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
          {forms.map((form, index) => (
            <m.li
              key={form.code}
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
                      {form.name}
                    </strong>
                    <code className='text-xs text-muted-foreground'>
                      {form.code}
                    </code>
                  </div>
                  {form.editableVersionId !== null &&
                  form.editableVersionId !== '' &&
                  form.editableStatus !== null &&
                  form.editableStatus !== '' ? (
                    <Link
                      to='/$locale/forms/$code/designer/$draftId'
                      params={{
                        locale,
                        code: form.code,
                        draftId: form.editableVersionId,
                      }}
                      className={cn(
                        buttonVariants({ size: 'sm' }),
                        'opacity-90 transition-opacity group-hover:opacity-100',
                      )}
                    >
                      {t('list.openDesigner')}
                    </Link>
                  ) : null}
                </div>
                <div className='mt-3 flex flex-wrap items-center gap-2'>
                  <Badge
                    variant='secondary'
                    className='bg-primary/8 text-primary'
                  >
                    {form.editableStatus ?? t('list.noDraft')}
                  </Badge>
                  {form.publishedVersions.length > 0 ? (
                    <span className='text-xs text-muted-foreground'>
                      {t('list.published', {
                        versions: form.publishedVersions.join(', '),
                      })}
                    </span>
                  ) : null}
                </div>
              </article>
            </m.li>
          ))}
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
            <FileText className='size-4 text-muted-foreground' />
            {t('list.yourForms')}
          </CardTitle>
          <CardDescription>{t('list.yourFormsDescription')}</CardDescription>
        </CardHeader>
        <CardContent className='min-h-0 flex-1 overflow-hidden'>
          {renderCatalogBody()}
        </CardContent>
      </Card>
    </m.div>
  );
}
