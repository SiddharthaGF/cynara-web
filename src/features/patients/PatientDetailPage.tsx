import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { ArrowLeft, UserCircle } from 'lucide-react';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react';
import type { JSX } from 'react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { isForbiddenPatientError } from '@/api/patients.ts';
import { AppShell } from '@/components/app-shell.tsx';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import { PatientEditForm } from '@/features/patients/PatientEditForm.tsx';
import { PatientView } from '@/features/patients/PatientView.tsx';
import {
  usePatientDetail,
  useDeletePatient,
} from '@/features/patients/usePatientsCatalog.ts';

export function PatientDetailPage(): JSX.Element {
  const { t } = useTranslation(['patients', 'api']);
  const { locale, id }: { locale: string; id: string } = useParams({
    from: '/$locale/patients/$id',
  });
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const { patient, isLoading, error: loadError } = usePatientDetail(id);
  const {
    deletePatient,
    isDeleting,
    error: deleteError,
    isSuccess: deleteSuccess,
  } = useDeletePatient();

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [mutationForbidden, setMutationForbidden] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!patient) {
      return;
    }
    try {
      await deletePatient({
        id: patient.id,
        rowVersion: patient.rowVersion,
      });
      setShowDeleteConfirm(false);
      void navigate({ to: '/$locale/patients', params: { locale } });
    } catch (err) {
      if (isForbiddenPatientError(err)) {
        setMutationForbidden(true);
      }
    }
  }, [patient, deletePatient, navigate, locale]);

  if (isLoading) {
    return (
      <AppShell variant='catalog'>
        <div className='mx-auto max-w-3xl px-6 py-10 pb-20'>
          <Skeleton className='mb-4 h-8 w-48' />
          <Skeleton className='mb-2 h-6 w-96' />
          <Skeleton className='h-64 w-full' />
        </div>
      </AppShell>
    );
  }

  if (loadError || !patient) {
    return (
      <AppShell variant='catalog'>
        <div className='mx-auto max-w-3xl px-6 py-10 pb-20'>
          <Empty className='min-h-48 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10'>
            <EmptyHeader>
              <EmptyTitle className='text-lg'>
                {t('detail.notFound')}
              </EmptyTitle>
              <EmptyDescription>
                {loadError ?? t('detail.loadError')}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
          <div className='mt-4'>
            <Link
              to='/$locale/patients'
              params={{ locale }}
            >
              <Button variant='ghost'>
                <ArrowLeft className='size-4' />
                {t('detail.backToList')}
              </Button>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const canMutate = !mutationForbidden;

  return (
    <AppShell variant='catalog'>
      <LazyMotion features={domAnimation}>
        <div className='mx-auto max-w-3xl px-6 py-10 pb-20'>
          <m.header
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
            }
            className='mb-8'
          >
            <Link
              to='/$locale/patients'
              params={{ locale }}
            >
              <Button
                variant='ghost'
                size='sm'
                className='mb-4 -ml-2'
              >
                <ArrowLeft className='size-4' />
                {t('detail.backToList')}
              </Button>
            </Link>
            <p className='mb-3 inline-flex items-center gap-1.5 text-xs font-medium tracking-[0.2em] text-accent uppercase'>
              <UserCircle className='size-3' />
              {t('detail.eyebrow')}
            </p>
            <h1 className='font-display text-balance text-3xl font-semibold tracking-tight md:text-4xl'>
              {t('detail.title')}
            </h1>
          </m.header>

          {mutationForbidden ? (
            <Alert
              variant='destructive'
              className='mb-6'
              data-testid='patient-detail-forbidden'
            >
              <AlertDescription>
                {t('permissions.forbiddenMutate')}
              </AlertDescription>
            </Alert>
          ) : null}

          {(deleteError || deleteSuccess) && (
            <m.div
              initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={reduceMotion ? { duration: 0 } : undefined}
            >
              <Alert
                variant={deleteSuccess ? 'default' : 'destructive'}
                className='mb-6'
              >
                <AlertDescription>
                  {deleteSuccess ? t('detail.deleteSuccess') : deleteError}
                </AlertDescription>
              </Alert>
            </m.div>
          )}

          <m.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }
            }
          >
            <Card className='border-border/70 shadow-sm'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 font-heading text-lg'>
                  <UserCircle className='size-4 text-muted-foreground' />
                  {isEditing
                    ? t('detail.editTitle')
                    : `${patient.givenName} ${patient.familyName}`}
                </CardTitle>
                <CardDescription>
                  {isEditing
                    ? t('detail.editTitle')
                    : `${t('detail.fields.mrn')}: ${patient.mrn}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isEditing && canMutate ? (
                  <PatientEditForm
                    patient={patient}
                    onCancel={() => setIsEditing(false)}
                    onSaved={() => setIsEditing(false)}
                  />
                ) : (
                  <PatientView
                    patient={patient}
                    onEdit={() => setIsEditing(true)}
                    onDelete={() => setShowDeleteConfirm(true)}
                    isDeleting={isDeleting}
                    canMutate={canMutate}
                  />
                )}
              </CardContent>
            </Card>
          </m.div>

          {showDeleteConfirm ? (
            <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
              <m.div
                initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className='mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl'
                data-testid='patient-delete-confirm'
              >
                <h3 className='font-heading text-lg font-medium'>
                  {t('detail.delete')}
                </h3>
                <p className='mt-2 text-sm text-muted-foreground'>
                  {t('detail.deleteConfirm')}
                </p>
                {deleteError ? (
                  <Alert
                    variant='destructive'
                    className='mt-3'
                  >
                    <AlertDescription>{deleteError}</AlertDescription>
                  </Alert>
                ) : null}
                <div className='mt-6 flex justify-end gap-3'>
                  <Button
                    variant='ghost'
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    {t('search.clear')}
                  </Button>
                  <Button
                    variant='destructive'
                    data-testid='patient-delete-confirm-submit'
                    onClick={() => {
                      void handleDelete();
                    }}
                    disabled={isDeleting}
                  >
                    {isDeleting ? <Spinner data-icon='inline-start' /> : null}
                    {t('detail.delete')}
                  </Button>
                </div>
              </m.div>
            </div>
          ) : null}
        </div>
      </LazyMotion>
    </AppShell>
  );
}
