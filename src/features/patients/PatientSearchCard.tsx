import { Search } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import { formatPatientResultDescription } from '@/features/patients/patientForm.ts';
import { PatientSearchPagination } from '@/features/patients/PatientSearchPagination.tsx';
import {
  PatientResultsTable,
  PatientSearchForm,
  type SearchFormValues,
} from '@/features/patients/PatientSearchParts.tsx';
import type {
  ListPatientsParams,
  PatientDto,
} from '@/features/patients/usePatientsCatalog.ts';

interface PatientSearchCardProps {
  title: string;
  searchFormKey: string;
  searchFormValues: SearchFormValues;
  isSearching: boolean;
  onSearch: (params: ListPatientsParams) => void;
  onClear: () => void;
  createForbidden: string | null;
  patients: PatientDto[];
  isLoading: boolean;
  locale: string;
  onNewEncounter: (patient: PatientDto) => void;
  register?: boolean;
  canRegister?: boolean;
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

/**
 * Search ribbon: the results card that owns the patient search form, the
 * result table, and the pagination. Kept self-contained so any surface that
 * needs patient search can mount it.
 */
export function PatientSearchCard({
  title,
  searchFormKey,
  searchFormValues,
  isSearching,
  onSearch,
  onClear,
  createForbidden,
  patients,
  isLoading,
  locale,
  onNewEncounter,
  register = false,
  canRegister = false,
  page,
  pageSize,
  totalCount,
  onPageChange,
}: PatientSearchCardProps): JSX.Element {
  const { t } = useTranslation('patients');

  return (
    <Card className='border-border/70 shadow-sm'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 font-heading text-lg'>
          <Search className='size-4 text-muted-foreground' />
          {title}
        </CardTitle>
        <CardDescription>
          {formatPatientResultDescription(isLoading, totalCount, t)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PatientSearchForm
          key={searchFormKey}
          initialValues={searchFormValues}
          onSearch={onSearch}
          onClear={onClear}
          isSearching={isSearching}
        />
        <div className='mt-6'>
          {createForbidden ? (
            <Alert
              variant='destructive'
              className='mb-4'
            >
              <AlertDescription>{createForbidden}</AlertDescription>
            </Alert>
          ) : null}
          <PatientResultsTable
            patients={patients}
            isLoading={isLoading}
            locale={locale}
            onNewEncounter={onNewEncounter}
            register={register}
            canRegister={canRegister}
          />
          <PatientSearchPagination
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            onPageChange={onPageChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}
