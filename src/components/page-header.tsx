import type { JSX, ReactNode } from 'react';

import { cn } from '@/lib/utils.ts';

interface PageHeaderProps {
  title: ReactNode;
  /** Short context line shown under the title. Only when it adds context. */
  subtitle?: ReactNode;
  /** Right-aligned action slot (primary/secondary actions, badges, count). */
  actions?: ReactNode;
  className?: string;
}

/**
 * Functional page header shared across workspace screens: a scannable title,
 * an optional subtitle that adds context, and a right-aligned action slot.
 * Deliberately keeps type at application scale (text-2xl/3xl) with no
 * decorative kicker or oversized hero type.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: PageHeaderProps): JSX.Element {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className='min-w-0'>
        <h1 className='font-display text-balance text-2xl font-semibold tracking-tight md:text-3xl'>
          {title}
        </h1>
        {subtitle ? (
          <p className='mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground'>
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className='flex shrink-0 flex-wrap items-center gap-2'>
          {actions}
        </div>
      ) : null}
    </header>
  );
}
