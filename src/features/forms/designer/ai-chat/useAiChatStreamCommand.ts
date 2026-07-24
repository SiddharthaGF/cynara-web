import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';

import type { FormDraftModel } from '@/features/forms/types.ts';

import type { ChatTurn } from './chatTurns.ts';
import {
  type PendingChatPayload,
  type QueuedMessage,
  runFormAiChatStream,
} from './runFormAiChatStream.ts';

export type BuildPayloadForUserTurn = (
  userTurnId: string,
  content: string,
  focusedFieldIds: string[],
  focusedFieldTypes: string[],
) => PendingChatPayload;

interface UseAiChatStreamCommandOptions {
  formCode: string;
  locale: string;
  idPrefix: string;
  isBusyRef: React.MutableRefObject<boolean>;
  modelRef: React.MutableRefObject<FormDraftModel>;
  userInitiatedStopRef: React.MutableRefObject<boolean>;
  onApplyDraft: (next: FormDraftModel) => void;
  abortRef: React.MutableRefObject<AbortController | null>;
  queueRef: React.MutableRefObject<QueuedMessage[]>;
  setTurns: Dispatch<SetStateAction<ChatTurn[]>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setIsBusy: Dispatch<SetStateAction<boolean>>;
  setStopped: Dispatch<SetStateAction<boolean>>;
  setPendingPayload: Dispatch<SetStateAction<PendingChatPayload | null>>;
  buildPayloadForUserTurn: BuildPayloadForUserTurn;
  errorGeneric: string;
  errorTimeout: string;
}

export interface UseAiChatStreamCommand {
  runStream: (payload: PendingChatPayload) => Promise<void>;
  handleStop: () => void;
  clearQueuedTurns: () => void;
  handleRemoveQueued: (turnId: string) => void;
}

/**
 * Owns the imperative surface that drives the AI chat stream lifecycle:
 * running a stream, aborting it, draining the queue, and dropping queued
 * turns. The parent component owns the actual `turns` / `isBusy` state —
 * this hook only manipulates them through the setters it receives.
 */
export function useAiChatStreamCommand({
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
  errorGeneric,
  errorTimeout,
}: UseAiChatStreamCommandOptions): UseAiChatStreamCommand {
  // Latest-ref dance so the imperative handlers always see the current
  // Props without re-creating the `runStream` closure on every render.
  const buildPayloadRef = useRef(buildPayloadForUserTurn);
  useEffect(() => {
    buildPayloadRef.current = buildPayloadForUserTurn;
  });

  async function runStream(payload: PendingChatPayload): Promise<void> {
    await runFormAiChatStream({
      abortRef,
      clearQueuedTurns,
      clearStoppedFlag: () => {
        userInitiatedStopRef.current = false;
      },
      drainQueue,
      errorGeneric,
      errorTimeout,
      formCode,
      idPrefix,
      isBusyRef,
      locale,
      modelRef,
      onApplyDraft,
      payload,
      queueRef,
      isUserStopped: () => userInitiatedStopRef.current,
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
    const payload = buildPayloadRef.current(
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

  return {
    runStream,
    handleStop,
    clearQueuedTurns,
    handleRemoveQueued,
  };
}
