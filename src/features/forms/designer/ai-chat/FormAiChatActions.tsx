import { SaveIcon, SaveOffIcon, Settings2Icon, Trash2Icon } from 'lucide-react';
import { useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { TooltipIconButton } from '@/components/ui/tooltip-button.tsx';
import { cn } from '@/lib/utils.ts';

interface FormAiChatActionsProps {
  configured: boolean;
  persistChat: boolean;
  hasConversation: boolean;
  onTogglePersist: () => void;
  onOpenSettings: () => void;
  /**
   * Called once the user confirms the clear-chat dialog. The component owns
   * the confirm step so the same controls stay in sync across the docked
   * rail and the mobile sheet header.
   */
  onClearConfirmed: () => void;
}

/**
 * Header action cluster for the AI chat (persist toggle, clear, settings).
 * Shared by the desktop docked-rail header and the mobile sheet header so the
 * affordances stay aligned across surfaces. Also owns the clear-chat
 * confirmation dialog so a press on the icon opens it from wherever the
 * cluster is mounted.
 */
export function FormAiChatActions({
  configured,
  persistChat,
  hasConversation,
  onTogglePersist,
  onOpenSettings,
  onClearConfirmed,
}: FormAiChatActionsProps): JSX.Element | null {
  const { t } = useTranslation('designer');
  const [clearOpen, setClearOpen] = useState(false);

  if (!configured) {
    return null;
  }

  function handleClear(): void {
    setClearOpen(false);
    onClearConfirmed();
  }

  return (
    <>
      <TooltipIconButton
        type='button'
        variant='ghost'
        size='icon-sm'
        className={cn(
          'shrink-0 rounded-full text-muted-foreground',
          persistChat && 'text-foreground ring-1 ring-inset ring-border/70',
        )}
        label={t(persistChat ? 'ai.persistOn' : 'ai.persistOff')}
        aria-pressed={persistChat}
        onClick={onTogglePersist}
      >
        {persistChat ? (
          <SaveIcon className='size-3.5' />
        ) : (
          <SaveOffIcon className='size-3.5' />
        )}
      </TooltipIconButton>
      <TooltipIconButton
        type='button'
        variant='ghost'
        size='icon-sm'
        className='shrink-0 rounded-full text-muted-foreground'
        label={t('ai.clearHint')}
        disabled={!hasConversation}
        onClick={() => {
          setClearOpen(true);
        }}
      >
        <Trash2Icon className='size-3.5' />
      </TooltipIconButton>
      <TooltipIconButton
        type='button'
        variant='ghost'
        size='icon-sm'
        className='shrink-0 rounded-full text-muted-foreground'
        label={t('ai.configure')}
        onClick={onOpenSettings}
      >
        <Settings2Icon className='size-3.5' />
      </TooltipIconButton>

      <Dialog
        open={clearOpen}
        onOpenChange={setClearOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('ai.clearConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('ai.clearConfirmDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant='outline' />}>
              {t('ai.clearConfirmCancel')}
            </DialogClose>
            <Button
              variant='destructive'
              onClick={handleClear}
            >
              {t('ai.clearConfirmAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
