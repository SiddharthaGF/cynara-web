import type { JSX, ReactNode } from 'react';

import { Button, type buttonVariants } from '@/components/ui/button.tsx';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx';
import type { VariantProps } from 'class-variance-authority';

/**
 * Combine a `Button` with a shadcn `Tooltip` to replace the native
 * `title`-attribute tooltips that ship with the designer's icon-only buttons.
 * Renders only the tooltip wrapper when `label` is provided; the underlying
 * button keeps its `aria-label` for screen readers.
 */
interface TooltipIconButtonProps
  extends Omit<React.ComponentProps<typeof Button>, 'children'>,
    VariantProps<typeof buttonVariants> {
  /** Tooltip copy. Empty string disables the wrapper entirely. */
  label: string;
  /** Optional position override for the tooltip; defaults to top. */
  side?: 'top' | 'right' | 'bottom' | 'left';
  children: ReactNode;
}

export function TooltipIconButton({
  label,
  side = 'top',
  children,
  ...buttonProps
}: TooltipIconButtonProps): JSX.Element {
  if (!label) {
    return <Button {...buttonProps}>{children}</Button>;
  }
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            {...buttonProps}
            aria-label={buttonProps['aria-label'] ?? label}
          >
            {children}
          </Button>
        }
      />
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}
