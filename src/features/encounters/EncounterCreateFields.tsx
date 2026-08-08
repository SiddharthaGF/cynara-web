import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Field, FieldError, FieldLabel } from '@/components/ui/field.tsx';
import { Input } from '@/components/ui/input.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { ENCOUNTER_TYPES } from '@/features/encounters/encounterForm.ts';

interface FieldController {
  state: { value: string };
  handleChange: (value: string) => void;
  handleBlur: () => void;
}

interface SelectOption {
  value: string;
  label: string;
}

interface EncounterSelectFieldProps {
  id: string;
  testId?: string;
  label: string;
  placeholder: string;
  options: SelectOption[];
  value: string | null;
  disabled: boolean;
  error?: string;
  onValueChange: (value: string | null) => void;
}

function EncounterSelectField({
  id,
  testId,
  label,
  placeholder,
  options,
  value,
  disabled,
  error,
  onValueChange,
}: EncounterSelectFieldProps): JSX.Element {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        items={options}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          data-testid={testId}
          aria-invalid={Boolean(error)}
          className='w-full'
        >
          <SelectValue placeholder={placeholder} />
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
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

interface EncounterFacilityFieldProps {
  field: FieldController;
  facilities: { id: string; name: string }[];
  facilitiesLoading: boolean;
  isCreating: boolean;
  taxonomyEmpty: boolean;
  error?: string;
  /** Called with the selected facility id after the form field updates. */
  onFacilityChange: (value: string) => void;
}

export function EncounterFacilityField({
  field,
  facilities,
  facilitiesLoading,
  isCreating,
  taxonomyEmpty,
  error,
  onFacilityChange,
}: EncounterFacilityFieldProps): JSX.Element {
  const { t } = useTranslation('encounters');
  const options = facilities.map((facility) => ({
    value: facility.id,
    label: facility.name,
  }));
  return (
    <EncounterSelectField
      id='encounter-facility'
      testId='encounter-create-facility'
      label={t('create.fields.facility')}
      placeholder={t('create.fields.facilityPlaceholder')}
      options={options}
      value={field.state.value || null}
      disabled={isCreating || facilitiesLoading || taxonomyEmpty}
      error={error}
      onValueChange={(next) => {
        field.handleChange(next ?? '');
        onFacilityChange(next ?? '');
      }}
    />
  );
}

interface EncounterClinicalAreaFieldProps {
  field: FieldController;
  clinicalAreas: { id: string; name: string }[];
  areasLoading: boolean;
  isCreating: boolean;
  facilityId: string;
  error?: string;
}

export function EncounterClinicalAreaField({
  field,
  clinicalAreas,
  areasLoading,
  isCreating,
  facilityId,
  error,
}: EncounterClinicalAreaFieldProps): JSX.Element {
  const { t } = useTranslation('encounters');
  const options = clinicalAreas.map((area) => ({
    value: area.id,
    label: area.name,
  }));
  return (
    <EncounterSelectField
      id='encounter-clinical-area'
      testId='encounter-create-clinicalArea'
      label={t('create.fields.clinicalArea')}
      placeholder={t('create.fields.clinicalAreaPlaceholder')}
      options={options}
      value={field.state.value || null}
      disabled={
        isCreating || !facilityId || areasLoading || clinicalAreas.length === 0
      }
      error={error}
      onValueChange={(next) => {
        field.handleChange(next ?? '');
      }}
    />
  );
}

interface EncounterTypeFieldProps {
  field: FieldController;
  isCreating: boolean;
  error?: string;
}

export function EncounterTypeField({
  field,
  isCreating,
  error,
}: EncounterTypeFieldProps): JSX.Element {
  const { t } = useTranslation('encounters');
  const options = ENCOUNTER_TYPES.map((type) => ({
    value: type,
    label: t(`types.${type}`),
  }));
  return (
    <EncounterSelectField
      id='encounter-type'
      testId='encounter-create-type'
      label={t('create.fields.type')}
      placeholder={t('create.fields.typePlaceholder')}
      options={options}
      value={field.state.value || null}
      disabled={isCreating}
      error={error}
      onValueChange={(next) => {
        field.handleChange(next ?? '');
      }}
    />
  );
}

interface EncounterProfessionalFieldProps {
  field: FieldController;
  isCreating: boolean;
  error?: string;
}

export function EncounterProfessionalField({
  field,
  isCreating,
  error,
}: EncounterProfessionalFieldProps): JSX.Element {
  const { t } = useTranslation('encounters');
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor='encounter-professional'>
        {t('create.fields.professional')}
      </FieldLabel>
      <Input
        id='encounter-professional'
        data-testid='encounter-create-professional'
        value={field.state.value}
        disabled={isCreating}
        aria-invalid={Boolean(error)}
        placeholder={t('create.fields.professionalPlaceholder')}
        onChange={(event) => {
          field.handleChange(event.target.value);
        }}
        onBlur={field.handleBlur}
      />
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}
