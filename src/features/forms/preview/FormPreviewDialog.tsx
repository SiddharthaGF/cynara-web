import { ChevronsRight, EyeIcon, FlaskConical } from 'lucide-react';
import { useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { PlainPreviewFrame } from '@/components/device-frames/index.ts';
import {
  PanelHeader,
  PanelHeaderCloseButton,
} from '@/components/panel/index.ts';
import { Button } from '@/components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
} from '@/components/ui/dialog.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import { Sheet, SheetContent } from '@/components/ui/sheet.tsx';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs.tsx';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx';
import {
  FormRendererView,
  useFormRenderer,
} from '@/features/forms/renderer/FormRenderer.tsx';
import type { UseFormRendererReturn } from '@/features/forms/renderer/useFormRenderer.ts';
import type { FormDraftModel } from '@/features/forms/types.ts';
import { useIsMobile } from '@/hooks/use-mobile.ts';
import { cn } from '@/lib/utils.ts';

import { DevicePreviewDialog } from './DevicePreviewDialog.tsx';
import { FormJsonExportMenu } from './FormJsonExportMenu.tsx';
import { FormPreviewActions } from './FormPreviewToolbar.tsx';
import { RuleInspectionPanel } from './RuleInspectionPanel.tsx';

interface FormPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formCode: string;
  model: FormDraftModel;
}

