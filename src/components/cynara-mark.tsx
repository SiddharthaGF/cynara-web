import type { JSX, SVGProps } from 'react';

import { cn } from '@/lib/utils.ts';

interface CynaraMarkProps extends SVGProps<SVGSVGElement> {
  showWordmark?: boolean;
  className?: string;
}

/** Botanical mark — stylized artichoke leaf cluster for Cynara identity */
export function CynaraMark({
  showWordmark = false,
  className,
  ...props
}: CynaraMarkProps): JSX.Element {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <svg
        viewBox='0 0 32 32'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
        aria-hidden='true'
        className='size-8 shrink-0'
        {...props}
      >
        <circle
          cx='16'
          cy='16'
          r='15'
          className='fill-primary/10 stroke-primary/30'
          strokeWidth='1'
        />
        <path
          d='M16 8c-2 4-6 6-6 10a6 6 0 0 0 12 0c0-4-4-6-6-10Z'
          className='fill-primary'
        />
        <path
          d='M16 8c2 4 6 6 6 10'
          className='stroke-accent'
          strokeWidth='1.5'
          strokeLinecap='round'
        />
        <path
          d='M16 8c-1 4-3 6-3 10M16 8c1 4 3 6 3 10'
          className='stroke-primary/50'
          strokeWidth='1'
          strokeLinecap='round'
        />
        <circle
          cx='16'
          cy='19'
          r='2'
          className='fill-accent'
        />
      </svg>
      {showWordmark ? (
        <span className='font-display text-xl font-semibold tracking-tight text-foreground'>
          Cynara
        </span>
      ) : null}
    </div>
  );
}
