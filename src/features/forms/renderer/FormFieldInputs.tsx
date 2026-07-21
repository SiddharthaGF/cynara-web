import type { JSX } from 'react';

import { Checkbox } from '@/components/ui/checkbox.tsx';
import { Field, FieldLabel } from '@/components/ui/field.tsx';
import { Input } from '@/components/ui/input.tsx';
import { NumberInput } from '@/components/ui/number-input.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { Switch } from '@/components/ui/switch.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import {
  TIME_FIELD_LAYOUT_CLASS,
  TimeInput,
} from '@/components/ui/time-input.tsx';
import type {
  ClinicalField,
  FieldPresentation,
} from '@/features/forms/types.ts';

import { DatePickerInput } from './DatePickerInput.tsx';

export function renderFieldInput(
  field: ClinicalField,
  presentation: FieldPresentation | undefined,
  value: unknown,
  enabled: boolean,
  placeholder: string | undefined,
  onChange: (value: unknown) => void,
  inputId?: string,
  invalid = false,
): JSX.Element {
  const widget = presentation?.widget;
  const ariaInvalid = invalid || undefined;

  switch (field.type) {
    case 'text': {
      return (
        <Input
          id={inputId}
          value={formatInputValue(value)}
          placeholder={placeholder}
          disabled={!enabled}
          readOnly={!enabled}
          aria-invalid={ariaInvalid}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        />
      );
    }
    case 'textarea': {
      return (
        <Textarea
          id={inputId}
          value={formatInputValue(value)}
          placeholder={placeholder}
          disabled={!enabled}
          readOnly={!enabled}
          aria-invalid={ariaInvalid}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        />
      );
    }
    case 'number':
    case 'integer': {
      return (
        <NumberInput
          id={inputId}
          integer={field.type === 'integer'}
          value={formatInputValue(value)}
          min={field.minimum}
          max={field.maximum}
          step={field.multipleOf}
          decimalPlaces={field.decimalPlaces}
          placeholder={placeholder}
          disabled={!enabled}
          readOnly={!enabled}
          aria-invalid={ariaInvalid}
          onValueChange={(next) => {
            onChange(next);
          }}
        />
      );
    }
    case 'boolean': {
      const checked = Boolean(value);
      if (widget === 'toggle') {
        return (
          <Switch
            id={inputId}
            checked={checked}
            disabled={!enabled}
            aria-invalid={ariaInvalid}
            className='w-auto'
            onCheckedChange={(next) => {
              onChange(next);
            }}
          />
        );
      }
      return (
        <Checkbox
          id={inputId}
          checked={checked}
          disabled={!enabled}
          aria-invalid={ariaInvalid}
          onCheckedChange={(next) => {
            onChange(next);
          }}
        />
      );
    }
    case 'date':
    case 'datetime': {
      return (
        <DatePickerInput
          fieldType={field.type}
          value={value}
          enabled={enabled}
          placeholder={placeholder}
          inputId={inputId}
          timePresets={presentation?.timePresets}
          ariaInvalid={invalid}
          onChange={onChange}
        />
      );
    }
    case 'time': {
      return (
        <div className={TIME_FIELD_LAYOUT_CLASS}>
          <TimeInput
            id={inputId}
            value={formatInputValue(value)}
            disabled={!enabled}
            readOnly={!enabled}
            aria-invalid={ariaInvalid}
            presets={presentation?.timePresets}
            onValueChange={(next) => {
              onChange(next);
            }}
          />
        </div>
      );
    }
    case 'choice': {
      return renderChoiceInput(
        field,
        widget,
        value,
        enabled,
        placeholder,
        onChange,
        inputId,
        invalid,
      );
    }
    case 'group':
    case 'repeater':
    case 'component-ref': {
      return <p className='text-sm text-muted-foreground'>{field.type}</p>;
    }
    default: {
      return <p className='text-sm text-muted-foreground'>{field.type}</p>;
    }
  }
}

function renderChoiceInput(
  field: ClinicalField,
  widget: string | undefined,
  value: unknown,
  enabled: boolean,
  placeholder: string | undefined,
  onChange: (value: unknown) => void,
  inputId: string | undefined,
  invalid: boolean,
): JSX.Element {
  const options = field.options ?? [];
  const ariaInvalid = invalid || undefined;

  if (widget === 'radio-group') {
    const groupName = inputId ?? field.id;
    return (
      <div
        role='radiogroup'
        aria-labelledby={inputId ? `${inputId}-legend` : undefined}
        aria-invalid={ariaInvalid}
        data-slot='radio-group'
        className='grid gap-3'
      >
        {options.map((option) => {
          const optionId = `${groupName}-${option.value}`;
          const checked = String(value) === option.value;
          return (
            <Field
              key={option.value}
              orientation='horizontal'
            >
              <input
                id={optionId}
                type='radio'
                name={groupName}
                value={option.value}
                checked={checked}
                disabled={!enabled}
                aria-label={option.label}
                className='size-4 shrink-0 accent-primary'
                onChange={() => {
                  onChange(option.value);
                }}
              />
              <FieldLabel htmlFor={optionId}>{option.label}</FieldLabel>
            </Field>
          );
        })}
      </div>
    );
  }

  if (widget === 'checkbox-group' || field.allowMultiple) {
    const selected = new Set(Array.isArray(value) ? value.map(String) : []);
    const groupId = inputId ?? field.id;
    return (
      <div
        role='group'
        data-slot='checkbox-group'
        className='grid gap-3'
      >
        {options.map((option) => {
          const optionId = `${groupId}-${option.value}`;
          return (
            <Field
              key={option.value}
              orientation='horizontal'
            >
              <Checkbox
                id={optionId}
                checked={selected.has(option.value)}
                disabled={!enabled}
                aria-invalid={ariaInvalid}
                onCheckedChange={(next) => {
                  const nextSelected = new Set(selected);
                  if (next) {
                    nextSelected.add(option.value);
                  } else {
                    nextSelected.delete(option.value);
                  }
                  onChange([...nextSelected]);
                }}
              />
              <FieldLabel htmlFor={optionId}>{option.label}</FieldLabel>
            </Field>
          );
        })}
      </div>
    );
  }

  return (
    <Select
      value={formatSelectValue(value)}
      items={options}
      disabled={!enabled}
      onValueChange={(next) => {
        onChange(next);
      }}
    >
      <SelectTrigger
        id={inputId}
        className='w-full'
        aria-invalid={ariaInvalid}
      >
        <SelectValue placeholder={placeholder ?? 'Select…'} />
      </SelectTrigger>
      <SelectContent>
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
  );
}

function formatSelectValue(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }
  return null;
}

function formatInputValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }
  if (typeof value === 'string') {
    return value;
  }
  return '';
}
