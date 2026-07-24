import type { JSX, ReactNode } from 'react';

import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import { cn } from '@/lib/utils.ts';

interface FrameScrollAreaProps {
  children: ReactNode;
  className?: string;
}

export function FrameScrollArea({
  children,
  className,
}: FrameScrollAreaProps): JSX.Element {
  return (
    <div className={cn('min-h-0 flex-1 overflow-hidden', className)}>
      <ScrollArea className='h-full'>{children}</ScrollArea>
    </div>
  );
}
