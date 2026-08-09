import {
  Link,
  useNavigate,
  useParams,
  useSearch,
} from '@tanstack/react-router';
import { UserPlus } from 'lucide-react';
import type { JSX } from 'react';
import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PageBreadcrumbs } from '@/components/page-breadcrumbs.tsx';
import { PageHeader } from '@/components/page-header.tsx';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardHeader } from '@/components/ui/card.tsx';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { EncounterCreateDialog } from '@/features/encounters/EncounterCreateDialog.tsx';
import {
  DEFAULT_PATIENT_PAGE_SIZE,
  usePatientSearch,
  type ListPatientsParams,
  type PatientDto,
} from '@/features/patients/usePatientsCatalog.ts';
import { useCapabilities } from '@/hooks/use-capabilities.ts';

export type PatientSearchRoute = '/$locale/patients';

export interface PatientSearchFraming {
  titleKey: string;
  subtitleKey: string;
  cardTitleKey: string;
}

const LazyPatientSearchCard = lazy(async () => {
  const module = await import('./PatientSearchCard.tsx');
  return { default: module.PatientSearchCard };
});

interface PatientSearchWorkspaceProps {
  /** Route the search state lives on (the single patient search surface). */
  route: PatientSearchRoute;
  framing: PatientSearchFraming;
  /** Render the "Register patient" action; registry framing only. */
  register?: boolean;
}

/**
 * Shared patient search experience used by the registry ("Patients") and
 * referenced by care flows. Owns the search/pagination state, the forbidden
 * and error states, and the quick "New consultation" dialog for result rows.
 */
export function PatientSearchWorkspace({
  route,
  framing,
  register = false,
}: PatientSearchWorkspaceProps): JSX.Element {
  const { t } = useTranslation(['patients', 'encounters', 'common']);
  const { locale } = useParams({ from: '/$locale' });
  const { can } = useCapabilities();
  const search = useSearch({ strict: false });
  const navigate = useNavigate();

  const [createPatient, setCreatePatient] = useState<PatientDto | null>(null);
  const [createForbidden, setCreateForbidden] = useState<string | null>(null);

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
        to: route,
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
    [locale, navigate, route],
  );

  const handleClear = useCallback(() => {
    void navigate({
      to: route,
      params: { locale },
      search: {
        page: 1,
        pageSize: DEFAULT_PATIENT_PAGE_SIZE,
      },
      replace: true,
    });
  }, [locale, navigate, route]);

  const handlePageChange = useCallback(
    (nextPage: number) => {
      void navigate({
        to: route,
        params: { locale },
        search: (prev) => ({ ...prev, page: nextPage }),
        replace: true,
      });
    },
    [locale, navigate, route],
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
    <div className='mx-auto max-w-5xl px-6 py-6 pb-12'>
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
          { key: 'page', label: t(framing.titleKey) },
        ]}
      />
      <PageHeader
        className='mb-6'
        title={t(framing.titleKey)}
        subtitle={t(framing.subtitleKey)}
        actions={
          register && canRegister ? (
            <div className='hidden md:block'>
              <Button
                nativeButton={false}
                render={
                  <Link
                    to='/$locale/patients/register'
                    params={{ locale }}
                  />
                }
              >
                <UserPlus className='size-4' />
                {t('search.registerPatient')}
              </Button>
            </div>
          ) : undefined
        }
      />

      {isForbidden ? (
        <Empty className='mb-6 min-h-48 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10'>
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
        <Alert
          variant='destructive'
          className='mb-6'
        >
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {isForbidden ? null : (
        <Suspense
          fallback={
            <Card className='border-border/70 shadow-sm'>
              <CardHeader>
                <Skeleton className='h-6 w-48' />
                <Skeleton className='mt-2 h-4 w-56' />
              </CardHeader>
              <CardContent>
                <div className='grid gap-3'>
                  <Skeleton className='h-11 w-full' />
                  <Skeleton className='h-11 w-full' />
                  <Skeleton className='h-64 w-full' />
                </div>
              </CardContent>
            </Card>
          }
        >
          <LazyPatientSearchCard
            title={t(framing.cardTitleKey)}
            searchFormKey={searchFormKey}
            searchFormValues={searchFormValues}
            isSearching={isFetching}
            onSearch={handleSearch}
            onClear={handleClear}
            createForbidden={createForbidden}
            patients={patients}
            isLoading={isLoading}
            locale={locale}
            onNewEncounter={setCreatePatient}
            register={register}
            canRegister={canRegister}
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            onPageChange={handlePageChange}
          />
        </Suspense>
      )}

      {register && canRegister ? (
        <div className='fixed right-6 bottom-6 z-40 md:hidden'>
          <Button
            size='icon-lg'
            nativeButton={false}
            className='shadow-lg'
            aria-label={t('search.registerPatient')}
            render={
              <Link
                to='/$locale/patients/register'
                params={{ locale }}
              />
            }
          >
            <UserPlus className='size-5' />
          </Button>
        </div>
      ) : null}

      {createPatient ? (
        <EncounterCreateDialog
          key={createPatient.id}
          patientId={createPatient.id}
          open
          onOpenChange={(open) => {
            if (!open) {
              setCreatePatient(null);
              setCreateForbidden(null);
            }
          }}
          onForbidden={(message) => {
            setCreateForbidden(message);
            setCreatePatient(null);
          }}
          onCreated={(encounterId) => {
            setCreatePatient(null);
            void navigate({
              to: '/$locale/patients/$id/encounters/$encounterId',
              params: { locale, id: createPatient.id, encounterId },
            });
          }}
        />
      ) : null}
    </div>
  );
}
