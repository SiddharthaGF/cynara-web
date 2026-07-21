import { ChevronsRight, FlaskConical } from 'lucide-react';
import { useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { PlainPreviewFrame } from '@/components/device-frames/index.ts';
import { Button } from '@/components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs.tsx';
import {
  FormRendererView,
  useFormRenderer,
} from '@/features/forms/renderer/FormRenderer.tsx';
import type { UseFormRendererReturn } from '@/features/forms/renderer/useFormRenderer.ts';
import type { FormDraftModel } from '@/features/forms/types.ts';

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

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        showCloseButton
        className='preview-modal flex h-[min(90dvh,52rem)] w-[min(96vw,52rem)] max-w-[min(96vw,52rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(96vw,52rem)]'
      >
        <DialogHeader className='preview-modal-header shrink-0 border-b border-border/60 px-5 py-4'>
          <p className='font-mono text-[10px] uppercase tracking-[0.14em] text-primary/80'>
            {formCode}
          </p>
          <DialogTitle className='flex items-center gap-2'>
            <FlaskConical className='size-4 text-primary' />
            {t('formPreview.title')}
          </DialogTitle>
          <DialogDescription className='max-w-prose text-xs leading-relaxed'>
            {t('formPreview.disclaimer')}
          </DialogDescription>
        </DialogHeader>

        {open ? (
          <FormPreviewBody
            formCode={formCode}
            model={model}
          />
        ) : null}
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
        <div className='flex shrink-0 items-center justify-between gap-3 border-b border-border/30 px-4 pt-3 pb-2 sm:px-5'>
          <TabsList
            variant='line'
            className='h-9 rounded-none bg-transparent px-1'
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
