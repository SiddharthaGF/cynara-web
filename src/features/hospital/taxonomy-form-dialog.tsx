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
import { FieldGroup } from '@/components/ui/field.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import { AdminFormFooter } from '@/features/hospital/admin-ui.tsx';
import {
  TaxonomyCodeField,
  TaxonomyNameField,
  TaxonomyParentField,
} from '@/features/hospital/taxonomy-form-fields.tsx';
import {
  useTaxonomyForm,
  type TaxonomyFormValues,
  type TaxonomyParentOption,
  type TaxonomyRecordLike,
} from '@/features/hospital/taxonomy-form-model.ts';

interface TaxonomyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** I18n suffix used to look up labels, e.g. 'facilities' | 'clinicalAreas' | 'disciplines'. */
  resource: 'facilities' | 'clinicalAreas' | 'disciplines';
  mode: 'create' | 'edit';
  record: TaxonomyRecordLike | null;
  /** Required when the resource is nested (clinical areas and disciplines). */
  parentOptions: TaxonomyParentOption[];
  parentEmpty: boolean;
  onSubmit: (values: TaxonomyFormValues) => Promise<void>;
  isPending: boolean;
  error: string | null;
  isConflict: boolean;
  isDuplicateCode: boolean;
  onConflictReload: () => void;
}

export function TaxonomyFormDialog({
  open,
  onOpenChange,
  resource,
  mode,
  record,
  parentOptions,
  parentEmpty,
  onSubmit,
  isPending,
  error,
  isConflict,
  isDuplicateCode,
  onConflictReload,
}: TaxonomyFormDialogProps): JSX.Element {
  const { t } = useTranslation('hospital');
  const isCreate = mode === 'create';
  const requiresParent = resource !== 'facilities';

  const form = useTaxonomyForm({
    defaultValues: {
      code: record?.code ?? '',
      name: record?.name ?? '',
      parentId: record?.parentId ?? '',
    },
    onSubmit,
  });

  // Reset the form when the dialog opens and after a concurrency conflict is resolved via onConflictReload (rowVersion changes).
  useEffect(() => {
    if (!open) {
      return;
    }
    form.reset({
      code: record?.code ?? '',
      name: record?.name ?? '',
      parentId: record?.parentId ?? '',
    });
  }, [
    form,
    open,
    record?.code,
    record?.name,
    record?.parentId,
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
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>
            {isCreate
              ? t('shared.createTitle', {
                  kind: t(`${resource}.kind`).toLowerCase(),
                })
              : t('shared.editTitle', { name: record?.name ?? '' })}
          </DialogTitle>
          <DialogDescription>
            {isCreate
              ? t(`${resource}.createDescription`)
              : t(`${resource}.parentHelp`)}
          </DialogDescription>
        </DialogHeader>

        <TaxonomyFormAlerts
          resource={resource}
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
            {requiresParent && isCreate ? (
              <TaxonomyParentField
                form={form}
                resource={resource}
                parentOptions={parentOptions}
                parentEmpty={parentEmpty}
                isPending={isPending}
              />
            ) : null}

            {isCreate ? (
              <TaxonomyCodeField
                form={form}
                resource={resource}
                isPending={isPending}
              />
            ) : null}

            <TaxonomyNameField
              form={form}
              resource={resource}
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

function TaxonomyFormAlerts({
  resource,
  showConflict,
  showDuplicate,
  showError,
  error,
}: {
  resource: TaxonomyFormDialogProps['resource'];
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
          <AlertDescription>{t(`${resource}.codeDuplicate`)}</AlertDescription>
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
