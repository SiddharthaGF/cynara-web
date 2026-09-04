import { FileText, Plus } from 'lucide-react';
import type { JSX } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
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
import { ClinicalDocumentListRow } from '@/features/documents/ClinicalDocumentListRow.tsx';
import { usePatientDocuments } from '@/features/documents/useClinicalDocumentsCatalog.ts';
import { useDocumentDefinitions } from '@/features/hospital/useDocumentCatalogAdmin.ts';

interface PatientDocumentsTimelineProps {
  patientId: string;
  locale: string;
  /** Opens the "New consultation" flow; documents only start inside an encounter. */
  onNewEncounter?: () => void;
}

export function PatientDocumentsTimeline({
  patientId,
  locale,
  onNewEncounter,
}: PatientDocumentsTimelineProps): JSX.Element {
  const { t, i18n } = useTranslation(['documents', 'api', 'encounters']);
  const { documents, isLoading, error, isForbidden } =
    usePatientDocuments(patientId);
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

  return (
    <Card className='mt-8 border-border/70 shadow-sm'>
      <CardHeader>
        <p className='mb-2 text-xs font-medium tracking-[0.2em] text-accent uppercase'>
          {t('timeline.eyebrow')}
        </p>
        <CardTitle className='flex items-center gap-2 font-heading text-lg'>
          <FileText className='size-4 text-muted-foreground' />
          {t('timeline.title')}
        </CardTitle>
        <CardDescription className='mt-1'>
          {t('timeline.subtitle')}
        </CardDescription>
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

        {isLoading ? (
          <div className='space-y-3'>
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-12 w-full' />
          </div>
        ) : null}

        {!isLoading && !isForbidden && !error && documents.length === 0 ? (
          <Empty className='min-h-36 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-8'>
            <EmptyHeader>
              <EmptyTitle>{t('timeline.emptyTitle')}</EmptyTitle>
              <EmptyDescription>
                {t('timeline.emptyDescription')}
              </EmptyDescription>
            </EmptyHeader>
            {onNewEncounter ? (
              <Button
                variant='outline'
                onClick={onNewEncounter}
              >
                <Plus className='size-4' />
                {t('encounters:list.create')}
              </Button>
            ) : null}
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
                patientId={document.patientId}
                encounterId={document.encounterId}
                language={i18n.language}
              />
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
