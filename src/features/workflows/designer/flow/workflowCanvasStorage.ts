/**
 * Browser-only persistence for the workflow designer canvas layout.
 *
 * Node positions are visual state that the backend schema rejects, so they are
 * stored in `localStorage` keyed by workflow code + draft version id. Loading is
 * strict: any malformed or outdated envelope is dropped so the designer always
 * starts from a clean auto layout.
 */

export interface WorkflowCanvasPosition {
  x: number;
  y: number;
}

const STORAGE_PREFIX = 'cynara.workflow.layout';
// Bumped whenever the layout algorithm or coordinate space changes, so stale
// Envelopes (e.g. layouts produced by the old column stacking or the crossed
// Branch ordering) are dropped.
const STORAGE_VERSION = 3;

interface PersistedLayoutEnvelope {
  schemaVersion: number;
  key: string;
  savedAt: number;
  positions: Record<string, WorkflowCanvasPosition>;
}

function buildKey(key: string): string {
  return `${STORAGE_PREFIX}.v${STORAGE_VERSION}.${key}`;
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
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

function isPosition(value: unknown): value is WorkflowCanvasPosition {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as { x?: unknown; y?: unknown };
  return (
    typeof candidate.x === 'number' &&
    Number.isFinite(candidate.x) &&
    typeof candidate.y === 'number' &&
    Number.isFinite(candidate.y)
  );
}

/**
 * Restore the last saved positions for `key`, or `null` when nothing usable is
 * stored. Invalid envelopes are removed so the canvas falls back to the
 * computed auto layout.
 */
export function loadWorkflowPositions(
  key: string,
): Map<string, WorkflowCanvasPosition> | null {
  const storage = getStorage();
  if (storage === null) {
    return null;
  }
  const raw = safeParse(storage.getItem(buildKey(key)));
  if (raw === null || typeof raw !== 'object') {
    return null;
  }
  const envelope = raw as Partial<PersistedLayoutEnvelope>;
  if (
    envelope.schemaVersion !== STORAGE_VERSION ||
    envelope.key !== key ||
    typeof envelope.positions !== 'object' ||
    envelope.positions === null
  ) {
    storage.removeItem(buildKey(key));
    return null;
  }
  const positions = new Map<string, WorkflowCanvasPosition>();
  for (const [id, value] of Object.entries(envelope.positions)) {
    if (!isPosition(value)) {
      storage.removeItem(buildKey(key));
      return null;
    }
    positions.set(id, value);
  }
  return positions;
}

export function saveWorkflowPositions(
  key: string,
  positions: ReadonlyMap<string, WorkflowCanvasPosition>,
): void {
  const storage = getStorage();
  if (storage === null || positions.size === 0) {
    return;
  }
  const envelope: PersistedLayoutEnvelope = {
    schemaVersion: STORAGE_VERSION,
    key,
    savedAt: Date.now(),
    positions: Object.fromEntries(positions),
  };
  try {
    storage.setItem(buildKey(key), JSON.stringify(envelope));
  } catch {
    // Quota exceeded or storage disabled: drop silently, the layout still works.
  }
}
