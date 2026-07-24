import type { JSX, ReactNode } from 'react';

import { Button } from '@/components/ui/button.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import { cn } from '@/lib/utils.ts';

type StatusStateKind = 'loading' | 'error';

interface StatusStateProps {
  kind: StatusStateKind;
  title: ReactNode;
  description?: ReactNode;
  actionLabel?: ReactNode;
  onAction?: () => void;
  className?: string;
}

export function StatusState({
  kind,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: StatusStateProps): JSX.Element {
  const isLoading = kind === 'loading';

  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 items-center justify-center px-6 py-10',
        className,
      )}
      role={isLoading ? 'status' : 'alert'}
      aria-live={isLoading ? 'polite' : undefined}
    >
      <div className='flex max-w-sm flex-col items-center gap-3 text-center'>
        {isLoading ? <Spinner className='size-7 text-primary' /> : null}
        <div className='grid gap-1'>
          <p className='font-heading text-sm font-medium'>{title}</p>
          {description ? (
            <p className='text-sm text-muted-foreground'>{description}</p>
          ) : null}
        </div>
        {actionLabel && onAction ? (
          <Button
            type='button'
            size='sm'
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
