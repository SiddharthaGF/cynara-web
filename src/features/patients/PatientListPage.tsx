import {
  Link,
  useNavigate,
  useParams,
  useSearch,
} from '@tanstack/react-router';
import { Search, UserPlus, Users } from 'lucide-react';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react';
import type { JSX } from 'react';
import { useCallback, useMemo } from 'react';
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
import { formatPatientResultDescription } from '@/features/patients/patientForm.ts';
import { PatientSearchPagination } from '@/features/patients/PatientSearchPagination.tsx';
import {
  PatientResultsTable,
  PatientSearchForm,
} from '@/features/patients/PatientSearchParts.tsx';
import {
  DEFAULT_PATIENT_PAGE_SIZE,
  usePatientSearch,
  type ListPatientsParams,
} from '@/features/patients/usePatientsCatalog.ts';
import { useCapabilities } from '@/hooks/use-capabilities.ts';

export function PatientListPage(): JSX.Element {
  const { t } = useTranslation('patients');
  const { locale } = useParams({ from: '/$locale' });
  const reduceMotion = useReducedMotion();
  const { can } = useCapabilities();
  const search = useSearch({ from: '/$locale/patients/' });
  const navigate = useNavigate();

  const listParams = useMemo<ListPatientsParams>(() => {
    const params: ListPatientsParams = {
      page: search.page,
      pageSize: search.pageSize,
    };
    if (search.mrn !== undefined && search.mrn !== '') {
      params.mrn = search.mrn;
    }
    if (search.givenName !== undefined && search.givenName !== '') {
      params.givenName = search.givenName;
    }
    if (search.familyName !== undefined && search.familyName !== '') {
      params.familyName = search.familyName;
    }
    if (search.nationalId !== undefined && search.nationalId !== '') {
      params.nationalId = search.nationalId;
    }
    return params;
  }, [search]);

  const {
    patients,
    totalCount,
    page,
    pageSize,
    isLoading,
    isFetching,
    error,
    isForbidden,
  } = usePatientSearch(listParams);

  const handleSearch = useCallback(
    (params: ListPatientsParams) => {
      void navigate({
        to: '/$locale/patients',
        params: { locale },
        search: (prev) => ({
          ...prev,
          mrn: params.mrn,
          givenName: params.givenName,
          familyName: params.familyName,
          nationalId: params.nationalId,
          page: 1,
        }),
      });
    },
    [locale, navigate],
  );

  const handleClear = useCallback(() => {
    void navigate({
      to: '/$locale/patients',
      params: { locale },
      search: {
        page: 1,
        pageSize: DEFAULT_PATIENT_PAGE_SIZE,
      },
      replace: true,
    });
  }, [locale, navigate]);

  const handlePageChange = useCallback(
    (nextPage: number) => {
      void navigate({
        to: '/$locale/patients',
        params: { locale },
        search: (prev) => ({ ...prev, page: nextPage }),
        replace: true,
      });
    },
    [locale, navigate],
  );

  const canRegister = !isForbidden && can('write', 'Patient');
  const showSearchError = !isForbidden && error !== null && error !== '';

  const searchFormValues = useMemo(
    () => ({
      mrn: search.mrn ?? '',
      givenName: search.givenName ?? '',
      familyName: search.familyName ?? '',
      nationalId: search.nationalId ?? '',
    }),
    [search.familyName, search.givenName, search.mrn, search.nationalId],
  );

  const searchFormKey = [
    search.mrn,
    search.givenName,
    search.familyName,
    search.nationalId,
  ]
    .map((value: string | undefined) => value ?? '')
    .join('|');

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
                    key={searchFormKey}
                    initialValues={searchFormValues}
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
