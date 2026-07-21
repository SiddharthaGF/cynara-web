import { Monitor, Smartphone } from 'lucide-react';
import { useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';

import {
  DesktopResolutionControl,
  MobileOrientationControl,
  useDeviceSimulator,
} from '@/components/device-frames/index.ts';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Dialog, DialogContent } from '@/components/ui/dialog.tsx';
import { FormRendererView } from '@/features/forms/renderer/FormRenderer.tsx';
import type { UseFormRendererReturn } from '@/features/forms/renderer/useFormRenderer.ts';
import type { FormDraftModel } from '@/features/forms/types.ts';
import { cn } from '@/lib/utils.ts';

import {
  FormPreviewActions,
  PreviewFrame,
  type PreviewViewport,
} from './FormPreviewToolbar.tsx';

type DevicePreviewViewport = Extract<PreviewViewport, 'desktop' | 'mobile'>;

interface DevicePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formCode: string;
  model: FormDraftModel;
  renderer: UseFormRendererReturn;
}

const deviceSwitcherOptions: readonly {
  value: DevicePreviewViewport;
  icon: typeof Monitor;
  labelKey: string;
}[] = [
  { value: 'desktop', icon: Monitor, labelKey: 'formPreview.viewportDesktop' },
  { value: 'mobile', icon: Smartphone, labelKey: 'formPreview.viewportMobile' },
];

export function DevicePreviewDialog({
  open,
  onOpenChange,
  formCode,
  model,
  renderer,
}: DevicePreviewDialogProps): JSX.Element {
  const { t } = useTranslation('designer');
  const [viewport, setViewport] = useState<DevicePreviewViewport>('desktop');
  const {
    resolution,
    orientation,
    setResolution,
    setOrientation,
    toggleOrientation,
  } = useDeviceSimulator();

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        showCloseButton
        className='preview-device-modal z-[60] flex h-[min(94dvh,72rem)] w-[min(98vw,88rem)] max-w-[min(98vw,88rem)] flex-col gap-0 overflow-hidden rounded-2xl border-0 p-0 ring-0 sm:max-w-[min(98vw,88rem)]'
      >
        {open ? (
          <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
            <header className='preview-device-toolbar flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border/40 py-3 pl-4 pr-12 sm:pl-6 sm:pr-14'>
              <div className='flex min-w-0 items-center gap-3'>
                <Badge
                  variant='outline'
                  className='shrink-0 rounded-full border-primary/25 bg-primary/8 px-2.5 py-0.5 font-mono text-[10px] tracking-[0.12em] text-primary uppercase'
                >
                  {t('formPreview.deviceLabBadge')}
                </Badge>
                <p className='truncate font-mono text-[11px] text-muted-foreground'>
                  {formCode}
                </p>
              </div>

              <div className='flex min-w-0 flex-wrap items-center justify-end gap-2'>
                <DeviceSwitcher
                  value={viewport}
                  onChange={setViewport}
                />

                {viewport === 'desktop' ? (
                  <DesktopResolutionControl
                    value={resolution}
                    onChange={setResolution}
                  />
                ) : null}
                {viewport === 'mobile' ? (
                  <MobileOrientationControl
                    value={orientation}
                    onChange={setOrientation}
                    onToggle={toggleOrientation}
                  />
                ) : null}
              </div>
            </header>

            <div className='canvas-grid preview-device-stage relative min-h-0 flex-1 overflow-hidden'>
              <PreviewFrame
                variant='stage'
                viewport={viewport}
                formCode={formCode}
                resolution={viewport === 'desktop' ? resolution : undefined}
                orientation={viewport === 'mobile' ? orientation : undefined}
              >
                <FormRendererView
                  model={model}
                  renderer={renderer}
                />
              </PreviewFrame>
            </div>

            <FormPreviewActions
              variant='device'
              onReset={renderer.resetValues}
              onValidate={renderer.triggerValidation}
              hasValidationErrors={renderer.hasValidationErrors}
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DeviceSwitcher({
  value,
  onChange,
}: {
  value: DevicePreviewViewport;
  onChange: (value: DevicePreviewViewport) => void;
}): JSX.Element {
  const { t } = useTranslation('designer');

  return (
    <div
      role='group'
      aria-label={t('formPreview.deviceSwitcherLabel')}
      className='device-viewport-bar inline-flex items-center gap-0.5 rounded-full p-1'
    >
      {deviceSwitcherOptions.map(
        ({ value: optionValue, icon: Icon, labelKey }) => {
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
              aria-label={t(labelKey)}
              aria-pressed={isActive}
              title={t(labelKey)}
              onClick={() => {
                onChange(optionValue);
              }}
            >
              <Icon className='size-3.5 shrink-0' />
              <span>
                {t(
                  `formPreview.viewport${optionValue === 'desktop' ? 'Desktop' : 'Mobile'}Short`,
                )}
              </span>
            </Button>
          );
        },
      )}
    </div>
  );
}
