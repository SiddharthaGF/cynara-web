import { SaveIcon, SaveOffIcon, Settings2Icon, Trash2Icon } from 'lucide-react';
import type { FormEvent, JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AiSettingsDialog } from '@/components/ai-settings-dialog.tsx';
import {
  PanelHeader,
  PanelHeaderCloseButton,
} from '@/components/panel/index.ts';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
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
import { Spinner } from '@/components/ui/spinner.tsx';
import type { FormDraftModel } from '@/features/forms/types.ts';
import { cn } from '@/lib/utils.ts';

import { ChatComposer } from './ChatComposer.tsx';
import { ChatTranscript } from './ChatTranscript.tsx';
import type { ChatTurn } from './chatTurns.ts';
import type { MentionableField } from './fieldMentions.ts';
import type { MentionableFieldType } from './fieldTypeMentions.ts';

/** Interaction flags for the AI chat shell (kept as one bag to avoid boolean-prop sprawl). */
export interface FormAiChatInteraction {
  canRetry: boolean;
  canSubmit: boolean;
  busy: boolean;
  statusLoading: boolean;
}

export interface FormAiChatPanelProps {
  aiSettingsOpen: boolean;
  configured: boolean;
  draftModel: FormDraftModel;
  error: string | null;
  fieldsById: Map<string, MentionableField>;
  idPrefix: string;
  input: string;
  /** Bumped when the parent clears `input` so DiceUI remounts a fresh editor. */
  composerKey: number;
  interaction: FormAiChatInteraction;
  locale: string;
  modelLabel: string | null;
  modelName: string | null;
  onAiSettingsOpenChange: (open: boolean) => void;
  onChange: (value: string) => void;
  onClear: () => void;
  onClose: () => void;
  onOpenSettings: () => void;
  onPickPrompt: (prompt: string) => void;
  onRemoveQueued: (turnId: string) => void;
  onRetry: () => void;
  onStop: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTogglePersist: () => void;
  persistChat: boolean;
  stopped: boolean;
  turns: ChatTurn[];
  typesBySlug: Map<string, MentionableFieldType>;
  readOnly: boolean;
  /**
   * When true, the parent provides the chrome header (e.g. the mobile sheet
   * renders its own `PanelHeader`) and this component renders only the body.
   */
  hideHeader?: boolean;
}

export function FormAiChatPanel({
  aiSettingsOpen,
  configured,
  draftModel,
  error,
  fieldsById,
  idPrefix,
  input,
  composerKey,
  interaction,
  locale,
  modelLabel,
  modelName,
  onAiSettingsOpenChange,
  onChange,
  onClear,
  onClose,
  onOpenSettings,
  onPickPrompt,
  onRemoveQueued,
  onRetry,
  onStop,
  onSubmit,
  onTogglePersist,
  persistChat,
  stopped,
  turns,
  typesBySlug,
  readOnly,
}: FormAiChatPanelProps): JSX.Element {
  const { t } = useTranslation('designer');

  return (
    <aside
      className={cn(
        'ai-chat-shell flex h-full min-h-0 w-full max-w-[22rem] shrink-0 flex-col border-l border-border/50 xl:max-w-[24rem]',
      )}
      aria-label={t('ai.title')}
    >
      <FormAiChatPanelBody
        aiSettingsOpen={aiSettingsOpen}
        configured={configured}
        draftModel={draftModel}
        error={error}
        fieldsById={fieldsById}
        idPrefix={idPrefix}
        input={input}
        composerKey={composerKey}
        interaction={interaction}
        locale={locale}
        modelLabel={modelLabel}
        modelName={modelName}
        onAiSettingsOpenChange={onAiSettingsOpenChange}
        onChange={onChange}
        onClear={onClear}
        onClose={onClose}
        onOpenSettings={onOpenSettings}
        onPickPrompt={onPickPrompt}
        onRemoveQueued={onRemoveQueued}
        onRetry={onRetry}
        onStop={onStop}
        onSubmit={onSubmit}
        onTogglePersist={onTogglePersist}
        persistChat={persistChat}
        stopped={stopped}
        turns={turns}
        typesBySlug={typesBySlug}
        readOnly={readOnly}
      />
    </aside>
  );
}

/**
 * Body-only variant of the chat panel. The desktop layout wraps this in an
 * `<aside>` rail; the mobile floating panel mounts it directly inside a sheet
 * so it stretches to the available width.
 */
