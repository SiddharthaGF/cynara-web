import { EyeOffIcon } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge.tsx';
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
  const { t } = useTranslation('designer');
  const visible = context.evaluation.visibility[field.id] ?? true;
  const isConditional = !visible;
  // When the preview asks to surface every authored field, render the field
  // Even when its visibility rule currently hides it. The field is rendered
  // Muted with a "conditional" badge so authors can still see and tweak it.
  if (!visible && !context.showConditionalFields) {
    return null;
  }

  const enabled = isConditional
    ? false
    : !context.readOnly && (context.evaluation.enabled[field.id] ?? true);
  const required = context.evaluation.required[field.id] ?? false;
  const errors =
    context.fieldErrors[
      repeaterPath ? `${field.id}::${repeaterPath.rowIndex}` : field.id
    ] ?? [];
  const invalid = context.showValidation && errors.length > 0;
  const label = stripLegacyCalculatedLabelSuffix(
    presentation?.label ?? field.id,
  );
  const isCalculated = Boolean(context.model.rules.fields[field.id]?.calculate);
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
          isConditional && 'opacity-60',
        )}
      >
        <div className='flex flex-wrap items-center gap-2'>
          <FieldLabel className='flex-1'>{label}</FieldLabel>
          {isConditional ? <ConditionalBadge label={t} /> : null}
        </div>
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
    isConditional && 'opacity-60',
  );
  const labelNode = (
    <>
      {label}
      {isCalculated ? <CalculatedFieldLabelSuffix /> : null}
      {required ? <span className='text-destructive'> *</span> : null}
      {isConditional ? <ConditionalBadge label={t} /> : null}
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
              handleChange(next);
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

function ConditionalBadge({
  label,
}: {
  label: (key: string) => string;
}): JSX.Element {
  return (
    <Badge
      variant='outline'
      className='ml-2 inline-flex items-center gap-1 border-amber-500/60 bg-amber-500/10 px-1.5 py-0 text-[10px] font-medium text-amber-700 dark:text-amber-300'
    >
      <EyeOffIcon className='size-3' />
      {label('formPreview.conditionalBadge')}
    </Badge>
  );
}
