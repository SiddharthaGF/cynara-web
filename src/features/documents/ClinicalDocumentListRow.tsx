import { Link } from '@tanstack/react-router';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import type { ClinicalDocumentDto } from '@/api/clinical-documents.ts';
import {
  isInProgressClinicalDocument,
  isTerminalClinicalDocument,
} from '@/api/clinical-documents.ts';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  clinicalDocumentStatusBadgeVariant,
  formatClinicalDocumentDateTime,
  formatClinicalDocumentStatus,
} from '@/features/documents/clinicalDocumentForm.ts';

interface ClinicalDocumentListRowProps {
  document: ClinicalDocumentDto;
  definitionName: string;
  locale: string;
  patientId: string;
  encounterId: string;
  language: string;
}

/**
 * Single document row shared by the encounter panel and the patient
 * timeline. Both render the same status, metadata, and detail link;
 * only the id source differs, so callers resolve patient/encounter ids.
 */
export function ClinicalDocumentListRow({
  document,
  definitionName,
  locale,
  patientId,
  encounterId,
  language,
}: ClinicalDocumentListRowProps): JSX.Element {
  const { t } = useTranslation(['documents']);
  const terminal = isTerminalClinicalDocument(document.status);
  const inProgress = isInProgressClinicalDocument(document.status);

  return (
    <li
      className={
        terminal
          ? 'flex flex-col gap-3 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'
          : 'flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'
      }
      data-status={document.status}
      data-terminal={terminal ? 'true' : 'false'}
    >
      <div className='min-w-0 space-y-1'>
        <div className='flex flex-wrap items-center gap-2'>
          <span className='font-medium'>
            {definitionName || t('list.documentName')}
          </span>
          <Badge variant={clinicalDocumentStatusBadgeVariant(document.status)}>
            {formatClinicalDocumentStatus(document.status, t)}
          </Badge>
          {inProgress ? (
            <span className='text-xs text-muted-foreground'>
              {t('list.inProgressHint')}
            </span>
          ) : null}
        </div>
        <p className='text-sm text-muted-foreground'>
          {t('list.columns.createdAt')}:{' '}
          {formatClinicalDocumentDateTime(document.createdAt, language)}
        </p>
      </div>
      <Link
        to='/$locale/patients/$id/encounters/$encounterId/documents/$documentId'
        params={{
          locale,
          id: patientId,
          encounterId,
          documentId: document.id,
        }}
      >
        <Button
          variant='outline'
          size='sm'
        >
          {t('list.viewDetail')}
        </Button>
      </Link>
    </li>
  );
}
