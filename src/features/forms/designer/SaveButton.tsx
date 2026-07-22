import { Cloud, CloudOff } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import type { SaveState } from '@/features/forms/designer/useFormDraft.ts';

interface SaveButtonProps {
  state: SaveState;
  disabled?: boolean;
  onClick: () => void;
}

/**
 * Compact save affordance surfaced in the designer header. Shows an icon-only
 * variant below the `sm` breakpoint (mobile) and an icon-plus-label variant
 * from `sm` upward (desktop). Click behaviour is owned by the caller.
 */
export function SaveButton({
  state,
  disabled,
  onClick,
}: SaveButtonProps): JSX.Element {
  const { t } = useTranslation('designer');
  const label = saveStateLabel(state, t);
  const icon = saveStateIcon(state);

  let variant: 'default' | 'secondary' | 'destructive' = 'default';
  if (state === 'saved') {
    variant = 'secondary';
  } else if (state === 'error' || state === 'conflict') {
    variant = 'destructive';
  }

  const isBusy = state === 'saving';

  return (
    <Button
      type='button'
      size='sm'
      variant={variant}
      disabled={disabled || isBusy}
      onClick={onClick}
      title={label}
      className='shrink-0 gap-1.5 px-2.5 sm:px-3'
    >
      {icon}
      <span className='hidden sm:inline'>{label}</span>
    </Button>
  );
}

function saveStateIcon(state: SaveState): JSX.Element {
  if (state === 'saving') {
    return <Spinner className='size-3.5' />;
  }
  if (state === 'saved') {
    return <Cloud className='size-3.5' />;
  }
  if (state === 'error' || state === 'conflict') {
    return <CloudOff className='size-3.5' />;
  }
  return <Cloud className='size-3.5 opacity-60' />;
}

function saveStateLabel(
  state: SaveState,
  t: ReturnType<typeof useTranslation<'designer'>>['t'],
): string {
  const labels: Record<SaveState, string> = {
    idle: t('saveState.unsaved'),
    saving: t('saveState.saving'),
    saved: t('saveState.saved'),
    conflict: t('saveState.conflict'),
    error: t('saveState.error'),
  };
  return labels[state];
}
