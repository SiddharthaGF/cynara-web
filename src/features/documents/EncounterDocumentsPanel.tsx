import { Link } from '@tanstack/react-router';
import { FileText } from 'lucide-react';
import type { JSX } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { ClinicalDocumentDto } from '@/api/clinical-documents.ts';
import {
  isInProgressClinicalDocument,
  isTerminalClinicalDocument,
} from '@/api/clinical-documents.ts';
import type { EncounterDto } from '@/api/encounters.ts';
import { isHistoricalEncounter } from '@/api/encounters.ts';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import {
  clinicalDocumentStatusBadgeVariant,
  formatClinicalDocumentDateTime,
  formatClinicalDocumentStatus,
} from '@/features/documents/clinicalDocumentForm.ts';
import { EncounterAvailableForms } from '@/features/documents/EncounterAvailableForms.tsx';
import { useEncounterDocuments } from '@/features/documents/useClinicalDocumentsCatalog.ts';
import { useDocumentDefinitions } from '@/features/hospital/useDocumentCatalogAdmin.ts';
import { useCapabilities } from '@/hooks/use-capabilities.ts';

interface EncounterDocumentsPanelProps {
  encounter: EncounterDto;
  locale: string;
  patientId: string;
  onForbidden: (message: string) => void;
}

export function EncounterDocumentsPanel({
  encounter,
  locale,
  patientId,
  onForbidden,
}: EncounterDocumentsPanelProps): JSX.Element {
  const { t, i18n } = useTranslation(['documents', 'api']);
  const { can } = useCapabilities();
  const { documents, isLoading, error, isForbidden } = useEncounterDocuments(
    encounter.id,
  );
  const definitionLookup = useDocumentDefinitions({ includeRetired: true });

  const definitionNames = useMemo(
    () =>
      new Map(
        definitionLookup.items.map((definition) => [
          definition.id,
          definition.name,
        ]),
      ),
    [definitionLookup.items],
  );

  const canWrite = can('write', 'ClinicalDocument');
  const encounterOpen = !isHistoricalEncounter(encounter.status);
  const canStart = encounterOpen && !isForbidden && canWrite;

  return (
    <Card
      className='mt-8 border-border/70 shadow-sm'
      data-testid='encounter-documents-panel'
    >
      <CardHeader>
        <p className='mb-2 text-xs font-medium tracking-[0.2em] text-accent uppercase'>
          {t('list.eyebrow')}
        </p>
        <CardTitle className='flex items-center gap-2 font-heading text-lg'>
          <FileText className='size-4 text-muted-foreground' />
          {t('list.title')}
        </CardTitle>
        <CardDescription className='mt-1'>{t('list.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isForbidden ? (
          <Alert
            variant='destructive'
            data-testid='document-list-forbidden'
          >
            <AlertDescription>{t('list.forbidden')}</AlertDescription>
          </Alert>
        ) : null}

        {!isForbidden && error ? (
          <Alert
            variant='destructive'
            data-testid='document-list-error'
          >
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {canStart ? (
          <EncounterAvailableForms
            patientId={patientId}
            encounterId={encounter.id}
            facilityId={encounter.facilityId}
            clinicalAreaId={encounter.clinicalAreaId}
            locale={locale}
            onForbidden={onForbidden}
          />
        ) : null}

        {isLoading ? (
          <div className='space-y-3'>
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-12 w-full' />
          </div>
        ) : null}

        {!isLoading && !isForbidden && !error && documents.length === 0 ? (
          <Empty
            className='min-h-36 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-8'
            data-testid='document-list-empty'
          >
            <EmptyHeader>
              <EmptyTitle>{t('list.emptyTitle')}</EmptyTitle>
              <EmptyDescription>{t('list.emptyDescription')}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}

        {!isLoading && documents.length > 0 ? (
          <ul
            className='divide-y divide-border/70 rounded-xl border border-border/70'
            data-testid='document-list'
          >
            {documents.map((document) => (
              <DocumentListRow
                key={document.id}
                document={document}
                definitionName={
                  definitionNames.get(document.documentDefinitionId) ?? ''
                }
                locale={locale}
                patientId={patientId}
                encounterId={encounter.id}
                language={i18n.language}
              />
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DocumentListRow({
  document,
  definitionName,
  locale,
  patientId,
  encounterId,
  language,
}: {
  document: ClinicalDocumentDto;
  definitionName: string;
  locale: string;
  patientId: string;
  encounterId: string;
  language: string;
}): JSX.Element {
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
      data-testid='document-list-row'
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
          data-testid='document-list-open'
        >
          {t('list.viewDetail')}
        </Button>
      </Link>
    </li>
  );
}
