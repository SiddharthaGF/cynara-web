import { Link, useParams } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppShell } from '@/components/app-shell.tsx';
import { PageBreadcrumbs } from '@/components/page-breadcrumbs.tsx';
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
  const [forbiddenMessage, setForbiddenMessage] = useState<string | null>(null);

  if (forbiddenMessage !== null) {
    return (
      <AppShell variant='catalog'>
        <div className='mx-auto max-w-2xl px-6 py-6 pb-12'>
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
            <Button
              variant='ghost'
              nativeButton={false}
              render={
                <Link
                  to='/$locale/patients'
                  params={{ locale }}
                />
              }
            >
              <ArrowLeft className='size-4' />
              {t('register.backToList')}
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell variant='catalog'>
      <div className='mx-auto max-w-2xl px-6 py-6 pb-12'>
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
            {
              label: t('common:nav.patients'),
              link: (
                <Link
                  to='/$locale/patients'
                  params={{ locale }}
                />
              ),
            },
            { label: t('register.title') },
          ]}
        />

        <header className='mb-6'>
          <h1 className='font-display text-balance text-2xl font-semibold tracking-tight md:text-3xl'>
            {t('register.title')}
          </h1>
          <p className='mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground'>
            {t('register.subtitle')}
          </p>
        </header>

        <PatientRegisterForm onForbidden={setForbiddenMessage} />
      </div>
    </AppShell>
  );
}
