import type { CSSProperties, JSX } from 'react';

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
          <FormAiChatPanelBody
            compactInBodyHeader
            {...panelProps}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return <FormAiChatPanel {...panelProps} />;
}
