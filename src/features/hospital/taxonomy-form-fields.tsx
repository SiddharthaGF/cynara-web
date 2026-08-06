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
import type {
  TaxonomyForm,
  TaxonomyParentOption,
} from '@/features/hospital/taxonomy-form-model.ts';
import {
  parentEmptyKey,
  parentFieldLabelKey,
  parentFieldPlaceholderKey,
  parentFieldRequiredKey,
} from '@/features/hospital/taxonomy-form-model.ts';
import { fieldErrorText } from '@/lib/useSyncedTanstackForm.ts';

const TAXONOMY_CODE_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9-]*$/;

export function TaxonomyParentField({
  form,
  resource,
  parentOptions,
  parentEmpty,
  isPending,
}: {
  form: TaxonomyForm;
  resource: 'facilities' | 'clinicalAreas' | 'disciplines';
  parentOptions: TaxonomyParentOption[];
  parentEmpty: boolean;
  isPending: boolean;
}): JSX.Element {
  const { t } = useTranslation('hospital');
  return (
    <form.Field
      name='parentId'
      validators={{
        onChange: ({ value }) => {
          if (!value) {
            return t(`${resource}.${parentFieldRequiredKey(resource)}`);
          }
          return undefined;
        },
      }}
    >
      {(field) => {
        const items = parentOptions.map((option) => ({
          value: option.id,
          label: option.name,
        }));
        return (
          <Field data-invalid={!field.state.meta.isValid}>
            <FieldLabel htmlFor={`${resource}-parent`}>
              {t(`${resource}.${parentFieldLabelKey(resource)}`)}
            </FieldLabel>
            {parentEmpty ? (
              <Alert
                variant='destructive'
                className='mt-1'
              >
                <AlertDescription>
                  {t(`${resource}.${parentEmptyKey(resource)}`)}
                </AlertDescription>
              </Alert>
            ) : (
              <Select
                items={items}
                value={field.state.value || null}
                onValueChange={(next: string | null) => {
                  field.handleChange(next ?? '');
                }}
                disabled={isPending}
              >
                <SelectTrigger
                  id={`${resource}-parent`}
                  className='w-full'
                  aria-invalid={!field.state.meta.isValid}
                >
                  <SelectValue
                    placeholder={t(
                      `${resource}.${parentFieldPlaceholderKey(resource)}`,
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
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
        );
      }}
    </form.Field>
  );
}

export function TaxonomyCodeField({
  form,
  resource,
  isPending,
}: {
  form: TaxonomyForm;
  resource: 'facilities' | 'clinicalAreas' | 'disciplines';
  isPending: boolean;
}): JSX.Element {
  const { t } = useTranslation('hospital');
  return (
    <form.Field
      name='code'
      validators={{
        onChange: ({ value }) => {
          if (!value.trim()) {
            return t(`${resource}.codeRequired`);
          }
          if (value.trim().length > 64) {
            return t(`${resource}.codeTooLong`);
          }
          if (!TAXONOMY_CODE_PATTERN.test(value.trim())) {
            return t(`${resource}.codeInvalid`);
          }
          return undefined;
        },
      }}
    >
      {(field) => (
        <Field data-invalid={!field.state.meta.isValid}>
          <FieldLabel htmlFor={`${resource}-code`}>
            {t(`${resource}.codeLabel`)}
          </FieldLabel>
          <Input
            id={`${resource}-code`}
            name={field.name}
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(event) => {
              field.handleChange(event.target.value);
            }}
            placeholder={t(`${resource}.codePlaceholder`)}
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

export function TaxonomyNameField({
  form,
  resource,
  isPending,
}: {
  form: TaxonomyForm;
  resource: 'facilities' | 'clinicalAreas' | 'disciplines';
  isPending: boolean;
}): JSX.Element {
  const { t } = useTranslation('hospital');
  return (
    <form.Field
      name='name'
      validators={{
        onChange: ({ value }) => {
          if (!value.trim()) {
            return t(`${resource}.nameRequired`);
          }
          if (value.trim().length > 256) {
            return t(`${resource}.nameTooLong`);
          }
          return undefined;
        },
      }}
    >
      {(field) => (
        <Field data-invalid={!field.state.meta.isValid}>
          <FieldLabel htmlFor={`${resource}-name`}>
            {t(`${resource}.nameLabel`)}
          </FieldLabel>
          <Input
            id={`${resource}-name`}
            name={field.name}
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(event) => {
              field.handleChange(event.target.value);
            }}
            placeholder={t(`${resource}.namePlaceholder`)}
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
