import type { TFunction } from 'i18next';

import type { EncounterStatus, EncounterType } from '@/api/encounters.ts';

export const ENCOUNTER_TYPES: readonly EncounterType[] = [
  'ambulatory',
  'emergency',
  'inpatient',
  'observation',
  'virtual',
] as const;

export const ENCOUNTER_STATUSES: readonly EncounterStatus[] = [
  'open',
  'completed',
  'canceled',
  'enteredInError',
] as const;

export interface EncounterCreateFields {
  facilityId: string;
  clinicalAreaId: string;
  type: string;
}

export type EncounterFieldErrors = Partial<
  Record<keyof EncounterCreateFields, string>
>;

export function validateEncounterCreate(
  value: EncounterCreateFields,
  t: TFunction,
): EncounterFieldErrors {
  const errors: EncounterFieldErrors = {};

  if (!value.facilityId.trim()) {
    errors.facilityId = t('create.errors.facilityRequired');
  }
  if (!value.clinicalAreaId.trim()) {
    errors.clinicalAreaId = t('create.errors.clinicalAreaRequired');
  }
  if (!value.type.trim()) {
    errors.type = t('create.errors.typeRequired');
  } else if (!ENCOUNTER_TYPES.includes(value.type as EncounterType)) {
    errors.type = t('create.errors.typeInvalid');
  }

  return errors;
}

export function formatEncounterType(type: string, t: TFunction): string {
  if (ENCOUNTER_TYPES.includes(type as EncounterType)) {
    return t(`types.${type as EncounterType}`);
  }
  return type;
}

export function formatEncounterStatus(status: string, t: TFunction): string {
  if (ENCOUNTER_STATUSES.includes(status as EncounterStatus)) {
    return t(`status.${status as EncounterStatus}`);
  }
  return status;
}

export function formatEncounterDateTime(
  iso: string | null | undefined,
  language: string,
): string {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat(language, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date);
}

export function encounterStatusBadgeVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'open': {
      return 'default';
    }
    case 'completed': {
      return 'secondary';
    }
    case 'canceled': {
      return 'outline';
    }
    case 'enteredInError': {
      return 'destructive';
    }
    default: {
      return 'outline';
    }
  }
}
