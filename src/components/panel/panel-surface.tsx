import type { ComponentProps, JSX } from 'react';

import { cn } from '@/lib/utils.ts';

export const PANEL_RAIL_CLASSNAME =
  'flex h-full min-h-0 shrink-0 flex-col border-l border-border/60 bg-card';

export const PANEL_SHEET_CLASSNAME =
  'inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-2xl border-t p-0';

export function PanelSurface({
  className,
  ...props
}: ComponentProps<'aside'>): JSX.Element {
  return (
    <aside
      className={cn(PANEL_RAIL_CLASSNAME, className)}
      {...props}
    />
  );
}
