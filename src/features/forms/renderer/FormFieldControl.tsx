import type { JSX } from 'react';

import { Checkbox } from '@/components/ui/checkbox.tsx';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field.tsx';
import { Switch } from '@/components/ui/switch.tsx';
import { CalculatedFieldLabelSuffix } from '@/features/forms/CalculatedFieldLabel.tsx';
import { stripLegacyCalculatedLabelSuffix } from '@/features/forms/stripLegacyCalculatedLabelSuffix.ts';
import type {
  ClinicalField,
  FieldPresentation,
} from '@/features/forms/types.ts';
import { cn } from '@/lib/utils.ts';

import { renderFieldInput } from './FormFieldInputs.tsx';
import { getRepeaterChildValue, getScalarValue } from './formValues.ts';
import { widthClass } from './layoutUtils.ts';
import type { FormRendererContext } from './types.ts';

interface FormFieldControlProps {
  field: ClinicalField;
  presentation: FieldPresentation | undefined;
  context: FormRendererContext;
  repeaterPath?: {
    repeaterCode: string;
    rowIndex: number;
  };
}

export function FormFieldControl({
  field,
  presentation,
  context,
  repeaterPath,
}: FormFieldControlProps): JSX.Element | null {
  const visible = context.evaluation.visibility[field.id] ?? true;
  if (!visible) {
    return null;
  }

  const enabled =
    !context.readOnly && (context.evaluation.enabled[field.id] ?? true);
  const required = context.evaluation.required[field.id] ?? false;
  const errors =
    context.fieldErrors[
      repeaterPath
        ? `${field.id}::${repeaterPath.rowIndex}`
        : field.id
    ] ?? [];
  const invalid = context.showValidation && errors.length > 0;
  const label = stripLegacyCalculatedLabelSuffix(
    presentation?.label ?? field.id,
  );
  const isCalculated = Boolean(
    context.model.rules.fields[field.id]?.calculate,
  );
  const helpText = presentation?.helpText;
  const placeholder = presentation?.placeholder;
  const calculatedValue = context.evaluation.calculatedValues[field.code];

  const value = repeaterPath
    ? getRepeaterChildValue(
        context.values,
        repeaterPath.repeaterCode,
        repeaterPath.rowIndex,
        field.code,
      )
    : getScalarValue(context.values, field.code);

  const displayValue =
    calculatedValue !== undefined && field.readOnly ? calculatedValue : value;

  function handleChange(next: unknown): void {
    if (repeaterPath) {
      context.onRepeaterRowChange(
        repeaterPath.repeaterCode,
        repeaterPath.rowIndex,
        field.code,
        next,
      );
      return;
    }
    context.onValueChange(field.code, next);
  }

  if (field.type === 'component-ref') {
    return (
      <Field
        className={cn(
          '@container/field min-w-0',
          widthClass(presentation?.width),
        )}
      >
        <FieldLabel>{label}</FieldLabel>
        <FieldDescription>
          {field.componentCode || 'Clinical block'}
        </FieldDescription>
      </Field>
    );
  }

  if (field.type === 'group' || field.type === 'repeater') {
    return null;
  }

  const inputId = repeaterPath
    ? `${field.id}-${repeaterPath.rowIndex}`
    : field.id;

  const fieldClassName = cn(
    '@container/field min-w-0',
    widthClass(presentation?.width),
  );
  const labelNode = (
    <>
      {label}
      {isCalculated ? <CalculatedFieldLabelSuffix /> : null}
      {required ? <span className='text-destructive'> *</span> : null}
    </>
  );

  // Boolean checkbox/toggle: horizontal Field per shadcn docs (avoids *:w-full stretch).
  if (field.type === 'boolean') {
    const checked = Boolean(displayValue);
    const useToggle = presentation?.widget === 'toggle';

    return (
      <Field
        className={fieldClassName}
        orientation='horizontal'
        data-invalid={invalid || undefined}
        data-disabled={!enabled || undefined}
      >
        {useToggle ? (
          <Switch
            id={inputId}
            checked={checked}
            disabled={!enabled}
            aria-invalid={invalid || undefined}
            onCheckedChange={(next) => {
              handleChange(next);
            }}
          />
        ) : (
          <Checkbox
            id={inputId}
            checked={checked}
            disabled={!enabled}
            aria-invalid={invalid || undefined}
            onCheckedChange={(next) => {
              handleChange(next === true);
            }}
          />
        )}
        <FieldContent>
          <FieldLabel
            htmlFor={inputId}
            className={isCalculated ? 'font-normal' : undefined}
          >
            {labelNode}
          </FieldLabel>
          {helpText ? (
            <FieldDescription className='text-xs'>{helpText}</FieldDescription>
          ) : null}
          {invalid ? (
            <FieldError errors={errors.map((message) => ({ message }))} />
          ) : null}
        </FieldContent>
      </Field>
    );
  }

  return (
    <Field
      className={fieldClassName}
      orientation='vertical'
      data-invalid={invalid || undefined}
      data-disabled={!enabled || undefined}
    >
      <FieldLabel
        htmlFor={inputId}
        className={isCalculated ? 'font-normal' : undefined}
      >
        {labelNode}
      </FieldLabel>
      {renderFieldInput(
        field,
        presentation,
        displayValue,
        enabled,
        placeholder,
        handleChange,
        inputId,
        invalid,
      )}
      {helpText ? (
        <FieldDescription className='text-xs'>{helpText}</FieldDescription>
      ) : null}
      {invalid ? (
        <FieldError errors={errors.map((message) => ({ message }))} />
      ) : null}
    </Field>
  );
}
