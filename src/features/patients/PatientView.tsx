import { UserCircle, Pencil, Trash2 } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import type { PatientDto } from '@/api/patients.ts';
import { Button } from '@/components/ui/button.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import {
  formatPatientDateTime,
  formatPatientSex,
  formatPatientStatus,
} from '@/features/patients/patientForm.ts';

function PatientInfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}): JSX.Element {
  return (
    <div className='flex flex-col gap-1'>
      <span className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
        {label}
      </span>
      <span className='text-sm font-medium'>{value ?? '—'}</span>
    </div>
  );
}

interface PatientViewProps {
  patient: PatientDto;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  canMutate: boolean;
}

export function PatientView({
  patient,
  onEdit,
  onDelete,
  isDeleting,
  canMutate,
}: PatientViewProps): JSX.Element {
  const { t, i18n } = useTranslation(['patients', 'api']);

  return (
    <div
      className='space-y-6'
      data-testid='patient-detail-view'
    >
      <div className='flex items-center justify-between gap-3'>
        <div className='flex items-center gap-3'>
          <div className='flex size-10 items-center justify-center rounded-full bg-primary/10'>
            <UserCircle className='size-5 text-primary' />
          </div>
          <div>
            <h2 className='font-heading text-lg font-medium'>
              {patient.givenName} {patient.familyName}
            </h2>
            <code className='text-sm text-muted-foreground'>{patient.mrn}</code>
          </div>
        </div>
        {canMutate ? (
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              data-testid='patient-detail-edit'
              onClick={onEdit}
            >
              <Pencil className='size-3.5' />
              {t('detail.edit')}
            </Button>
            <Button
              variant='destructive'
              size='sm'
              data-testid='patient-detail-delete'
              onClick={onDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <Spinner data-icon='inline-start' /> : null}
              <Trash2 className='size-3.5' />
              {t('detail.delete')}
            </Button>
          </div>
        ) : null}
      </div>

      <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'>
        <PatientInfoRow
          label={t('detail.fields.mrn')}
          value={patient.mrn}
        />
        <PatientInfoRow
          label={t('detail.fields.givenName')}
          value={patient.givenName}
        />
        <PatientInfoRow
          label={t('detail.fields.familyName')}
          value={patient.familyName}
        />
        <PatientInfoRow
          label={t('detail.fields.birthDate')}
          value={patient.birthDate}
        />
        <PatientInfoRow
          label={t('detail.fields.sex')}
          value={formatPatientSex(patient.sex, t)}
        />
        <PatientInfoRow
          label={t('detail.fields.nationalId')}
          value={patient.nationalId}
        />
        <PatientInfoRow
          label={t('detail.fields.status')}
          value={formatPatientStatus(patient.status, t)}
        />
        <PatientInfoRow
          label={t('detail.fields.createdAt')}
          value={formatPatientDateTime(patient.createdAt, i18n.language)}
        />
        <PatientInfoRow
          label={t('detail.fields.updatedAt')}
          value={formatPatientDateTime(patient.updatedAt, i18n.language)}
        />
      </div>
    </div>
  );
}
