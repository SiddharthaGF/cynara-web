import { Link } from '@tanstack/react-router';
import { ChevronDown, ChevronRight, Workflow } from 'lucide-react';
import { useState, type JSX, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import type { PatientJourney } from '@/api/pipelines.ts';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible.tsx';
import { cn } from '@/lib/utils.ts';

import {
  formatJourneyDateTime,
  formatJourneyStatus,
  isTerminalJourney,
  journeyNextNodeLabel,
  journeyNodeLabel,
  journeyStatusBadgeVariant,
} from './journeyForm.ts';
import { JourneyGraphSnapshot } from './JourneyGraphSnapshot.tsx';
import { JourneyTimeline } from './JourneyTimeline.tsx';

interface JourneyCardProps {
  journey: PatientJourney;
  patientId: string;
  locale: string;
  language: string;
}

/**
 * One journey in the patient's care-path history, presented as a care plan:
 * the current and next step up front, the chronological history in clinical
 * language, and the pinned workflow diagram behind an "advanced" collapsible.
 */
export function JourneyCard({
  journey,
  patientId,
  locale,
  language,
}: JourneyCardProps): JSX.Element {
  const { t } = useTranslation('journeys');
  const [expanded, setExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const terminal = isTerminalJourney(journey.status);
  const nextStep = journeyNextNodeLabel(journey, t);

  return (
    <article
      className={cn(
        'overflow-hidden rounded-xl border border-border/70',
        terminal && 'bg-muted/20',
      )}
      data-status={journey.status}
      data-terminal={terminal ? 'true' : 'false'}
    >
      <button
        type='button'
        className='flex w-full items-center justify-between gap-3 px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring'
        aria-expanded={expanded}
        onClick={() => {
          setExpanded((value) => !value);
        }}
      >
        <div className='min-w-0 space-y-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='inline-flex items-center gap-1.5 font-medium'>
              <Workflow className='size-3.5 text-muted-foreground' />
              {t('card.carePath')}
            </span>
            <Badge variant={journeyStatusBadgeVariant(journey.status)}>
              {formatJourneyStatus(journey.status, t)}
            </Badge>
            <span className='text-xs text-muted-foreground'>
              {t('card.version', {
                version: journey.workflowVersion || t('card.versionUnknown'),
              })}
            </span>
          </div>
          <p className='text-sm'>
            {t(terminal ? 'card.finalStep' : 'card.currentStep')}:{' '}
            <span className='font-medium'>
              {journeyNodeLabel(journey, journey.currentNodeId, t)}
            </span>
            {!terminal && nextStep ? (
              <span className='text-muted-foreground'>
                {' '}
                · {t('card.nextStep')}:{' '}
                <span className='font-medium text-foreground'>{nextStep}</span>
              </span>
            ) : null}
          </p>
          <p className='text-xs text-muted-foreground'>
            {t('card.startedAt')}:{' '}
            {formatJourneyDateTime(journey.startedAt, language)}
            {journey.endedAt
              ? ` · ${t('card.endedAt')}: ${formatJourneyDateTime(journey.endedAt, language)}`
              : null}
          </p>
        </div>
        {expanded ? (
          <ChevronDown className='size-4 shrink-0 text-muted-foreground' />
        ) : (
          <ChevronRight className='size-4 shrink-0 text-muted-foreground' />
        )}
      </button>

      {expanded ? (
        <div className='space-y-5 border-t border-border/60 px-4 py-4'>
          <dl className='grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2'>
            <JourneyField label={t('card.subject')}>
              {journey.subjectType === 'encounter' && journey.encounterId ? (
                <span className='inline-flex flex-wrap items-center gap-2'>
                  <span className='font-medium'>
                    {t('card.subjectEncounter')}
                  </span>
                  <Link
                    to='/$locale/patients/$id/encounters/$encounterId'
                    params={{
                      locale,
                      id: patientId,
                      encounterId: journey.encounterId,
                    }}
                  >
                    <Button
                      variant='outline'
                      size='sm'
                    >
                      {t('card.openEncounter')}
                    </Button>
                  </Link>
                </span>
              ) : (
                <span className='font-medium'>{t('card.subjectPatient')}</span>
              )}
            </JourneyField>
            <JourneyField label={t('card.endedAt')}>
              <span className='font-medium'>
                {formatJourneyDateTime(journey.endedAt, language)}
              </span>
            </JourneyField>
          </dl>

          <section>
            <h4 className='mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase'>
              {t('timeline.title')}
            </h4>
            <JourneyTimeline
              journey={journey}
              language={language}
            />
          </section>

          <Collapsible
            open={showDetails}
            onOpenChange={setShowDetails}
            className='border-t border-border/60 pt-3'
          >
            <CollapsibleTrigger
              className='flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs font-medium text-muted-foreground transition-colors outline-none select-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 data-open:text-foreground'
              aria-label={t('details.title')}
            >
              <span>{t('details.title')}</span>
              <ChevronDown
                className={cn(
                  'size-3.5 shrink-0 transition-transform duration-150',
                  showDetails && 'rotate-180',
                )}
                aria-hidden='true'
              />
            </CollapsibleTrigger>
            <CollapsibleContent className='data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0'>
              <div className='space-y-5 pt-3'>
                <dl className='grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2'>
                  <JourneyField label={t('details.workflow')}>
                    <code className='font-mono text-xs'>
                      {journey.workflowCode}
                    </code>
                  </JourneyField>
                  <JourneyField label={t('details.version')}>
                    <span className='font-medium'>
                      {journey.workflowVersion || t('card.versionUnknown')}
                    </span>
                  </JourneyField>
                  <JourneyField label={t('details.schemaVersion')}>
                    <code className='font-mono text-xs'>
                      {journey.workflowSchemaVersion}
                    </code>
                  </JourneyField>
                </dl>

                <section>
                  <h4 className='mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase'>
                    {t('snapshot.title')}
                  </h4>
                  <JourneyGraphSnapshot
                    journey={journey}
                    language={language}
                  />
                </section>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      ) : null}
    </article>
  );
}

function JourneyField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div>
      <dt className='text-xs text-muted-foreground'>{label}</dt>
      <dd className='mt-0.5'>{children}</dd>
    </div>
  );
}
