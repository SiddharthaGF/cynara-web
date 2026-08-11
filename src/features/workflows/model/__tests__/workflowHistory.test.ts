import { describe, expect, it } from 'vitest';

import {
  createWorkflowHistory,
  workflowHistoryReducer,
  WORKFLOW_HISTORY_COALESCE_MS,
  WORKFLOW_HISTORY_LIMIT,
} from '@/features/workflows/model/workflowHistory.ts';

describe('workflowHistoryReducer', () => {
  it('records the previous present when committing', () => {
    const initial = createWorkflowHistory(0);
    const next = workflowHistoryReducer(initial, {
      type: 'commit',
      next: 1,
      now: 1000,
    });

    expect(next.present).toBe(1);
    expect(next.past).toStrictEqual([0]);
    expect(next.future).toStrictEqual([]);
  });

  it('coalesces rapid commits into a single undo step', () => {
    let state = createWorkflowHistory(0);
    state = workflowHistoryReducer(state, { type: 'commit', next: 1, now: 0 });
    state = workflowHistoryReducer(state, {
      type: 'commit',
      next: 2,
      now: 100,
    });
    state = workflowHistoryReducer(state, {
      type: 'commit',
      next: 3,
      now: 200,
    });

    expect(state.past).toStrictEqual([0]);
    expect(state.present).toBe(3);

    const undone = workflowHistoryReducer(state, { type: 'undo' });
    expect(undone.present).toBe(0);
  });

  it('splits commits that fall outside the coalescing window', () => {
    let state = createWorkflowHistory(0);
    state = workflowHistoryReducer(state, { type: 'commit', next: 1, now: 0 });
    state = workflowHistoryReducer(state, {
      type: 'commit',
      next: 2,
      now: 100,
    });
    state = workflowHistoryReducer(state, {
      type: 'commit',
      next: 3,
      now: 100 + WORKFLOW_HISTORY_COALESCE_MS + 1,
    });

    expect(state.past).toStrictEqual([0, 2]);
    expect(state.present).toBe(3);
  });

  it('undo restores the previous state and moves present to future', () => {
    let state = createWorkflowHistory(0);
    state = workflowHistoryReducer(state, { type: 'commit', next: 1, now: 0 });
    state = workflowHistoryReducer(state, {
      type: 'commit',
      next: 2,
      now: 1000,
    });

    const undone = workflowHistoryReducer(state, { type: 'undo' });
    expect(undone.present).toBe(1);
    expect(undone.past).toStrictEqual([0]);
    expect(undone.future).toStrictEqual([2]);
  });

  it('redo restores the future state', () => {
    let state = createWorkflowHistory(0);
    state = workflowHistoryReducer(state, { type: 'commit', next: 1, now: 0 });
    state = workflowHistoryReducer(state, {
      type: 'commit',
      next: 2,
      now: 1000,
    });
    state = workflowHistoryReducer(state, { type: 'undo' });

    const redone = workflowHistoryReducer(state, { type: 'redo' });
    expect(redone.present).toBe(2);
    expect(redone.future).toStrictEqual([]);
    expect(redone.past).toStrictEqual([0, 1]);
  });

  it('ignores undo and redo when there is nothing to move', () => {
    const initial = createWorkflowHistory(0);
    expect(workflowHistoryReducer(initial, { type: 'undo' })).toBe(initial);
    expect(workflowHistoryReducer(initial, { type: 'redo' })).toBe(initial);
  });

  it('ignores commits that keep the same present reference', () => {
    const initial = createWorkflowHistory(0);
    const next = workflowHistoryReducer(initial, {
      type: 'commit',
      next: 0,
      now: 1000,
    });
    expect(next).toBe(initial);
  });

  it('starts a fresh burst after undo so the next edit is undoable', () => {
    let state = createWorkflowHistory(0);
    state = workflowHistoryReducer(state, { type: 'commit', next: 1, now: 0 });
    state = workflowHistoryReducer(state, { type: 'undo' });

    state = workflowHistoryReducer(state, {
      type: 'commit',
      next: 2,
      now: 100,
    });
    expect(state.past).toStrictEqual([0]);

    const undone = workflowHistoryReducer(state, { type: 'undo' });
    expect(undone.present).toBe(0);
  });

  it('clears history on reset', () => {
    let state = createWorkflowHistory(0);
    state = workflowHistoryReducer(state, { type: 'commit', next: 1, now: 0 });
    state = workflowHistoryReducer(state, {
      type: 'commit',
      next: 2,
      now: 1000,
    });

    const reset = workflowHistoryReducer(state, { type: 'reset', present: 9 });
    expect(reset.present).toBe(9);
    expect(reset.past).toStrictEqual([]);
    expect(reset.future).toStrictEqual([]);
  });

  it('caps the retained snapshots at the configured limit', () => {
    let state = createWorkflowHistory(0);
    for (let i = 1; i <= WORKFLOW_HISTORY_LIMIT + 20; i += 1) {
      state = workflowHistoryReducer(state, {
        type: 'commit',
        next: i,
        now: i * 1000,
      });
    }

    expect(state.past).toHaveLength(WORKFLOW_HISTORY_LIMIT);
    expect(state.present).toBe(WORKFLOW_HISTORY_LIMIT + 20);
  });
});
