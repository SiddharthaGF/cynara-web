import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { PublishedSuccessDialog } from '@/components/published-success-dialog.tsx';

interface WorkflowPublishedDialogProps {
  open: boolean;
  version: string | null;
  continuePending: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function WorkflowPublishedDialog({
  open,
  version,
  continuePending,
  onOpenChange,
  onContinue,
  onBack,
}: WorkflowPublishedDialogProps): JSX.Element {
  const { t } = useTranslation('workflows');

  return (
    <PublishedSuccessDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('publish.publishedTitle')}
      description={t('publish.publishedBody', {
        version: version ?? '',
      })}
      continueLabel={t('publish.continueEditing')}
      backLabel={t('publish.backToWorkflows')}
      continuePending={continuePending}
      onContinue={onContinue}
      onBack={onBack}
    />
  );
}
