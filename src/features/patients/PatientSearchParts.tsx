import { Link } from '@tanstack/react-router';
import { UserCircle } from 'lucide-react';
import { m, useReducedMotion } from 'motion/react';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { PatientDto } from '@/api/patients.ts';
import { Button } from '@/components/ui/button.tsx';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty.tsx';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field.tsx';
import { Input } from '@/components/ui/input.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx';
import {
  formatPatientSex,
  formatPatientStatus,
} from '@/features/patients/patientForm.ts';
import type { ListPatientsParams } from '@/features/patients/usePatientsCatalog.ts';

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

export function PatientSearchForm({
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
      data-testid='patient-search-form'
    >
      <FieldGroup className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <Field>
          <FieldLabel htmlFor='mrn'>{t('search.mrn')}</FieldLabel>
          <Input
            id='mrn'
            data-testid='patient-search-mrn'
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
            data-testid='patient-search-givenName'
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
            data-testid='patient-search-familyName'
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
            data-testid='patient-search-nationalId'
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
          data-testid='patient-search-submit'
        >
          {isSearching ? <Spinner data-icon='inline-start' /> : null}
          {isSearching ? t('search.searching') : t('search.search')}
        </Button>
        <Button
          type='button'
          variant='ghost'
          data-testid='patient-search-clear'
          onClick={handleClear}
        >
          {t('search.clear')}
        </Button>
      </div>
    </form>
  );
}

interface PatientResultsTableProps {
  patients: PatientDto[];
  isLoading: boolean;
  locale: string;
}

export function PatientResultsTable({
  patients,
  isLoading,
  locale,
}: PatientResultsTableProps): JSX.Element {
  const { t } = useTranslation('patients');
  const reduceMotion = useReducedMotion();

  if (isLoading) {
    return (
      <div
        className='grid gap-3'
        data-testid='patient-search-loading'
      >
        <Skeleton className='h-12 w-full' />
        <Skeleton className='h-12 w-full' />
        <Skeleton className='h-12 w-full' />
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <Empty
        className='min-h-48 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10'
        data-testid='patient-search-empty'
      >
        <EmptyHeader>
          <EmptyTitle className='text-lg'>{t('search.emptyTitle')}</EmptyTitle>
          <EmptyDescription>{t('search.emptyDescription')}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ScrollArea
      className='max-h-80 w-full rounded-lg border border-border/60'
      data-testid='patient-search-results'
    >
      <table
        data-slot='table'
        className='w-full min-w-[40rem] caption-bottom text-sm'
      >
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
              data-testid='patient-search-row'
              data-patient-id={patient.id}
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
              <TableCell>{formatPatientSex(patient.sex, t)}</TableCell>
              <TableCell>
                <span className='inline-flex items-center gap-1.5'>
                  <span
                    className={`size-1.5 rounded-full ${
                      patient.status === 'active'
                        ? 'bg-green-500'
                        : 'bg-muted-foreground'
                    }`}
                  />
                  {formatPatientStatus(patient.status, t)}
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
                    data-testid='patient-search-view'
                  >
                    <UserCircle className='size-4' />
                    {t('search.viewDetail')}
                  </Button>
                </Link>
              </TableCell>
            </m.tr>
          ))}
        </TableBody>
      </table>
    </ScrollArea>
  );
}
