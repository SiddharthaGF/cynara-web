import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { Field, FieldError, FieldLabel } from '@/components/ui/field.tsx';
import { Input } from '@/components/ui/input.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import {
  DOCUMENT_CODE_PATTERN,
  type DocumentForm,
  type DocumentFormOption,
} from '@/features/hospital/document-form-model.ts';
import { fieldErrorText } from '@/lib/useSyncedTanstackForm.ts';

export function DocumentIdentityFields({
  form,
  formOptions,
  formOptionsLoading,
  isPending,
}: {
  form: DocumentForm;
  formOptions: DocumentFormOption[];
  formOptionsLoading: boolean;
  isPending: boolean;
}): JSX.Element {
  const { t } = useTranslation('hospital');
  const formItems = formOptions.map((option) => ({
    value: option.formDefinitionId,
    label: option.name,
  }));
  const hasPublishedForms = formItems.length > 0;

  return (
    <>
      <form.Field
        name='code'
        validators={{
          onChange: ({ value }) => {
            if (!value.trim()) {
              return t('documents.codeRequired');
            }
            if (value.trim().length > 64) {
              return t('documents.codeTooLong');
            }
            if (!DOCUMENT_CODE_PATTERN.test(value.trim())) {
              return t('documents.codeInvalid');
            }
            return undefined;
          },
        }}
      >
        {(field) => (
          <Field data-invalid={!field.state.meta.isValid}>
            <FieldLabel htmlFor='documents-code'>
              {t('documents.codeLabel')}
            </FieldLabel>
            <Input
              id='documents-code'
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => {
                field.handleChange(event.target.value);
              }}
              placeholder={t('documents.codePlaceholder')}
              aria-invalid={!field.state.meta.isValid}
              disabled={isPending}
            />
            {field.state.meta.isValid ? null : (
              <FieldError>{fieldErrorText(field.state.meta.errors)}</FieldError>
            )}
          </Field>
        )}
      </form.Field>

      <form.Field
        name='formDefinitionId'
        validators={{
          onChange: ({ value }) =>
            value ? undefined : t('documents.formRequired'),
        }}
      >
        {(field) => (
          <Field data-invalid={!field.state.meta.isValid}>
            <FieldLabel htmlFor='documents-form'>
              {t('documents.formLabel')}
            </FieldLabel>
            {!hasPublishedForms && !formOptionsLoading ? (
              <Alert
                variant='destructive'
                className='mt-1'
              >
                <AlertDescription>{t('documents.formEmpty')}</AlertDescription>
              </Alert>
            ) : (
              <Select
                items={formItems}
                value={field.state.value || null}
                onValueChange={(next: string | null) => {
                  field.handleChange(next ?? '');
                  form.setFieldValue('formVersionId', '');
                }}
                disabled={isPending || formOptionsLoading}
              >
                <SelectTrigger
                  id='documents-form'
                  className='w-full'
                  aria-invalid={!field.state.meta.isValid}
                >
                  <SelectValue placeholder={t('documents.formPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {formItems.map((item) => (
                    <SelectItem
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {field.state.meta.isValid ? null : (
              <FieldError>{fieldErrorText(field.state.meta.errors)}</FieldError>
            )}
          </Field>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => state.values.formDefinitionId}>
        {(formDefinitionId) => {
          const selectedForm = formOptions.find(
            (option) => option.formDefinitionId === formDefinitionId,
          );
          const versionItems =
            selectedForm?.publishedVersions.map((version) => ({
              value: version.id,
              label: version.version,
            })) ?? [];
          return (
            <form.Field
              name='formVersionId'
              validators={{
                onChange: ({ value }) =>
                  value ? undefined : t('documents.versionRequired'),
              }}
            >
              {(field) => (
                <Field data-invalid={!field.state.meta.isValid}>
                  <FieldLabel htmlFor='documents-version'>
                    {t('documents.versionLabel')}
                  </FieldLabel>
                  {formDefinitionId && versionItems.length === 0 ? (
                    <Alert
                      variant='destructive'
                      className='mt-1'
                    >
                      <AlertDescription>
                        {t('documents.versionEmpty')}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Select
                      items={versionItems}
                      value={field.state.value || null}
                      onValueChange={(next: string | null) => {
                        field.handleChange(next ?? '');
                      }}
                      disabled={isPending || !formDefinitionId}
                    >
                      <SelectTrigger
                        id='documents-version'
                        className='w-full'
                        aria-invalid={!field.state.meta.isValid}
                      >
                        <SelectValue
                          placeholder={t('documents.versionPlaceholder')}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {versionItems.map((item) => (
                          <SelectItem
                            key={item.value}
                            value={item.value}
                          >
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {field.state.meta.isValid ? null : (
                    <FieldError>
                      {fieldErrorText(field.state.meta.errors)}
                    </FieldError>
                  )}
                </Field>
              )}
            </form.Field>
          );
        }}
      </form.Subscribe>
    </>
  );
}
