import { useNavigate } from '@tanstack/react-router';
import { FilePlus } from 'lucide-react';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  isForbiddenClinicalDocumentError,
  type ClinicalDocumentDto,
} from '@/api/clinical-documents.ts';
import { describeApiError } from '@/api/error-message.ts';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { useStartClinicalDocument } from '@/features/documents/useClinicalDocumentsCatalog.ts';
import { useDocumentDefinitions } from '@/features/hospital/useDocumentCatalogAdmin.ts';
import { useCapabilities } from '@/hooks/use-capabilities.ts';

interface EncounterAvailableFormsProps {
  patientId: string;
  encounterId: string;
  facilityId: string;
  clinicalAreaId: string;
  locale: string;
  /** Raised when the actor lacks write permission; parents show a banner. */
  onForbidden?: (message: string) => void;
  /** Compact layout for the patient chart overview. */
  compact?: boolean;
}

/**
 * Lists the clinical forms published for an encounter's facility and clinical
 * area as one-click start actions. Replaces the generic "new document" dialog
 * so the most frequent clinical task stays within two clicks of the chart.
 */
export function EncounterAvailableForms({
  patientId,
  encounterId,
  facilityId,
  clinicalAreaId,
  locale,
  onForbidden,
  compact = false,
}: EncounterAvailableFormsProps): JSX.Element | null {
  const { t } = useTranslation(['documents', 'api']);
  const navigate = useNavigate();
  const { can } = useCapabilities();
  const list = useDocumentDefinitions({ includeRetired: false });
  const {
    startDocument,
    isStarting,
    error: startError,
  } = useStartClinicalDocument();
  const [forbiddenMessage, setForbiddenMessage] = useState<string | null>(null);

  if (!can('write', 'ClinicalDocument')) {
    return null;
  }

  const definitions = list.items.filter(
    (definition) =>
      definition.facilityId === facilityId &&
      definition.clinicalAreaId === clinicalAreaId,
  );

  const handleStart = async (definitionId: string): Promise<void> => {
    setForbiddenMessage(null);
    try {
      const created: ClinicalDocumentDto = await startDocument({
        documentDefinitionId: definitionId,
        encounterId,
      });
      void navigate({
        to: '/$locale/patients/$id/encounters/$encounterId/documents/$documentId',
        params: {
          locale,
          id: patientId,
          encounterId,
          documentId: created.id,
        },
      });
    } catch (err) {
      if (isForbiddenClinicalDocumentError(err)) {
        const message = describeApiError(err, t);
        setForbiddenMessage(message);
        onForbidden?.(message);
      }
    }
  };

  return (
    <section
      className={compact ? 'mt-4' : 'mb-6'}
      data-testid='encounter-available-forms'
    >
      <div className='mb-2 flex items-center justify-between gap-2'>
        <p className='text-xs font-medium tracking-[0.2em] text-accent uppercase'>
          {t('list.startForms')}
        </p>
        <p className='text-xs text-muted-foreground'>
          {t('list.startFormsHint')}
        </p>
      </div>

      {forbiddenMessage ? (
        <Alert
          variant='destructive'
          className='mb-3'
        >
          <AlertDescription>{forbiddenMessage}</AlertDescription>
        </Alert>
      ) : null}

      {startError ? (
        <Alert
          variant='destructive'
          className='mb-3'
          data-testid='start-document-error'
        >
          <AlertDescription>{startError}</AlertDescription>
        </Alert>
      ) : null}

      {list.error ? (
        <Alert
          variant='destructive'
          className='mb-3'
        >
          <AlertDescription>{list.error}</AlertDescription>
        </Alert>
      ) : null}

      {list.isLoading ? (
        <div className='space-y-2'>
          <Skeleton className='h-9 w-full' />
          <Skeleton className='h-9 w-full' />
        </div>
      ) : null}

      {!list.isLoading && !list.error && definitions.length === 0 ? (
        <p className='rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground'>
          {t('list.formsEmptyDescription')}
        </p>
      ) : null}

      {!list.isLoading && !list.error && definitions.length > 0 ? (
        <div className='flex flex-wrap gap-2'>
          {definitions.map((definition) => (
            <Button
              key={definition.id}
              variant='outline'
              size='sm'
              data-testid='start-document-action'
              disabled={isStarting}
              onClick={() => {
                void handleStart(definition.id);
              }}
            >
              <FilePlus className='size-3.5' />
              {definition.name || definition.code}
            </Button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
