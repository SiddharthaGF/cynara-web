import { UserCircle } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import type { PatientDto } from '@/api/patients.ts';
import {
  formatPatientDateTime,
  formatPatientSex,
  formatPatientStatus,
} from '@/features/patients/patientForm.ts';

/** Age in whole years as of today, or null when the birth date is missing. */
function patientAgeYears(birthDate: string | null | undefined): number | null {
  if (!birthDate) {
    return null;
  }
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) {
    return null;
  }
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const beforeBirthdayThisYear =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthdayThisYear) {
    years -= 1;
  }
  return years;
}

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
}

export function PatientView({ patient }: PatientViewProps): JSX.Element {
  const { t, i18n } = useTranslation(['patients', 'api']);
  const ageYears = patientAgeYears(patient.birthDate);

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-3'>
        <div className='flex size-10 items-center justify-center rounded-full bg-primary/10'>
          <UserCircle className='size-5 text-primary' />
        </div>
        <div>
          <p className='font-heading text-lg font-medium'>
            {patient.givenName} {patient.familyName}
          </p>
          <code className='text-sm text-muted-foreground'>{patient.mrn}</code>
        </div>
      </div>

      <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'>
        <PatientInfoRow
          label={t('detail.fields.mrn')}
          value={patient.mrn}
        />
        <PatientInfoRow
          label={t('detail.fields.birthDate')}
          value={patient.birthDate}
        />
        {ageYears === null ? null : (
          <PatientInfoRow
            label={t('detail.fields.age')}
            value={String(ageYears)}
          />
        )}
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
