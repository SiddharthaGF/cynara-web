import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

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
import { Textarea } from '@/components/ui/textarea.tsx';
import {
  TIME_FIELD_LAYOUT_CLASS,
  TimeInput,
} from '@/components/ui/time-input.tsx';
import type { ClinicalField, FieldPresentation } from '@/features/forms/types.ts';
import { cn } from '@/lib/utils.ts';

import { DatePickerInput } from './DatePickerInput.tsx';

export function renderFieldInput(
  field: ClinicalField,
  presentation: FieldPresentation | undefined,
  value: unknown,
  enabled: boolean,
  placeholder: string | undefined,
  onChange: (value: unknown) => void,
  inputId?: string,
): JSX.Element {
  const widget = presentation?.widget;

  switch (field.type) {
    case 'text': {
      return (
        <Input
          id={inputId}
          value={formatInputValue(value)}
          placeholder={placeholder}
          disabled={!enabled}
          readOnly={!enabled}
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
          onValueChange={(next) => {
            onChange(next);
          }}
        />
      );
    }
    case 'boolean': {
      if (widget === 'toggle') {
        return renderToggleInput(inputId, value, enabled, onChange);
      }
      return (
        <YesNoRadioInput
          inputId={inputId}
          value={value}
          enabled={enabled}
          onChange={onChange}
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

function YesNoRadioInput({
  inputId,
  value,
  enabled,
  onChange,
}: {
  inputId: string | undefined;
  value: unknown;
  enabled: boolean;
  onChange: (value: unknown) => void;
}): JSX.Element {
  const { t } = useTranslation('common');
  const groupName = inputId ?? 'yes-no';
  const yesId = `${groupName}-yes`;
  const noId = `${groupName}-no`;

  return (
    <div
      role='radiogroup'
      data-slot='radio-group'
      className='flex flex-row flex-wrap items-center gap-x-6 gap-y-2'
    >
      <label
        htmlFor={yesId}
        className='inline-flex cursor-pointer items-center gap-2 text-sm font-normal'
      >
        <input
          id={yesId}
          type='radio'
          name={groupName}
          checked={value === true}
          disabled={!enabled}
          className='size-4 shrink-0 accent-primary disabled:cursor-not-allowed disabled:opacity-50'
          onChange={() => {
            onChange(true);
          }}
        />
        {t('yes')}
      </label>
      <label
        htmlFor={noId}
        className='inline-flex cursor-pointer items-center gap-2 text-sm font-normal'
      >
        <input
          id={noId}
          type='radio'
          name={groupName}
          checked={value === false}
          disabled={!enabled}
          className='size-4 shrink-0 accent-primary disabled:cursor-not-allowed disabled:opacity-50'
          onChange={() => {
            onChange(false);
          }}
        />
        {t('no')}
      </label>
    </div>
  );
}

function renderToggleInput(
  inputId: string | undefined,
  value: unknown,
  enabled: boolean,
  onChange: (value: unknown) => void,
): JSX.Element {
  const checked = Boolean(value);
  return (
    <button
      id={inputId}
      type='button'
      role='switch'
      aria-checked={checked}
      disabled={!enabled}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors',
        checked ? 'border-primary bg-primary' : 'border-input bg-muted',
        !enabled && 'cursor-not-allowed opacity-50',
      )}
      onClick={() => {
        onChange(!checked);
      }}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none block size-4 rounded-full bg-background shadow-sm transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
      <span className='sr-only'>{checked ? 'On' : 'Off'}</span>
    </button>
  );
}

function renderChoiceInput(
  field: ClinicalField,
  widget: string | undefined,
  value: unknown,
  enabled: boolean,
  placeholder: string | undefined,
  onChange: (value: unknown) => void,
  inputId?: string,
): JSX.Element {
  const options = field.options ?? [];

  if (widget === 'radio-group') {
    const groupName = inputId ?? field.id;
    return (
      <div
        role='radiogroup'
        aria-labelledby={inputId ? `${inputId}-legend` : undefined}
        data-slot='radio-group'
        className='grid gap-2'
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
        className='grid gap-2'
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
      disabled={!enabled}
      onValueChange={(next) => {
        onChange(next);
      }}
    >
      <SelectTrigger
        id={inputId}
        className='w-full'
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
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
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

