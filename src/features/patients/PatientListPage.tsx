import { Link, useParams } from '@tanstack/react-router';
import { Search, UserPlus, Users } from 'lucide-react';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react';
import type { JSX } from 'react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppShell } from '@/components/app-shell.tsx';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
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
import {
  formatPatientResultDescription,
  PatientResultsTable,
  PatientSearchForm,
  PatientSearchPagination,
} from '@/features/patients/PatientSearchParts.tsx';
import {
  DEFAULT_PATIENT_PAGE_SIZE,
  usePatientSearch,
  type ListPatientsParams,
} from '@/features/patients/usePatientsCatalog.ts';

export function PatientListPage(): JSX.Element {
  const { t } = useTranslation('patients');
  const { locale } = useParams({ from: '/$locale' });
  const reduceMotion = useReducedMotion();
  const [searchParams, setSearchParams] = useState<ListPatientsParams>({
    page: 1,
    pageSize: DEFAULT_PATIENT_PAGE_SIZE,
  });

  const {
    patients,
    totalCount,
    page,
    pageSize,
    isLoading,
    isFetching,
    error,
    isForbidden,
  } = usePatientSearch(searchParams);

  const handleSearch = useCallback((params: ListPatientsParams) => {
    setSearchParams({
      ...params,
      page: 1,
      pageSize: DEFAULT_PATIENT_PAGE_SIZE,
    });
  }, []);

  const handleClear = useCallback(() => {
    setSearchParams({
      page: 1,
      pageSize: DEFAULT_PATIENT_PAGE_SIZE,
    });
  }, []);

  const handlePageChange = useCallback((nextPage: number) => {
    setSearchParams((prev) => ({
      ...prev,
      page: nextPage,
      pageSize: prev.pageSize ?? DEFAULT_PATIENT_PAGE_SIZE,
    }));
  }, []);

  const canRegister = !isForbidden;
  const showSearchError = !isForbidden && error !== null && error !== '';

  return (
    <AppShell variant='catalog'>
      <LazyMotion features={domAnimation}>
        <div className='mx-auto max-w-5xl px-6 py-10 pb-20'>
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
                <Users className='size-3' />
                {t('search.eyebrow')}
              </p>
              <h1 className='font-display text-balance text-4xl font-semibold tracking-tight md:text-5xl'>
                {t('search.title')}
                <span className='text-primary'>{t('search.titleAccent')}</span>
              </h1>
              <p className='mt-3 max-w-lg text-base leading-relaxed text-muted-foreground'>
                {t('search.subtitle')}
              </p>
            </div>
            {canRegister ? (
              <div className='hidden md:block'>
                <Link
                  to='/$locale/patients/register'
                  params={{ locale }}
                >
                  <Button data-testid='patient-register-open'>
                    <UserPlus className='size-4' />
                    {t('search.registerPatient')}
                  </Button>
                </Link>
              </div>
            ) : null}
          </m.header>

          {isForbidden ? (
            <Empty
              className='mb-6 min-h-48 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10'
              data-testid='patient-search-forbidden'
            >
              <EmptyHeader>
                <EmptyTitle className='text-lg'>
                  {t('permissions.forbiddenTitle')}
                </EmptyTitle>
                <EmptyDescription>
                  {t('permissions.forbiddenSearch')}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}

          {showSearchError ? (
            <m.div
              initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={reduceMotion ? { duration: 0 } : undefined}
            >
              <Alert
                variant='destructive'
                className='mb-6'
                data-testid='patient-search-error'
              >
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </m.div>
          ) : null}

          {isForbidden ? null : (
            <m.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }
              }
            >
              <Card className='border-border/70 shadow-sm'>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2 font-heading text-lg'>
                    <Search className='size-4 text-muted-foreground' />
                    {t('search.resultsTitle')}
                  </CardTitle>
                  <CardDescription>
                    {formatPatientResultDescription(isLoading, totalCount, t)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PatientSearchForm
                    onSearch={handleSearch}
                    onClear={handleClear}
                    isSearching={isFetching}
                  />
                  <div className='mt-6'>
                    <PatientResultsTable
                      patients={patients}
                      isLoading={isLoading}
                      locale={locale}
                    />
                    <PatientSearchPagination
                      page={page}
                      pageSize={pageSize}
                      totalCount={totalCount}
                      onPageChange={handlePageChange}
                    />
                  </div>
                </CardContent>
              </Card>
            </m.div>
          )}

          {canRegister ? (
            <div className='fixed right-6 bottom-6 z-40 md:hidden'>
              <Link
                to='/$locale/patients/register'
                params={{ locale }}
              >
                <Button
                  size='icon-lg'
                  className='shadow-lg'
                  data-testid='patient-register-open-mobile'
                  aria-label={t('search.registerPatient')}
                >
                  <UserPlus className='size-5' />
                </Button>
              </Link>
            </div>
          ) : null}
        </div>
      </LazyMotion>
    </AppShell>
  );
}
