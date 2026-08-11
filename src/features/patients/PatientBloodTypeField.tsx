import { Droplet, type LucideIcon } from 'lucide-react';
import type { JSX } from 'react';

import type { PatientBloodType } from '@/api/patients.ts';
import { Field, FieldError, FieldLabel } from '@/components/ui/field.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';

const BLOOD_TYPE_VALUES: PatientBloodType[] = [
  'a+',
  'a-',
  'b+',
  'b-',
  'ab+',
  'ab-',
  'o+',
  'o-',
];

const BLOOD_TYPE_ICONS: Record<PatientBloodType, LucideIcon> = {
  'a+': Droplet,
  'a-': Droplet,
  'b+': Droplet,
  'b-': Droplet,
  'ab+': Droplet,
  'ab-': Droplet,
  'o+': Droplet,
  'o-': Droplet,
};

function patientBloodTypeItems(): { value: PatientBloodType; label: string }[] {
  return BLOOD_TYPE_VALUES.map((value) => ({
    value,
    label: value.toUpperCase(),
  }));
}

function PatientBloodTypeOptionLabel({
  value,
  label,
}: {
  value: string;
  label: string;
}): JSX.Element {
  const Icon = BLOOD_TYPE_ICONS[value as PatientBloodType] ?? Droplet;
  return (
    <span className='inline-flex items-center gap-2'>
      <Icon
        className='size-4 shrink-0 text-muted-foreground'
        aria-hidden
      />
      <span className='font-medium'>{label}</span>
    </span>
  );
}

export function PatientBloodTypeField({
  id,
  label,
  value,
  error,
  disabled,
  required,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}): JSX.Element {
  const items = patientBloodTypeItems();
  const selected = items.find((item) => item.value === value);

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        items={items}
        value={value || null}
        onValueChange={(val: string | null) => {
          if (val) {
            onChange(val);
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          aria-invalid={Boolean(error)}
          aria-required={required || undefined}
          className='w-full'
        >
          <SelectValue placeholder={placeholder}>
            {selected ? (
              <PatientBloodTypeOptionLabel
                value={selected.value}
                label={selected.label}
              />
            ) : null}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem
              key={item.value}
              value={item.value}
            >
              <PatientBloodTypeOptionLabel
                value={item.value}
                label={item.label}
              />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}
