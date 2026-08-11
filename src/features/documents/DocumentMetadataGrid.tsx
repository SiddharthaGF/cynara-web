import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import type { ClinicalDocumentDto } from '@/api/clinical-documents.ts';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import {
  formatClinicalDocumentDateTime,
  formatClinicalDocumentStatus,
} from '@/features/documents/clinicalDocumentForm.ts';

function DocumentInfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div className='flex flex-col gap-1'>
      <dt className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
        {label}
      </dt>
      <dd className='text-sm font-medium break-all'>{value}</dd>
    </div>
  );
}

interface DocumentMetadataGridProps {
  document: ClinicalDocumentDto;
  language: string;
}

export function DocumentMetadataGrid({
  document,
  language,
}: DocumentMetadataGridProps): JSX.Element {
  const { t } = useTranslation(['documents']);
  return (
    <>
      <dl className='grid gap-4 sm:grid-cols-2'>
        <DocumentInfoRow
          label={t('detail.fields.status')}
          value={formatClinicalDocumentStatus(document.status, t)}
        />
        <DocumentInfoRow
          label={t('detail.fields.createdAt')}
          value={formatClinicalDocumentDateTime(document.createdAt, language)}
        />
        <DocumentInfoRow
          label={t('detail.fields.updatedAt')}
          value={formatClinicalDocumentDateTime(document.updatedAt, language)}
        />
        <DocumentInfoRow
          label={t('detail.fields.completedAt')}
          value={formatClinicalDocumentDateTime(document.completedAt, language)}
        />
      </dl>

      {document.status === 'enteredInError' && document.enteredInErrorReason ? (
        <Alert>
          <AlertDescription>
            {t('detail.confirm.enteredInErrorReason')}:{' '}
            {document.enteredInErrorReason}
          </AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}
