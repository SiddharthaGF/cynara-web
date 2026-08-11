import { CloudUpload } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

interface DocumentUnsavedIndicatorProps {
  isDirty: boolean;
  isSaving: boolean;
}

export function DocumentUnsavedIndicator({
  isDirty,
  isSaving,
}: DocumentUnsavedIndicatorProps): JSX.Element | null {
  const { t } = useTranslation('documents');

  if (!isDirty) {
    return null;
  }

  return (
    <div className='mb-4 inline-flex items-center gap-1.5 rounded-full border border-amber-600/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400'>
      <CloudUpload className='size-3.5' />
      {isSaving ? t('detail.autosaving') : t('detail.unsaved')}
    </div>
  );
}
