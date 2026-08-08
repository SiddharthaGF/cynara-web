import type { FormEvent, JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { AiSettingsDialog } from '@/components/ai-settings-dialog.tsx';
import {
  PanelHeader,
  PanelHeaderCloseButton,
  PanelSurface,
} from '@/components/panel/index.ts';
import { StatusState } from '@/components/status-state.tsx';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
import type { FormDraftModel } from '@/features/forms/types.ts';

import { ChatComposer } from './ChatComposer.tsx';
import { ChatTranscript } from './ChatTranscript.tsx';
import type { ChatTurn } from './chatTurns.ts';
import type { MentionableField } from './fieldMentions.ts';
import type { MentionableFieldType } from './fieldTypeMentions.ts';
import { FormAiChatActions } from './FormAiChatActions.tsx';

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
    <PanelSurface
      className='ai-chat-shell w-full max-w-[22rem] xl:max-w-[24rem]'
      aria-label={t('ai.title')}
      data-testid='ai-chat-panel'
    >
      <FormAiChatPanelBody
        aiSettingsOpen={aiSettingsOpen}
        configured={configured}
        draftModel={draftModel}
        error={error}
        fieldsById={fieldsById}
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
    </PanelSurface>
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
  const hasConversation =
    turns.length > 0 || input.length > 0 || error !== null;

  return (
    <>
      {hideHeader ? null : (
        <PanelHeader
          surface='desktop'
          eyebrow={modelName ?? undefined}
          title={t('ai.title')}
          actions={
            <FormAiChatActions
              configured={configured}
              persistChat={persistChat}
              hasConversation={hasConversation}
              onTogglePersist={onTogglePersist}
              onOpenSettings={onOpenSettings}
              onClearConfirmed={onClear}
            />
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
          <StatusState
            kind='loading'
            title={t('ai.statusLoading')}
            className='py-6'
          />
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
                isBusy={busy}
                onChange={onChange}
                onSubmit={onSubmit}
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
    </>
  );
}
