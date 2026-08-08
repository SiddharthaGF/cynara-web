import type { ComponentProps, JSX } from 'react';

import { cn } from '@/lib/utils';

export function BaseNode({
  className,
  ...props
}: ComponentProps<'div'>): JSX.Element {
  return (
    <div
      className={cn(
        'bg-card text-card-foreground relative rounded-md border',
        'hover:ring-1',
        // React Flow renders nodes inside `.react-flow__node` wrappers. When a
        // Node is selected, the wrapper gets the `selected` class, which this
        // Component styles below.
        'in-[.selected]:border-muted-foreground',
        'in-[.selected]:shadow-lg',
        className,
      )}
      tabIndex={0}
      {...props}
    />
  );
}

/**
 * A container for a consistent header layout intended to be used inside the
 * `<BaseNode />` component.
 */
export function BaseNodeHeader({
  className,
  ...props
}: ComponentProps<'header'>): JSX.Element {
  return (
    <header
      {...props}
      className={cn(
        'mx-0 my-0 -mb-1 flex flex-row items-center justify-between gap-2 px-3 py-2',
        // Remove or modify these classes if you modify the padding in the
        // `<BaseNode />` component.
        className,
      )}
    />
  );
}

export function BaseNodeContent({
  className,
  ...props
}: ComponentProps<'div'>): JSX.Element {
  return (
    <div
      data-slot='base-node-content'
      className={cn('flex flex-col gap-y-2 p-3', className)}
      {...props}
    />
  );
}
