import type { JSX } from 'react';

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field.tsx';
import type {
  ClinicalField,
  FieldPresentation,
} from '@/features/forms/types.ts';
import { cn } from '@/lib/utils.ts';

import { renderFieldInput } from './FormFieldInputs.tsx';
import { getRepeaterChildValue, getScalarValue } from './formValues.ts';
import { fieldShellClass, widthClass } from './layoutUtils.ts';
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
  const label = presentation?.label ?? field.id;
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
      <UnsupportedField
        label={label}
        message={field.componentCode || 'Clinical block'}
        className={cn('@container/field min-w-0', widthClass(presentation?.width))}
      />
    );
  }

  if (field.type === 'group' || field.type === 'repeater') {
    return null;
  }

  const inputId = repeaterPath
    ? `${field.id}-${repeaterPath.rowIndex}`
    : field.id;

  return (
    <div className={cn('@container/field min-w-0', widthClass(presentation?.width))}>
      <Field
        data-invalid={errors.length > 0 || undefined}
        data-disabled={!enabled || undefined}
      >
        <FieldLabel htmlFor={inputId}>
          {label}
          {required ? <span className='text-destructive'> *</span> : null}
        </FieldLabel>
        <FieldContent>
          {helpText ? <FieldDescription>{helpText}</FieldDescription> : null}
          {renderFieldInput(
            field,
            presentation,
            displayValue,
            enabled,
            placeholder,
            handleChange,
            inputId,
          )}
          {context.showValidation && errors.length > 0 ? (
            <FieldError errors={errors.map((message) => ({ message }))} />
          ) : null}
        </FieldContent>
      </Field>
    </div>
  );
}

function UnsupportedField({
  label,
  message,
  className,
}: {
  label: string;
  message: string;
  className?: string;
}): JSX.Element {
  return (
    <div className={cn(fieldShellClass('rounded-lg border border-dashed bg-muted/20 p-4'), className)}>
      <p className='text-sm font-medium'>{label}</p>
      <p className='text-sm text-muted-foreground'>{message}</p>
    </div>
  );
}
