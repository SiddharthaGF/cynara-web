import {
  ChevronLeft,
  ChevronRight,
  Lock,
  PanelLeft,
  Plus,
  Share,
  SquareStack,
} from 'lucide-react';
import { useRef, type JSX, type ReactNode } from 'react';

import { cn } from '@/lib/utils.ts';

import { DeviceAppChrome } from './DeviceAppChrome.tsx';
import type { DesktopResolutionSpec } from './use-device-simulator.ts';
import { useFitScale } from './use-fit-scale.ts';

interface SafariBrowserFrameProps {
  children: ReactNode;
  className?: string;
  address?: string;
  contextLabel?: string;
  resolution?: DesktopResolutionSpec;
}

function TrafficLights(): JSX.Element {
  return (
    <div className='flex items-center gap-[0.4rem]'>
      <span className='size-[0.68rem] rounded-full bg-[#FF5F57] shadow-[inset_0_0_0_1px_oklch(0_0_0/12%)]' />
      <span className='size-[0.68rem] rounded-full bg-[#FEBC2E] shadow-[inset_0_0_0_1px_oklch(0_0_0/10%)]' />
      <span className='size-[0.68rem] rounded-full bg-[#28C840] shadow-[inset_0_0_0_1px_oklch(0_0_0/10%)]' />
    </div>
  );
}

export function SafariBrowserFrame({
  children,
  className,
  address = 'forms.cynara.app/preview',
  contextLabel,
  resolution,
}: SafariBrowserFrameProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const width = resolution?.width ?? 1440;
  const height = resolution?.height ?? 900;
  const scale = useFitScale(containerRef, {
    width,
    height,
    padding: 8,
  });

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex h-full min-h-0 items-center justify-center overflow-hidden py-1',
        className,
      )}
    >
      <div
        className={cn(
          'device-safari flex shrink-0 flex-col overflow-hidden rounded-xl bg-[oklch(0.97_0.004_260)] shadow-[0_24px_48px_-28px_oklch(0.22_0.02_260/40%)]',
          'dark:bg-[oklch(0.24_0.008_260)] dark:shadow-[0_28px_56px_-32px_oklch(0_0_0/62%)]',
        )}
        style={{
          width,
          height,
          zoom: scale,
        }}
      >
        <div
          aria-hidden
          className='flex h-11 shrink-0 items-center gap-2 border-b border-[oklch(0.82_0.008_260/70%)] bg-[oklch(0.945_0.006_260)] px-3 dark:border-[oklch(0.32_0.008_260/80%)] dark:bg-[oklch(0.28_0.008_260)]'
        >
          <TrafficLights />

          <span className='inline-flex size-7 shrink-0 items-center justify-center rounded-md text-[oklch(0.52_0.01_260/75%)] dark:text-[oklch(0.78_0.008_260/70%)]'>
            <PanelLeft className='size-3.5 stroke-[1.75]' />
          </span>

          <div className='flex items-center gap-0.5 text-[oklch(0.52_0.01_260/70%)] dark:text-[oklch(0.78_0.008_260/65%)]'>
            <ChevronLeft className='size-3.5 stroke-[2]' />
            <ChevronRight className='size-3.5 stroke-[2]' />
          </div>

          <div className='mx-1 flex min-w-0 flex-1 items-center gap-1.5 rounded-full border border-[oklch(0.86_0.006_260/90%)] bg-[oklch(0.995_0.002_260)] px-3 py-1 shadow-[inset_0_1px_0_oklch(1_0_0/65%)] dark:border-[oklch(0.36_0.008_260/90%)] dark:bg-[oklch(0.2_0.008_260)] dark:shadow-[inset_0_1px_0_oklch(1_0_0/4%)]'>
            <Lock className='size-2.5 shrink-0 stroke-[2.25] text-[oklch(0.58_0.01_260/80%)] dark:text-[oklch(0.72_0.008_260/75%)]' />
            <span className='truncate font-sans text-[11px] tracking-[0.01em] text-[oklch(0.42_0.012_260/90%)] dark:text-[oklch(0.82_0.008_260/88%)]'>
              {address}
            </span>
          </div>

          <div className='flex shrink-0 items-center gap-1 text-[oklch(0.52_0.01_260/75%)] dark:text-[oklch(0.78_0.008_260/70%)]'>
            <Share className='size-3 stroke-[2]' />
            <Plus className='size-3.5 stroke-[2]' />
            <SquareStack className='size-3.5 stroke-[1.75]' />
          </div>
        </div>

        <DeviceAppChrome
          kind='desktop'
          contextLabel={contextLabel}
          className='min-h-0 flex-1 overflow-hidden'
        >
          <div className='@container/preview bg-background p-6'>{children}</div>
        </DeviceAppChrome>
      </div>
    </div>
  );
}
