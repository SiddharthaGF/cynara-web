import type { CSSProperties, JSX } from 'react';
import { useTranslation } from 'react-i18next';

import {
  PanelHeader,
  PanelHeaderCloseButton,
} from '@/components/panel/index.ts';
import { Sheet, SheetContent } from '@/components/ui/sheet.tsx';

import { FormAiChatActions } from './FormAiChatActions.tsx';
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
    // `fullHeight` on `SheetContent` already pins the sheet to `100dvh`, which
    // On modern engines (Chrome 108+, Safari 15.4+) is the visible viewport
    // Once the soft keyboard is open. Adding `paddingBottom: keyboardInset`
    // On top of that pushes the composer up by the keyboard height, leaving
    // A visible gap between the composer and the keyboard. With `100dvh`
    // Already accounting for the keyboard, the composer just sits at the
    // Bottom of the sheet (= top of the keyboard) on its own.
    const sheetStyle: CSSProperties = {};
    const hasConversation =
      panelProps.turns.length > 0 ||
      panelProps.input.length > 0 ||
      panelProps.error !== null;
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
          style={sheetStyle}
          className='inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-2xl border-t p-0'
        >
          <PanelHeader
            surface='mobile'
            title={t('mobile.ai.sheetTitle')}
            subtitle={t('mobile.ai.sheetSubtitle')}
            actions={
              <FormAiChatActions
                configured={panelProps.configured}
                persistChat={panelProps.persistChat}
                hasConversation={hasConversation}
                onTogglePersist={panelProps.onTogglePersist}
                onOpenSettings={panelProps.onOpenSettings}
                onClearConfirmed={panelProps.onClear}
              />
            }
            overlay={
              <PanelHeaderCloseButton
                onClick={() => {
                  onOpenChange(false);
                }}
                label={t('ai.close')}
              />
            }
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
