import type { JSX } from 'react';

import { cn } from '@/lib/utils.ts';

export interface ProgressProps
  extends Omit<React.ComponentPropsWithoutRef<'div'>, 'value'> {
  /** Current value (0..max). */
  value?: number;
  /** Max value (defaults to 100). */
  max?: number;
  /** Render as a moving stripe instead of a static fill. */
  indeterminate?: boolean;
  /** Optional accessible label. Falls back to "Loading". */
  'aria-label'?: string;
}

/**
 * Lightweight progress indicator with two modes:
 *  - Determinate: a filled bar with `value` / `max`.
 *  - Indeterminate: an animated stripe pattern that loops, used when we
 *    Don't know how long the underlying operation will take (e.g. waiting
 *    for an AI stream to produce its draft patch).
 *
 * We intentionally do not pull in `@radix-ui/react-progress` to keep the
 * dependency footprint small; styling is driven by plain Tailwind utilities
 * Plus the global theme tokens.
 */
export function Progress({
  className,
  value,
  max = 100,
  indeterminate = false,
  'aria-label': ariaLabel = 'Loading',
  ...rest
}: ProgressProps): JSX.Element {
  const clampedValue =
    typeof value === 'number' ? Math.max(0, Math.min(value, max)) : 0;
  const percent = indeterminate ? 0 : (clampedValue / max) * 100;

  return (
    <div
      role='progressbar'
      aria-label={ariaLabel}
      aria-valuemin={indeterminate ? undefined : 0}
      aria-valuemax={indeterminate ? undefined : max}
      aria-valuenow={indeterminate ? undefined : clampedValue}
      aria-busy={indeterminate || undefined}
      data-state={indeterminate ? 'indeterminate' : 'determinate'}
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-muted',
        className,
      )}
      {...rest}
    >
      <div
        className={cn(
          'h-full rounded-full bg-primary transition-[width] duration-300 ease-out',
          indeterminate &&
            'w-1/3 animate-[progress-indeterminate_1.2s_ease-in-out_infinite]',
        )}
        style={
          indeterminate
            ? undefined
            : { width: `${Math.max(0, Math.min(100, percent))}%` }
        }
      />
    </div>
  );
}
