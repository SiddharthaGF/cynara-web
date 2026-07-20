import { Monitor, RotateCcw, Smartphone } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils.ts';

import {
  DESKTOP_RESOLUTIONS,
  MOBILE_ORIENTATIONS,
  type DesktopResolution,
  type MobileOrientation,
} from './use-device-simulator.ts';

interface DesktopResolutionControlProps {
  value: DesktopResolution;
  onChange: (value: DesktopResolution) => void;
}

interface MobileOrientationControlProps {
  value: MobileOrientation;
  onChange: (value: MobileOrientation) => void;
  onToggle: () => void;
}

export function DesktopResolutionControl({
  value,
  onChange,
}: DesktopResolutionControlProps): JSX.Element {
  const { t } = useTranslation('designer');

  return (
    <div
      role='group'
      aria-label={t('formPreview.resolution.label')}
      className='device-simulator-control inline-flex items-center gap-1 rounded-full border border-border/55 bg-card/55 p-1 backdrop-blur-sm'
    >
      <span className='flex items-center gap-1 px-1.5 text-muted-foreground'>
        <Monitor className='size-3' strokeWidth={2} />
        <span className='hidden font-mono text-[9.5px] tracking-[0.14em] uppercase sm:inline'>
          {t('formPreview.resolution.shortLabel')}
        </span>
      </span>
      {DESKTOP_RESOLUTIONS.map((option) => {
        const isActive = option.id === value;
        return (
          <button
            key={option.id}
            type='button'
            onClick={() => {
              onChange(option.id);
            }}
            aria-pressed={isActive}
            className={cn(
              'rounded-full px-2.5 py-1 font-mono text-[10px] tracking-tight transition-colors',
              isActive
                ? 'bg-primary/15 text-primary shadow-[inset_0_0_0_1px_oklch(0.62_0.105_148/32%)]'
                : 'text-muted-foreground hover:text-foreground',
            )}
            title={`${option.width} × ${option.height}`}
          >
            {t(option.shortKey)}
          </button>
        );
      })}
    </div>
  );
}

export function MobileOrientationControl({
  value,
  onChange,
  onToggle,
}: MobileOrientationControlProps): JSX.Element {
  const { t } = useTranslation('designer');

  return (
    <div
      role='group'
      aria-label={t('formPreview.rotation.label')}
      className='device-simulator-control inline-flex items-center gap-1 rounded-full border border-border/55 bg-card/55 p-1 backdrop-blur-sm'
    >
      <span className='flex items-center gap-1 px-1.5 text-muted-foreground'>
        <Smartphone className='size-3' strokeWidth={2} />
        <span className='hidden font-mono text-[9.5px] tracking-[0.14em] uppercase sm:inline'>
          {t('formPreview.rotation.shortLabel')}
        </span>
      </span>
      <button
        type='button'
        onClick={onToggle}
        aria-label={t('formPreview.rotation.toggle')}
        title={t('formPreview.rotation.toggle')}
        className='flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground'
      >
        <RotateCcw
          className={cn(
            'size-3 transition-transform duration-500',
            value === 'landscape' ? 'rotate-90' : 'rotate-0',
          )}
          strokeWidth={2.25}
        />
      </button>
      <div
        className='inline-flex items-center rounded-full bg-background/60 p-0.5 shadow-[inset_0_0_0_1px_oklch(0.62_0.09_148/14%)]'
      >
        {MOBILE_ORIENTATIONS.map((option) => {
          const isActive = option.id === value;
          return (
            <button
              key={option.id}
              type='button'
              onClick={() => {
                onChange(option.id);
              }}
              aria-pressed={isActive}
              className={cn(
                'rounded-full px-2.5 py-0.5 font-mono text-[10px] tracking-tight transition-colors',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              title={`${option.width} × ${option.height}`}
            >
              {t(option.shortKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}