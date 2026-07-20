import type { JSX } from 'react';

import { Checkbox } from '@/components/ui/checkbox.tsx';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field.tsx';
import { Input } from '@/components/ui/input.tsx';
import { NumberInput } from '@/components/ui/number-input.tsx';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { MAX_DECIMAL_PLACES } from '@/lib/number-format.ts';

import type { ClinicalFieldSectionProps } from './fieldInspectorClinicalTypes.ts';
import { ChoiceOptionsEditor } from './FieldInspectorFieldEditors.tsx';

function optionalNumberToForm(value: number | null): string {
  return value === null ? '' : String(value);
}

export function ClinicalTextConstraintFields({
  field,
  form,
  t,
}: ClinicalFieldSectionProps): JSX.Element | null {
  if (field.type !== 'text' && field.type !== 'textarea') {
    return null;
  }

  return (
    <>
      <form.Field name='minLength'>
        {(fieldApi) => (
          <Field>
            <FieldLabel htmlFor={`${field.id}-min-length`}>
              {t('inspector.minLength')}
            </FieldLabel>
            <NumberInput
              id={`${field.id}-min-length`}
              name={fieldApi.name}
              integer
              min={0}
              value={fieldApi.state.value}
              onBlur={fieldApi.handleBlur}
              onValueChange={(next) => {
                fieldApi.handleChange(optionalNumberToForm(next));
              }}
            />
          </Field>
        )}
      </form.Field>
      <form.Field name='maxLength'>
        {(fieldApi) => (
          <Field>
            <FieldLabel htmlFor={`${field.id}-max-length`}>
              {t('inspector.maxLength')}
            </FieldLabel>
            <NumberInput
              id={`${field.id}-max-length`}
              name={fieldApi.name}
              integer
              min={1}
              value={fieldApi.state.value}
              onBlur={fieldApi.handleBlur}
              onValueChange={(next) => {
                fieldApi.handleChange(optionalNumberToForm(next));
              }}
            />
          </Field>
        )}
      </form.Field>
      {field.type === 'text' ? (
        <form.Field name='pattern'>
          {(fieldApi) => (
            <Field>
              <FieldLabel htmlFor={`${field.id}-pattern`}>
                {t('inspector.pattern')}
              </FieldLabel>
              <Input
                id={`${field.id}-pattern`}
                name={fieldApi.name}
                value={fieldApi.state.value}
                placeholder='^[A-Z0-9]+$'
                onBlur={fieldApi.handleBlur}
                onChange={(event) => {
                  fieldApi.handleChange(event.target.value);
                }}
              />
              <FieldDescription className='text-xs'>
                {t('inspector.patternHelp')}
              </FieldDescription>
            </Field>
          )}
        </form.Field>
      ) : null}
    </>
  );
}

