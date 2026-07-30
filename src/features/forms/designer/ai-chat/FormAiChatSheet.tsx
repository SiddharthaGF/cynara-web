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
import { splitPromptIntoBlocks } from './splitPrompt.ts';
import { useAiChatStreamCommand } from './useAiChatStreamCommand.ts';
import { useAiChatStreamLifecycle } from './useAiChatStreamLifecycle.ts';
import { usePersistedChatTurns } from './usePersistedChatTurns.ts';

export interface FormAiChatSheetProps {
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
  const chat = usePersistedChatTurns(formCode, locale);
  const [composer, setComposer] = useState({ value: '', key: 0 });
  const [error, setError] = useState<string | null>(null);
  const [stopped, setStopped] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [pendingPayload, setPendingPayload] =
    useState<PendingChatPayload | null>(null);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const statusQuery = useQuery({
    queryKey: ['ai', 'status'],
    queryFn: getFormAiStatus,
    staleTime: 60_000,
    enabled: open,
  });
  useEffect(() => {
    modelRef.current = model;
  }, [model]);
  useEffect(() => {
    isBusyRef.current = isBusy;
  }, [isBusy]);
  useAiChatStreamLifecycle({
    turns: chat.turns,
    setTurns: chat.setTurns,
    isBusy,
    abortRef,
    clearStorage: chat.clearStorage,
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
  const buildPayloadForUserTurn = useCallback(
    (
      userTurnId: string,
      content: string,
      focusedFieldIds: string[],
      focusedFieldTypes: string[],
    ): PendingChatPayload => {
      const current = chat.turns.filter((turn) => !turn.failed);
      const index = current.findIndex((turn) => turn.id === userTurnId);
      const slice =
        index === -1
          ? [...current, { id: userTurnId, role: 'user' as const, content }]
          : current.slice(0, index + 1);
      return {
        messages: turnsToFormAiMessages(slice),
        focusedFieldIds,
        focusedFieldTypes,
      };
    },
    [chat.turns],
  );
  const stream = useAiChatStreamCommand({
    formCode,
    locale,
    idPrefix,
    isBusyRef,
    modelRef,
    userInitiatedStopRef,
    onApplyDraft,
    abortRef,
    queueRef,
    setTurns: chat.setTurns,
    setError,
    setIsBusy,
    setStopped,
    setPendingPayload,
    buildPayloadForUserTurn,
    errorGeneric: t('ai.errorGeneric'),
    errorTimeout: t('ai.errorTimeout'),
  });
  const configured = statusQuery.data?.configured === true;
  const canSubmit = !readOnly && configured && composer.value.trim().length > 0;
  const canRetry =
    !readOnly &&
    configured &&
    !isBusy &&
    pendingPayload !== null &&
    (error !== null || stopped);
  const submitText = (content: string): void => {
    const trimmed = content.trim();
    if (readOnly || !configured || trimmed.length === 0) {
      return;
    }
    const blocks = splitPromptIntoBlocks(trimmed);
    const focusedFieldIds = extractMentionedFieldIds(blocks[0], knownFieldIds);
    const focusedFieldTypes = extractMentionedFieldTypes(blocks[0]);
    const timestamp = Date.now();
    const userTurnIds = blocks.map(
      (_block, index) => `${idPrefix}-user-${timestamp}-${index}`,
    );
    const newTurns: ChatTurn[] = userTurnIds.map((id, index) => ({
      id,
      role: 'user',
      content: blocks[index],
      queued: index === 0 && isBusyRef.current ? true : undefined,
    }));
    setComposer((previous) => ({ value: '', key: previous.key + 1 }));
    setError(null);
    setStopped(false);
    chat.setTurns((current) => [
      ...current.filter((turn) => !turn.failed),
      ...newTurns,
    ]);
    for (let index = 1; index < userTurnIds.length; index += 1) {
      queueRef.current.push({
        userTurnId: userTurnIds[index],
        content: blocks[index],
        focusedFieldIds,
        focusedFieldTypes,
      });
    }
    if (isBusyRef.current) {
      return;
    }
    void stream.runStream(
      buildPayloadForUserTurn(
        userTurnIds[0],
        blocks[0],
        focusedFieldIds,
        focusedFieldTypes,
      ),
    );
  };
  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (canSubmit) {
      submitText(composer.value);
    }
  };
  const handleRetry = (): void => {
    if (!canRetry || pendingPayload === null) {
      return;
    }
    chat.setTurns((current) =>
      current.map((turn) => (turn.failed ? { ...turn, failed: false } : turn)),
    );
    void stream.runStream(pendingPayload);
  };
  const handleClose = (): void => {
    if (isBusy) {
      stream.handleStop();
    }
    stream.clearQueuedTurns();
    onOpenChange(false);
  };
  const handleClear = useCallback((): void => {
    if (isBusy) {
      stream.handleStop();
    }
    stream.clearQueuedTurns();
    queueRef.current = [];
    setComposer({ value: '', key: 0 });
    setError(null);
    setStopped(false);
    setPendingPayload(null);
    chat.setTurns([]);
    if (chat.persistEnabled) {
      chat.clearStorage();
    }
  }, [chat, isBusy, stream]);
  const handlePickPrompt = (prompt: string): void => {
    if (!readOnly && configured) {
      submitText(prompt);
    }
  };
  if (!open) {
    return null;
  }
  let modelLabel: string | null = null;
  if (statusQuery.data?.model) {
    modelLabel = t('ai.composerHint');
    if (isBusy && canSubmit) {
      modelLabel = t('ai.queueHint');
    }
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
      setComposer((previous) => ({ ...previous, value }));
    },
    onClear: handleClear,
    onClose: handleClose,
    onOpenSettings: () => {
      setAiSettingsOpen(true);
    },
    onPickPrompt: handlePickPrompt,
    onRemoveQueued: stream.handleRemoveQueued,
    onRetry: handleRetry,
    onStop: stream.handleStop,
    onSubmit: handleSubmit,
    persistChat: chat.persistEnabled,
    onTogglePersist: chat.togglePersist,
    stopped,
    turns: chat.turns,
    typesBySlug,
    readOnly,
  };
  return (
    <FormAiChatSheetView
      open={open}
      isMobile={isMobile}
      onOpenChange={onOpenChange}
      panelProps={panelProps}
    />
  );
}
