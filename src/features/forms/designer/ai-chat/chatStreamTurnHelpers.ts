import type { Dispatch, SetStateAction } from 'react';

import type { ChatTurn } from './chatTurns.ts';

export function patchAssistant(
  setTurns: Dispatch<SetStateAction<ChatTurn[]>>,
  assistantId: string,
  patch: (turn: ChatTurn) => ChatTurn,
): void {
  setTurns((current) =>
    current.map((turn) => (turn.id === assistantId ? patch(turn) : turn)),
  );
}

/** Clear in-flight fields so a retry reuses the same assistant bubble. */
export function resetAssistantForRetry(
  setTurns: Dispatch<SetStateAction<ChatTurn[]>>,
  assistantId: string,
): void {
  patchAssistant(setTurns, assistantId, (turn) => ({
    ...turn,
    content: '',
    streaming: true,
    streamPhase: undefined,
    draftApplied: undefined,
    appliedSummary: undefined,
  }));
}

export function settleAssistantStreaming(
  setTurns: Dispatch<SetStateAction<ChatTurn[]>>,
  assistantId: string,
): void {
  setTurns((current) =>
    current.map((turn) =>
      turn.id === assistantId && turn.streaming
        ? { ...turn, streaming: false, streamPhase: undefined }
        : turn,
    ),
  );
}

export function markTurnFailed(turn: ChatTurn, failedTurnId?: string): ChatTurn {
  if (turn.id !== failedTurnId) {
    return turn;
  }
  return { ...turn, failed: true };
}

export function findLastUserTurn(turns: ChatTurn[]): ChatTurn | undefined {
  let latest: ChatTurn | undefined = undefined;
  for (const turn of turns) {
    if (turn.role === 'user') {
      latest = turn;
    }
  }
  return latest;
}
