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
  // The button shows the icon-only flavour on mobile, where the tooltip
  // Doubles as the label. Desktop keeps the inline label and renders the
  // Tooltip on top of it as an extra affordance.
  return (
    <Tooltip>
      <Button
        type='button'
        variant='outline'
        size='sm'
        className='gap-1.5'
        disabled={disabled}
        onClick={onOpen}
      >
        <FlaskConical className='size-3.5' />
        <span className='hidden sm:inline'>{t('formPreview.open')}</span>
      </Button>
      <TooltipContent side='bottom'>{t('formPreview.open')}</TooltipContent>
    </Tooltip>
  );
}
