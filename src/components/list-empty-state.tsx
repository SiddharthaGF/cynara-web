import type { JSX, ReactNode } from 'react';

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty.tsx';
import { cn } from '@/lib/utils.ts';

interface ListEmptyStateProps {
  title: string;
  description: string;
  /** Caller-owned primary action, rendered only when the caller passes it (CASL stays with the caller). */
  action?: ReactNode;
  /** Optional contextual help shown below the action. */
  helpText?: string;
  /** Compact density for dashboard rows. */
  compact?: boolean;
}

/**
 * Shared list empty state: title, short description, an optional real
 * next action, and optional contextual help. Never text-only by design;
 * callers without a permitted action pass helpText instead.
 */
export function ListEmptyState({
  title,
  description,
  action,
  helpText,
  compact = false,
}: ListEmptyStateProps): JSX.Element {
  return (
    <Empty
      className={cn(
        'rounded-xl border border-dashed border-border/70 bg-muted/20 px-6',
        compact ? 'min-h-32 py-6' : 'min-h-40 px-6 py-10',
      )}
    >
      <EmptyHeader>
        <EmptyTitle className={compact ? undefined : 'text-lg'}>
          {title}
        </EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {(action ?? helpText) ? (
        <EmptyContent>
          {action}
          {helpText ? (
            <p className='text-xs text-muted-foreground'>{helpText}</p>
          ) : null}
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
