import type { CSSProperties, JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { PanelHeader } from '@/components/panel/index.ts';
import { Sheet, SheetContent } from '@/components/ui/sheet.tsx';
import { useKeyboardInset } from '@/hooks/use-keyboard-inset.ts';

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
  const keyboardInset = useKeyboardInset();

  if (!open) {
    return null;
  }

  if (isMobile) {
    // Cap the sheet so it never exceeds the visual viewport minus the soft
    // Keyboard inset. The body itself drops its in-body close X (the sheet
    // Provides one) and keeps title + model + persist + settings inline.
    const insetPx = `${Math.max(0, keyboardInset)}px`;
    const sheetStyle: CSSProperties = {
      height: `calc(100dvh - ${insetPx})`,
      maxHeight: `calc(100dvh - ${insetPx})`,
      paddingBottom: insetPx,
    };
    return (
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        modal
      >
        <SheetContent
          side='bottom'
          showCloseButton
          fullHeight
          style={sheetStyle}
          className='inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-2xl border-t p-0'
        >
          <PanelHeader
            surface='mobile'
            title={t('mobile.ai.sheetTitle')}
            subtitle={t('mobile.ai.sheetSubtitle')}
          />
          <FormAiChatPanelBody
            hideHeader
            {...panelProps}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return <FormAiChatPanel {...panelProps} />;
}
