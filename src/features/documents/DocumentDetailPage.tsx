import { useParams } from '@tanstack/react-router';
import type { JSX } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { ClinicalDocumentDto } from '@/api/clinical-documents.ts';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import {
  DocumentDetailLoading,
  DocumentDetailShell,
  DocumentDetailUnavailable,
} from '@/features/documents/DocumentDetailStates.tsx';
import { DocumentFormWorkspace } from '@/features/documents/DocumentFormWorkspace.tsx';
import {
  useClinicalDocumentDetail,
  useDocumentDraft,
} from '@/features/documents/useClinicalDocumentsCatalog.ts';
import { useDocumentDefinitions } from '@/features/hospital/useDocumentCatalogAdmin.ts';

export function DocumentDetailPage(): JSX.Element {
  const { t } = useTranslation(['documents', 'api']);
  const {
    locale,
    id: patientId,
    encounterId,
    documentId,
  }: {
    locale: string;
    id: string;
    encounterId: string;
    documentId: string;
  } = useParams({
    from: '/$locale/patients/$id_/encounters/$encounterId_/documents/$documentId',
  });

  const { document, isLoading, error, isForbidden } =
    useClinicalDocumentDetail(documentId);

  if (isLoading) {
    return <DocumentDetailLoading />;
  }

  if (isForbidden) {
    return (
      <DocumentDetailUnavailable
        title={t('permissions.forbiddenTitle')}
        description={t('detail.forbidden')}
        locale={locale}
        patientId={patientId}
        encounterId={encounterId}
      />
    );
  }

  if (error || !document) {
    return (
      <DocumentDetailUnavailable
        title={t('detail.notFound')}
        description={error ?? t('detail.loadError')}
        locale={locale}
        patientId={patientId}
        encounterId={encounterId}
      />
    );
  }

  return (
    <DocumentDraftLoader
      document={document}
      locale={locale}
      patientId={patientId}
      encounterId={encounterId}
    />
  );
}

function DocumentDraftLoader({
  document,
  locale,
  patientId,
  encounterId,
}: {
  document: ClinicalDocumentDto;
  locale: string;
  patientId: string;
  encounterId: string;
}): JSX.Element {
  const { t } = useTranslation(['documents', 'api']);
  const { response, formVersion, isLoading, error } = useDocumentDraft(
    document.formResponseId,
  );

  const definitionLookup = useDocumentDefinitions({ includeRetired: true });
  const definitionName = useMemo(
    () =>
      definitionLookup.items.find(
        (item) => item.id === document.documentDefinitionId,
      )?.name ?? '',
    [definitionLookup.items, document.documentDefinitionId],
  );

  if (isLoading) {
    return (
      <DocumentDetailShell>
        <div className='space-y-6'>
          <Skeleton className='h-8 w-56' />
          <Skeleton className='h-56 w-full' />
        </div>
      </DocumentDetailShell>
    );
  }

  if (error || !response || !formVersion) {
    return (
      <DocumentDetailUnavailable
        title={t('detail.draftUnavailable')}
        description={error ?? t('detail.draftLoadError')}
        locale={locale}
        patientId={patientId}
        encounterId={encounterId}
      />
    );
  }

  return (
    <DocumentFormWorkspace
      document={document}
      response={response}
      formVersion={formVersion}
      definitionName={definitionName}
      locale={locale}
      patientId={patientId}
      encounterId={encounterId}
    />
  );
}
