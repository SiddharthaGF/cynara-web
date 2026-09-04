import { FlaskConical } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import { Tooltip, TooltipContent } from '@/components/ui/tooltip.tsx';

interface FormPreviewTriggerProps {
  onOpen: () => void;
  disabled?: boolean;
}

export function FormPreviewTrigger({
  onOpen,
  disabled,
}: FormPreviewTriggerProps): JSX.Element {
  const { t } = useTranslation('designer');
  // Mobile is icon-only (tooltip doubles as the label); desktop overlays the inline label.
  return (
    <Tooltip>
      <Button
        type='button'
        variant='outline'
        size='sm'
        className='gap-1.5'
        disabled={disabled}
        onClick={onOpen}
        aria-label={t('formPreview.open')}
      >
        <FlaskConical className='size-3.5' />
        <span className='hidden sm:inline'>{t('formPreview.open')}</span>
      </Button>
      <TooltipContent side='bottom'>{t('formPreview.open')}</TooltipContent>
    </Tooltip>
  );
}