export function FormPreviewDialog({
  open,
  onOpenChange,
  formCode,
  model,
}: FormPreviewDialogProps): JSX.Element {
  const { t } = useTranslation('designer');
  const isMobile = useIsMobile();

  if (!open) {
    return isMobile ? (
      <Sheet
        open={false}
        onOpenChange={onOpenChange}
      >
        {null}
      </Sheet>
    ) : (
      <Dialog
        open={false}
        onOpenChange={onOpenChange}
      >
        {null}
      </Dialog>
    );
  }

  if (isMobile) {
    // Subtract the soft-keyboard height from the bottom padding so the
    // Content (preview body) stays above the keyboard. The sheet itself
    // Stretches to the visual viewport; max-height uses an un-mixed `calc`
    // To avoid the browser serialising it as `0px + ...` and producing
    // Unexpected sizing on some engines.
    return (
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        modal
      >
        <SheetContent
          side='bottom'
          fullHeight
          showCloseButton={false}
          className='inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-2xl border-t p-0'
        >
          <PanelHeader
            surface='mobile'
            icon={<FlaskConical className='size-4' />}
            title={t('formPreview.title')}
            overlay={
              <PanelHeaderCloseButton
                onClick={() => {
                  onOpenChange(false);
                }}
                label={t('formPreview.close')}
              />
            }
          />
          <FormPreviewBody
            formCode={formCode}
            model={model}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        showCloseButton={false}
        className='preview-modal flex h-[min(90dvh,52rem)] w-[min(96vw,52rem)] max-w-[min(96vw,52rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(96vw,52rem)]'
      >
        <DialogDescription className='sr-only'>
          {t('formPreview.disclaimer')}
        </DialogDescription>
        <PanelHeader
          surface='desktop'
          eyebrow={formCode}
          icon={<FlaskConical className='size-4' />}
          title={t('formPreview.title')}
          meta={
            <p className='max-w-prose text-xs leading-relaxed text-muted-foreground'>
              {t('formPreview.disclaimer')}
            </p>
          }
          overlay={
            <PanelHeaderCloseButton
              onClick={() => {
                onOpenChange(false);
              }}
              label={t('formPreview.close')}
            />
          }
        />

        <FormPreviewBody
          formCode={formCode}
          model={model}
        />
      </DialogContent>
    </Dialog>
  );
}

function FormPreviewBody({
  formCode,
  model,
}: {
  formCode: string;
  model: FormDraftModel;
}): JSX.Element {
  const { t } = useTranslation('designer');
  const [activeTab, setActiveTab] = useState('preview');
  const [showConditional, setShowConditional] = useState(false);
  const renderer = useFormRenderer({ model, readOnly: false });

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        if (typeof value === 'string') {
          setActiveTab(value);
        }
      }}
      className='flex min-h-0 flex-1 flex-col gap-0 overflow-hidden'
    >
      <div className='canvas-grid preview-stage relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-b-xl'>
        <div className='flex shrink-0 flex-col gap-2 border-b border-border/30 px-3 pt-2.5 pb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5 sm:pt-3 sm:pb-2'>
          <TabsList
            variant='line'
            className='h-9 shrink-0 rounded-none bg-transparent px-1'
          >
            <TabsTrigger
              value='preview'
              className='px-4'
            >
              {t('formPreview.tabPreview')}
            </TabsTrigger>
            <TabsTrigger
              value='rules'
              className='px-4'
            >
              {t('formPreview.tabRules')}
            </TabsTrigger>
          </TabsList>

          <div className='flex min-w-0 flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-end'>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type='button'
                    variant={showConditional ? 'default' : 'outline'}
                    size='sm'
                    className={cn(
                      'h-8 shrink-0 gap-1.5 whitespace-nowrap px-2.5 text-xs shadow-none',
                      showConditional && 'shadow-primary/15',
                    )}
                    aria-pressed={showConditional}
                    onClick={() => {
                      setShowConditional((current) => !current);
                    }}
                  />
                }
              >
                <EyeIcon className='size-3.5' />
                <span>{t('formPreview.showAll')}</span>
              </TooltipTrigger>
              <TooltipContent side='bottom'>
                {t('formPreview.showAllHint')}
              </TooltipContent>
            </Tooltip>

            {activeTab === 'preview' ? (
              <DevicePreviewLauncher
                formCode={formCode}
                model={model}
                renderer={renderer}
              />
            ) : (
              <FormJsonExportMenu
                formCode={formCode}
                model={model}
              />
            )}
          </div>
        </div>

        <div className='relative h-0 min-h-0 flex-1 overflow-hidden'>
          <TabsContent
            value='preview'
            className='absolute inset-0 mt-0 flex min-h-0 flex-col overflow-hidden outline-none'
          >
            <div className='flex h-full min-h-0 flex-col overflow-hidden px-2 pt-1 pb-2 md:px-4 md:pb-3'>
              <PlainPreviewFrame>
                <FormRendererView
                  model={model}
                  renderer={renderer}
                  showConditionalFields={showConditional}
                />
              </PlainPreviewFrame>
            </div>
          </TabsContent>

          <TabsContent
            value='rules'
            className='absolute inset-0 mt-0 overflow-hidden outline-none'
          >
            <ScrollArea className='h-full'>
              <RuleInspectionPanel
                variant='tab'
                model={model}
                evaluation={renderer.evaluation}
                configWarnings={renderer.configWarnings}
              />
            </ScrollArea>
          </TabsContent>
        </div>

        <FormPreviewActions
          onReset={renderer.resetValues}
          onValidate={renderer.triggerValidation}
          hasValidationErrors={renderer.hasValidationErrors}
        />
      </div>
    </Tabs>
  );
}

function DevicePreviewLauncher({
  formCode,
  model,
  renderer,
}: {
  formCode: string;
  model: FormDraftModel;
  renderer: UseFormRendererReturn;
}): JSX.Element {
  const { t } = useTranslation('designer');
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className='flex flex-col items-end gap-1'>
        <Button
          type='button'
          variant='default'
          size='sm'
          className='gap-1.5 shadow-sm shadow-primary/15'
          onClick={() => {
            setOpen(true);
          }}
        >
          <ChevronsRight className='size-3.5' />
          {t('formPreview.openInDevice')}
        </Button>
        <p className='hidden text-[10px] text-muted-foreground/80 sm:block'>
          {t('formPreview.openInDeviceHint')}
        </p>
      </div>

      <DevicePreviewDialog
        open={open}
        onOpenChange={setOpen}
        formCode={formCode}
        model={model}
        renderer={renderer}
      />
    </>
  );
}
