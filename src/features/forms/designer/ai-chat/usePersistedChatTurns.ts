import { useCallback, useEffect, useRef, useState } from 'react';

import type { ChatTurn } from './chatTurns.ts';
import {
  clearPersistedChatTurns,
  loadPersistedChatTurns,
  loadPersistPreference,
  savePersistedChatTurns,
  setPersistPreference,
} from './persistChatHistory.ts';

interface UsePersistedChatTurns {
  clearStorage: () => void;
  persistEnabled: boolean;
  togglePersist: () => void;
  turns: ChatTurn[];
  setTurns: React.Dispatch<React.SetStateAction<ChatTurn[]>>;
}

export function usePersistedChatTurns(
  formCode: string,
  locale: string,
): UsePersistedChatTurns {
  const [turns, setTurns] = useState<ChatTurn[]>(
    () => loadPersistedChatTurns(formCode, locale) ?? [],
  );
  const [persistEnabled, setPersistEnabled] = useState<boolean>(
    loadPersistPreference,
  );
  const turnsRef = useRef<ChatTurn[]>(turns);

  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  useEffect(() => {
    if (!persistEnabled) {
      return undefined;
    }
    const handle = window.setTimeout(() => {
      savePersistedChatTurns(formCode, locale, turns);
    }, 250);
    return (): void => {
      window.clearTimeout(handle);
    };
  }, [turns, formCode, locale, persistEnabled]);

  useEffect(() => {
    if (!persistEnabled) {
      return undefined;
    }
    const flush = (): void => {
      savePersistedChatTurns(formCode, locale, turnsRef.current);
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    return (): void => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
    };
  }, [formCode, locale, persistEnabled]);

  const togglePersist = useCallback((): void => {
    setPersistEnabled((current) => {
      const next = !current;
      setPersistPreference(next);
      if (!next) {
        clearPersistedChatTurns(formCode);
      }
      return next;
    });
  }, [formCode]);

  const clearStorage = useCallback((): void => {
    clearPersistedChatTurns(formCode);
  }, [formCode]);

  return {
    clearStorage,
    persistEnabled,
    togglePersist,
    turns,
    setTurns,
  };
}
