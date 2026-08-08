import { Handle, type HandleProps } from '@xyflow/react';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export type BaseHandleProps = HandleProps;

export function BaseHandle({
  className,
  children,
  ...props
}: ComponentProps<typeof Handle>) {
  return (
    <Handle
      {...props}
      className={cn(
        'size-3 rounded-full border border-border bg-background transition dark:bg-card',
        className,
      )}
    >
      {children}
    </Handle>
  );
}
