import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type { FormAiChatMessage } from '@/api/form-ai-chat.ts';
import {
  parseDraft,
  serializeDraft,
  syncRulesSchema,
  syncUiSchema,
} from '@/features/forms/model/formDraft.ts';
import type { FormDraftModel } from '@/features/forms/types.ts';

import {
  findLastUserTurn,
  markTurnFailed,
  patchAssistant,
  resetAssistantForRetry,
  settleAssistantStreaming,
} from './chatStreamTurnHelpers.ts';
import type { ChatTurn } from './chatTurns.ts';
import {
  playErrorNotificationSound,
  playNotificationSound,
} from './playNotificationSound.ts';
import { runStreamAttempt } from './runFormAiChatStreamAttempt.ts';
import {
  EMPTY_AI_SCHEMA_MESSAGE,
  isRetryableAiErrorMessage,
} from './transientAiRetry.ts';

export interface PendingChatPayload {
  messages: FormAiChatMessage[];
  focusedFieldIds: string[];
  focusedFieldTypes: string[];
}

export interface QueuedMessage {
  userTurnId: string;
  content: string;
  focusedFieldIds: string[];
  focusedFieldTypes: string[];
}

interface RunFormAiChatStreamOptions {
  abortRef: MutableRefObject<AbortController | null>;
  /** Set by the previous stream's stop/abort path so we can suppress the
   *  "stopped" banner when a newer stream replaces an old one. Cleared on
   *  every new stream call so only the latest intent matters. */
  clearStoppedFlag: () => void;
  drainQueue: () => Promise<void>;
  errorGeneric: string;
  errorTimeout: string;
  formCode: string;
  idPrefix: string;
  isBusyRef: MutableRefObject<boolean>;
  locale: string;
  modelRef: MutableRefObject<FormDraftModel>;
  onApplyDraft: (next: FormDraftModel) => void;
  payload: PendingChatPayload;
  queueRef: MutableRefObject<QueuedMessage[]>;
  /** Live check for an explicit Stop click (not a snapshot at stream start). */
  isUserStopped: () => boolean;
  setError: Dispatch<SetStateAction<string | null>>;
  setIsBusy: Dispatch<SetStateAction<boolean>>;
  setPendingPayload: Dispatch<SetStateAction<PendingChatPayload | null>>;
  setStopped: Dispatch<SetStateAction<boolean>>;
  setTurns: Dispatch<SetStateAction<ChatTurn[]>>;
  clearQueuedTurns: () => void;
}

/** Convenience re-export so callers can import the attempt types from the
 *  Single chat-stream entry point. */
export type {
  AttemptResult,
  AttemptTelemetry,
} from './runFormAiChatStreamAttempt.ts';

export async function runFormAiChatStream({
  abortRef,
  clearQueuedTurns,
  clearStoppedFlag,
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
  isUserStopped,
  setError,
  setIsBusy,
  setPendingPayload,
  setStopped,
  setTurns,
}: RunFormAiChatStreamOptions): Promise<void> {
  // Cancel any in-flight turn (replaced by this one). That abort is silent —
  // Only user Stop and per-attempt timeouts are surfaced below.
  abortRef.current?.abort();
  setPendingPayload(payload);
  setError(null);
  setStopped(false);
  clearStoppedFlag();
  setIsBusy(true);
  isBusyRef.current = true;

  const assistantId = `${idPrefix}-assistant-${Date.now()}`;
  setTurns((current) => [
    ...current.map((turn) => (turn.failed ? { ...turn, failed: false } : turn)),
    {
      id: assistantId,
      role: 'assistant',
      content: '',
      streaming: true,
    },
  ]);

  const promptChars = payload.messages.reduce(
    (sum, message) => sum + message.content.length,
    0,
  );

  const runAttempt = runStreamAttempt({
    abortRef,
    assistantId,
    errorGeneric,
    errorTimeout,
    formCode,
    isUserStopped,
    isRetryable: isRetryableAiErrorMessage,
    locale,
    modelRef,
    onApplyDone: (event, turnContentSnapshot) => {
      applyDoneEvent({
        assistantId,
        modelRef,
        onApplyDraft,
        result: event.result,
        setError,
        setPendingPayload,
        setStopped,
        setTurns,
        turnContentSnapshot,
      });
    },
    payload,
    promptChars,
    setError,
    setPendingPayload,
    setStopped,
    setTurns,
  });

  /**
   * Auto-retry once on transient parse failures, empty schema payloads, or
   * Client safety timeouts. User Stop and non-recoverable errors are not
   * Retried. Each attempt owns its own AbortController so a timed-out signal
   * Does not block the retry.
   */
  const attemptResult = await runAttempt(1);
  let errorMessage: string | null = null;
  let wasAborted = false;

  const canRetry =
    !isUserStopped() &&
    attemptResult.status === 'failed' &&
    Boolean(attemptResult.retryable);

  if (canRetry) {
    resetAssistantForRetry(setTurns, assistantId);
    const retry = await runAttempt(2);
    if (retry.status === 'succeeded') {
      finalizeSuccess();
      return;
    }
    if (retry.status === 'aborted') {
      wasAborted = true;
    } else {
      errorMessage = retry.message;
    }
  } else if (attemptResult.status === 'failed') {
    errorMessage = attemptResult.message;
  } else if (attemptResult.status === 'aborted') {
    wasAborted = true;
  }

  if (errorMessage === null && !wasAborted) {
    // Attempt succeeded but the stream drained without `done`. Treat as a
    // Success path so the UI clears the spinner. The existing event loop
    // Already handled the `done` event earlier, so this branch is mostly
    // Defensive.
    finalizeSuccess();
    return;
  }

  function finalizeSuccess(): void {
    setIsBusy(false);
    isBusyRef.current = false;
    if (queueRef.current.length > 0) {
      void drainQueue();
    }
  }

  if (wasAborted) {
    settleAssistantStreaming(setTurns, assistantId);
    setError(null);
    // Only surface the "generation stopped" banner when the user
    // Explicitly hit Stop. Replaced streams should not leave a stale card.
    setStopped(isUserStopped());
    // Keep queue for after stop settles — still drain next.
  } else if (errorMessage !== null) {
    const errMessage = errorMessage;
    setTurns((current) => {
      const withoutStreaming = current.filter(
        (turn) => turn.id !== assistantId || turn.content.length > 0,
      );
      const lastUser = findLastUserTurn(withoutStreaming);
      return withoutStreaming.flatMap((turn) =>
        turn.id === assistantId ? [] : [markTurnFailed(turn, lastUser?.id)],
      );
    });

    setStopped(false);
    setError(errMessage);
    // On hard error, clear queue so we don't cascade failures.
    clearQueuedTurns();
    playErrorNotificationSound();
    settleAssistantStreaming(setTurns, assistantId);
  }

  finalizeSuccess();
}

