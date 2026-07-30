import { useForm } from '@tanstack/react-form';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { UserPlus, ArrowLeft } from 'lucide-react';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/api/client.ts';
import { describeApiError } from '@/api/error-message.ts';
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
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field.tsx';
import { Input } from '@/components/ui/input.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import {
  useRegisterPatient,
  type CreatePatientInput,
} from '@/features/patients/usePatientsCatalog.ts';

// ─── Form values ─────────────────────────────────────────────────────────────

interface PatientFormValues {
  mrn: string;
  nationalId: string;
  givenName: string;
  familyName: string;
  birthDate: string;
  sex: string;
  status: string;
}

const INITIAL_VALUES: PatientFormValues = {
  mrn: '',
  nationalId: '',
  givenName: '',
  familyName: '',
  birthDate: '',
  sex: '',
  status: 'active',
};

// ─── Validation ──────────────────────────────────────────────────────────────

const MRN_PATTERN = /^[A-Za-z0-9-]+$/;

function validateForm(
  values: PatientFormValues,
  t: (key: string) => string,
): Partial<Record<keyof PatientFormValues, string>> {
  const errors: Partial<Record<keyof PatientFormValues, string>> = {};

  if (!values.mrn.trim()) {
    errors.mrn = t('register.errors.mrnRequired');
  } else if (!MRN_PATTERN.test(values.mrn.trim())) {
    errors.mrn = t('register.errors.mrnInvalid');
  }

  if (!values.givenName.trim()) {
    errors.givenName = t('register.errors.givenNameRequired');
  }

  if (!values.familyName.trim()) {
    errors.familyName = t('register.errors.familyNameRequired');
  }

  if (!values.birthDate.trim()) {
    errors.birthDate = t('register.errors.birthDateRequired');
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(values.birthDate.trim())) {
    errors.birthDate = t('register.errors.birthDateInvalid');
  }

  if (!values.sex) {
    errors.sex = t('register.errors.sexRequired');
  }

  return errors;
}

// ─── Duplicate MRN detection ─────────────────────────────────────────────────

