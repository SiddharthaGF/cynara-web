import { Link, useParams } from '@tanstack/react-router';
import { Search, UserPlus, Users, UserCircle } from 'lucide-react';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react';
import type { JSX } from 'react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { PatientDto } from '@/api/patients.ts';
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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx';
import {
  usePatientSearch,
  type ListPatientsParams,
} from '@/features/patients/usePatientsCatalog.ts';

// ─── Sex display helper ──────────────────────────────────────────────────────

// ─── Search form ─────────────────────────────────────────────────────────────

interface SearchFormValues {
  mrn: string;
  givenName: string;
  familyName: string;
  nationalId: string;
}

interface PatientSearchFormProps {
  onSearch: (params: ListPatientsParams) => void;
  onClear: () => void;
  isSearching: boolean;
}

function PatientSearchForm({
  onSearch,
  onClear,
  isSearching,
}: PatientSearchFormProps): JSX.Element {
  const { t } = useTranslation('patients');
  const [values, setValues] = useState<SearchFormValues>({
    mrn: '',
    givenName: '',
    familyName: '',
    nationalId: '',
  });

  function handleChange(field: keyof SearchFormValues, value: string): void {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const params: ListPatientsParams = {};
    if (values.mrn.trim()) {
      params.mrn = values.mrn.trim();
    }
    if (values.givenName.trim()) {
      params.givenName = values.givenName.trim();
    }
    if (values.familyName.trim()) {
      params.familyName = values.familyName.trim();
    }
    if (values.nationalId.trim()) {
      params.nationalId = values.nationalId.trim();
    }
    onSearch(params);
  }

  function handleClear(): void {
    setValues({ mrn: '', givenName: '', familyName: '', nationalId: '' });
    onClear();
  }

  return (
    <form
      onSubmit={handleSubmit}
      role='search'
      aria-label={t('search.title')}
    >
      <FieldGroup className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <Field>
          <FieldLabel htmlFor='mrn'>{t('search.mrn')}</FieldLabel>
          <Input
            id='mrn'
            value={values.mrn}
            onChange={(e) => handleChange('mrn', e.target.value)}
            placeholder={t('search.mrnPlaceholder')}
            autoComplete='off'
          />
        </Field>
        <Field>
          <FieldLabel htmlFor='givenName'>{t('search.givenName')}</FieldLabel>
          <Input
            id='givenName'
            value={values.givenName}
            onChange={(e) => handleChange('givenName', e.target.value)}
            placeholder={t('search.givenNamePlaceholder')}
            autoComplete='off'
          />
        </Field>
        <Field>
          <FieldLabel htmlFor='familyName'>{t('search.familyName')}</FieldLabel>
          <Input
            id='familyName'
            value={values.familyName}
            onChange={(e) => handleChange('familyName', e.target.value)}
            placeholder={t('search.familyNamePlaceholder')}
            autoComplete='off'
          />
        </Field>
        <Field>
          <FieldLabel htmlFor='nationalId'>{t('search.nationalId')}</FieldLabel>
          <Input
            id='nationalId'
            value={values.nationalId}
            onChange={(e) => handleChange('nationalId', e.target.value)}
            placeholder={t('search.nationalIdPlaceholder')}
            autoComplete='off'
          />
        </Field>
      </FieldGroup>
      <div className='mt-4 flex items-center gap-2'>
        <Button
          type='submit'
          disabled={isSearching}
        >
          {isSearching ? <Spinner data-icon='inline-start' /> : null}
          {isSearching ? t('search.searching') : t('search.search')}
        </Button>
        <Button
          type='button'
          variant='ghost'
          onClick={handleClear}
        >
          {t('search.clear')}
        </Button>
      </div>
    </form>
  );
}

// ─── Results table ───────────────────────────────────────────────────────────

function formatSex(
  sex: string,
  t: ReturnType<typeof useTranslation<'patients'>>['t'],
): string {
  if (sex === 'male') {
    return t('sex.male');
  }
  if (sex === 'female') {
    return t('sex.female');
  }
  return t('sex.other');
}

function formatResultDescription(
  isLoading: boolean,
  resultCount: number,
  t: ReturnType<typeof useTranslation<'patients'>>['t'],
): string | undefined {
  if (isLoading) {
    return t('search.searching');
  }
  if (resultCount > 0) {
    return t('search.resultCount', { count: resultCount });
  }
  return undefined;
}

