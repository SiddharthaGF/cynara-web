import type { ChatTurn } from './chatTurns.ts';

const STORAGE_PREFIX = 'cynara.ai.chat';
const STORAGE_VERSION = 1;
const PERSIST_PREFERENCE_KEY = `${STORAGE_PREFIX}.persist`;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_TURNS = 200;

interface PersistedChatEnvelope {
  schemaVersion: number;
  formCode: string;
  locale: string;
  savedAt: number;
  turns: ChatTurn[];
}

function buildKey(formCode: string): string {
  return `${STORAGE_PREFIX}.v${STORAGE_VERSION}.${formCode}`;
}

function getStorage(area: 'local' | 'session'): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return area === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function readPersistPreference(): boolean {
  const storage = getStorage('local');
  if (storage === null) {
    return true;
  }
  const raw = storage.getItem(PERSIST_PREFERENCE_KEY);
  if (raw === null) {
    return true;
  }
  return raw !== '0' && raw !== 'false';
}

export function loadPersistPreference(): boolean {
  return readPersistPreference();
}

export function setPersistPreference(enabled: boolean): void {
  const storage = getStorage('local');
  if (storage === null) {
    return;
  }
  try {
    storage.setItem(PERSIST_PREFERENCE_KEY, enabled ? '1' : '0');
  } catch {
    // Quota / disabled: leave preference unchanged.
  }
}

function isChatTurn(value: unknown): value is ChatTurn {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<ChatTurn>;
  return (
    typeof candidate.id === 'string' &&
    (candidate.role === 'user' || candidate.role === 'assistant') &&
    typeof candidate.content === 'string'
  );
}

function sanitizeTurnsForPersist(turns: readonly ChatTurn[]): ChatTurn[] {
  // Drop in-flight or stale-failure turns so we never resurrect a half-finished
  // Stream or an orphaned error bubble after a reload.
  const stable = turns.filter(
    (turn) => !turn.streaming && !turn.queued && !turn.failed,
  );
  const safe: ChatTurn[] = stable.map((turn) => ({
    id: turn.id,
    role: turn.role,
    content: turn.content,
    draftApplied: turn.draftApplied === true ? true : undefined,
    appliedSummary:
      typeof turn.appliedSummary === 'string' && turn.appliedSummary.length > 0
        ? turn.appliedSummary
        : undefined,
  }));
  return safe.length > MAX_TURNS ? safe.slice(-MAX_TURNS) : safe;
}

function safeParse(raw: string | null): unknown {
  if (raw === null) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Restore the last visible transcript for `formCode`, or `null` when nothing
 * Usable is stored. Skips envelopes that are too old, from a different
 * Locale, or that fail validation — any of those silently drop the entry so
 * The UI starts from a clean slate. Also returns `null` when the user has
 * Disabled the cross-reload persistence preference.
 */
export function loadPersistedChatTurns(
  formCode: string,
  locale: string,
): ChatTurn[] | null {
  if (!readPersistPreference()) {
    return null;
  }
  const storage = getStorage('session');
  if (storage === null) {
    return null;
  }
  const raw = safeParse(storage.getItem(buildKey(formCode)));
  if (raw === null || typeof raw !== 'object') {
    return null;
  }
  const envelope = raw as Partial<PersistedChatEnvelope>;
  if (
    envelope.schemaVersion !== STORAGE_VERSION ||
    envelope.formCode !== formCode ||
    envelope.locale !== locale ||
    typeof envelope.savedAt !== 'number' ||
    !Array.isArray(envelope.turns)
  ) {
    storage.removeItem(buildKey(formCode));
    return null;
  }
  if (Date.now() - envelope.savedAt > MAX_AGE_MS) {
    storage.removeItem(buildKey(formCode));
    return null;
  }
  const restored: ChatTurn[] = [];
  for (const candidate of envelope.turns) {
    if (!isChatTurn(candidate)) {
      storage.removeItem(buildKey(formCode));
      return null;
    }
    restored.push({
      id: candidate.id,
      role: candidate.role,
      content: candidate.content,
      draftApplied: candidate.draftApplied === true ? true : undefined,
      appliedSummary:
        typeof candidate.appliedSummary === 'string' &&
        candidate.appliedSummary.length > 0
          ? candidate.appliedSummary
          : undefined,
    });
  }
  return restored;
}

export function savePersistedChatTurns(
  formCode: string,
  locale: string,
  turns: readonly ChatTurn[],
): void {
  if (!readPersistPreference()) {
    return;
  }
  const storage = getStorage('session');
  if (storage === null) {
    return;
  }
  const safeTurns = sanitizeTurnsForPersist(turns);
  if (safeTurns.length === 0) {
    storage.removeItem(buildKey(formCode));
    return;
  }
  const envelope: PersistedChatEnvelope = {
    schemaVersion: STORAGE_VERSION,
    formCode,
    locale,
    savedAt: Date.now(),
    turns: safeTurns,
  };
  try {
    storage.setItem(buildKey(formCode), JSON.stringify(envelope));
  } catch {
    // Quota exceeded or storage disabled: drop silently, the chat still works.
  }
}

export function clearPersistedChatTurns(formCode: string): void {
  const storage = getStorage('session');
  if (storage === null) {
    return;
  }
  storage.removeItem(buildKey(formCode));
}
