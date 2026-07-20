import { useQuery } from '@tanstack/react-query';
import { XIcon } from 'lucide-react';
import type { FormEvent, JSX } from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/api/client.ts';
import {
  type FormAiChatMessage,
  getFormAiStatus,
  isRequestAborted,
  streamFormDraftAi,
} from '@/api/forms.ts';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import { parseDraft, serializeDraft } from '@/features/forms/model/formDraft.ts';
import type { FormDraftModel } from '@/features/forms/types.ts';
import { cn } from '@/lib/utils.ts';

import { ChatComposer } from './ChatComposer.tsx';
import { type ChatTurn, toApiMessages } from './ChatTurnMessage.tsx';
import { ChatTranscript } from './ChatTranscript.tsx';
import {
  extractMentionedFieldIds,
  listMentionableFields,
} from './fieldMentions.ts';
import {
  extractMentionedFieldTypes,
  listMentionableFieldTypes,
} from './fieldTypeMentions.ts';
import { playNotificationSound } from './playNotificationSound.ts';

export { ChatAiTrigger as FormAiChatTrigger } from './ChatComposer.tsx';

interface FormAiChatPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formCode: string;
  locale: string;
  model: FormDraftModel;
  readOnly: boolean;
  onApplyDraft: (next: FormDraftModel) => void;
}

interface PendingChatPayload {
  messages: FormAiChatMessage[];
  focusedFieldIds: string[];
  focusedFieldTypes: string[];
}

interface QueuedMessage {
  userTurnId: string;
  content: string;
  focusedFieldIds: string[];
  focusedFieldTypes: string[];
}

