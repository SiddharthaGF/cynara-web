import type { JSX } from 'react';

import { Checkbox } from '@/components/ui/checkbox.tsx';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field.tsx';
import { Input } from '@/components/ui/input.tsx';
import { NumberInput } from '@/components/ui/number-input.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';

import type { ClinicalFieldSectionProps } from './fieldInspectorClinicalTypes.ts';

export function ClinicalDescriptionField({
  field,
  form,
  t,
}: ClinicalFieldSectionProps): JSX.Element {
  return (
    <form.Field name='description'>
      {(fieldApi) => (
        <Field>
          <FieldLabel htmlFor={`${field.id}-description`}>
            {t('inspector.clinicalDescription')}
          </FieldLabel>
          <Textarea
            id={`${field.id}-description`}
            rows={2}
            name={fieldApi.name}
            value={fieldApi.state.value}
            onBlur={fieldApi.handleBlur}
            onChange={(event) => {
              fieldApi.handleChange(event.target.value);
            }}
          />
          <FieldDescription>
            {t('inspector.clinicalDescriptionHelp')}
          </FieldDescription>
        </Field>
      )}
    </form.Field>
  );
}

export function ClinicalDefaultValueFields({
  field,
  form,
  t,
}: ClinicalFieldSectionProps): JSX.Element | null {
  if (field.type === 'boolean') {
    return (
      <form.Field name='defaultBoolean'>
        {(fieldApi) => (
          <Field orientation='horizontal'>
            <Checkbox
              id={`${field.id}-default`}
              checked={fieldApi.state.value}
              onCheckedChange={(checked) => {
                fieldApi.handleChange(checked);
              }}
            />
            <FieldLabel htmlFor={`${field.id}-default`}>
              {t('inspector.defaultValue')}
            </FieldLabel>
          </Field>
        )}
      </form.Field>
    );
  }

  if (field.type === 'choice') {
    return (
      <form.Subscribe selector={(state) => state.values.options}>
        {(options) => (
          <form.Field name='defaultChoice'>
            {(fieldApi) => (
              <Field>
                <FieldLabel>{t('inspector.defaultValue')}</FieldLabel>
                <Select
                  value={fieldApi.state.value}
                  onValueChange={(value) => {
                    fieldApi.handleChange(value ?? '');
                  }}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder={t('inspector.noDefault')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=''>{t('inspector.noDefault')}</SelectItem>
                    {options.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </form.Field>
        )}
      </form.Subscribe>
    );
  }

  if (
    field.type === 'group' ||
    field.type === 'repeater' ||
    field.type === 'component-ref'
  ) {
    return null;
  }

  if (field.type === 'number' || field.type === 'integer') {
    return (
      <form.Field name='defaultText'>
        {(fieldApi) => (
          <Field>
            <FieldLabel htmlFor={`${field.id}-default`}>
              {t('inspector.defaultValue')}
            </FieldLabel>
            <NumberInput
              id={`${field.id}-default`}
              name={fieldApi.name}
              integer={field.type === 'integer'}
              value={fieldApi.state.value}
              onBlur={fieldApi.handleBlur}
              onValueChange={(next) => {
                fieldApi.handleChange(next === null ? '' : String(next));
              }}
            />
          </Field>
        )}
      </form.Field>
    );
  }

  return (
    <form.Field name='defaultText'>
      {(fieldApi) => (
        <Field>
          <FieldLabel htmlFor={`${field.id}-default`}>
            {t('inspector.defaultValue')}
          </FieldLabel>
          <Input
            id={`${field.id}-default`}
            name={fieldApi.name}
            value={fieldApi.state.value}
            onBlur={fieldApi.handleBlur}
            onChange={(event) => {
              fieldApi.handleChange(event.target.value);
            }}
          />
        </Field>
      )}
    </form.Field>
  );
}

export function ClinicalCommonFields({
  field,
  form,
  t,
}: ClinicalFieldSectionProps): JSX.Element {
  return (
    <>
      <form.Field name='readOnly'>
        {(fieldApi) => (
          <Field orientation='horizontal'>
            <Checkbox
              id={`${field.id}-readonly`}
              checked={fieldApi.state.value}
              onCheckedChange={(checked) => {
                fieldApi.handleChange(checked);
              }}
            />
            <FieldLabel htmlFor={`${field.id}-readonly`}>
              {t('inspector.readOnly')}
            </FieldLabel>
          </Field>
        )}
      </form.Field>

      <form.Field name='code'>
        {(fieldApi) => (
          <Field>
            <FieldLabel htmlFor={`${field.id}-code`}>
              {t('inspector.fieldCode')}
            </FieldLabel>
            <Input
              id={`${field.id}-code`}
              name={fieldApi.name}
              value={fieldApi.state.value}
              onBlur={fieldApi.handleBlur}
              onChange={(event) => {
                fieldApi.handleChange(event.target.value);
              }}
            />
            <FieldDescription>{t('inspector.fieldCodeHelp')}</FieldDescription>
          </Field>
        )}
      </form.Field>
    </>
  );
}
