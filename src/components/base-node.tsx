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
        // React Flow's `.react-flow__node` wrapper carries the `selected` class, styled below.
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
        // Keep in sync with `<BaseNode />` padding.
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
