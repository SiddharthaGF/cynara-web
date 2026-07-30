import { useForm } from '@tanstack/react-form';
import { Link, useParams } from '@tanstack/react-router';
import { ArrowLeft, UserCircle, Pencil, Trash2, Save } from 'lucide-react';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react';
import type { JSX } from 'react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/api/client.ts';
import { describeApiError } from '@/api/error-message.ts';
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
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import {
  usePatientDetail,
  useEditPatient,
  useDeletePatient,
} from '@/features/patients/usePatientsCatalog.ts';

// ─── Edit form values ────────────────────────────────────────────────────────

interface EditFormValues {
  mrn: string;
  nationalId: string;
  givenName: string;
  familyName: string;
  birthDate: string;
  sex: string;
  status: string;
}

function patientToFormValues(patient: PatientDto): EditFormValues {
  return {
    mrn: patient.mrn,
    nationalId: patient.nationalId ?? '',
    givenName: patient.givenName,
    familyName: patient.familyName,
    birthDate: patient.birthDate,
    sex: patient.sex,
    status: patient.status,
  };
}

const MRN_PATTERN = /^[A-Za-z0-9-]+$/;

function validateEditForm(
  values: EditFormValues,
  t: (key: string) => string,
): Partial<Record<keyof EditFormValues, string>> {
  const errors: Partial<Record<keyof EditFormValues, string>> = {};

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

// ─── Patient info row ────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}): JSX.Element {
  return (
    <div className='flex flex-col gap-1'>
      <span className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
        {label}
      </span>
      <span className='text-sm font-medium'>{value ?? '—'}</span>
    </div>
  );
}

// ─── View mode ───────────────────────────────────────────────────────────────

interface PatientViewProps {
  patient: PatientDto;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function PatientView({
  patient,
  onEdit,
  onDelete,
  isDeleting,
}: PatientViewProps): JSX.Element {
  const { t } = useTranslation(['patients', 'api']);

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
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
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={onEdit}
          >
            <Pencil className='size-3.5' />
            {t('detail.edit')}
          </Button>
          <Button
            variant='destructive'
            size='sm'
            onClick={onDelete}
            disabled={isDeleting}
          >
            {isDeleting ? <Spinner data-icon='inline-start' /> : null}
            <Trash2 className='size-3.5' />
            {t('detail.delete')}
          </Button>
        </div>
      </div>

      <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'>
        <InfoRow
          label={t('detail.fields.mrn')}
          value={patient.mrn}
        />
        <InfoRow
          label={t('detail.fields.givenName')}
          value={patient.givenName}
        />
        <InfoRow
          label={t('detail.fields.familyName')}
          value={patient.familyName}
        />
        <InfoRow
          label={t('detail.fields.birthDate')}
          value={patient.birthDate}
        />
        <InfoRow
          label={t('detail.fields.sex')}
          value={patient.sex}
        />
        <InfoRow
          label={t('detail.fields.nationalId')}
          value={patient.nationalId}
        />
        <InfoRow
          label={t('detail.fields.status')}
          value={patient.status}
        />
        <InfoRow
          label={t('detail.fields.createdAt')}
          value={patient.createdAt}
        />
        <InfoRow
          label={t('detail.fields.updatedAt')}
          value={patient.updatedAt}
        />
      </div>
    </div>
  );
}

// ─── Edit mode ───────────────────────────────────────────────────────────────

interface PatientEditFormProps {
  patient: PatientDto;
  onCancel: () => void;
}

