import { useForm } from '@tanstack/react-form';
import { useNavigate, useParams } from '@tanstack/react-router';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { describeApiError } from '@/api/error-message.ts';
import {
  isDuplicateMrnError,
  isForbiddenPatientError,
  type CreatePatientInput,
} from '@/api/patients.ts';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import {
  validatePatientIdentity,
  type PatientFieldErrors,
  type PatientIdentityFields,
} from '@/features/patients/patientForm.ts';
import { PatientRegisterCard } from '@/features/patients/PatientRegisterCard.tsx';
import { useRegisterPatient } from '@/features/patients/usePatientsCatalog.ts';

const INITIAL_VALUES: PatientIdentityFields = {
  mrn: '',
  nationalId: '',
  givenName: '',
  familyName: '',
  birthDate: '',
  sex: '',
};

interface PatientRegisterFormProps {
  onForbidden: (message: string) => void;
}

export function PatientRegisterForm({
  onForbidden,
}: PatientRegisterFormProps): JSX.Element {
  const { t } = useTranslation(['patients', 'api']);
  const { locale } = useParams({ from: '/$locale' });
  const navigate = useNavigate();
  const { registerPatient, isRegistering } = useRegisterPatient();

  const [fieldErrors, setFieldErrors] = useState<PatientFieldErrors>({});
  const [duplicateMrnError, setDuplicateMrnError] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: INITIAL_VALUES,
    onSubmit: async ({ value }) => {
      setFieldErrors({});
      setDuplicateMrnError(false);
      setServerError(null);

      const errors = validatePatientIdentity(value, t, {
        requireMrn: true,
        requireNationalId: true,
      });
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }

      const input: CreatePatientInput = {
        mrn: value.mrn.trim(),
        nationalId: value.nationalId.trim(),
        givenName: value.givenName.trim(),
        familyName: value.familyName.trim(),
        birthDate: value.birthDate.trim(),
        sex: value.sex as CreatePatientInput['sex'],
      };

      try {
        const created = await registerPatient(input);
        void navigate({
          to: '/$locale/patients/$id',
          params: { locale, id: created.id },
        });
      } catch (err) {
        if (isForbiddenPatientError(err)) {
          onForbidden(describeApiError(err, t));
          return;
        }
        if (isDuplicateMrnError(err)) {
          setDuplicateMrnError(true);
          return;
        }
        setServerError(describeApiError(err, t));
      }
    },
  });

  return (
    <>
      {serverError !== null && serverError !== '' ? (
        <Alert
          variant='destructive'
          className='mb-6'
        >
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      <PatientRegisterCard
        form={form}
        locale={locale}
        fieldErrors={fieldErrors}
        setFieldErrors={setFieldErrors}
        duplicateMrnError={duplicateMrnError}
        setDuplicateMrnError={setDuplicateMrnError}
        isRegistering={isRegistering}
      />
    </>
  );
}
