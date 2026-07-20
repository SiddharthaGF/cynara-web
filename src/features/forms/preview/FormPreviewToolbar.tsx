import { Monitor, RotateCcw, ShieldCheck, Smartphone, Square } from 'lucide-react';
import type { JSX, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import {
  IPhoneFrame,
  PlainPreviewFrame,
  SafariBrowserFrame,
  getDesktopResolution,
  getMobileOrientation,
  type DesktopResolution,
  type MobileOrientation,
} from '@/components/device-frames/index.ts';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';

type PreviewViewport = 'desktop' | 'mobile' | 'plain';

type PreviewViewportToggleMode = 'compact' | 'bar';

interface PreviewViewportToggleProps {
  value: PreviewViewport;
  onChange: (value: PreviewViewport) => void;
  mode?: PreviewViewportToggleMode;
}

const viewportOptions = [
  { value: 'plain' as const, icon: Square, labelKey: 'formPreview.viewportPlainShort' },
  { value: 'desktop' as const, icon: Monitor, labelKey: 'formPreview.viewportDesktopShort' },
  { value: 'mobile' as const, icon: Smartphone, labelKey: 'formPreview.viewportMobileShort' },
];

function viewportLabel(value: PreviewViewport): string {
  if (value === 'plain') {
    return 'formPreview.viewportPlain';
  }
  if (value === 'desktop') {
    return 'formPreview.viewportDesktop';
  }
  return 'formPreview.viewportMobile';
}

export function PreviewViewportToggle({
  value,
  onChange,
  mode = 'compact',
}: PreviewViewportToggleProps): JSX.Element {
  const { t } = useTranslation('designer');

  if (mode === 'bar') {
    return (
      <div
        role='group'
        aria-label={t('formPreview.viewportLabel')}
        className='device-viewport-bar inline-flex items-center gap-0.5 rounded-full p-1'
      >
        {viewportOptions.map(({ value: optionValue, icon: Icon, labelKey }) => {
          const isActive = value === optionValue;

          return (
            <Button
              key={optionValue}
              type='button'
              size='sm'
              variant='ghost'
              className={cn(
                'h-8 gap-1.5 rounded-full px-3.5 text-xs font-medium',
                isActive
                  ? 'bg-background text-foreground shadow-sm ring-1 ring-border/50'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              aria-label={t(viewportLabel(optionValue))}
              aria-pressed={isActive}
              onClick={() => {
                onChange(optionValue);
              }}
            >
              <Icon className='size-3.5 shrink-0' />
              <span>{t(labelKey)}</span>
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role='group'
      aria-label={t('formPreview.viewportLabel')}
      className='inline-flex items-center gap-0.5 rounded-lg border border-border/60 bg-muted/20 p-0.5'
    >
      {viewportOptions.map(({ value: optionValue, icon: Icon, labelKey }) => {
        const isActive = value === optionValue;

        return (
          <Button
            key={optionValue}
            type='button'
            size='icon-sm'
            variant='ghost'
            className={cn(
              'size-7 rounded-[calc(var(--radius)-2px)]',
              isActive && 'bg-background text-foreground shadow-sm',
            )}
            aria-label={t(viewportLabel(optionValue))}
            aria-pressed={isActive}
            title={t(labelKey)}
            onClick={() => {
              onChange(optionValue);
            }}
          >
            <Icon className='size-3.5' />
          </Button>
        );
      })}
    </div>
  );
}

interface FormPreviewActionsProps {
  onReset: () => void;
  onValidate: () => void;
  hasValidationErrors: boolean;
  variant?: 'default' | 'device';
}

export function FormPreviewActions({
  onReset,
  onValidate,
  hasValidationErrors,
  variant = 'default',
}: FormPreviewActionsProps): JSX.Element {
  const { t } = useTranslation('designer');
  const isDevice = variant === 'device';

  return (
    <div
      className={cn(
        'shrink-0',
        isDevice ? 'preview-device-dock px-5 py-3.5' : 'preview-dock px-4 py-3',
      )}
    >
      <div
        className={cn(
          'flex flex-wrap items-center gap-2 sm:gap-2.5',
          isDevice ? 'justify-between' : 'justify-end',
        )}
      >
        {isDevice ? (
          <p className='max-w-xs text-[11px] leading-relaxed text-muted-foreground'>
            {t('formPreview.deviceDockHint')}
          </p>
        ) : null}

        <div className='flex flex-wrap items-center justify-end gap-2 sm:gap-2.5'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='gap-1.5 border-border/70 bg-background/60'
            onClick={onReset}
          >
            <RotateCcw className='size-3.5' />
            {t('formPreview.resetData')}
          </Button>

          <Button
            type='button'
            size='sm'
            className={cn(
              'gap-1.5 shadow-sm',
              hasValidationErrors
                ? 'shadow-destructive/20'
                : 'shadow-primary/15',
            )}
            variant={hasValidationErrors ? 'destructive' : 'default'}
            onClick={onValidate}
          >
            <ShieldCheck className='size-3.5' />
            {t('formPreview.runValidation')}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface PreviewFrameProps {
  children: ReactNode;
  viewport?: PreviewViewport;
  variant?: 'default' | 'stage';
  formCode?: string;
  resolution?: DesktopResolution;
  orientation?: MobileOrientation;
}

export function PreviewFrame({
  children,
  viewport = 'plain',
  variant = 'default',
  formCode,
  resolution,
  orientation,
}: PreviewFrameProps): JSX.Element {
  const isStage = variant === 'stage';

  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-col overflow-hidden',
        isStage ? 'px-6 py-4 md:px-10 md:py-6' : 'px-2 pt-1 pb-2 md:px-4 md:pb-3',
      )}
    >
      {viewport === 'mobile' ? (
        <IPhoneFrame
          className={cn(
            'preview-device-specimen min-h-0 flex-1',
            isStage && 'preview-device-specimen-mobile',
          )}
          contextLabel={formCode}
          orientation={orientation ? getMobileOrientation(orientation) : undefined}
        >
          {children}
        </IPhoneFrame>
      ) : null}

      {viewport === 'desktop' ? (
        <SafariBrowserFrame
          className='preview-device-specimen min-h-0 flex-1'
          contextLabel={formCode}
          resolution={resolution ? getDesktopResolution(resolution) : undefined}
        >
          {children}
        </SafariBrowserFrame>
      ) : null}

      {viewport === 'plain' ? <PlainPreviewFrame>{children}</PlainPreviewFrame> : null}
    </div>
  );
}

export type { PreviewViewport };