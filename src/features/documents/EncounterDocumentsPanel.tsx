import { FileText } from 'lucide-react';
import type { JSX } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { EncounterDto } from '@/api/encounters.ts';
import { isHistoricalEncounter } from '@/api/encounters.ts';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
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
import { ClinicalDocumentListRow } from '@/features/documents/ClinicalDocumentListRow.tsx';
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
    <Card className='mt-8 border-border/70 shadow-sm'>
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
          <Alert variant='destructive'>
            <AlertDescription>{t('list.forbidden')}</AlertDescription>
          </Alert>
        ) : null}

        {!isForbidden && error ? (
          <Alert variant='destructive'>
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
          <Empty className='min-h-36 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-8'>
            <EmptyHeader>
              <EmptyTitle>{t('list.emptyTitle')}</EmptyTitle>
              <EmptyDescription>{t('list.emptyDescription')}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}

        {!isLoading && documents.length > 0 ? (
          <ul className='divide-y divide-border/70 rounded-xl border border-border/70'>
            {documents.map((document) => (
              <ClinicalDocumentListRow
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
