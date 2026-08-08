import { Cloud, CloudOff } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Spinner } from '@/components/ui/spinner.tsx';
import { TooltipIconButton } from '@/components/ui/tooltip-button.tsx';
import type { SaveState } from '@/features/workflows/designer/useWorkflowDraft.ts';

interface WorkflowSaveButtonProps {
  state: SaveState;
  disabled?: boolean;
  onClick: () => void;
  /** Optional keyboard shortcut shown in the tooltip. */
  hint?: string;
}

export function WorkflowSaveButton({
  state,
  disabled,
  onClick,
  hint,
}: WorkflowSaveButtonProps): JSX.Element {
  const { t } = useTranslation('workflows');
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
    <TooltipIconButton
      type='button'
      size='sm'
      variant={variant}
      disabled={disabled || isBusy}
      onClick={onClick}
      aria-label={label}
      label={hint ? `${label} · ${hint}` : label}
      className='shrink-0 gap-1.5 px-2.5 sm:px-3'
    >
      {icon}
      <span className='hidden sm:inline'>{label}</span>
    </TooltipIconButton>
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
  t: ReturnType<typeof useTranslation<'workflows'>>['t'],
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
