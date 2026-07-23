import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';

import type { ChatTurn } from './chatTurns.ts';

interface UseAiChatStreamLifecycleOptions {
  turns: ChatTurn[];
  setTurns: Dispatch<SetStateAction<ChatTurn[]>>;
  /** While true, never force-clear `streaming` — schema generation is still in flight. */
  isBusy: boolean;
  abortRef: React.MutableRefObject<AbortController | null>;
  clearStorage: () => void;
}

export function useAiChatStreamLifecycle({
  turns,
  setTurns,
  isBusy,
  abortRef,
  clearStorage,
}: UseAiChatStreamLifecycleOptions): void {
  // Defensive backstop only: after the stream settles (`isBusy` false), clear
  // Any assistant turn that still shows `streaming` with content. Must not run
  // During an active request — that used to wipe the "Generating schema
  // Changes…" status as soon as the assistant text arrived.
  useEffect(() => {
    if (isBusy) {
      return undefined;
    }
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
            ? { ...turn, streaming: false, streamPhase: undefined }
            : turn,
        ),
      );
    });
    return (): void => {
      cancelAnimationFrame(handle);
    };
  }, [turns, setTurns, isBusy]);

  const clearStorageRef = useRef(clearStorage);
  useEffect(() => {
    clearStorageRef.current = clearStorage;
  }, [clearStorage]);
  // oxlint-disable-next-line eslint/arrow-body-style
  useEffect(() => {
    return (): void => {
      abortRef.current?.abort();
      abortRef.current = null;
      clearStorageRef.current();
    };
  }, [abortRef]);
}
