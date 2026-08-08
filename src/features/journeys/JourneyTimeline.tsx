import type { TFunction } from 'i18next';
import {
  ArrowRight,
  CircleCheck,
  CirclePlay,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import type { JourneyHistoryEvent, PatientJourney } from '@/api/pipelines.ts';

import {
  formatJourneyDateTime,
  journeyNodeLabel,
  parseHistoryMetadata,
} from './journeyForm.ts';

interface JourneyTimelineProps {
  journey: PatientJourney;
  language: string;
}

/**
 * Immutable progression timeline of a pipeline: every node visit, transition,
 * actor, and timestamp recorded since the pipeline started. Events are
 * rendered in append order (sequence).
 */
export function JourneyTimeline({
  journey,
  language,
}: JourneyTimelineProps): JSX.Element {
  const { t } = useTranslation('journeys');

  if (journey.history.length === 0) {
    return (
      <p className='rounded-lg border border-dashed border-border/70 px-3 py-4 text-xs text-muted-foreground'>
        {t('timeline.empty')}
      </p>
    );
  }

  return (
    <ol
      className='space-y-0'
      data-testid='journey-timeline'
    >
      {journey.history.map((event, index) => (
        <TimelineEvent
          key={event.id}
          event={event}
          journey={journey}
          language={language}
          isLast={index === journey.history.length - 1}
        />
      ))}
    </ol>
  );
}

function TimelineEvent({
  event,
  journey,
  language,
  isLast,
}: {
  event: JourneyHistoryEvent;
  journey: PatientJourney;
  language: string;
  isLast: boolean;
}): JSX.Element {
  const { t } = useTranslation('journeys');
  const meta = parseHistoryMetadata(event);
  const Icon = timelineIcon(event.action);

  const label = timelineEventLabel(event, meta, journey, t);
  const transitionLabel = meta.edgeLabel?.trim() ?? null;

  return (
    <li className='relative flex gap-3 pb-4 last:pb-0'>
      {isLast ? null : (
        <span
          aria-hidden='true'
          className='absolute top-7 bottom-0 left-3.5 w-px bg-border/70'
        />
      )}
      <span className='mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-border/70 bg-card'>
        <Icon className='size-3.5 text-muted-foreground' />
      </span>
      <div className='min-w-0 flex-1'>
        <p className='text-sm font-medium'>{label}</p>
        {transitionLabel ? (
          <p className='text-xs text-muted-foreground'>
            {t('timeline.via', { label: transitionLabel })}
          </p>
        ) : null}
        {meta.reason?.trim() ? (
          <p className='mt-0.5 text-xs text-muted-foreground'>
            <span className='font-medium'>{t('timeline.reason')}:</span>{' '}
            {meta.reason.trim()}
          </p>
        ) : null}
        <p className='mt-0.5 text-xs text-muted-foreground'>
          {formatJourneyDateTime(event.occurredAt, language)}
        </p>
      </div>
    </li>
  );
}

function timelineEventLabel(
  event: JourneyHistoryEvent,
  meta: ReturnType<typeof parseHistoryMetadata>,
  journey: PatientJourney,
  t: TFunction,
): string {
  if (event.action === 'pipeline.advanced' && meta.toNodeId) {
    return t('timeline.event_pipeline.advanced', {
      node: journeyNodeLabel(journey, meta.toNodeId, t),
    });
  }
  const key = `timeline.event_${event.action}`;
  return t(key, { defaultValue: t('timeline.event_unknown') });
}

function timelineIcon(action: string): typeof CirclePlay {
  switch (action) {
    case 'pipeline.started': {
      return CirclePlay;
    }
    case 'pipeline.advanced': {
      return ArrowRight;
    }
    case 'pipeline.completed': {
      return CircleCheck;
    }
    case 'pipeline.canceled': {
      return RotateCcw;
    }
    case 'pipeline.entered-in-error': {
      return ShieldAlert;
    }
    default: {
      return CirclePlay;
    }
  }
}
