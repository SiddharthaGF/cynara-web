import { Link, useParams } from '@tanstack/react-router';
import { UserPlus, ArrowLeft } from 'lucide-react';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppShell } from '@/components/app-shell.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty.tsx';
import { PatientRegisterForm } from '@/features/patients/PatientRegisterForm.tsx';

export function PatientRegisterPage(): JSX.Element {
  const { t } = useTranslation(['patients', 'api']);
  const { locale } = useParams({ from: '/$locale' });
  const reduceMotion = useReducedMotion();
  const [forbiddenMessage, setForbiddenMessage] = useState<string | null>(null);

  if (forbiddenMessage !== null) {
    return (
      <AppShell variant='catalog'>
        <div className='mx-auto max-w-2xl px-6 py-10 pb-20'>
          <Empty
            className='min-h-48 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10'
            data-testid='patient-register-forbidden'
          >
            <EmptyHeader>
              <EmptyTitle className='text-lg'>
                {t('permissions.forbiddenTitle')}
              </EmptyTitle>
              <EmptyDescription>
                {forbiddenMessage || t('permissions.forbiddenRegister')}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
          <div className='mt-4'>
            <Link
              to='/$locale/patients'
              params={{ locale }}
            >
              <Button variant='ghost'>
                <ArrowLeft className='size-4' />
                {t('register.backToList')}
              </Button>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell variant='catalog'>
      <LazyMotion features={domAnimation}>
        <div className='mx-auto max-w-2xl px-6 py-10 pb-20'>
          <m.header
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
            }
            className='mb-8'
          >
            <Link
              to='/$locale/patients'
              params={{ locale }}
            >
              <Button
                variant='ghost'
                size='sm'
                className='mb-4 -ml-2'
              >
                <ArrowLeft className='size-4' />
                {t('register.backToList')}
              </Button>
            </Link>
            <p className='mb-3 inline-flex items-center gap-1.5 text-xs font-medium tracking-[0.2em] text-accent uppercase'>
              <UserPlus className='size-3' />
              {t('register.eyebrow')}
            </p>
            <h1 className='font-display text-balance text-3xl font-semibold tracking-tight md:text-4xl'>
              {t('register.title')}
            </h1>
            <p className='mt-3 max-w-lg text-base leading-relaxed text-muted-foreground'>
              {t('register.subtitle')}
            </p>
          </m.header>

          <m.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }
            }
          >
            <PatientRegisterForm onForbidden={setForbiddenMessage} />
          </m.div>
        </div>
      </LazyMotion>
    </AppShell>
  );
}
