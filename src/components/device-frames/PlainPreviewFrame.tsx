import type { JSX, ReactNode } from 'react';

import { cn } from '@/lib/utils.ts';

import { FrameScrollArea } from './FrameScrollArea.tsx';

interface PlainPreviewFrameProps {
  children: ReactNode;
  className?: string;
}

export function PlainPreviewFrame({
  children,
  className,
}: PlainPreviewFrameProps): JSX.Element {
  return (
    <FrameScrollArea className={cn('min-h-0 flex-1', className)}>
      <div className='@container/preview p-4 md:p-6'>{children}</div>
    </FrameScrollArea>
  );
}
