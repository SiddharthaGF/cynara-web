import { Leaf } from 'lucide-react';
import type { JSX } from 'react';

import { cn } from '@/lib/utils.ts';

interface CynaraMarkProps {
  showWordmark?: boolean;
  className?: string;
}

/** Cynara brand mark — a single lucide leaf keeps the identity consistent. */
export function CynaraMark({
  showWordmark = false,
  className,
}: CynaraMarkProps): JSX.Element {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className='flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10'>
        <Leaf
          aria-hidden='true'
          className='size-4 text-primary'
          strokeWidth={2}
        />
      </span>
      {showWordmark ? (
        <span className='font-display text-xl font-semibold tracking-tight text-foreground'>
          Cynara
        </span>
      ) : null}
    </div>
  );
}