interface PatientResultsTableProps {
  patients: PatientDto[];
  isLoading: boolean;
  locale: string;
}

function PatientResultsTable({
  patients,
  isLoading,
  locale,
}: PatientResultsTableProps & { locale: string }): JSX.Element {
  const { t } = useTranslation('patients');
  const reduceMotion = useReducedMotion();

  if (isLoading) {
    return (
      <div className='grid gap-3'>
        <Skeleton className='h-12 w-full' />
        <Skeleton className='h-12 w-full' />
        <Skeleton className='h-12 w-full' />
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <Empty className='min-h-48 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10'>
        <EmptyHeader>
          <EmptyTitle className='text-lg'>{t('search.emptyTitle')}</EmptyTitle>
          <EmptyDescription>{t('search.emptyDescription')}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className='overflow-x-auto'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('search.columns.mrn')}</TableHead>
            <TableHead>{t('search.columns.name')}</TableHead>
            <TableHead>{t('search.columns.birthDate')}</TableHead>
            <TableHead>{t('detail.fields.sex')}</TableHead>
            <TableHead>{t('search.columns.status')}</TableHead>
            <TableHead className='text-right'>
              <span className='sr-only'>Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((patient, index) => (
            <m.tr
              key={patient.id}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : {
                      duration: 0.3,
                      delay: 0.04 * index,
                      ease: [0.22, 1, 0.36, 1],
                    }
              }
            >
              <TableCell>
                <code className='text-sm font-medium'>{patient.mrn}</code>
              </TableCell>
              <TableCell>
                <span className='font-medium'>
                  {patient.givenName} {patient.familyName}
                </span>
              </TableCell>
              <TableCell>{patient.birthDate}</TableCell>
              <TableCell>{formatSex(patient.sex, t)}</TableCell>
              <TableCell>
                <span className='inline-flex items-center gap-1.5'>
                  <span
                    className={`size-1.5 rounded-full ${
                      patient.status === 'active'
                        ? 'bg-green-500'
                        : 'bg-muted-foreground'
                    }`}
                  />
                  {patient.status}
                </span>
              </TableCell>
              <TableCell className='text-right'>
                <Link
                  to='/$locale/patients/$id'
                  params={{ locale, id: patient.id }}
                >
                  <Button
                    variant='ghost'
                    size='sm'
                  >
                    <UserCircle className='size-4' />
                    {t('search.viewDetail')}
                  </Button>
                </Link>
              </TableCell>
            </m.tr>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function PatientListPage(): JSX.Element {
  const { t } = useTranslation('patients');
  const { locale } = useParams({ from: '/$locale' });
  const reduceMotion = useReducedMotion();
  const [searchParams, setSearchParams] = useState<ListPatientsParams>({});

  const { patients, isLoading, error } = usePatientSearch(searchParams);

  const handleSearch = useCallback((params: ListPatientsParams) => {
    setSearchParams(params);
  }, []);

  const handleClear = useCallback(() => {
    setSearchParams({});
  }, []);

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
            <div className='hidden md:block'>
              <Link
                to='/$locale/patients/register'
                params={{ locale }}
              >
                <Button>
                  <UserPlus className='size-4' />
                  {t('search.registerPatient')}
                </Button>
              </Link>
            </div>
          </m.header>

          {error !== null && error !== '' ? (
            <m.div
              initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={reduceMotion ? { duration: 0 } : undefined}
            >
              <Alert
                variant='destructive'
                className='mb-6'
              >
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </m.div>
          ) : null}

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
                  {formatResultDescription(isLoading, patients.length, t)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PatientSearchForm
                  onSearch={handleSearch}
                  onClear={handleClear}
                  isSearching={isLoading}
                />
                <div className='mt-6'>
                  <PatientResultsTable
                    patients={patients}
                    isLoading={isLoading}
                    locale={locale}
                  />
                </div>
              </CardContent>
            </Card>
          </m.div>

          {/* Mobile FAB for register */}
          <div className='fixed bottom-6 right-6 z-40 md:hidden'>
            <Link
              to='/$locale/patients/register'
              params={{ locale }}
            >
              <Button
                size='icon-lg'
                className='shadow-lg'
              >
                <UserPlus className='size-5' />
              </Button>
            </Link>
          </div>
        </div>
      </LazyMotion>
    </AppShell>
  );
}
