import type {
  FormAsyncValidateOrFn,
  FormValidateOrFn,
  ReactFormExtendedApi,
} from '@tanstack/react-form';
import { Link } from '@tanstack/react-router';
import { UserPlus } from 'lucide-react';
import type { Dispatch, JSX, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import { DatePickerInput } from '@/features/forms/renderer/DatePickerInput.tsx';
import type {
  PatientFieldErrors,
  PatientIdentityFields,
} from '@/features/patients/patientForm.ts';
import { PatientSexField } from '@/features/patients/PatientSexOption.tsx';

type PatientRegisterFormApi = ReactFormExtendedApi<
  PatientIdentityFields,
  FormValidateOrFn<PatientIdentityFields> | undefined,
  FormValidateOrFn<PatientIdentityFields> | undefined,
  FormAsyncValidateOrFn<PatientIdentityFields> | undefined,
  FormValidateOrFn<PatientIdentityFields> | undefined,
  FormAsyncValidateOrFn<PatientIdentityFields> | undefined,
  FormValidateOrFn<PatientIdentityFields> | undefined,
  FormAsyncValidateOrFn<PatientIdentityFields> | undefined,
  FormValidateOrFn<PatientIdentityFields> | undefined,
  FormAsyncValidateOrFn<PatientIdentityFields> | undefined,
  FormAsyncValidateOrFn<PatientIdentityFields> | undefined,
  unknown
>;

interface PatientRegisterCardProps {
  form: PatientRegisterFormApi;
  locale: string;
  fieldErrors: PatientFieldErrors;
  setFieldErrors: Dispatch<SetStateAction<PatientFieldErrors>>;
  duplicateMrnError: boolean;
  setDuplicateMrnError: Dispatch<SetStateAction<boolean>>;
  isRegistering: boolean;
}

export function PatientRegisterCard({
  form,
  locale,
  fieldErrors,
  setFieldErrors,
  duplicateMrnError,
  setDuplicateMrnError,
  isRegistering,
}: PatientRegisterCardProps): JSX.Element {
  const { t } = useTranslation('patients');

  return (
    <Card className='border-border/70 shadow-sm'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 font-heading text-lg'>
          <UserPlus className='size-4 text-primary' />
          {t('register.title')}
        </CardTitle>
        <CardDescription>{t('register.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          data-testid='patient-register-form'
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          noValidate
        >
          <FieldGroup className='grid gap-4 sm:grid-cols-2'>
            <form.Field name='mrn'>
              {(field) => {
                const mrnError =
                  fieldErrors.mrn ??
                  (duplicateMrnError
                    ? t('register.errors.mrnDuplicate')
                    : undefined);
                return (
                  <Field data-invalid={Boolean(mrnError)}>
                    <FieldLabel htmlFor='mrn'>
                      {t('register.fields.mrn')}
                    </FieldLabel>
                    <Input
                      id='mrn'
                      data-testid='patient-register-mrn'
                      value={field.state.value}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                        setDuplicateMrnError(false);
                        setFieldErrors((prev) => ({
                          ...prev,
                          mrn: undefined,
                        }));
                      }}
                      placeholder={t('register.fields.mrnPlaceholder')}
                      aria-invalid={Boolean(mrnError)}
                      aria-required
                      required
                      disabled={isRegistering}
                      autoComplete='off'
                    />
                    {mrnError ? (
                      <FieldError data-testid='patient-register-mrn-error'>
                        {mrnError}
                      </FieldError>
                    ) : null}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name='nationalId'>
              {(field) => {
                const error = fieldErrors.nationalId;
                return (
                  <Field data-invalid={Boolean(error)}>
                    <FieldLabel htmlFor='nationalId'>
                      {t('register.fields.nationalId')}
                    </FieldLabel>
                    <Input
                      id='nationalId'
                      data-testid='patient-register-nationalId'
                      value={field.state.value}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                        setFieldErrors((prev) => ({
                          ...prev,
                          nationalId: undefined,
                        }));
                      }}
                      placeholder={t('register.fields.nationalIdPlaceholder')}
                      aria-invalid={Boolean(error)}
                      aria-required
                      required
                      disabled={isRegistering}
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
                    <FieldLabel htmlFor='givenName'>
                      {t('register.fields.givenName')}
                    </FieldLabel>
                    <Input
                      id='givenName'
                      data-testid='patient-register-givenName'
                      value={field.state.value}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                        setFieldErrors((prev) => ({
                          ...prev,
                          givenName: undefined,
                        }));
                      }}
                      placeholder={t('register.fields.givenNamePlaceholder')}
                      aria-invalid={Boolean(error)}
                      aria-required
                      required
                      disabled={isRegistering}
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
                    <FieldLabel htmlFor='familyName'>
                      {t('register.fields.familyName')}
                    </FieldLabel>
                    <Input
                      id='familyName'
                      data-testid='patient-register-familyName'
                      value={field.state.value}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                        setFieldErrors((prev) => ({
                          ...prev,
                          familyName: undefined,
                        }));
                      }}
                      placeholder={t('register.fields.familyNamePlaceholder')}
                      aria-invalid={Boolean(error)}
                      aria-required
                      required
                      disabled={isRegistering}
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
                    <FieldLabel htmlFor='birthDate'>
                      {t('register.fields.birthDate')}
                    </FieldLabel>
                    <DatePickerInput
                      fieldType='date'
                      inputId='birthDate'
                      data-testid='patient-register-birthDate'
                      value={field.state.value}
                      enabled={!isRegistering}
                      placeholder={t('register.fields.birthDatePlaceholder')}
                      ariaInvalid={Boolean(error)}
                      ariaRequired
                      onChange={(next) => {
                        field.handleChange(
                          typeof next === 'string' ? next : '',
                        );
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
                  id='sex'
                  testId='patient-register-sex'
                  label={t('register.fields.sex')}
                  labels={{
                    female: t('register.fields.sexFemale'),
                    male: t('register.fields.sexMale'),
                    unknown: t('register.fields.sexUnknown'),
                  }}
                  value={field.state.value}
                  error={fieldErrors.sex}
                  disabled={isRegistering}
                  required
                  placeholder={t('register.fields.sexPlaceholder')}
                  onChange={(val) => {
                    field.handleChange(val);
                    setFieldErrors((prev) => ({
                      ...prev,
                      sex: undefined,
                    }));
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
                  data-testid='patient-register-submit'
                  disabled={isRegistering || !canSubmit}
                >
                  {isRegistering ? <Spinner data-icon='inline-start' /> : null}
                  {isRegistering
                    ? t('register.submitting')
                    : t('register.submit')}
                </Button>
              )}
            </form.Subscribe>
            <Link
              to='/$locale/patients'
              params={{ locale }}
            >
              <Button
                type='button'
                variant='ghost'
                disabled={isRegistering}
              >
                {t('register.backToList')}
              </Button>
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
