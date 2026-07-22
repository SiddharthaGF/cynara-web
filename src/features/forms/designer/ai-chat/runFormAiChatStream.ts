import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import {
  type FormAiChatMessage,
  isRequestAborted,
  streamFormDraftAi,
} from '@/api/forms.ts';
import {
  parseDraft,
  serializeDraft,
} from '@/features/forms/model/formDraft.ts';
import type { FormDraftModel } from '@/features/forms/types.ts';

import type { ChatTurn } from './chatTurns.ts';
import {
  playErrorNotificationSound,
  playNotificationSound,
} from './playNotificationSound.ts';
import {
  EMPTY_AI_SCHEMA_MESSAGE,
  isTransientAiErrorMessage,
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
  formCode: string;
  idPrefix: string;
  isBusyRef: MutableRefObject<boolean>;
  locale: string;
  modelRef: MutableRefObject<FormDraftModel>;
  onApplyDraft: (next: FormDraftModel) => void;
  payload: PendingChatPayload;
  queueRef: MutableRefObject<QueuedMessage[]>;
  /** True only when the previous stream was aborted by the user clicking
   *  Stop. Internal cancels (replaced stream, 60s safety timeout) leave
   *  this false so we don't show a misleading "generation stopped" banner. */
  wasUserStopped: boolean;
  setError: Dispatch<SetStateAction<string | null>>;
  setIsBusy: Dispatch<SetStateAction<boolean>>;
  setPendingPayload: Dispatch<SetStateAction<PendingChatPayload | null>>;
  setStopped: Dispatch<SetStateAction<boolean>>;
  setTurns: Dispatch<SetStateAction<ChatTurn[]>>;
  clearQueuedTurns: () => void;
}

