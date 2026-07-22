import { useQuery } from '@tanstack/react-query';
import type { FormEvent, JSX } from 'react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { getFormAiStatus } from '@/api/ai.ts';
import type { FormDraftModel } from '@/features/forms/types.ts';

import { buildMentionableTypes } from './buildMentionableTypes.ts';
import type { ChatTurn } from './chatTurns.ts';
import { turnsToFormAiMessages } from './chatTurns.ts';
import {
  extractMentionedFieldIds,
  listMentionableFields,
} from './fieldMentions.ts';
import { extractMentionedFieldTypes } from './fieldTypeMentions.ts';
import { FormAiChatPanel } from './FormAiChatPanel.tsx';
import {
  type PendingChatPayload,
  type QueuedMessage,
  runFormAiChatStream,
} from './runFormAiChatStream.ts';
import { usePersistedChatTurns } from './usePersistedChatTurns.ts';

export { ChatAiTrigger as FormAiChatTrigger } from './ChatComposer.tsx';

interface FormAiChatSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formCode: string;
  locale: string;
  model: FormDraftModel;
  readOnly: boolean;
  onApplyDraft: (next: FormDraftModel) => void;
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
}: FormAiChatSheetProps): JSX.Element | null {
  const { t } = useTranslation('designer');
  const idPrefix = useId();
  const abortRef = useRef<AbortController | null>(null);
  const queueRef = useRef<QueuedMessage[]>([]);
  const isBusyRef = useRef(false);
  const userInitiatedStopRef = useRef(false);
  const modelRef = useRef(model);
  const { clearStorage, persistEnabled, togglePersist, turns, setTurns } =
    usePersistedChatTurns(formCode, locale);
  const [composer, setComposer] = useState({ value: '', key: 0 });
  const [error, setError] = useState<string | null>(null);
  const [stopped, setStopped] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [pendingPayload, setPendingPayload] =
    useState<PendingChatPayload | null>(null);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);

  useEffect(() => {
    modelRef.current = model;
  }, [model]);

  useEffect(() => {
    isBusyRef.current = isBusy;
  }, [isBusy]);

  // Watchdog: if an assistant turn is still marked `streaming: true` while
  // Its content has been rendered (i.e. the `done` handler ran) but the
  // Spinner stays visible, force `streaming: false` on the next animation
  // Frame. This is a defensive backstop for the rare cases where React
  // Batches reorders state updates and the UI lags behind the model.
  useEffect(() => {
    const stuck = turns.some(
      (turn) =>
        turn.role === 'assistant' && turn.streaming && turn.content.length > 0,
    );
    if (!stuck) {
      return undefined;
    }
    const handle = requestAnimationFrame(() => {
      setTurns((current) =>
        current.map((turn) =>
          turn.role === 'assistant' && turn.streaming && turn.content.length > 0
            ? { ...turn, streaming: false }
            : turn,
        ),
      );
    });
    return () => {
      cancelAnimationFrame(handle);
    };
  }, [turns]);

  // Cancel any in-flight stream if the chat sheet is torn down (route change,
  // StrictMode double-mount, etc.) so background requests don't keep arriving.
  // The persisted transcript is dropped only when we leave the designer route;
  // Toggling the panel keeps the conversation alive across reloads.
  const clearStorageRef = useRef(clearStorage);
  useEffect(() => {
    clearStorageRef.current = clearStorage;
  }, [clearStorage]);
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
      clearStorageRef.current();
    };
  }, []);

  const mentionable = useMemo(() => listMentionableFields(model), [model]);
  const fieldsById = useMemo(
    () => new Map(mentionable.map((field) => [field.id, field])),
    [mentionable],
  );
  const knownFieldIds = useMemo(
    () => new Set(mentionable.map((field) => field.id)),
    [mentionable],
  );
  const mentionableTypes = useMemo(
    () => buildMentionableTypes(locale, t),
    [locale, t],
  );
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

  const buildPayloadForUserTurn = useCallback(
    (
      userTurnId: string,
      content: string,
      focusedFieldIds: string[],
      focusedFieldTypes: string[],
    ): PendingChatPayload => {
      const current = turns.filter((turn) => !turn.failed);
      const index = current.findIndex((turn) => turn.id === userTurnId);
      const slice =
        index === -1
          ? [
              ...current,
              {
                id: userTurnId,
                role: 'user' as const,
                content,
              },
            ]
          : current.slice(0, index + 1);
      return {
        messages: turnsToFormAiMessages(slice),
        focusedFieldIds,
        focusedFieldTypes,
      };
    },
    [turns],
  );

  const configured = statusQuery.data?.configured === true;
  const canSubmit = !readOnly && configured && composer.value.trim().length > 0;
  const canRetry =
    !readOnly &&
    configured &&
    !isBusy &&
    pendingPayload !== null &&
    (error !== null || stopped);
  let modelLabel: string | null = null;
  if (statusQuery.data?.model) {
    modelLabel = t('ai.composerHint');
    if (isBusy && canSubmit) {
      modelLabel = t('ai.queueHint');
    }
  }

  async function runStream(payload: PendingChatPayload): Promise<void> {
    await runFormAiChatStream({
      abortRef,
      clearQueuedTurns,
      clearStoppedFlag: () => {
        userInitiatedStopRef.current = false;
      },
      drainQueue,
      errorGeneric: t('ai.errorGeneric'),
      formCode,
      idPrefix,
      isBusyRef,
      locale,
      modelRef,
      onApplyDraft,
      payload,
      queueRef,
      wasUserStopped: userInitiatedStopRef.current,
      setError,
      setIsBusy,
      setPendingPayload,
      setStopped,
      setTurns,
    });
  }

  function handleStop(): void {
    userInitiatedStopRef.current = true;
    abortRef.current?.abort();
  }

  function clearQueuedTurns(): void {
    queueRef.current = [];
    setTurns((current) => current.filter((turn) => !turn.queued));
  }

  async function drainQueue(): Promise<void> {
    const next = queueRef.current.shift();
    if (!next) {
      return;
    }
    setTurns((current) =>
      current.map((turn) =>
        turn.id === next.userTurnId ? { ...turn, queued: false } : turn,
      ),
    );
    const payload = buildPayloadForUserTurn(
      next.userTurnId,
      next.content,
      next.focusedFieldIds,
      next.focusedFieldTypes,
    );
    await runStream(payload);
  }

  function handleRemoveQueued(turnId: string): void {
    queueRef.current = queueRef.current.filter(
      (item) => item.userTurnId !== turnId,
    );
    setTurns((current) => current.filter((turn) => turn.id !== turnId));
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
    setComposer((prev) => ({ value: '', key: prev.key + 1 }));
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

    void runStream(
      buildPayloadForUserTurn(
        userTurnId,
        trimmed,
        focusedFieldIds,
        focusedFieldTypes,
      ),
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    submitText(composer.value);
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

  function handleClose(): void {
    if (isBusy) {
      handleStop();
    }
    clearQueuedTurns();
    onOpenChange(false);
  }

  if (!open) {
    return null;
  }

  return (
    <FormAiChatPanel
      aiSettingsOpen={aiSettingsOpen}
      configured={configured}
      draftModel={model}
      error={error}
      fieldsById={fieldsById}
      idPrefix={idPrefix}
      input={composer.value}
      composerKey={composer.key}
      interaction={{
        canRetry,
        canSubmit,
        busy: isBusy,
        statusLoading: statusQuery.isLoading,
      }}
      locale={locale}
      modelLabel={modelLabel}
      modelName={statusQuery.data?.model ?? null}
      onAiSettingsOpenChange={setAiSettingsOpen}
      onChange={(value) => {
        setComposer((prev) => ({ ...prev, value }));
      }}
      onClose={handleClose}
      onOpenSettings={() => {
        setAiSettingsOpen(true);
      }}
      onPickPrompt={handlePickPrompt}
      onRemoveQueued={handleRemoveQueued}
      onRetry={handleRetry}
      onStop={handleStop}
      onSubmit={handleSubmit}
      persistChat={persistEnabled}
      onTogglePersist={togglePersist}
      stopped={stopped}
      turns={turns}
      typesBySlug={typesBySlug}
      readOnly={readOnly}
    />
  );
}