/** Docked right-rail chat — ChatGPT-like transcript beside the canvas. */
export function FormAiChatSheet({
  open,
  onOpenChange,
  formCode,
  locale,
  model,
  readOnly,
  onApplyDraft,
}: FormAiChatPanelProps): JSX.Element | null {
  const { t } = useTranslation('designer');
  const idPrefix = useId();
  const abortRef = useRef<AbortController | null>(null);
  const queueRef = useRef<QueuedMessage[]>([]);
  const isBusyRef = useRef(false);
  const turnsRef = useRef<ChatTurn[]>([]);
  const modelRef = useRef(model);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [stopped, setStopped] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [pendingPayload, setPendingPayload] =
    useState<PendingChatPayload | null>(null);

  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  useEffect(() => {
    modelRef.current = model;
  }, [model]);

  useEffect(() => {
    isBusyRef.current = isBusy;
  }, [isBusy]);

  const mentionable = useMemo(() => listMentionableFields(model), [model]);
  const fieldsById = useMemo(
    () => new Map(mentionable.map((field) => [field.id, field])),
    [mentionable],
  );
  const knownFieldIds = useMemo(
    () => new Set(mentionable.map((field) => field.id)),
    [mentionable],
  );
  const mentionableTypes = useMemo(() => {
    const types = [
      'text',
      'textarea',
      'number',
      'integer',
      'boolean',
      'date',
      'datetime',
      'time',
      'choice',
      'group',
      'repeater',
      'component-ref',
    ] as const;
    const labels = Object.fromEntries(
      types.map((type) => [
        type,
        {
          label: t(`fieldTypes.${type}.label`),
          description: t(`fieldTypes.${type}.description`),
        },
      ]),
    ) as Parameters<typeof listMentionableFieldTypes>[1];
    return listMentionableFieldTypes(locale, labels);
  }, [locale, t]);
  const typesBySlug = useMemo(
    () => new Map(mentionableTypes.map((item) => [item.slug, item])),
    [mentionableTypes],
  );

  const statusQuery = useQuery({
    queryKey: ['ai', 'status'],
    queryFn: getFormAiStatus,
    staleTime: 60_000,
    enabled: open,
  });

  if (!open) {
    return null;
  }

  const configured = statusQuery.data?.configured === true;
  const canSubmit =
    !readOnly && configured && input.trim().length > 0;
  const canRetry =
    !readOnly &&
    configured &&
    !isBusy &&
    pendingPayload !== null &&
    (error !== null || stopped);

  function patchAssistant(
    assistantId: string,
    patch: (turn: ChatTurn) => ChatTurn,
  ): void {
    setTurns((current) =>
      current.map((turn) => (turn.id === assistantId ? patch(turn) : turn)),
    );
  }

  function buildPayloadForUserTurn(
    userTurnId: string,
    content: string,
    focusedFieldIds: string[],
    focusedFieldTypes: string[],
  ): PendingChatPayload {
    const current = turnsRef.current.filter((turn) => !turn.failed);
    const index = current.findIndex((turn) => turn.id === userTurnId);
    const slice =
      index >= 0
        ? current.slice(0, index + 1)
        : [
            ...current,
            {
              id: userTurnId,
              role: 'user' as const,
              content,
            },
          ];
    return {
      messages: toApiMessages(slice),
      focusedFieldIds,
      focusedFieldTypes,
    };
  }

  async function drainQueue(): Promise<void> {
    const next = queueRef.current.shift();
    if (!next) {
      return;
    }
    setTurns((current) => {
      const updated = current.map((turn) =>
        turn.id === next.userTurnId ? { ...turn, queued: false } : turn,
      );
      turnsRef.current = updated;
      return updated;
    });
    const payload = buildPayloadForUserTurn(
      next.userTurnId,
      next.content,
      next.focusedFieldIds,
      next.focusedFieldTypes,
    );
    await runStream(payload);
  }

  function clearQueuedTurns(): void {
    queueRef.current = [];
    setTurns((current) => current.filter((turn) => !turn.queued));
  }

  function handleRemoveQueued(turnId: string): void {
    queueRef.current = queueRef.current.filter(
      (item) => item.userTurnId !== turnId,
    );
    setTurns((current) => current.filter((turn) => turn.id !== turnId));
  }

  async function runStream(payload: PendingChatPayload): Promise<void> {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPendingPayload(payload);
    setError(null);
    setStopped(false);
    setIsBusy(true);
    isBusyRef.current = true;

    const assistantId = `${idPrefix}-assistant-${Date.now()}`;
    setTurns((current) => [
      ...current.map((turn) =>
        turn.failed ? { ...turn, failed: false } : turn,
      ),
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        streaming: true,
      },
    ]);

    try {
      const serialized = serializeDraft(modelRef.current);
      for await (const event of streamFormDraftAi(
        formCode,
        {
          messages: payload.messages,
          locale,
          focusedFieldIds: payload.focusedFieldIds,
          focusedFieldTypes: payload.focusedFieldTypes,
          clinicalSchemaJson: serialized.clinicalSchemaJson,
          uiSchemaJson: serialized.uiSchemaJson,
          rulesSchemaJson: serialized.rulesSchemaJson,
        },
        { signal: controller.signal },
      )) {
        if (event.type === 'thinking') {
          continue;
        }
        if (event.type === 'message') {
          patchAssistant(assistantId, (turn) => ({
            ...turn,
            content: `${turn.content}${event.delta}`,
          }));
          continue;
        }
        if (event.type === 'error') {
          throw new Error(event.message);
        }
        if (event.type === 'done') {
          const before = serializeDraft(modelRef.current);
          const draftChanged =
            before.clinicalSchemaJson !== event.result.clinicalSchemaJson ||
            before.uiSchemaJson !== (event.result.uiSchemaJson ?? null) ||
            before.rulesSchemaJson !== (event.result.rulesSchemaJson ?? null);
          patchAssistant(assistantId, (turn) => ({
            ...turn,
            content: event.result.assistantMessage || turn.content,
            streaming: false,
            draftApplied: draftChanged,
            appliedSummary: draftChanged
              ? event.result.summary.trim() || undefined
              : undefined,
          }));
          if (draftChanged) {
            onApplyDraft(
              parseDraft({
                clinicalSchemaJson: event.result.clinicalSchemaJson,
                uiSchemaJson: event.result.uiSchemaJson,
                rulesSchemaJson: event.result.rulesSchemaJson,
              }),
            );
          }
          setPendingPayload(null);
          setError(null);
          setStopped(false);
          playNotificationSound();
        }
      }
    } catch (err) {
      setTurns((current) => {
        const withoutStreaming = current.filter(
          (turn) => turn.id !== assistantId || turn.content.length > 0,
        );
        if (isRequestAborted(err)) {
          return withoutStreaming.map((turn) =>
            turn.id === assistantId
              ? { ...turn, streaming: false }
              : turn,
          );
        }
        let lastUser: ChatTurn | undefined;
        for (let i = withoutStreaming.length - 1; i >= 0; i -= 1) {
          const turn = withoutStreaming[i];
          if (turn?.role === 'user') {
            lastUser = turn;
            break;
          }
        }
        return withoutStreaming
          .filter((turn) => turn.id !== assistantId)
          .map((turn) =>
            lastUser && turn.id === lastUser.id
              ? { ...turn, failed: true }
              : turn,
          );
      });

      if (isRequestAborted(err)) {
        setError(null);
        setStopped(true);
        // Keep queue for after stop settles — still drain next.
      } else {
        setStopped(false);
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError(err instanceof Error ? err.message : t('ai.errorGeneric'));
        }
        // On hard error, clear queue so we don't cascade failures.
        clearQueuedTurns();
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setTurns((current) =>
        current.map((turn) =>
          turn.id === assistantId && turn.streaming
            ? { ...turn, streaming: false }
            : turn,
        ),
      );
      setIsBusy(false);
      isBusyRef.current = false;
      if (queueRef.current.length > 0) {
        void drainQueue();
      }
    }
  }

  function handleStop(): void {
    abortRef.current?.abort();
  }

  function submitText(content: string): void {
    const trimmed = content.trim();
    if (readOnly || !configured || trimmed.length === 0) {
      return;
    }

    const userTurnId = `${idPrefix}-user-${Date.now()}`;
    const focusedFieldIds = extractMentionedFieldIds(trimmed, knownFieldIds);
    const focusedFieldTypes = extractMentionedFieldTypes(trimmed);
    const willQueue = isBusyRef.current;
    const userTurn: ChatTurn = {
      id: userTurnId,
      role: 'user',
      content: trimmed,
      queued: willQueue || undefined,
    };
    setInput('');
    setError(null);
    setStopped(false);
    setTurns((current) => [
      ...current.filter((turn) => !turn.failed),
      userTurn,
    ]);

    if (willQueue) {
      queueRef.current.push({
        userTurnId,
        content: trimmed,
        focusedFieldIds,
        focusedFieldTypes,
      });
      return;
    }

    const nextTurns = [
      ...turnsRef.current.filter((turn) => !turn.failed),
      userTurn,
    ];
    void runStream({
      messages: toApiMessages(nextTurns),
      focusedFieldIds,
      focusedFieldTypes,
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    submitText(input);
  }

  function handleRetry(): void {
    if (!canRetry || pendingPayload === null) {
      return;
    }
    setTurns((current) =>
      current.map((turn) => (turn.failed ? { ...turn, failed: false } : turn)),
    );
    void runStream(pendingPayload);
  }

  function handlePickPrompt(prompt: string): void {
    if (readOnly || !configured) {
      return;
    }
    submitText(prompt);
  }

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
          {statusQuery.data?.model ? (
            <span className='ai-chat-model shrink-0'>
              {statusQuery.data.model}
            </span>
          ) : null}
          <Button
            type='button'
            variant='ghost'
            size='icon-sm'
            className='absolute top-2.5 right-2.5 rounded-full'
            aria-label={t('ai.close')}
            onClick={() => {
              if (isBusy) {
                handleStop();
              }
              clearQueuedTurns();
              onOpenChange(false);
            }}
          >
            <XIcon className='size-4' />
          </Button>
        </div>
      </header>

      <div className='flex min-h-0 flex-1 flex-col'>
        {statusQuery.isLoading ? (
          <div className='flex flex-1 items-center justify-center'>
            <Spinner className='size-5 text-muted-foreground' />
          </div>
        ) : null}

        {!statusQuery.isLoading && !configured ? (
          <div className='p-4'>
            <Alert>
              <AlertDescription>{t('ai.notConfigured')}</AlertDescription>
            </Alert>
          </div>
        ) : null}

        {!statusQuery.isLoading && configured ? (
          <>
            <ChatTranscript
              turns={turns}
              fieldsById={fieldsById}
              typesBySlug={typesBySlug}
              isBusy={isBusy}
              error={error}
              stopped={stopped}
              canRetry={canRetry}
              idPrefix={idPrefix}
              onRetry={handleRetry}
              onPickPrompt={handlePickPrompt}
              onRemoveQueued={handleRemoveQueued}
            />

            <div className='ai-chat-composer-wrap shrink-0 px-3 pb-3'>
              <ChatComposer
                value={input}
                model={model}
                locale={locale}
                modelLabel={
                  statusQuery.data?.model
                    ? isBusy && canSubmit
                      ? t('ai.queueHint')
                      : t('ai.composerHint')
                    : null
                }
                disabled={readOnly}
                canSubmit={canSubmit}
                canRetry={canRetry}
                isBusy={isBusy}
                onChange={setInput}
                onSubmit={handleSubmit}
                onRetry={handleRetry}
                onStop={handleStop}
              />
            </div>
          </>
        ) : null}
      </div>
    </aside>
  );
}