function applyDoneEvent({
  assistantId,
  modelRef,
  onApplyDraft,
  result,
  setError,
  setPendingPayload,
  setStopped,
  setTurns,
  turnContentSnapshot,
}: {
  assistantId: string;
  modelRef: MutableRefObject<FormDraftModel>;
  onApplyDraft: (next: FormDraftModel) => void;
  result: {
    clinicalSchemaJson: string;
    uiSchemaJson: string;
    rulesSchemaJson: string;
    assistantMessage: string;
    summary: string;
  };
  setError: Dispatch<SetStateAction<string | null>>;
  setPendingPayload: Dispatch<SetStateAction<PendingChatPayload | null>>;
  setStopped: Dispatch<SetStateAction<boolean>>;
  setTurns: Dispatch<SetStateAction<ChatTurn[]>>;
  turnContentSnapshot: string;
}): void {
  const {
    clinicalSchemaJson,
    uiSchemaJson,
    rulesSchemaJson,
    assistantMessage,
    summary,
  } = result;
  const before = serializeDraft(modelRef.current);
  const normalizedUiSchemaJson = uiSchemaJson ?? null;
  const normalizedRulesSchemaJson = rulesSchemaJson ?? null;
  const draftChanged =
    before.clinicalSchemaJson !== clinicalSchemaJson ||
    before.uiSchemaJson !== normalizedUiSchemaJson ||
    before.rulesSchemaJson !== normalizedRulesSchemaJson;
  // Defensive: `streamFormDraftAi` may synthesize a `done` when the
  // Upstream SSE closes early (no `done`, no `error`). That
  // Synthetic payload carries empty schema strings; matching it
  // Against the live draft would falsely report `draftChanged: true`
  // And then crash inside `parseDraft(JSON.parse(''))`. Treat any
  // Empty schema as "nothing usable arrived" so the outer retry
  // Layer can take over.
  const resultEmpty =
    clinicalSchemaJson.length === 0 &&
    (uiSchemaJson ?? '').length === 0 &&
    (rulesSchemaJson ?? '').length === 0;
  if (resultEmpty) {
    throw new Error(EMPTY_AI_SCHEMA_MESSAGE);
  }
  const finalContent = assistantMessage || turnContentSnapshot || '';
  patchAssistant(setTurns, assistantId, (turn) => ({
    ...turn,
    content: finalContent,
    streaming: false,
    streamPhase: undefined,
    draftApplied: draftChanged,
    appliedSummary: draftChanged ? summary.trim() || undefined : undefined,
  }));
  // Re-apply `streaming: false` on the next frame in case React
  // Batched a competing `setTurns` (from a queued drain, etc.) after
  // This patch. This guarantees the spinner stops even when concurrent
  // Rendering reorders state updates around the `done` handler.
  requestAnimationFrame(() => {
    patchAssistant(setTurns, assistantId, (turn) =>
      turn.streaming
        ? { ...turn, streaming: false, streamPhase: undefined }
        : turn,
    );
  });
  if (draftChanged) {
    const parsed = parseDraft({
      clinicalSchemaJson,
      uiSchemaJson,
      rulesSchemaJson,
    });
    // Sync UI/rules (incl. layout order) before apply so preview matches the
    // Designer canvas immediately, and so queued follow-ups serialize the
    // Applied draft rather than a stale modelRef from before React re-renders.
    const next: FormDraftModel = {
      clinical: parsed.clinical,
      ui: syncUiSchema(parsed.clinical, parsed.ui),
      rules: syncRulesSchema(parsed.clinical, parsed.rules),
    };
    modelRef.current = next;
    onApplyDraft(next);
  }
  setPendingPayload(null);
  setError(null);
  setStopped(false);
  playNotificationSound();
}