export function ClinicalNumberConstraintFields({
  field,
  form,
  t,
}: ClinicalFieldSectionProps): JSX.Element | null {
  if (field.type !== 'number' && field.type !== 'integer') {
    return null;
  }

  const asInteger = field.type === 'integer';

  return (
    <>
      <form.Field name='minimum'>
        {(fieldApi) => (
          <Field>
            <FieldLabel htmlFor={`${field.id}-minimum`}>
              {t('inspector.min')}
            </FieldLabel>
            <NumberInput
              id={`${field.id}-minimum`}
              name={fieldApi.name}
              integer={asInteger}
              value={fieldApi.state.value}
              onBlur={fieldApi.handleBlur}
              onValueChange={(next) => {
                fieldApi.handleChange(optionalNumberToForm(next));
              }}
            />
          </Field>
        )}
      </form.Field>
      <form.Field name='maximum'>
        {(fieldApi) => (
          <Field>
            <FieldLabel htmlFor={`${field.id}-maximum`}>
              {t('inspector.max')}
            </FieldLabel>
            <NumberInput
              id={`${field.id}-maximum`}
              name={fieldApi.name}
              integer={asInteger}
              value={fieldApi.state.value}
              onBlur={fieldApi.handleBlur}
              onValueChange={(next) => {
                fieldApi.handleChange(optionalNumberToForm(next));
              }}
            />
          </Field>
        )}
      </form.Field>
      {field.type === 'number' ? (
        <>
          <form.Field name='multipleOf'>
            {(fieldApi) => (
              <Field>
                <FieldLabel htmlFor={`${field.id}-multiple-of`}>
                  {t('inspector.multipleOf')}
                </FieldLabel>
                <NumberInput
                  id={`${field.id}-multiple-of`}
                  name={fieldApi.name}
                  min={0}
                  value={fieldApi.state.value}
                  onBlur={fieldApi.handleBlur}
                  onValueChange={(next) => {
                    fieldApi.handleChange(optionalNumberToForm(next));
                  }}
                />
              </Field>
            )}
          </form.Field>
          <form.Field name='decimalPlaces'>
            {(fieldApi) => {
              const items = [
                { label: t('inspector.decimalPlacesAuto'), value: 'auto' },
                ...Array.from(
                  { length: MAX_DECIMAL_PLACES + 1 },
                  (_, decimalPlace) => ({
                    label: String(decimalPlace),
                    value: String(decimalPlace),
                  }),
                ),
              ];

              return (
                <Field>
                  <FieldLabel>{t('inspector.decimalPlaces')}</FieldLabel>
                  <Select
                    items={items}
                    value={
                      fieldApi.state.value === '' ? 'auto' : fieldApi.state.value
                    }
                    onValueChange={(value) => {
                      if (!value) {
                        return;
                      }
                      fieldApi.handleChange(value === 'auto' ? '' : value);
                    }}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {items.map((item) => (
                          <SelectItem
                            key={item.value}
                            value={item.value}
                          >
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldDescription className='text-xs'>
                    {t('inspector.decimalPlacesHelp')}
                  </FieldDescription>
                </Field>
              );
            }}
          </form.Field>
        </>
      ) : null}
    </>
  );
}

export function ClinicalChoiceConstraintFields({
  field,
  form,
  t,
}: ClinicalFieldSectionProps): JSX.Element | null {
  if (field.type !== 'choice') {
    return null;
  }

  return (
    <>
      <form.Field name='options'>
        {(fieldApi) => (
          <ChoiceOptionsEditor
            options={fieldApi.state.value}
            onChange={fieldApi.handleChange}
          />
        )}
      </form.Field>
      <form.Field name='allowMultiple'>
        {(fieldApi) => (
          <Field orientation='horizontal'>
            <Checkbox
              id={`${field.id}-allow-multiple`}
              checked={fieldApi.state.value}
              onCheckedChange={(checked) => {
                fieldApi.handleChange(checked);
              }}
            />
            <FieldLabel htmlFor={`${field.id}-allow-multiple`}>
              {t('inspector.allowMultiple')}
            </FieldLabel>
          </Field>
        )}
      </form.Field>
    </>
  );
}

export function ClinicalRepeaterConstraintFields({
  field,
  form,
  t,
}: ClinicalFieldSectionProps): JSX.Element | null {
  if (field.type !== 'repeater') {
    return null;
  }

  return (
    <>
      <form.Field name='minItems'>
        {(fieldApi) => (
          <Field>
            <FieldLabel htmlFor={`${field.id}-min-items`}>
              {t('inspector.minItems')}
            </FieldLabel>
            <NumberInput
              id={`${field.id}-min-items`}
              name={fieldApi.name}
              integer
              min={0}
              value={fieldApi.state.value}
              onBlur={fieldApi.handleBlur}
              onValueChange={(next) => {
                fieldApi.handleChange(optionalNumberToForm(next));
              }}
            />
          </Field>
        )}
      </form.Field>
      <form.Field name='maxItems'>
        {(fieldApi) => (
          <Field>
            <FieldLabel htmlFor={`${field.id}-max-items`}>
              {t('inspector.maxItems')}
            </FieldLabel>
            <NumberInput
              id={`${field.id}-max-items`}
              name={fieldApi.name}
              integer
              min={1}
              value={fieldApi.state.value}
              onBlur={fieldApi.handleBlur}
              onValueChange={(next) => {
                fieldApi.handleChange(optionalNumberToForm(next));
              }}
            />
          </Field>
        )}
      </form.Field>
    </>
  );
}
