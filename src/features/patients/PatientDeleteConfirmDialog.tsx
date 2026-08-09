import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog.tsx';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';

interface PatientDeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
  deleteError: string | null;
}

export function PatientDeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
  deleteError,
}: PatientDeleteConfirmDialogProps): JSX.Element {
  const { t } = useTranslation(['patients', 'api', 'common']);

  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <AlertDialogContent aria-label={t('detail.deleteConfirmTitle')}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('detail.deleteConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('detail.deleteConfirmBody')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deleteError ? (
          <Alert
            variant='destructive'
            className='mt-2'
          >
            <AlertDescription>{deleteError}</AlertDescription>
          </Alert>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {t('detail.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            variant='destructive'
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? <Spinner data-icon='inline-start' /> : null}
            {t('detail.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
