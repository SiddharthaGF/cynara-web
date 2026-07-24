import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import {
  type FormAiStreamEvent,
  isRequestAborted,
  streamFormDraftAi,
} from '@/api/form-ai-chat.ts';
import { serializeDraft } from '@/features/forms/model/formDraft.ts';
import type { FormDraftModel } from '@/features/forms/types.ts';

import { patchAssistant } from './chatStreamTurnHelpers.ts';
import type { ChatTurn } from './chatTurns.ts';
import type { PendingChatPayload } from './runFormAiChatStream.ts';
import { recordStreamMetrics } from './streamTelemetry.ts';
import { AI_STREAM_TIMEOUT_MS } from './transientAiRetry.ts';

/** Per-attempt telemetry captured by the run-attempt helper. We never await
 *  the recorder; `recordStreamMetrics` swallows transport errors so the UI
 *  stays responsive even if the beacon endpoint is offline. */
export interface AttemptTelemetry {
  ttfbMs: number;
  totalMs: number;
  eventCount: number;
  phaseReached: 'message' | 'schema' | null;
  fallbackOutcome: string | null;
  status: 'succeeded' | 'failed';
  errorClass?: string;
}

export type AttemptResult =
  | { status: 'succeeded'; telemetry: AttemptTelemetry }
  | { status: 'aborted'; telemetry: AttemptTelemetry }
  | {
      status: 'failed';
      message: string;
      retryable?: boolean;
      telemetry: AttemptTelemetry;
    };

interface RunStreamAttemptOptions {
  abortRef: MutableRefObject<AbortController | null>;
  assistantId: string;
  errorGeneric: string;
  errorTimeout: string;
  formCode: string;
  isUserStopped: () => boolean;
  isRetryable: (message: string) => boolean;
  locale: string;
  modelRef: MutableRefObject<FormDraftModel>;
  onApplyDone: (
    event: Extract<FormAiStreamEvent, { type: 'done' }>,
    turnContentSnapshot: string,
  ) => void;
  payload: PendingChatPayload;
  promptChars: number;
  setError: Dispatch<SetStateAction<string | null>>;
  setPendingPayload: Dispatch<SetStateAction<PendingChatPayload | null>>;
  setStopped: Dispatch<SetStateAction<boolean>>;
  setTurns: Dispatch<SetStateAction<ChatTurn[]>>;
}

/**
 * Runs a single attempt against the AI stream: one AbortController, one
 * Per-attempt timeout, and a per-event telemetry tracker. The returned
 * Helper owns the SSE consumption loop and finish-telemetry bookkeeping
 * So the parent `runFormAiChatStream` stays readable.
 */
export function runStreamAttempt({
  abortRef,
  assistantId,
  errorGeneric,
  errorTimeout,
  formCode,
  isUserStopped,
  isRetryable,
  locale,
  modelRef,
  onApplyDone,
  payload,
  promptChars,
  setError,
  setPendingPayload,
  setStopped,
  setTurns,
}: RunStreamAttemptOptions): (attemptNumber: number) => Promise<AttemptResult> {
  return async (attemptNumber: number): Promise<AttemptResult> => {
    const controller = new AbortController();
    abortRef.current = controller;
    let timedOut = false;
    // Cap each attempt so a hung provider cannot leave the composer busy
    // Forever. Timeouts are retryable; user Stop is not.
    const streamTimeout = setTimeout(() => {
      if (abortRef.current === controller) {
        timedOut = true;
        controller.abort();
      }
    }, AI_STREAM_TIMEOUT_MS);

    let turnContentSnapshot = '';
    const startedAt = performance.now();
    const tracker = {
      ttfbMs: 0,
      eventCount: 0,
      phaseReached: null as 'message' | 'schema' | null,
      fallbackOutcome: null as string | null,
    };
    const finishTelemetry = (
      status: 'succeeded' | 'failed',
      extra: { errorClass?: string } = {},
    ): AttemptTelemetry => ({
      ttfbMs: tracker.ttfbMs,
      totalMs: performance.now() - startedAt,
      eventCount: tracker.eventCount,
      phaseReached: tracker.phaseReached,
      fallbackOutcome: tracker.fallbackOutcome,
      status,
      ...extra,
    });
    const emit = (telemetry: AttemptTelemetry): void => {
      recordStreamMetrics({
        ttfb_ms: telemetry.ttfbMs,
        total_ms: telemetry.totalMs,
        event_count: telemetry.eventCount,
        phase_reached: telemetry.phaseReached,
        fallback_outcome: telemetry.fallbackOutcome,
        prompt_chars: promptChars,
        attempt: attemptNumber,
        status: telemetry.status,
        error_class: telemetry.errorClass,
      });
    };
    const handleEvent = (event: FormAiStreamEvent): 'continue' | 'done' => {
      if (tracker.eventCount === 0) {
        tracker.ttfbMs = performance.now() - startedAt;
      }
      tracker.eventCount += 1;
      if (event.type === 'thinking') {
        return 'continue';
      }
      if (event.type === 'phase') {
        tracker.phaseReached = event.phase;
        patchAssistant(setTurns, assistantId, (turn) => ({
          ...turn,
          streamPhase: event.phase,
        }));
        return 'continue';
      }
      if (event.type === 'message') {
        turnContentSnapshot = `${turnContentSnapshot}${event.delta}`;
        patchAssistant(setTurns, assistantId, (turn) => ({
          ...turn,
          content: `${turn.content}${event.delta}`,
          streamPhase: turn.streamPhase ?? 'message',
        }));
        if (tracker.phaseReached === null) {
          tracker.phaseReached = 'message';
        }
        return 'continue';
      }
      if (event.type === 'error') {
        throw new Error(event.message);
      }
      // Event.type === 'done' (only branch left after the if-chain above).
      const fallback = event.result.notes?.fallback;
      if (fallback !== undefined) {
        tracker.fallbackOutcome = fallback.outcome;
      }
      onApplyDone(event, turnContentSnapshot);
      return 'done';
    };
    let telemetryOnExit: AttemptTelemetry | null = null;
    try {
      const serialized = serializeDraft(modelRef.current);
      const stream = streamFormDraftAi(
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
      );
      for await (const event of stream) {
        const verdict = handleEvent(event);
        if (verdict === 'done') {
          telemetryOnExit = finishTelemetry('succeeded');
          return { status: 'succeeded', telemetry: telemetryOnExit };
        }
      }
      telemetryOnExit = finishTelemetry('succeeded');
      return { status: 'succeeded', telemetry: telemetryOnExit };
    } catch (error) {
      const errorClass = error instanceof Error ? error.name : 'Error';
      if (isRequestAborted(error)) {
        if (timedOut && !isUserStopped()) {
          telemetryOnExit = finishTelemetry('failed', { errorClass });
          return {
            status: 'failed',
            message: errorTimeout,
            retryable: true,
            telemetry: telemetryOnExit,
          };
        }
        telemetryOnExit = finishTelemetry('failed', { errorClass });
        return { status: 'aborted', telemetry: telemetryOnExit };
      }
      const message = error instanceof Error ? error.message : errorGeneric;
      telemetryOnExit = finishTelemetry('failed', { errorClass });
      return {
        status: 'failed',
        message,
        retryable: isRetryable(message),
        telemetry: telemetryOnExit,
      };
    } finally {
      clearTimeout(streamTimeout);
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      if (telemetryOnExit !== null) {
        emit(telemetryOnExit);
      }
      // Touch the unused setters so they remain in the closure signature;
      // Done for the parent layer invariants.
      void setError;
      void setStopped;
      void setPendingPayload;
    }
  };
}
