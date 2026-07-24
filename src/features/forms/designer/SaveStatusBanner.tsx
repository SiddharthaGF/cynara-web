import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { ConcurrencyBanner } from '@/features/forms/designer/ConcurrencyBanner.tsx';
import type { SaveState } from '@/features/forms/designer/useFormDraft.ts';

interface SaveStatusBannerProps {
  state: SaveState;
  error: string | null;
  defaultConcurrencyMessage: string;
  onReload: () => void;
  onDismissConflict: () => void;
}

/**
 * Single banner slot for save-related feedback (conflict and save error).
 * Renders nothing when the state is neither `conflict` nor `error` so it can
 * stay mounted permanently without visual cost.
 */
export function SaveStatusBanner({
  state,
  error,
  defaultConcurrencyMessage,
  onReload,
  onDismissConflict,
}: SaveStatusBannerProps): JSX.Element | null {
  const { t: tv } = useTranslation('validation');

  if (state === 'conflict') {
    return (
      <ConcurrencyBanner
        message={error ?? defaultConcurrencyMessage}
        onReload={onReload}
        onDismiss={onDismissConflict}
      />
    );
  }

  if (state === 'error' && error) {
    return (
      <Alert variant='destructive'>
        <AlertDescription>{translateSaveError(error, tv)}</AlertDescription>
      </Alert>
    );
  }

  return null;
}

/**
 * Map known server-side save error strings (currently surfaced in English)
 * to their localized counterparts. Unknown errors fall back to the raw
 * message so we never lose information.
 */
function translateSaveError(
  error: string,
  t: ReturnType<typeof useTranslation<'validation'>>['t'],
): string {
  const known: Record<string, string> = {
    'Fix validation issues before saving.': t('save.fixBeforeSave'),
    'Save failed.': t('save.failed'),
  };
  return known[error] ?? error;
}
