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
import { useIsMobile } from '@/hooks/use-mobile.ts';

import { buildMentionableTypes } from './buildMentionableTypes.ts';
import type { ChatTurn } from './chatTurns.ts';
import { turnsToFormAiMessages } from './chatTurns.ts';
import {
  extractMentionedFieldIds,
  listMentionableFields,
} from './fieldMentions.ts';
import { extractMentionedFieldTypes } from './fieldTypeMentions.ts';
import type { FormAiChatPanelProps } from './FormAiChatPanel.tsx';
import { FormAiChatSheetView } from './FormAiChatSheetView.tsx';
import type {
  PendingChatPayload,
  QueuedMessage,
} from './runFormAiChatStream.ts';
import { useAiChatStreamCommand } from './useAiChatStreamCommand.ts';
import { useAiChatStreamLifecycle } from './useAiChatStreamLifecycle.ts';
import { usePersistedChatTurns } from './usePersistedChatTurns.ts';

interface FormAiChatSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formCode: string;
  locale: string;
  model: FormDraftModel;
  readOnly: boolean;
  onApplyDraft: (next: FormDraftModel) => void;
}

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
  const isMobile = useIsMobile();
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

  useAiChatStreamLifecycle({
    turns,
    setTurns,
    isBusy,
    abortRef,
    clearStorage,
  });

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

  const { runStream, handleStop, clearQueuedTurns, handleRemoveQueued } =
    useAiChatStreamCommand({
      formCode,
      locale,
      idPrefix,
      isBusyRef,
      modelRef,
      userInitiatedStopRef,
      onApplyDraft,
      abortRef,
      queueRef,
      setTurns,
      setError,
      setIsBusy,
      setStopped,
      setPendingPayload,
      buildPayloadForUserTurn,
      errorGeneric: t('ai.errorGeneric'),
    });

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

  const handleClear = useCallback((): void => {
    if (isBusy) {
      handleStop();
    }
    clearQueuedTurns();
    queueRef.current = [];
    userInitiatedStopRef.current = false;
    setComposer((prev) => ({ value: '', key: prev.key + 1 }));
    setError(null);
    setStopped(false);
    setPendingPayload(null);
    setTurns([]);
    if (persistEnabled) {
      clearStorage();
    }
  }, [
    isBusy,
    handleStop,
    clearQueuedTurns,
    persistEnabled,
    clearStorage,
    setTurns,
  ]);

  if (!open) {
    return null;
  }

  const panelProps: FormAiChatPanelProps = {
    aiSettingsOpen,
    configured,
    draftModel: model,
    error,
    fieldsById,
    input: composer.value,
    composerKey: composer.key,
    interaction: {
      canRetry,
      canSubmit,
      busy: isBusy,
      statusLoading: statusQuery.isLoading,
    },
    locale,
    modelLabel,
    modelName: statusQuery.data?.model ?? null,
    onAiSettingsOpenChange: setAiSettingsOpen,
    onChange: (value: string) => {
      setComposer((prev) => ({ ...prev, value }));
    },
    onClear: handleClear,
    onClose: handleClose,
    onOpenSettings: () => {
      setAiSettingsOpen(true);
    },
    onPickPrompt: handlePickPrompt,
    onRemoveQueued: handleRemoveQueued,
    onRetry: handleRetry,
    onStop: handleStop,
    onSubmit: handleSubmit,
    persistChat: persistEnabled,
    onTogglePersist: togglePersist,
    stopped,
    turns,
    typesBySlug,
    readOnly,
  } as const;

  return (
    <FormAiChatSheetView
      open={open}
      isMobile={isMobile}
      onOpenChange={onOpenChange}
      panelProps={panelProps}
    />
  );
}
