import { Settings2Icon, XIcon } from 'lucide-react';
import type { FormEvent, JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { AiSettingsDialog } from '@/components/ai-settings-dialog.tsx';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
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

interface FormAiChatPanelProps {
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
  onClose: () => void;
  onOpenSettings: () => void;
  onPickPrompt: (prompt: string) => void;
  onRemoveQueued: (turnId: string) => void;
  onRetry: () => void;
  onStop: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  stopped: boolean;
  turns: ChatTurn[];
  typesBySlug: Map<string, MentionableFieldType>;
  readOnly: boolean;
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
  onClose,
  onOpenSettings,
  onPickPrompt,
  onRemoveQueued,
  onRetry,
  onStop,
  onSubmit,
  stopped,
  turns,
  typesBySlug,
  readOnly,
}: FormAiChatPanelProps): JSX.Element {
  const { t } = useTranslation('designer');
  const { canRetry, canSubmit, busy, statusLoading } = interaction;

  return (
    <aside
      className={cn(
        'ai-chat-shell flex h-full min-h-0 w-full max-w-[22rem] shrink-0 flex-col border-l border-border/50 xl:max-w-[24rem]',
      )}
      aria-label={t('ai.title')}
    >
      <header className='ai-chat-header shrink-0'>
        <div className='relative flex items-center gap-2 px-4 py-3 pr-12'>
          <h2 className='ai-chat-title truncate'>{t('ai.title')}</h2>
          {modelName ? (
            <span className='ai-chat-model shrink-0'>{modelName}</span>
          ) : null}
          {configured ? (
            <Button
              type='button'
              variant='ghost'
              size='icon-sm'
              className='shrink-0 rounded-full text-muted-foreground'
              aria-label={t('ai.configure')}
              onClick={onOpenSettings}
            >
              <Settings2Icon className='size-3.5' />
            </Button>
          ) : null}
          <Button
            type='button'
            variant='ghost'
            size='icon-sm'
            className='absolute top-2.5 right-2.5 rounded-full'
            aria-label={t('ai.close')}
            onClick={onClose}
          >
            <XIcon className='size-4' />
          </Button>
        </div>
      </header>

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
    </aside>
  );
}
