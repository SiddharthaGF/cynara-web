import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import { ApiError } from '@/api/client.ts';
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
import { playNotificationSound } from './playNotificationSound.ts';

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
        patchAssistant(setTurns, assistantId, (turn) => ({
          ...turn,
          streamPhase: event.phase,
        }));
      } else if (event.type === 'message') {
        patchAssistant(setTurns, assistantId, (turn) => ({
          ...turn,
          content: `${turn.content}${event.delta}`,
          streamPhase: turn.streamPhase ?? 'message',
        }));
      } else if (event.type === 'error') {
        throw new Error(event.message);
      } else if (event.type === 'done') {
        const before = serializeDraft(modelRef.current);
        const draftChanged =
          before.clinicalSchemaJson !== event.result.clinicalSchemaJson ||
          before.uiSchemaJson !== (event.result.uiSchemaJson ?? null) ||
          before.rulesSchemaJson !== (event.result.rulesSchemaJson ?? null);
        patchAssistant(setTurns, assistantId, (turn) => ({
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
          turn.id === assistantId ? { ...turn, streaming: false } : turn,
        );
      }
      const lastUser = findLastUserTurn(withoutStreaming);
      return withoutStreaming.flatMap((turn) =>
        turn.id === assistantId ? [] : [markTurnFailed(turn, lastUser?.id)],
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
        setError(err instanceof Error ? err.message : errorGeneric);
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
