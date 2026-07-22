import { Settings2, Sparkles } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { TooltipIconButton } from '@/components/ui/tooltip-button.tsx';

import type { useFormDesignerLayout } from './useFormDesignerLayout.ts';

type Layout = ReturnType<typeof useFormDesignerLayout>;

interface MobileDesignerFabProps {
  layout: Layout;
  aiChatOpen: boolean;
  onOpenChat: () => void;
}

/**
 * Mobile-only floating action buttons that open the field-settings and AI chat
 * bottom sheets. Rendered as fixed FABs anchored to the bottom-right safe
 * area; visibility rules mirror the docked rails on `md+`.
 */
export function MobileDesignerFab({
  layout,
  aiChatOpen,
  onOpenChat,
}: MobileDesignerFabProps): JSX.Element | null {
  const { t } = useTranslation('designer');

  const hasInspectorFab = layout.selectedField !== null && !layout.showAdvanced;

  return (
    <div className='pointer-events-none fixed inset-x-0 bottom-4 z-40 flex flex-col items-end gap-3 px-4 pb-[env(safe-area-inset-bottom)]'>
      {hasInspectorFab ? (
        <TooltipIconButton
          type='button'
          size='icon-lg'
          variant='secondary'
          className='pointer-events-auto size-14 rounded-full shadow-lg'
          label={t('mobile.fieldSettings.fabHint')}
          aria-haspopup='dialog'
          aria-expanded={layout.showAdvanced}
          onClick={() => {
            const selected = layout.selectedField;
            if (selected) {
              layout.handleOpenAdvanced(selected.id);
            }
          }}
        >
          <Settings2 className='size-5' />
        </TooltipIconButton>
      ) : null}
      {aiChatOpen ? null : (
        <TooltipIconButton
          type='button'
          size='icon-lg'
          variant='default'
          className='pointer-events-auto size-14 rounded-full shadow-lg'
          label={t('mobile.ai.fabHint')}
          aria-haspopup='dialog'
          aria-expanded={aiChatOpen}
          onClick={onOpenChat}
        >
          <Sparkles className='size-5' />
        </TooltipIconButton>
      )}
    </div>
  );
}
