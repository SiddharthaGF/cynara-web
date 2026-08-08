import { Link } from '@tanstack/react-router';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { PageBreadcrumbs } from '@/components/page-breadcrumbs.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import {
  clinicalDocumentStatusBadgeVariant,
  formatClinicalDocumentStatus,
} from '@/features/documents/clinicalDocumentForm.ts';

interface DocumentFormHeaderProps {
  definitionName: string;
  fallbackCode: string;
  status: string;
  locale: string;
  patientId: string;
  encounterId: string;
  /** Patient display name for the breadcrumb trail; omitted while loading. */
  patientName?: string;
}

export function DocumentFormHeader({
  definitionName,
  fallbackCode,
  status,
  locale,
  patientId,
  encounterId,
  patientName,
}: DocumentFormHeaderProps): JSX.Element {
  const { t } = useTranslation(['documents', 'common']);
  const title = definitionName || fallbackCode;

  return (
    <header className='mb-6'>
      <PageBreadcrumbs
        className='mb-4'
        items={[
          {
            label: t('common:breadcrumb.patients'),
            link: (
              <Link
                to='/$locale/patients'
                params={{ locale }}
              />
            ),
          },
          {
            label: patientName ?? t('common:breadcrumb.clinicalRecord'),
            link: (
              <Link
                to='/$locale/patients/$id'
                params={{ locale, id: patientId }}
              />
            ),
          },
          {
            label: t('common:breadcrumb.encounter'),
            link: (
              <Link
                to='/$locale/patients/$id/encounters/$encounterId'
                params={{ locale, id: patientId, encounterId }}
              />
            ),
          },
          { label: title },
        ]}
      />
      <div className='flex flex-wrap items-center gap-3'>
        <h1 className='font-display text-balance text-2xl font-semibold tracking-tight md:text-3xl'>
          {title}
        </h1>
        <Badge
          variant={clinicalDocumentStatusBadgeVariant(status)}
          data-testid='document-detail-status'
        >
          {formatClinicalDocumentStatus(status, t)}
        </Badge>
      </div>
    </header>
  );
}
