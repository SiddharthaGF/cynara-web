import { CircleHelp, Mars, Venus, type LucideIcon } from 'lucide-react';
import type { JSX } from 'react';

import type { PatientSex } from '@/api/patients.ts';
import { Field, FieldError, FieldLabel } from '@/components/ui/field.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';

const SEX_ICONS: Record<PatientSex, LucideIcon> = {
  female: Venus,
  male: Mars,
  unknown: CircleHelp,
};

function PatientSexOptionLabel({
  value,
  label,
}: {
  value: string;
  label: string;
}): JSX.Element {
  const Icon = SEX_ICONS[value as PatientSex] ?? CircleHelp;
  return (
    <span className='inline-flex items-center gap-2'>
      <Icon
        className='size-4 shrink-0 text-muted-foreground'
        aria-hidden
      />
      <span>{label}</span>
    </span>
  );
}

function patientSexItems(
  labels: Record<PatientSex, string>,
): { value: PatientSex; label: string }[] {
  return [
    { value: 'female', label: labels.female },
    { value: 'male', label: labels.male },
    { value: 'unknown', label: labels.unknown },
  ];
}

export function PatientSexField({
  id,
  label,
  labels,
  value,
  error,
  disabled,
  placeholder,
  required,
  onChange,
}: {
  id: string;
  label: string;
  labels: Record<PatientSex, string>;
  value: string;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
  onChange: (value: string) => void;
}): JSX.Element {
  const sexItems = patientSexItems(labels);
  const selected = sexItems.find((item) => item.value === value);

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        items={sexItems}
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
              <PatientSexOptionLabel
                value={selected.value}
                label={selected.label}
              />
            ) : null}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {sexItems.map((item) => (
            <SelectItem
              key={item.value}
              value={item.value}
            >
              <PatientSexOptionLabel
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
