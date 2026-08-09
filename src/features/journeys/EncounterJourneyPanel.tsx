import { Route } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import { JourneyPanelBody } from '@/features/journeys/JourneyPanelBody.tsx';
import { useEncounterJourney } from '@/features/journeys/useJourneyQueries.ts';
import { useCapabilities } from '@/hooks/use-capabilities.ts';

interface EncounterJourneyPanelProps {
  encounterId: string;
  patientId: string;
  locale: string;
}

/**
 * The pipeline journey bound to a single encounter. Reads require the
 * `pipelines.read` capability; without it the panel is not fetched.
 */
export function EncounterJourneyPanel({
  encounterId,
  patientId,
  locale,
}: EncounterJourneyPanelProps): JSX.Element {
  const { t, i18n } = useTranslation(['journeys', 'api']);
  const { can } = useCapabilities();
  const canRead = can('read', 'Pipeline');
  const { journeys, isLoading, error, isForbidden } = useEncounterJourney(
    encounterId,
    canRead,
  );

  return (
    <Card className='mt-8 border-border/70 shadow-sm'>
      <CardHeader>
        <p className='mb-2 text-xs font-medium tracking-[0.2em] text-accent uppercase'>
          {t('encounterPanel.eyebrow')}
        </p>
        <CardTitle className='flex items-center gap-2 font-heading text-lg'>
          <Route className='size-4 text-muted-foreground' />
          {t('encounterPanel.title')}
        </CardTitle>
        <CardDescription className='mt-1'>
          {t('encounterPanel.subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {canRead ? (
          <JourneyPanelBody
            journeys={journeys}
            isLoading={isLoading}
            error={error}
            isForbidden={isForbidden}
            emptyTitle={t('encounterPanel.emptyTitle')}
            emptyDescription={t('encounterPanel.emptyDescription')}
            forbiddenMessage={t('encounterPanel.forbidden')}
            patientId={patientId}
            locale={locale}
            language={i18n.language}
          />
        ) : (
          <p className='rounded-lg border border-border/70 bg-muted/20 px-3 py-3 text-sm text-muted-foreground'>
            {t('panel.denied')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
