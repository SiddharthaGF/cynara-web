import { CheckCircle2, CircleAlert, Info } from 'lucide-react';
import type { JSX, ReactNode } from 'react';

import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover.tsx';
import { cn } from '@/lib/utils.ts';

export type StatusPillVariant = 'error' | 'warning' | 'info' | 'success';

interface StatusPillProps {
  variant: StatusPillVariant;
  /** Short label shown on the pill. */
  summary: string;
  ariaLabel?: string;
  title?: string;
  /** When set, the popover renders a header with this title. */
  popoverTitle?: string;
  popoverDescription?: string;
  /** Extra classes for the popover panel (e.g. width). */
  contentClassName?: string;
  /** Applied to the pill button. */
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Optional popover body. Omit to render the pill without a popover. */
  children?: ReactNode;
}

const STATUS_PILL_ICONS: Record<StatusPillVariant, typeof Info> = {
  error: CircleAlert,
  warning: Info,
  info: Info,
  success: CheckCircle2,
};

const STATUS_PILL_CLASSES: Record<StatusPillVariant, string> = {
  error: 'border-destructive/30 text-destructive hover:bg-destructive/5',
  warning:
    'border-amber-500/30 text-amber-600 hover:bg-amber-500/5 dark:text-amber-400',
  info: 'border-sky-500/30 text-sky-600 hover:bg-sky-500/5 dark:text-sky-400',
  success:
    'border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5 dark:text-emerald-400',
};

const STATUS_PILL_ICON_CLASSES: Record<StatusPillVariant, string> = {
  error: 'text-destructive',
  warning: 'text-amber-500',
  info: 'text-sky-500',
  success: 'text-emerald-500',
};

/**
 * Compact floating status pill. Renders a clickable summary that may open a
 * popover with additional detail, mirroring the style used by the workflow
 * canvas validation indicator. Position it from the caller (e.g. inside a
 * `pointer-events-none` overlay so the pill stays interactive).
 */
export function StatusPill({
  variant,
  summary,
  ariaLabel,
  title,
  popoverTitle,
  popoverDescription,
  contentClassName,
  className,
  open,
  onOpenChange,
  children,
}: StatusPillProps): JSX.Element {
  const Icon = STATUS_PILL_ICONS[variant];
  const trigger = (
    <PopoverTrigger
      aria-label={ariaLabel}
      title={title}
      className={cn(
        'pointer-events-auto inline-flex items-center gap-1.5 rounded-full border bg-card/90 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm outline-none select-none transition-colors hover:bg-card focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
        STATUS_PILL_CLASSES[variant],
        className,
      )}
    >
      <Icon className='size-3.5' />
      <span>{summary}</span>
    </PopoverTrigger>
  );

  if (children !== undefined) {
    return (
      <Popover
        open={open}
        onOpenChange={onOpenChange}
      >
        {trigger}
        <PopoverContent
          align='center'
          className={cn('w-80 overflow-hidden p-0', contentClassName)}
        >
          {popoverTitle || popoverDescription ? (
            <PopoverHeader className='border-b border-border/60 px-3 py-2.5'>
              <PopoverTitle className='flex items-center gap-2 text-sm'>
                <Icon
                  className={cn('size-4', STATUS_PILL_ICON_CLASSES[variant])}
                />
                {popoverTitle}
              </PopoverTitle>
              {popoverDescription ? (
                <PopoverDescription>{popoverDescription}</PopoverDescription>
              ) : null}
            </PopoverHeader>
          ) : null}
          {children}
        </PopoverContent>
      </Popover>
    );
  }

  return trigger;
}
