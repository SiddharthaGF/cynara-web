import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { PublishedSuccessDialog } from '@/components/published-success-dialog.tsx';
import type { FormVersion } from '@/features/forms/types.ts';

interface PublishedVersionDialogProps {
  version: FormVersion | null;
  isPending: boolean;
  onClose: () => void;
  onContinueEditing: () => void;
}

/**
 * Success dialog shown after a version is published. Published versions have no
 * editable draft, so the dialog only dismisses into an explicit next step:
 * continue editing a fresh draft, or head back to the form catalog.
 */
export function PublishedVersionDialog({
  version,
  isPending,
  onClose,
  onContinueEditing,
}: PublishedVersionDialogProps): JSX.Element {
  const { t } = useTranslation('designer');

  return (
    <PublishedSuccessDialog
      open={version !== null}
      onOpenChange={(open) => {
        // Published versions have no editable draft, so the dialog only dismisses into an explicit next step.
        if (!open) {
          onClose();
        }
      }}
      title={t('publish.publishedTitle')}
      description={t('publish.publishedBody', {
        version: version?.version ?? '',
      })}
      continueLabel={t('publish.continueEditing')}
      backLabel={t('publish.backToForms')}
      continuePending={isPending}
      onContinue={onContinueEditing}
      onBack={onClose}
    />
  );
}
