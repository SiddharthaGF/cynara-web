import { Route } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import { JourneyPanelBody } from '@/features/journeys/JourneyPanelBody.tsx';
import { usePatientJourney } from '@/features/journeys/useJourneyQueries.ts';
import { useCapabilities } from '@/hooks/use-capabilities.ts';

interface PatientJourneyPanelProps {
  patientId: string;
  locale: string;
  /** Opens the encounter-create dialog owned by the patient chart page. */
  onNewEncounter?: () => void;
}

/**
 * The patient's pipeline journey inside the patient chart: every workflow
 * pipeline bound to the record or to one of its encounters, rendered from
 * the published workflow version at start time. Reads require the
 * `pipelines.read` capability; without it the panel is not fetched.
 */
export function PatientJourneyPanel({
  patientId,
  locale,
  onNewEncounter,
}: PatientJourneyPanelProps): JSX.Element {
  const { t, i18n } = useTranslation(['journeys', 'api']);
  const { can } = useCapabilities();
  const canRead = can('read', 'Pipeline');
  const { journeys, isLoading, error, isForbidden } = usePatientJourney(
    patientId,
    canRead,
  );

  return (
    <Card
      className='mt-8 border-border/70 shadow-sm'
      data-testid='patient-journey-panel'
    >
      <CardHeader>
        <p className='mb-2 text-xs font-medium tracking-[0.2em] text-accent uppercase'>
          {t('panel.eyebrow')}
        </p>
        <CardTitle className='flex items-center gap-2 font-heading text-lg'>
          <Route className='size-4 text-muted-foreground' />
          {t('panel.title')}
        </CardTitle>
        <CardDescription className='mt-1'>
          {t('panel.subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {canRead ? (
          <JourneyPanelBody
            journeys={journeys}
            isLoading={isLoading}
            error={error}
            isForbidden={isForbidden}
            emptyTitle={t('panel.emptyTitle')}
            emptyDescription={t('panel.emptyDescription')}
            emptyAction={
              onNewEncounter ? (
                <Button
                  size='sm'
                  data-testid='patient-journey-empty-action'
                  onClick={onNewEncounter}
                >
                  {t('panel.emptyAction')}
                </Button>
              ) : undefined
            }
            forbiddenMessage={t('panel.forbidden')}
            patientId={patientId}
            locale={locale}
            language={i18n.language}
            listTestId='patient-journey-list'
            forbiddenTestId='patient-journey-forbidden'
            emptyTestId='patient-journey-empty'
          />
        ) : (
          <p
            className='rounded-lg border border-border/70 bg-muted/20 px-3 py-3 text-sm text-muted-foreground'
            data-testid='patient-journey-denied'
          >
            {t('panel.denied')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
