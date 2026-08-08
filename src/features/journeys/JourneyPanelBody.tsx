import type { JSX, ReactNode } from 'react';

import type { PatientJourney } from '@/api/pipelines.ts';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';

import { JourneyCard } from './JourneyCard.tsx';

interface JourneyPanelBodyProps {
  journeys: PatientJourney[];
  isLoading: boolean;
  error: string | null;
  isForbidden: boolean;
  emptyTitle: string;
  emptyDescription: string;
  /** Optional concrete action rendered inside the empty state. */
  emptyAction?: ReactNode;
  forbiddenMessage: string;
  patientId: string;
  locale: string;
  language: string;
  listTestId: string;
  forbiddenTestId: string;
  emptyTestId: string;
}

/**
 * Shared body for the journey panels: loading skeletons, forbidden/error
 * alerts, the empty state, and the journey card list. The patient and
 * encounter panels differ only in copy and query scope.
 */
export function JourneyPanelBody({
  journeys,
  isLoading,
  error,
  isForbidden,
  emptyTitle,
  emptyDescription,
  emptyAction,
  forbiddenMessage,
  patientId,
  locale,
  language,
  listTestId,
  forbiddenTestId,
  emptyTestId,
}: JourneyPanelBodyProps): JSX.Element {
  return (
    <div className='space-y-3'>
      {isForbidden ? (
        <Alert
          variant='destructive'
          data-testid={forbiddenTestId}
        >
          <AlertDescription>{forbiddenMessage}</AlertDescription>
        </Alert>
      ) : null}

      {!isForbidden && error ? (
        <Alert
          variant='destructive'
          data-testid='journey-list-error'
        >
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <div className='space-y-3'>
          <Skeleton className='h-16 w-full' />
          <Skeleton className='h-16 w-full' />
        </div>
      ) : null}

      {!isLoading && !isForbidden && !error && journeys.length === 0 ? (
        <Empty
          className='min-h-36 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-8'
          data-testid={emptyTestId}
        >
          <EmptyHeader>
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            <EmptyDescription>{emptyDescription}</EmptyDescription>
          </EmptyHeader>
          {emptyAction ? <div className='mt-4'>{emptyAction}</div> : null}
        </Empty>
      ) : null}

      {!isLoading && journeys.length > 0 ? (
        <div
          className='space-y-3'
          data-testid={listTestId}
        >
          {journeys.map((journey) => (
            <JourneyCard
              key={journey.pipelineId}
              journey={journey}
              patientId={patientId}
              locale={locale}
              language={language}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
