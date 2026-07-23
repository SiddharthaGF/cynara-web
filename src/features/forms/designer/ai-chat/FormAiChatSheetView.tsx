import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import {
  PANEL_SHEET_CLASSNAME,
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
  panelProps: FormAiChatPanelProps;
}

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
          className={PANEL_SHEET_CLASSNAME}
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
