export interface WorkflowHistoryState<T> {
  /** Snapshots before the current one, oldest first. */
  past: T[];
  /** Current value. */
  present: T;
  /** Snapshots after an undo, oldest first; cleared on the next commit. */
  future: T[];
  /**
   * Timestamp of the last commit, or `null` when no edit burst is in
   * progress. Rapid successive commits collapse into a single undo step.
   */
  lastCommitMs: number | null;
}

export type WorkflowHistoryAction<T> =
  | { type: 'commit'; next: T; now?: number }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'reset'; present: T };

/** Maximum number of snapshots retained in each direction. */
export const WORKFLOW_HISTORY_LIMIT = 100;
/**
 * Commits landing inside this window are treated as one edit burst (typing,
 * dragging) and collapse into a single undo step.
 */
export const WORKFLOW_HISTORY_COALESCE_MS = 800;

export function createWorkflowHistory<T>(present: T): WorkflowHistoryState<T> {
  return { past: [], present, future: [], lastCommitMs: null };
}

/**
 * Undo/redo state machine for the immutable workflow graph. `commit` pushes
 * the current present into the past stack (coalescing rapid edits), `undo` and
 * `redo` move the present between the two stacks, and `reset` starts a fresh
 * history (e.g. after reloading a draft).
 */
export function workflowHistoryReducer<T>(
  state: WorkflowHistoryState<T>,
  action: WorkflowHistoryAction<T>,
): WorkflowHistoryState<T> {
  switch (action.type) {
    case 'commit': {
      if (action.next === state.present) {
        return state;
      }
      const now = action.now ?? Date.now();
      const sameBurst =
        state.lastCommitMs !== null &&
        now - state.lastCommitMs < WORKFLOW_HISTORY_COALESCE_MS;
      const past = sameBurst
        ? state.past
        : [...state.past, state.present].slice(-WORKFLOW_HISTORY_LIMIT);
      return {
        ...state,
        past,
        present: action.next,
        future: [],
        lastCommitMs: now,
      };
    }
    case 'undo': {
      if (state.past.length === 0) {
        return state;
      }
      const previous = state.past.at(-1);
      if (previous === undefined) {
        return state;
      }
      return {
        ...state,
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future].slice(-WORKFLOW_HISTORY_LIMIT),
        lastCommitMs: null,
      };
    }
    case 'redo': {
      if (state.future.length === 0) {
        return state;
      }
      const [next, ...rest] = state.future;
      return {
        ...state,
        past: [...state.past, state.present].slice(-WORKFLOW_HISTORY_LIMIT),
        present: next,
        future: rest,
        lastCommitMs: null,
      };
    }
    case 'reset': {
      return createWorkflowHistory(action.present);
    }
    default: {
      return state;
    }
  }
}