function PatientEditForm({
  patient,
  onCancel,
}: PatientEditFormProps): JSX.Element {
  const { t } = useTranslation(['patients', 'api']);

  const { editPatient, isEditing } = useEditPatient();

  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof EditFormValues, string>>
  >({});
  const [duplicateMrnError, setDuplicateMrnError] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: patientToFormValues(patient),
    onSubmit: async ({ value }) => {
      setFieldErrors({});
      setDuplicateMrnError(false);
      setServerError(null);

      const errors = validateEditForm(value, t);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }

      try {
        await editPatient({
          id: patient.id,
          mrn: value.mrn.trim(),
          givenName: value.givenName.trim(),
          familyName: value.familyName.trim(),
          birthDate: value.birthDate.trim(),
          sex: value.sex,
          nationalId: value.nationalId.trim() || null,
          status: value.status,
          rowVersion: patient.rowVersion,
        });
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
    <form
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
        >
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

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
                <FieldLabel htmlFor='edit-mrn'>
                  {t('detail.fields.mrn')}
                </FieldLabel>
                <Input
                  id='edit-mrn'
                  value={field.state.value}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    setDuplicateMrnError(false);
                    setFieldErrors((prev) => ({ ...prev, mrn: undefined }));
                  }}
                  aria-invalid={Boolean(mrnError)}
                  disabled={isEditing}
                  autoComplete='off'
                />
                {mrnError ? <FieldError>{mrnError}</FieldError> : null}
              </Field>
            );
          }}
        </form.Field>

        {/* National ID */}
        <form.Field name='nationalId'>
          {(field) => (
            <Field>
              <FieldLabel htmlFor='edit-nationalId'>
                {t('detail.fields.nationalId')}
              </FieldLabel>
              <Input
                id='edit-nationalId'
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                disabled={isEditing}
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
                <FieldLabel htmlFor='edit-givenName'>
                  {t('detail.fields.givenName')}
                </FieldLabel>
                <Input
                  id='edit-givenName'
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

        {/* Family Name */}
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

        {/* Birth Date */}
        <form.Field name='birthDate'>
          {(field) => {
            const error = fieldErrors.birthDate;
            return (
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor='edit-birthDate'>
                  {t('detail.fields.birthDate')}
                </FieldLabel>
                <Input
                  id='edit-birthDate'
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
                  disabled={isEditing}
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
                <FieldLabel htmlFor='edit-sex'>
                  {t('detail.fields.sex')}
                </FieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(val: string | null) => {
                    if (val) {
                      field.handleChange(val);
                    }
                    setFieldErrors((prev) => ({ ...prev, sex: undefined }));
                  }}
                  disabled={isEditing}
                >
                  <SelectTrigger
                    id='edit-sex'
                    aria-invalid={Boolean(error)}
                    className='w-full'
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='male'>
                      {t('detail.sexOptions.male')}
                    </SelectItem>
                    <SelectItem value='female'>
                      {t('detail.sexOptions.female')}
                    </SelectItem>
                    <SelectItem value='other'>
                      {t('detail.sexOptions.other')}
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
              <FieldLabel htmlFor='edit-status'>
                {t('detail.fields.status')}
              </FieldLabel>
              <Select
                value={field.state.value}
                onValueChange={(val: string | null) => {
                  if (val) {
                    field.handleChange(val);
                  }
                }}
                disabled={isEditing}
              >
                <SelectTrigger
                  id='edit-status'
                  className='w-full'
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='active'>
                    {t('detail.statusOptions.active')}
                  </SelectItem>
                  <SelectItem value='inactive'>
                    {t('detail.statusOptions.inactive')}
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
          {t('search.clear')}
        </Button>
      </div>
    </form>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export function PatientDetailPage(): JSX.Element {
  const { t } = useTranslation(['patients', 'api']);
  const { locale, id }: { locale: string; id: string } = useParams({
    from: '/$locale/patients/$id',
  });
  const reduceMotion = useReducedMotion();

  const { patient, isLoading, error: loadError } = usePatientDetail(id);
  const {
    deletePatient,
    isDeleting,
    error: deleteError,
    isSuccess: deleteSuccess,
  } = useDeletePatient();

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!patient) {
      return;
    }
    await deletePatient({ id: patient.id });
    setShowDeleteConfirm(false);
  }, [patient, deletePatient]);

  if (isLoading) {
    return (
      <AppShell variant='catalog'>
        <div className='mx-auto max-w-3xl px-6 py-10 pb-20'>
          <Skeleton className='mb-4 h-8 w-48' />
          <Skeleton className='mb-2 h-6 w-96' />
          <Skeleton className='h-64 w-full' />
        </div>
      </AppShell>
    );
  }

  if (loadError || !patient) {
    return (
      <AppShell variant='catalog'>
        <div className='mx-auto max-w-3xl px-6 py-10 pb-20'>
          <Empty className='min-h-48 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10'>
            <EmptyHeader>
              <EmptyTitle className='text-lg'>
                {t('detail.notFound')}
              </EmptyTitle>
              <EmptyDescription>
                {loadError ?? t('detail.loadError')}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
          <div className='mt-4'>
            <Link
              to='/$locale/patients'
              params={{ locale }}
            >
              <Button variant='ghost'>
                <ArrowLeft className='size-4' />
                {t('detail.backToList')}
              </Button>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell variant='catalog'>
      <LazyMotion features={domAnimation}>
        <div className='mx-auto max-w-3xl px-6 py-10 pb-20'>
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
                {t('detail.backToList')}
              </Button>
            </Link>
            <p className='mb-3 inline-flex items-center gap-1.5 text-xs font-medium tracking-[0.2em] text-accent uppercase'>
              <UserCircle className='size-3' />
              {t('detail.eyebrow')}
            </p>
            <h1 className='font-display text-balance text-3xl font-semibold tracking-tight md:text-4xl'>
              {t('detail.title')}
            </h1>
          </m.header>

          {(deleteError || deleteSuccess) && (
            <m.div
              initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={reduceMotion ? { duration: 0 } : undefined}
            >
              <Alert
                variant={deleteSuccess ? 'default' : 'destructive'}
                className='mb-6'
              >
                <AlertDescription>
                  {deleteSuccess ? t('detail.deleteSuccess') : deleteError}
                </AlertDescription>
              </Alert>
            </m.div>
          )}

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
                  <UserCircle className='size-4 text-muted-foreground' />
                  {isEditing
                    ? t('detail.editTitle')
                    : `${patient.givenName} ${patient.familyName}`}
                </CardTitle>
                <CardDescription>
                  {isEditing
                    ? t('detail.editTitle')
                    : `${t('detail.fields.mrn')}: ${patient.mrn}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <PatientEditForm
                    patient={patient}
                    onCancel={() => setIsEditing(false)}
                  />
                ) : (
                  <PatientView
                    patient={patient}
                    onEdit={() => setIsEditing(true)}
                    onDelete={() => setShowDeleteConfirm(true)}
                    isDeleting={isDeleting}
                  />
                )}
              </CardContent>
            </Card>
          </m.div>

          {/* Delete confirmation */}
          {showDeleteConfirm && (
            <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
              <m.div
                initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className='mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl'
              >
                <h3 className='font-heading text-lg font-medium'>
                  {t('detail.delete')}
                </h3>
                <p className='mt-2 text-sm text-muted-foreground'>
                  {t('detail.deleteConfirm')}
                </p>
                {deleteError && (
                  <Alert
                    variant='destructive'
                    className='mt-3'
                  >
                    <AlertDescription>{deleteError}</AlertDescription>
                  </Alert>
                )}
                <div className='mt-6 flex justify-end gap-3'>
                  <Button
                    variant='ghost'
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    {t('search.clear')}
                  </Button>
                  <Button
                    variant='destructive'
                    onClick={() => {
                      void handleDelete();
                    }}
                    disabled={isDeleting}
                  >
                    {isDeleting ? <Spinner data-icon='inline-start' /> : null}
                    {t('detail.delete')}
                  </Button>
                </div>
              </m.div>
            </div>
          )}
        </div>
      </LazyMotion>
    </AppShell>
  );
}
