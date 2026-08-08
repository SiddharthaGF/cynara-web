import { useForm } from '@tanstack/react-form';
import { Save } from 'lucide-react';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { describeApiError } from '@/api/error-message.ts';
import {
  isDuplicateMrnError,
  isForbiddenPatientError,
  type PatientDto,
} from '@/api/patients.ts';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import { DatePickerInput } from '@/features/forms/renderer/DatePickerInput.tsx';
import {
  validatePatientIdentity,
  type PatientFieldErrors,
  type PatientIdentityFields,
} from '@/features/patients/patientForm.ts';
import { PatientSexField } from '@/features/patients/PatientSexOption.tsx';
import { useEditPatient } from '@/features/patients/usePatientsCatalog.ts';

interface EditFormValues {
  nationalId: string;
  givenName: string;
  familyName: string;
  birthDate: string;
  sex: string;
}

function patientToFormValues(patient: PatientDto): EditFormValues {
  return {
    nationalId: patient.nationalId ?? '',
    givenName: patient.givenName,
    familyName: patient.familyName,
    birthDate: patient.birthDate,
    sex: patient.sex,
  };
}

interface PatientEditFormProps {
  patient: PatientDto;
  onCancel: () => void;
  onSaved: () => void;
}

export function PatientEditForm({
  patient,
  onCancel,
  onSaved,
}: PatientEditFormProps): JSX.Element {
  const { t } = useTranslation(['patients', 'api']);
  const { editPatient, isEditing } = useEditPatient();

  const [fieldErrors, setFieldErrors] = useState<PatientFieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: patientToFormValues(patient),
    onSubmit: async ({ value }) => {
      setFieldErrors({});
      setServerError(null);

      const identity: PatientIdentityFields = {
        mrn: patient.mrn,
        nationalId: value.nationalId,
        givenName: value.givenName,
        familyName: value.familyName,
        birthDate: value.birthDate,
        sex: value.sex,
      };
      const errors = validatePatientIdentity(identity, t, {
        requireMrn: false,
      });
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }

      try {
        await editPatient({
          id: patient.id,
          givenName: value.givenName.trim(),
          familyName: value.familyName.trim(),
          birthDate: value.birthDate.trim(),
          sex: value.sex as 'female' | 'male' | 'unknown',
          nationalId: value.nationalId.trim() || null,
          rowVersion: patient.rowVersion,
        });
        onSaved();
      } catch (err) {
        if (isForbiddenPatientError(err)) {
          setServerError(describeApiError(err, t));
          return;
        }
        if (isDuplicateMrnError(err)) {
          setServerError(t('register.errors.mrnDuplicate'));
          return;
        }
        setServerError(describeApiError(err, t));
      }
    },
  });

  return (
    <form
      data-testid='patient-edit-form'
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      noValidate
    >
      {serverError !== null && serverError !== '' ? (
        <Alert
          variant='destructive'
          className='mb-4'
          data-testid='patient-edit-error'
        >
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      <FieldGroup className='grid gap-4 sm:grid-cols-2'>
        <Field>
          <FieldLabel htmlFor='edit-mrn'>{t('detail.fields.mrn')}</FieldLabel>
          <Input
            id='edit-mrn'
            value={patient.mrn}
            disabled
            readOnly
            aria-readonly='true'
            data-testid='patient-edit-mrn'
          />
          <p className='text-xs text-muted-foreground'>
            {t('detail.mrnImmutable')}
          </p>
        </Field>

        <form.Field name='nationalId'>
          {(field) => {
            const error = fieldErrors.nationalId;
            return (
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor='edit-nationalId'>
                  {t('detail.fields.nationalId')}
                </FieldLabel>
                <Input
                  id='edit-nationalId'
                  data-testid='patient-edit-nationalId'
                  value={field.state.value}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    setFieldErrors((prev) => ({
                      ...prev,
                      nationalId: undefined,
                    }));
                  }}
                  aria-invalid={Boolean(error)}
                  disabled={isEditing}
                  autoComplete='off'
                />
                {error ? <FieldError>{error}</FieldError> : null}
              </Field>
            );
          }}
        </form.Field>

        <form.Field name='givenName'>
          {(field) => {
            const error = fieldErrors.givenName;
            return (
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor='edit-givenName'>
                  {t('detail.fields.givenName')}
                </FieldLabel>
                <Input
                  id='edit-givenName'
                  data-testid='patient-edit-givenName'
                  value={field.state.value}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    setFieldErrors((prev) => ({
                      ...prev,
                      givenName: undefined,
                    }));
                  }}
                  aria-invalid={Boolean(error)}
                  disabled={isEditing}
                />
                {error ? <FieldError>{error}</FieldError> : null}
              </Field>
            );
          }}
        </form.Field>

        <form.Field name='familyName'>
          {(field) => {
            const error = fieldErrors.familyName;
            return (
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor='edit-familyName'>
                  {t('detail.fields.familyName')}
                </FieldLabel>
                <Input
                  id='edit-familyName'
                  data-testid='patient-edit-familyName'
                  value={field.state.value}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    setFieldErrors((prev) => ({
                      ...prev,
                      familyName: undefined,
                    }));
                  }}
                  aria-invalid={Boolean(error)}
                  disabled={isEditing}
                />
                {error ? <FieldError>{error}</FieldError> : null}
              </Field>
            );
          }}
        </form.Field>

        <form.Field name='birthDate'>
          {(field) => {
            const error = fieldErrors.birthDate;
            return (
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor='edit-birthDate'>
                  {t('detail.fields.birthDate')}
                </FieldLabel>
                <DatePickerInput
                  fieldType='date'
                  inputId='edit-birthDate'
                  data-testid='patient-edit-birthDate'
                  value={field.state.value}
                  enabled={!isEditing}
                  placeholder={t('register.fields.birthDatePlaceholder')}
                  ariaInvalid={Boolean(error)}
                  onChange={(next) => {
                    field.handleChange(typeof next === 'string' ? next : '');
                    setFieldErrors((prev) => ({
                      ...prev,
                      birthDate: undefined,
                    }));
                  }}
                />
                {error ? <FieldError>{error}</FieldError> : null}
              </Field>
            );
          }}
        </form.Field>

        <form.Field name='sex'>
          {(field) => (
            <PatientSexField
              id='edit-sex'
              testId='patient-edit-sex'
              label={t('detail.fields.sex')}
              labels={{
                female: t('detail.sexOptions.female'),
                male: t('detail.sexOptions.male'),
                unknown: t('detail.sexOptions.unknown'),
              }}
              value={field.state.value}
              error={fieldErrors.sex}
              disabled={isEditing}
              onChange={(val) => {
                field.handleChange(val);
                setFieldErrors((prev) => ({ ...prev, sex: undefined }));
              }}
            />
          )}
        </form.Field>
      </FieldGroup>

      <div className='mt-6 flex items-center gap-3'>
        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <Button
              type='submit'
              data-testid='patient-edit-save'
              disabled={isEditing || !canSubmit}
            >
              {isEditing ? <Spinner data-icon='inline-start' /> : null}
              <Save className='size-4' />
              {isEditing ? t('detail.saving') : t('detail.save')}
            </Button>
          )}
        </form.Subscribe>
        <Button
          type='button'
          variant='ghost'
          disabled={isEditing}
          onClick={onCancel}
        >
          {t('detail.cancel')}
        </Button>
      </div>
    </form>
  );
}
