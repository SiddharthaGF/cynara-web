import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet.tsx';

import {
  FormAiChatPanel,
  type FormAiChatPanelProps,
  FormAiChatPanelBody,
} from './FormAiChatPanel.tsx';

interface FormAiChatSheetViewProps {
  open: boolean;
  isMobile: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-built props for `FormAiChatPanel` / `FormAiChatPanelBody`. */
  panelProps: FormAiChatPanelProps;
}

/** Render the chat panel as a docked aside (desktop) or a bottom sheet (mobile). */
export function FormAiChatSheetView({
  open,
  isMobile,
  onOpenChange,
  panelProps,
}: FormAiChatSheetViewProps): JSX.Element | null {
  const { t } = useTranslation('designer');

  if (!open) {
    return null;
  }

  if (isMobile) {
    return (
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        modal
      >
        <SheetContent
          side='bottom'
          showCloseButton
          className='inset-x-0 bottom-0 flex max-h-[85dvh] flex-col overflow-hidden rounded-t-2xl border-t p-0'
        >
          <SheetHeader className='sr-only'>
            <SheetTitle>{t('ai.title')}</SheetTitle>
            <SheetDescription>{t('mobile.ai.description')}</SheetDescription>
          </SheetHeader>
          <FormAiChatPanelBody {...panelProps} />
        </SheetContent>
      </Sheet>
    );
  }

  return <FormAiChatPanel {...panelProps} />;
}