export async function runFormAiChatStream({
  abortRef,
  clearQueuedTurns,
  clearStoppedFlag,
  drainQueue,
  errorGeneric,
  formCode,
  idPrefix,
  isBusyRef,
  locale,
  modelRef,
  onApplyDraft,
  payload,
  queueRef,
  wasUserStopped,
  setError,
  setIsBusy,
  setPendingPayload,
  setStopped,
  setTurns,
}: RunFormAiChatStreamOptions): Promise<void> {
  abortRef.current?.abort();
  const controller = new AbortController();
  abortRef.current = controller;
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

  // Safety net: cap any single chat turn at 60s so the UI never gets stuck
  // On the "writing reply" spinner if the upstream provider hangs without
  // Sending a terminal event. The controller is aborted, the SSE parser
  // Drains its buffer, and the synthetic `done` settles the turn.
  const streamTimeout = setTimeout(() => {
    if (abortRef.current === controller) {
      controller.abort();
    }
  }, 60_000);

  /**
   * Run the inner stream loop once. Returns the failure shape when the
   * upstream SSE errored; otherwise resolves void on success. Callers
   * decide whether to retry based on the failed shape.
   */
  const runAttempt = async (): Promise<
    | { status: 'succeeded' }
    | { status: 'aborted' }
    | { status: 'failed'; message: string }
  > => {
    let turnContentSnapshot = '';
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
          // Thinking events only indicate that the server is still working.
        } else if (event.type === 'phase') {
          // Phase hints are unreliable; rely on the assistant
          // Message + done event for the real state.
        } else if (event.type === 'message') {
          turnContentSnapshot = `${turnContentSnapshot}${event.delta}`;
          patchAssistant(setTurns, assistantId, (turn) => ({
            ...turn,
            content: `${turn.content}${event.delta}`,
          }));
        } else if (event.type === 'error') {
          throw new Error(event.message);
        } else if (event.type === 'done') {
          const {
            clinicalSchemaJson,
            uiSchemaJson,
            rulesSchemaJson,
            assistantMessage,
            summary,
          } = event.result;
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
            draftApplied: draftChanged,
            appliedSummary: draftChanged
              ? summary.trim() || undefined
              : undefined,
          }));
          // Re-apply `streaming: false` on the next frame in case React
          // Batched a competing `setTurns` (from a queued drain, etc.) after
          // This patch. This guarantees the spinner stops even when concurrent
          // Rendering reorders state updates around the `done` handler.
          requestAnimationFrame(() => {
            patchAssistant(setTurns, assistantId, (turn) =>
              turn.streaming ? { ...turn, streaming: false } : turn,
            );
          });
          if (draftChanged) {
            onApplyDraft(
              parseDraft({
                clinicalSchemaJson,
                uiSchemaJson,
                rulesSchemaJson,
              }),
            );
          }
          setPendingPayload(null);
          setError(null);
          setStopped(false);
          playNotificationSound();
          return { status: 'succeeded' };
        }
      }
      return { status: 'succeeded' };
    } catch (error) {
      if (isRequestAborted(error)) {
        return { status: 'aborted' };
      }
      return {
        status: 'failed',
        message: error instanceof Error ? error.message : errorGeneric,
      };
    }
  };

  /**
   * Auto-retry once when the upstream produced a transient parse failure.
   * The `cynara-api` LLM provider occasionally emits truncated/malformed
   * JSON for short prompts; a second invocation almost always lands a clean
   * schema. We do not retry user aborts, network failures, or non-recoverable
   * errors. We also do not retry when the assistant never produced any
   * content (suggests auth/billing issue, not a flaky parse).
   */
  const attemptResult = await runAttempt();
  let errorMessage: string | null = null;
  let wasAborted = false;
  if (attemptResult.status === 'failed') {
    if (
      isTransientAiErrorMessage(attemptResult.message) &&
      !wasUserStopped &&
      !controller.signal.aborted
    ) {
      // Reset the assistant turn in-place so the user sees a fresh spinner
      // Without a duplicate bubble; keep the same `assistantId` so the
      // Conversation UI looks like one continuous reply.
      patchAssistant(setTurns, assistantId, (turn) => ({
        ...turn,
        content: '',
        streaming: true,
      }));
      const retry = await runAttempt();
      if (retry.status === 'succeeded') {
        finalizeSuccess();
        return;
      }
      if (retry.status === 'aborted') {
        wasAborted = true;
      } else {
        errorMessage = retry.message;
      }
    } else if (
      attemptResult.message === EMPTY_AI_SCHEMA_MESSAGE &&
      !wasUserStopped &&
      !controller.signal.aborted
    ) {
      // Stream closed without `done` or `error` (common when the provider
      // Flushes a `phase:schema` then drops the socket). One more try.
      patchAssistant(setTurns, assistantId, (turn) => ({
        ...turn,
        content: '',
        streaming: true,
      }));
      const retry = await runAttempt();
      if (retry.status === 'succeeded') {
        finalizeSuccess();
        return;
      }
      if (retry.status === 'aborted') {
        wasAborted = true;
      } else {
        errorMessage = retry.message;
      }
    } else {
      errorMessage = attemptResult.message;
    }
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
    clearTimeout(streamTimeout);
    if (abortRef.current === controller) {
      abortRef.current = null;
    }
    setIsBusy(false);
    isBusyRef.current = false;
    if (queueRef.current.length > 0) {
      void drainQueue();
    }
  }

  if (wasAborted) {
    setTurns((current) =>
      current.map((turn) =>
        turn.id === assistantId && turn.streaming
          ? { ...turn, streaming: false }
          : turn,
      ),
    );
    setError(null);
    // Only surface the "generation stopped" banner when the user
    // Explicitly hit Stop. Replaced streams and the 60s safety timeout
    // Should not leave a stale card on screen.
    if (wasUserStopped) {
      setStopped(true);
    } else {
      setStopped(false);
    }
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
    // Force `streaming: false` defensively so the UI spinner stops even
    // When the assistant turn somehow survives the catch block above.
    setTurns((current) =>
      current.map((turn) =>
        turn.id === assistantId && turn.streaming
          ? { ...turn, streaming: false }
          : turn,
      ),
    );
  }

  finalizeSuccess();
}

function patchAssistant(
  setTurns: Dispatch<SetStateAction<ChatTurn[]>>,
  assistantId: string,
  patch: (turn: ChatTurn) => ChatTurn,
): void {
  setTurns((current) =>
    current.map((turn) => (turn.id === assistantId ? patch(turn) : turn)),
  );
}

function markTurnFailed(turn: ChatTurn, failedTurnId?: string): ChatTurn {
  if (turn.id !== failedTurnId) {
    return turn;
  }
  return { ...turn, failed: true };
}

function findLastUserTurn(turns: ChatTurn[]): ChatTurn | undefined {
  let latest: ChatTurn | undefined = undefined;
  for (const turn of turns) {
    if (turn.role === 'user') {
      latest = turn;
    }
  }
  return latest;
}
