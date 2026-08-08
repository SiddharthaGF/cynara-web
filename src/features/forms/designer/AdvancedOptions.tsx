import { ChevronDown } from 'lucide-react';
import type { JSX, ReactNode } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible.tsx';
import { cn } from '@/lib/utils.ts';

interface AdvancedOptionsProps {
  /** Accessible label of the disclosure group. */
  title: string;
  children: ReactNode;
  className?: string;
}

/**
 * Progressive disclosure group for the field inspector: less common options
 * are hidden behind a chevron trigger instead of always occupying space.
 */
export function AdvancedOptions({
  title,
  children,
  className,
}: AdvancedOptionsProps): JSX.Element {
  const { t } = useTranslation('designer');
  const [open, setOpen] = useState(false);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className='border-t border-border/60 pt-3'
    >
      <CollapsibleTrigger
        className='flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs font-medium text-muted-foreground transition-colors outline-none select-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 data-open:text-foreground'
        aria-label={t('inspector.advancedOptions')}
      >
        <span>{title}</span>
        <ChevronDown
          className={cn(
            'size-3.5 shrink-0 transition-transform duration-150',
            open && 'rotate-180',
          )}
          aria-hidden='true'
        />
      </CollapsibleTrigger>
      <CollapsibleContent className='data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0'>
        <div className={cn('grid gap-4 px-2 pt-3', className)}>{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
