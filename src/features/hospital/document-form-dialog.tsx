import type { JSX } from 'react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import { AdminFormFooter } from '@/features/hospital/admin-ui.tsx';
import { DocumentIdentityFields } from '@/features/hospital/document-form-identity-fields.tsx';
import {
  useDocumentForm,
  EMPTY_DOCUMENT_VALUES,
  type DocumentForm,
  type DocumentFormOption,
  type DocumentFormValues,
} from '@/features/hospital/document-form-model.ts';
import { DocumentPolicyFields } from '@/features/hospital/document-form-policy-fields.tsx';
import { DocumentScopeFields } from '@/features/hospital/document-form-scope-fields.tsx';
import type { DocumentDefinitionDto } from '@/features/hospital/useHospitalAdmin.ts';
import { fieldErrorText } from '@/lib/useSyncedTanstackForm.ts';

interface DocumentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  record: DocumentDefinitionDto | null;
  formOptions: DocumentFormOption[];
  formOptionsLoading: boolean;
  activeFacilities: { id: string; name: string }[];
  activeClinicalAreas: { id: string; name: string; facilityId: string }[];
  activeDisciplines: {
    id: string;
    name: string;
    clinicalAreaId: string;
  }[];
  onSubmit: (values: DocumentFormValues) => Promise<void>;
  isPending: boolean;
  error: string | null;
  isConflict: boolean;
  isDuplicateCode: boolean;
  onConflictReload: () => void;
}

