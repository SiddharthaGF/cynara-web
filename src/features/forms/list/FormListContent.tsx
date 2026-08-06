import { Sparkles } from 'lucide-react';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import type { FormSummary } from '@/features/forms/types.ts';

import { CreateFormCard, CreateFormErrorAlert } from './CreateFormCard.tsx';
import { FormsCatalogCard } from './FormsCatalogCard.tsx';

interface FormListContentProps {
  forms: FormSummary[];
  error: string | null;
  isCreating: boolean;
  isLoading: boolean;
  canCreate: boolean;
  onCreate: (values: { code: string; name: string }) => Promise<void>;
}

export function FormListContent({
  forms,
  error,
  isCreating,
  isLoading,
  canCreate,
  onCreate,
}: FormListContentProps): JSX.Element {
  const { t } = useTranslation('forms');
  const reduceMotion = useReducedMotion();

  return (
    <LazyMotion features={domAnimation}>
      <div
        className='mx-auto max-w-4xl px-6 py-10 pb-20'
        data-testid='form-list-content'
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
              <Sparkles className='size-3' />
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
                {forms.length}
              </p>
              <p className='text-xs tracking-wide text-muted-foreground uppercase'>
                {t('list.draftCount', { count: forms.length })}
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
            <CreateFormErrorAlert message={error} />
          </m.div>
        ) : null}

        <div className='grid gap-6 lg:grid-cols-[1fr_1.2fr]'>
          {canCreate ? (
            <CreateFormCard
              isCreating={isCreating}
              reduceMotion={reduceMotion}
              onSubmit={onCreate}
            />
          ) : null}
          <FormsCatalogCard
            forms={forms}
            isLoading={isLoading}
            reduceMotion={reduceMotion}
          />
        </div>
      </div>
    </LazyMotion>
  );
}