function isDuplicateMrnError(error: unknown): boolean {
  if (!(error instanceof ApiError)) {
    return false;
  }
  if (error.status !== 409 && error.status !== 422) {
    return false;
  }
  const detail = (error.message ?? '').toLowerCase();
  return (
    detail.includes('mrn') ||
    detail.includes('already exists') ||
    detail.includes('duplicate')
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PatientRegisterPage(): JSX.Element {
  const { t } = useTranslation(['patients', 'api']);
  const { locale } = useParams({ from: '/$locale' });
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const { registerPatient, isRegistering } = useRegisterPatient();

  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof PatientFormValues, string>>
  >({});
  const [duplicateMrnError, setDuplicateMrnError] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: INITIAL_VALUES,
    onSubmit: async ({ value }) => {
      setFieldErrors({});
      setDuplicateMrnError(false);
      setServerError(null);

      const errors = validateForm(value, t);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }

      const input: CreatePatientInput = {
        mrn: value.mrn.trim(),
        givenName: value.givenName.trim(),
        familyName: value.familyName.trim(),
        birthDate: value.birthDate.trim(),
        sex: value.sex,
      };

      if (value.nationalId.trim()) {
        input.nationalId = value.nationalId.trim();
      }

      if (value.status) {
        input.status = value.status;
      }

      try {
        await registerPatient(input);
        void navigate({ to: '/$locale/patients', params: { locale } });
      } catch (err) {
        if (isDuplicateMrnError(err)) {
          setDuplicateMrnError(true);
          return;
        }
        setServerError(describeApiError(err, t));
      }
    },
  });

  return (
    <AppShell variant='catalog'>
      <LazyMotion features={domAnimation}>
        <div className='mx-auto max-w-2xl px-6 py-10 pb-20'>
          <m.header
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
            }
            className='mb-8'
          >
            <Link
              to='/$locale/patients'
              params={{ locale }}
            >
              <Button
                variant='ghost'
                size='sm'
                className='mb-4 -ml-2'
              >
                <ArrowLeft className='size-4' />
                {t('register.backToList')}
              </Button>
            </Link>
            <p className='mb-3 inline-flex items-center gap-1.5 text-xs font-medium tracking-[0.2em] text-accent uppercase'>
              <UserPlus className='size-3' />
              {t('register.eyebrow')}
            </p>
            <h1 className='font-display text-balance text-3xl font-semibold tracking-tight md:text-4xl'>
              {t('register.title')}
            </h1>
            <p className='mt-3 max-w-lg text-base leading-relaxed text-muted-foreground'>
              {t('register.subtitle')}
            </p>
          </m.header>

          {serverError !== null && serverError !== '' ? (
            <m.div
              initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={reduceMotion ? { duration: 0 } : undefined}
            >
              <Alert
                variant='destructive'
                className='mb-6'
              >
                <AlertDescription>{serverError}</AlertDescription>
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
                  <UserPlus className='size-4 text-primary' />
                  {t('register.title')}
                </CardTitle>
                <CardDescription>{t('register.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void form.handleSubmit();
                  }}
                  noValidate
                >
                  <FieldGroup className='grid gap-4 sm:grid-cols-2'>
                    {/* MRN */}
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
                              disabled={isRegistering}
                              autoComplete='off'
                            />
                            {mrnError ? (
                              <FieldError>{mrnError}</FieldError>
                            ) : null}
                          </Field>
                        );
                      }}
                    </form.Field>

                    {/* National ID */}
                    <form.Field name='nationalId'>
                      {(field) => (
                        <Field>
                          <FieldLabel htmlFor='nationalId'>
                            {t('register.fields.nationalId')}
                          </FieldLabel>
                          <Input
                            id='nationalId'
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder={t(
                              'register.fields.nationalIdPlaceholder',
                            )}
                            disabled={isRegistering}
                            autoComplete='off'
                          />
                        </Field>
                      )}
                    </form.Field>

                    {/* Given Name */}
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
                              value={field.state.value}
                              onChange={(e) => {
                                field.handleChange(e.target.value);
                                setFieldErrors((prev) => ({
                                  ...prev,
                                  givenName: undefined,
                                }));
                              }}
                              placeholder={t(
                                'register.fields.givenNamePlaceholder',
                              )}
                              aria-invalid={Boolean(error)}
                              disabled={isRegistering}
                            />
                            {error ? <FieldError>{error}</FieldError> : null}
                          </Field>
                        );
                      }}
                    </form.Field>

                    {/* Family Name */}
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
                              value={field.state.value}
                              onChange={(e) => {
                                field.handleChange(e.target.value);
                                setFieldErrors((prev) => ({
                                  ...prev,
                                  familyName: undefined,
                                }));
                              }}
                              placeholder={t(
                                'register.fields.familyNamePlaceholder',
                              )}
                              aria-invalid={Boolean(error)}
                              disabled={isRegistering}
                            />
                            {error ? <FieldError>{error}</FieldError> : null}
                          </Field>
                        );
                      }}
                    </form.Field>

                    {/* Birth Date */}
                    <form.Field name='birthDate'>
                      {(field) => {
                        const error = fieldErrors.birthDate;
                        return (
                          <Field data-invalid={Boolean(error)}>
                            <FieldLabel htmlFor='birthDate'>
                              {t('register.fields.birthDate')}
                            </FieldLabel>
                            <Input
                              id='birthDate'
                              type='date'
                              value={field.state.value}
                              onChange={(e) => {
                                field.handleChange(e.target.value);
                                setFieldErrors((prev) => ({
                                  ...prev,
                                  birthDate: undefined,
                                }));
                              }}
                              aria-invalid={Boolean(error)}
                              disabled={isRegistering}
                            />
                            {error ? <FieldError>{error}</FieldError> : null}
                          </Field>
                        );
                      }}
                    </form.Field>

                    {/* Sex */}
                    <form.Field name='sex'>
                      {(field) => {
                        const error = fieldErrors.sex;
                        return (
                          <Field data-invalid={Boolean(error)}>
                            <FieldLabel htmlFor='sex'>
                              {t('register.fields.sex')}
                            </FieldLabel>
                            <Select
                              value={field.state.value}
                              onValueChange={(val: string | null) => {
                                if (val) {
                                  field.handleChange(val);
                                }
                                setFieldErrors((prev) => ({
                                  ...prev,
                                  sex: undefined,
                                }));
                              }}
                              disabled={isRegistering}
                            >
                              <SelectTrigger
                                id='sex'
                                aria-invalid={Boolean(error)}
                                className='w-full'
                              >
                                <SelectValue
                                  placeholder={t(
                                    'register.fields.sexPlaceholder',
                                  )}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value='male'>
                                  {t('register.fields.sexMale')}
                                </SelectItem>
                                <SelectItem value='female'>
                                  {t('register.fields.sexFemale')}
                                </SelectItem>
                                <SelectItem value='other'>
                                  {t('register.fields.sexOther')}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            {error ? <FieldError>{error}</FieldError> : null}
                          </Field>
                        );
                      }}
                    </form.Field>

                    {/* Status */}
                    <form.Field name='status'>
                      {(field) => (
                        <Field>
                          <FieldLabel htmlFor='status'>
                            {t('register.fields.status')}
                          </FieldLabel>
                          <Select
                            value={field.state.value}
                            onValueChange={(val: string | null) => {
                              if (val) {
                                field.handleChange(val);
                              }
                            }}
                            disabled={isRegistering}
                          >
                            <SelectTrigger
                              id='status'
                              className='w-full'
                            >
                              <SelectValue
                                placeholder={t(
                                  'register.fields.statusPlaceholder',
                                )}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='active'>
                                {t('register.fields.statusActive')}
                              </SelectItem>
                              <SelectItem value='inactive'>
                                {t('register.fields.statusInactive')}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                      )}
                    </form.Field>
                  </FieldGroup>

                  <div className='mt-6 flex items-center gap-3'>
                    <form.Subscribe selector={(state) => state.canSubmit}>
                      {(canSubmit) => (
                        <Button
                          type='submit'
                          disabled={isRegistering || !canSubmit}
                        >
                          {isRegistering ? (
                            <Spinner data-icon='inline-start' />
                          ) : null}
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
          </m.div>
        </div>
      </LazyMotion>
    </AppShell>
  );
}
