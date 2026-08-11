import { FlaskConical } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import { Tooltip, TooltipContent } from '@/components/ui/tooltip.tsx';

interface WorkflowPreviewTriggerProps {
  onOpen: () => void;
}

export function WorkflowPreviewTrigger({
  onOpen,
}: WorkflowPreviewTriggerProps): JSX.Element {
  const { t } = useTranslation('workflows');
  return (
    <Tooltip>
      <Button
        type='button'
        variant='outline'
        size='sm'
        className='gap-1.5 shrink-0'
        onClick={onOpen}
        aria-label={t('preview.open')}
      >
        <FlaskConical className='size-3.5' />
        <span className='hidden sm:inline'>{t('preview.open')}</span>
      </Button>
      <TooltipContent side='bottom'>{t('preview.open')}</TooltipContent>
    </Tooltip>
  );
}
