import { useBlocker } from '@tanstack/react-router';
import { useCallback } from 'react';

export interface UseUnsavedChangesBlockerResult {
  /** True while the router is asking the user to confirm leaving the page. */
  blocked: boolean;
  /** Dismiss the prompt and stay on the current page. */
  keepEditing: () => void;
  /** Discard unsaved changes and allow navigation to proceed. */
  discardChanges: () => void;
}

/**
 * Blocks navigation away from a page with unsaved changes and exposes the
 * actions the unsaved-changes dialog needs.
 */
export function useUnsavedChangesBlocker(
  dirty: boolean,
  onDiscard: () => void,
): UseUnsavedChangesBlockerResult {
  const blocker = useBlocker({
    shouldBlockFn: () => dirty,
    enableBeforeUnload: () => dirty,
    withResolver: true,
  });

  const keepEditing = useCallback((): void => {
    if (blocker.status !== 'blocked') {
      return;
    }
    blocker.reset();
  }, [blocker]);

  const discardChanges = useCallback((): void => {
    if (blocker.status !== 'blocked') {
      return;
    }
    onDiscard();
    blocker.proceed();
  }, [blocker, onDiscard]);

  return {
    blocked: blocker.status === 'blocked',
    keepEditing,
    discardChanges,
  };
}
