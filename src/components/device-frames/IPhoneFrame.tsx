import { useRef, type JSX, type ReactNode } from 'react';

import { cn } from '@/lib/utils.ts';

import { DeviceAppChrome } from './DeviceAppChrome.tsx';
import { useFitScale } from './use-fit-scale.ts';
import type { MobileOrientationSpec } from './use-device-simulator.ts';

interface IPhoneFrameProps {
  children: ReactNode;
  className?: string;
  /** Form code shown in the simulated mobile header. */
  contextLabel?: string;
  /** Logical viewport for the simulated phone. Defaults to iPhone 15 portrait. */
  orientation?: MobileOrientationSpec;
}

function StatusBar({ isLandscape }: { isLandscape: boolean }): JSX.Element {
  return (
    <div
      className={cn(
        'relative z-10 flex h-11 shrink-0 items-end justify-between px-6 pb-1.5',
        isLandscape && 'h-7 px-4 pb-0.5',
      )}
    >
      <span
        className={cn(
          'font-sans font-semibold tracking-[-0.02em] text-foreground/90',
          isLandscape ? 'text-[10px]' : 'text-[11px]',
        )}
      >
        9:41
      </span>

      <div className='flex items-center gap-[0.35rem] text-foreground/85'>
        <SignalBars />
        <WifiIcon />
        <BatteryIcon />
      </div>
    </div>
  );
}

function SignalBars(): JSX.Element {
  return (
    <svg
      aria-hidden
      viewBox='0 0 18 12'
      className='h-2.5 w-[1.1rem]'
      fill='currentColor'
    >
      <rect
        x='0'
        y='8'
        width='3'
        height='4'
        rx='0.5'
      />
      <rect
        x='5'
        y='5.5'
        width='3'
        height='6.5'
        rx='0.5'
      />
      <rect
        x='10'
        y='3'
        width='3'
        height='9'
        rx='0.5'
      />
      <rect
        x='15'
        y='0'
        width='3'
        height='12'
        rx='0.5'
      />
    </svg>
  );
}

function WifiIcon(): JSX.Element {
  return (
    <svg
      aria-hidden
      viewBox='0 0 16 12'
      className='h-2.5 w-3'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.4'
      strokeLinecap='round'
    >
      <path d='M1 4.5c4-3.5 10-3.5 14 0' />
      <path d='M3.5 7c2.5-2 7-2 9.5 0' />
      <path d='M6 9.5c1.2-.9 2.8-.9 4 0' />
      <circle
        cx='8'
        cy='11'
        r='0.75'
        fill='currentColor'
        stroke='none'
      />
    </svg>
  );
}

function BatteryIcon(): JSX.Element {
  return (
    <svg
      aria-hidden
      viewBox='0 0 26 12'
      className='h-2.5 w-[1.65rem]'
      fill='none'
      stroke='currentColor'
    >
      <rect
        x='0.5'
        y='0.5'
        width='21'
        height='11'
        rx='2.5'
        strokeWidth='1'
      />
      <rect
        x='2.5'
        y='2.5'
        width='16'
        height='7'
        rx='1.25'
        fill='currentColor'
        stroke='none'
      />
      <path
        d='M23 4.5v3'
        strokeWidth='1.2'
        strokeLinecap='round'
      />
    </svg>
  );
}

export function IPhoneFrame({
  children,
  className,
  contextLabel,
  orientation,
}: IPhoneFrameProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const width = orientation?.width ?? 390;
  const height = orientation?.height ?? 844;
  const isLandscape = width > height;
  const scale = useFitScale(containerRef, {
    width,
    height,
    padding: 8,
    boost: isLandscape ? 0.95 : 1.05,
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
          'device-iphone device-iphone--orient relative flex shrink-0 flex-col overflow-hidden rounded-[2.75rem] p-[0.42rem]',
          isLandscape && 'rounded-[2rem]',
          'bg-[linear-gradient(145deg,oklch(0.34_0.008_260)_0%,oklch(0.22_0.006_260)_48%,oklch(0.16_0.004_260)_100%)]',
          'shadow-[inset_0_1px_0_oklch(0.55_0.01_260/35%),0_28px_56px_-24px_oklch(0_0_0/55%)]',
          'transition-[width,height] duration-500 ease-out',
        )}
        style={{
          width,
          height,
          zoom: scale,
        }}
      >
        {isLandscape ? (
          <>
            <span
              aria-hidden
              className='pointer-events-none absolute -top-[0.08rem] left-[18%] h-[0.18rem] w-8 rounded-full bg-[oklch(0.28_0.006_260)] shadow-[inset_0_1px_0_oklch(0.42_0.008_260/40%)]'
            />
            <span
              aria-hidden
              className='pointer-events-none absolute -top-[0.08rem] left-[28%] h-[0.18rem] w-14 rounded-full bg-[oklch(0.28_0.006_260)] shadow-[inset_0_1px_0_oklch(0.42_0.008_260/40%)]'
            />
          </>
        ) : (
          <>
            <span
              aria-hidden
              className='pointer-events-none absolute inset-y-[18%] -left-[0.08rem] w-[0.18rem] rounded-full bg-[oklch(0.28_0.006_260)] shadow-[inset_0_1px_0_oklch(0.42_0.008_260/40%)]'
            />
            <span
              aria-hidden
              className='pointer-events-none absolute top-[22%] -right-[0.08rem] h-8 w-[0.18rem] rounded-full bg-[oklch(0.28_0.006_260)] shadow-[inset_0_1px_0_oklch(0.42_0.008_260/40%)]'
            />
            <span
              aria-hidden
              className='pointer-events-none absolute top-[34%] -right-[0.08rem] h-14 w-[0.18rem] rounded-full bg-[oklch(0.28_0.006_260)] shadow-[inset_0_1px_0_oklch(0.42_0.008_260/40%)]'
            />
          </>
        )}

        <div className='relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2.35rem] bg-background'>
          {isLandscape ? (
            <div
              aria-hidden
              className='pointer-events-none absolute left-1/2 top-[0.45rem] z-20 h-[0.9rem] w-[3.6rem] -translate-x-1/2 rounded-full bg-[oklch(0.08_0_0)] shadow-[inset_0_0_0_1px_oklch(0.18_0_0/80%)]'
            />
          ) : (
            <div
              aria-hidden
              className='pointer-events-none absolute left-1/2 top-[0.55rem] z-20 h-[1.35rem] w-[5.65rem] -translate-x-1/2 rounded-full bg-[oklch(0.08_0_0)] shadow-[inset_0_0_0_1px_oklch(0.18_0_0/80%)]'
            />
          )}

          <StatusBar isLandscape={isLandscape} />

          <DeviceAppChrome
            kind='mobile'
            contextLabel={contextLabel}
            className='flex min-h-0 flex-1 flex-col overflow-hidden'
          >
            <div className='@container/preview px-3.5 pb-6 pt-1'>{children}</div>
          </DeviceAppChrome>

          {isLandscape ? null : (
            <div
              aria-hidden
              className='pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-center'
            >
              <span className='h-[0.22rem] w-28 rounded-full bg-foreground/25' />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}