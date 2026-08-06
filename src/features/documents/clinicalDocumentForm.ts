import type { TFunction } from 'i18next';

import type { ClinicalDocumentStatus } from '@/api/clinical-documents.ts';

export const CLINICAL_DOCUMENT_STATUSES: readonly ClinicalDocumentStatus[] = [
  'inProgress',
  'completed',
  'canceled',
  'enteredInError',
] as const;

export function formatClinicalDocumentStatus(
  status: string,
  t: TFunction,
): string {
  if (CLINICAL_DOCUMENT_STATUSES.includes(status as ClinicalDocumentStatus)) {
    return t(`status.${status as ClinicalDocumentStatus}`);
  }
  return status;
}

export function clinicalDocumentStatusBadgeVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'inProgress': {
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

export function formatClinicalDocumentDateTime(
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
