import type { JSX } from 'react';

import { ConcurrencyBanner } from '@/features/forms/designer/ConcurrencyBanner.tsx';
import type { SaveState } from '@/features/workflows/designer/useWorkflowDraft.ts';

interface WorkflowSaveStatusBannerProps {
  state: SaveState;
  error: string | null;
  defaultConcurrencyMessage: string;
  onReload: () => void;
  onDismissConflict: () => void;
}

/**
 * Full-width banner reserved for the conflict state, which needs explicit
 * reload/dismiss actions. Transient save failures render as a floating
 * status pill over the canvas instead of pushing layout around.
 */
export function WorkflowSaveStatusBanner({
  state,
  error,
  defaultConcurrencyMessage,
  onReload,
  onDismissConflict,
}: WorkflowSaveStatusBannerProps): JSX.Element | null {
  if (state !== 'conflict') {
    return null;
  }
  return (
    <ConcurrencyBanner
      message={error ?? defaultConcurrencyMessage}
      onReload={onReload}
      onDismiss={onDismissConflict}
    />
  );
}