export function FormAiChatPanelBody({
  aiSettingsOpen,
  configured,
  draftModel,
  error,
  fieldsById,
  idPrefix,
  input,
  composerKey,
  interaction,
  locale,
  modelLabel,
  modelName,
  onAiSettingsOpenChange,
  onChange,
  onClear,
  onClose,
  onOpenSettings,
  onPickPrompt,
  onRemoveQueued,
  onRetry,
  onStop,
  onSubmit,
  onTogglePersist,
  persistChat,
  stopped,
  turns,
  typesBySlug,
  readOnly,
  hideHeader = false,
}: FormAiChatPanelProps): JSX.Element {
  const { t } = useTranslation('designer');
  const { canRetry, canSubmit, busy, statusLoading } = interaction;
  const [clearOpen, setClearOpen] = useState(false);
  const hasConversation =
    turns.length > 0 || input.length > 0 || error !== null;

  function handleClear(): void {
    setClearOpen(false);
    onClear();
  }

  return (
    <>
      {hideHeader ? null : (
        <PanelHeader
          surface='desktop'
          eyebrow={modelName ?? undefined}
          title={t('ai.title')}
          actions={
            configured ? (
              <>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon-sm'
                  className={cn(
                    'shrink-0 rounded-full text-muted-foreground',
                    persistChat &&
                      'text-foreground ring-1 ring-inset ring-border/70',
                  )}
                  aria-label={t(persistChat ? 'ai.persistOn' : 'ai.persistOff')}
                  aria-pressed={persistChat}
                  title={t(persistChat ? 'ai.persistOn' : 'ai.persistOff')}
                  onClick={onTogglePersist}
                >
                  {persistChat ? (
                    <SaveIcon className='size-3.5' />
                  ) : (
                    <SaveOffIcon className='size-3.5' />
                  )}
                </Button>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon-sm'
                  className='shrink-0 rounded-full text-muted-foreground'
                  aria-label={t('ai.clearHint')}
                  title={t('ai.clearHint')}
                  disabled={!hasConversation}
                  onClick={() => {
                    setClearOpen(true);
                  }}
                >
                  <Trash2Icon className='size-3.5' />
                </Button>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon-sm'
                  className='shrink-0 rounded-full text-muted-foreground'
                  aria-label={t('ai.configure')}
                  title={t('ai.configure')}
                  onClick={onOpenSettings}
                >
                  <Settings2Icon className='size-3.5' />
                </Button>
              </>
            ) : null
          }
          overlay={
            <PanelHeaderCloseButton
              onClick={onClose}
              label={t('ai.close')}
            />
          }
        />
      )}

      <div className='flex min-h-0 flex-1 flex-col'>
        {statusLoading ? (
          <div className='flex flex-1 items-center justify-center'>
            <Spinner className='size-5 text-muted-foreground' />
          </div>
        ) : null}

        {!statusLoading && !configured ? (
          <div className='flex flex-col gap-3 p-4'>
            <Alert>
              <AlertDescription>{t('ai.notConfigured')}</AlertDescription>
            </Alert>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='self-start'
              onClick={onOpenSettings}
            >
              {t('ai.configure')}
            </Button>
          </div>
        ) : null}

        {!statusLoading && configured ? (
          <>
            <ChatTranscript
              turns={turns}
              fieldsById={fieldsById}
              typesBySlug={typesBySlug}
              isBusy={busy}
              error={error}
              stopped={stopped}
              canRetry={canRetry}
              idPrefix={idPrefix}
              onRetry={onRetry}
              onPickPrompt={onPickPrompt}
              onRemoveQueued={onRemoveQueued}
            />

            <div className='ai-chat-composer-wrap shrink-0 px-3 pb-3'>
              <ChatComposer
                key={composerKey}
                value={input}
                model={draftModel}
                locale={locale}
                modelLabel={modelLabel}
                disabled={readOnly}
                canSubmit={canSubmit}
                canRetry={canRetry}
                isBusy={busy}
                onChange={onChange}
                onSubmit={onSubmit}
                onRetry={onRetry}
                onStop={onStop}
              />
            </div>
          </>
        ) : null}
      </div>

      <AiSettingsDialog
        open={aiSettingsOpen}
        onOpenChange={onAiSettingsOpenChange}
      />

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