export function DocumentFormDialog({
  open,
  onOpenChange,
  mode,
  record,
  formOptions,
  formOptionsLoading,
  activeFacilities,
  activeClinicalAreas,
  activeDisciplines,
  onSubmit,
  isPending,
  error,
  isConflict,
  isDuplicateCode,
  onConflictReload,
}: DocumentFormDialogProps): JSX.Element {
  const { t } = useTranslation('hospital');
  const isCreate = mode === 'create';

  const form = useDocumentForm({
    defaultValues: record
      ? {
          code: record.code,
          name: record.name,
          formDefinitionId: record.formDefinitionId,
          formVersionId: record.formVersionId,
          facilityId: record.facilityId,
          clinicalAreaId: record.clinicalAreaId,
          disciplineId: record.disciplineId,
          allowsMultipleInstancesPerEncounter:
            record.allowsMultipleInstancesPerEncounter,
          requiresActorForCreation: record.requiresActorForCreation,
          requiresActorForCompletion: record.requiresActorForCompletion,
        }
      : EMPTY_DOCUMENT_VALUES,
    onSubmit,
  });

  // Re-sync the form when the dialog opens, and after a concurrency conflict is resolved via onConflictReload (the rowVersion changes).
  useEffect(() => {
    if (!open) {
      return;
    }
    form.reset(
      record
        ? {
            code: record.code,
            name: record.name,
            formDefinitionId: record.formDefinitionId,
            formVersionId: record.formVersionId,
            facilityId: record.facilityId,
            clinicalAreaId: record.clinicalAreaId,
            disciplineId: record.disciplineId,
            allowsMultipleInstancesPerEncounter:
              record.allowsMultipleInstancesPerEncounter,
            requiresActorForCreation: record.requiresActorForCreation,
            requiresActorForCompletion: record.requiresActorForCompletion,
          }
        : EMPTY_DOCUMENT_VALUES,
    );
  }, [
    form,
    open,
    record?.allowsMultipleInstancesPerEncounter,
    record?.clinicalAreaId,
    record?.code,
    record?.disciplineId,
    record?.facilityId,
    record?.formDefinitionId,
    record?.formVersionId,
    record?.name,
    record?.requiresActorForCompletion,
    record?.requiresActorForCreation,
    record?.rowVersion,
  ]);

  const showConflict = isConflict;
  const showDuplicate = isCreate && isDuplicateCode;
  const showGenericError = error !== null && !showConflict && !showDuplicate;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>
            {isCreate
              ? t('shared.createTitle', {
                  kind: t('documents.kind').toLowerCase(),
                })
              : t('shared.editTitle', { name: record?.name ?? '' })}
          </DialogTitle>
          <DialogDescription>
            {t('documents.createDescription')}
          </DialogDescription>
        </DialogHeader>

        <DocumentFormAlerts
          showConflict={showConflict}
          showDuplicate={showDuplicate}
          showError={showGenericError}
          error={error}
        />

        {/* Client-only SPA form; preventDefault avoids a native submit reload. */}
        {/* react-doctor-disable-next-line react-doctor/no-prevent-default */}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <FieldGroup className='gap-4'>
            {isCreate ? (
              <DocumentIdentityFields
                form={form}
                formOptions={formOptions}
                formOptionsLoading={formOptionsLoading}
                isPending={isPending}
              />
            ) : null}

            <DocumentNameField
              form={form}
              isPending={isPending}
            />

            {isCreate ? (
              <DocumentScopeFields
                form={form}
                activeFacilities={activeFacilities}
                activeClinicalAreas={activeClinicalAreas}
                activeDisciplines={activeDisciplines}
                isPending={isPending}
              />
            ) : null}

            <DocumentPolicyFields
              form={form}
              isPending={isPending}
            />
          </FieldGroup>

          <AdminFormFooter
            showConflict={showConflict}
            isPending={isPending}
            onConflictReload={onConflictReload}
            onCancel={() => {
              onOpenChange(false);
            }}
            submit={
              <form.Subscribe selector={(state) => state.canSubmit}>
                {(canSubmit) => (
                  <Button
                    type='submit'
                    disabled={isPending || !canSubmit}
                  >
                    {isPending ? <Spinner data-icon='inline-start' /> : null}
                    {isPending ? t('shared.saving') : t('shared.save')}
                  </Button>
                )}
              </form.Subscribe>
            }
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DocumentFormAlerts({
  showConflict,
  showDuplicate,
  showError,
  error,
}: {
  showConflict: boolean;
  showDuplicate: boolean;
  showError: boolean;
  error: string | null;
}): JSX.Element {
  const { t } = useTranslation('hospital');
  return (
    <>
      {showConflict ? (
        <Alert
          variant='destructive'
          className='mt-2'
        >
          <AlertDescription>
            {t('shared.conflictTitle')}. {t('shared.conflictDescription')}
          </AlertDescription>
        </Alert>
      ) : null}
      {showDuplicate ? (
        <Alert
          variant='destructive'
          className='mt-2'
        >
          <AlertDescription>{t('documents.codeDuplicate')}</AlertDescription>
        </Alert>
      ) : null}
      {showError ? (
        <Alert
          variant='destructive'
          className='mt-2'
        >
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}

function DocumentNameField({
  form,
  isPending,
}: {
  form: DocumentForm;
  isPending: boolean;
}): JSX.Element {
  const { t } = useTranslation('hospital');
  return (
    <form.Field
      name='name'
      validators={{
        onChange: ({ value }) => {
          if (!value.trim()) {
            return t('documents.nameRequired');
          }
          if (value.trim().length > 256) {
            return t('documents.nameTooLong');
          }
          return undefined;
        },
      }}
    >
      {(field) => (
        <Field data-invalid={!field.state.meta.isValid}>
          <FieldLabel htmlFor='documents-name'>
            {t('documents.nameLabel')}
          </FieldLabel>
          <Input
            id='documents-name'
            name={field.name}
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(event) => {
              field.handleChange(event.target.value);
            }}
            placeholder={t('documents.namePlaceholder')}
            aria-invalid={!field.state.meta.isValid}
            disabled={isPending}
          />
          {field.state.meta.isValid ? null : (
            <FieldError>{fieldErrorText(field.state.meta.errors)}</FieldError>
          )}
        </Field>
      )}
    </form.Field>
  );
}
