import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { ArrowLeft, Plus, Rocket, Undo2 } from 'lucide-react';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  createFormDraft,
  publishFormVersion,
  submitFormReview,
  withdrawFormReview,
} from '@/api/forms.ts';
import { queryKeys } from '@/api/query-keys.ts';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import type { FormVersion } from '@/features/forms/types.ts';

type PublishDialog = 'publish' | 'withdraw' | null;

interface FormPublishControlProps {
  code: string;
  versionStatus: string;
  versionLabel: string | null;
  saveNow: () => Promise<boolean>;
  reloadDraft: () => Promise<void>;
}

/**
 * Lifecycle control for the form designer. Draft versions can be published
 * directly (the review gate runs transparently), and review versions can be
 * published or returned to draft. The confirmation dialogs explain what
 * publishing means for consultations that are already in progress.
 */
export function FormPublishControl({
  code,
  versionStatus,
  versionLabel,
  saveNow,
  reloadDraft,
}: FormPublishControlProps): JSX.Element {
  const { t } = useTranslation('designer');
  const { locale } = useParams({ from: '/$locale' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeDialog, setActiveDialog] = useState<PublishDialog>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [publishedVersion, setPublishedVersion] = useState<FormVersion | null>(
    null,
  );

  const isReview = versionStatus === 'review';

  const publishMutation = useMutation({
    mutationFn: async (): Promise<FormVersion> => {
      // Review versions are read-only, so there is nothing to flush before publishing.
      if (!isReview) {
        const flushed = await saveNow();
        if (!flushed) {
          throw new Error(t('publish.saveFailed'));
        }
      }
      const saved = queryClient.getQueryData<FormVersion>(
        queryKeys.forms.draft(code),
      );
      if (!saved) {
        throw new Error(t('publish.errorNoDraft'));
      }
      let current = saved;
      if (current.status === 'draft') {
        current = await submitFormReview(current.id, current.rowVersion);
      }
      return publishFormVersion(current.id, current.rowVersion);
    },
    onSuccess: (published) => {
      // Published versions have no editable draft; drop the cached draft so the next designer mount refetches cleanly.
      queryClient.removeQueries({ queryKey: queryKeys.forms.draft(code) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.forms.all });
      setActiveDialog(null);
      setPublishError(null);
      setPublishedVersion(published);
    },
    onError: (error) => {
      setPublishError(
        error instanceof Error ? error.message : t('publish.errorGeneric'),
      );
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      const saved = queryClient.getQueryData<FormVersion>(
        queryKeys.forms.draft(code),
      );
      if (!saved) {
        throw new Error(t('publish.errorNoDraft'));
      }
      const withdrawn = await withdrawFormReview(saved.id, saved.rowVersion);
      queryClient.setQueryData(queryKeys.forms.draft(code), withdrawn);
      await reloadDraft();
    },
    onSuccess: () => {
      setActiveDialog(null);
      setWithdrawError(null);
    },
    onError: (error) => {
      setWithdrawError(
        error instanceof Error ? error.message : t('publish.errorGeneric'),
      );
    },
  });

  const continueEditingMutation = useMutation({
    mutationFn: async (): Promise<FormVersion> => createFormDraft(code),
    onSuccess: (draft) => {
      queryClient.setQueryData(queryKeys.forms.draft(code), draft);
      void queryClient.invalidateQueries({ queryKey: queryKeys.forms.all });
      void navigate({
        to: '/$locale/forms/$code/designer/$draftId',
        params: { locale, code, draftId: draft.id },
      });
    },
  });

  function backToForms(): void {
    void navigate({ to: '/$locale/forms', params: { locale } });
  }

  const isPending =
    publishMutation.isPending ||
    withdrawMutation.isPending ||
    continueEditingMutation.isPending;

  return (
    <>
      <div
        className='flex shrink-0 items-center gap-2'
        data-testid='form-publish-control'
      >
        <Badge
          variant={isReview ? 'secondary' : 'outline'}
          className='hidden gap-1.5 font-normal sm:inline-flex'
          title={
            versionLabel
              ? `${t('inspector.version')} ${versionLabel}`
              : undefined
          }
        >
          <span
            className='size-1.5 rounded-full bg-current opacity-70'
            aria-hidden='true'
          />
          {isReview ? t('publish.statusReview') : t('publish.statusDraft')}
        </Badge>

        {isReview ? (
          <Button
            variant='outline'
            size='sm'
            disabled={isPending}
            onClick={() => {
              setWithdrawError(null);
              setActiveDialog('withdraw');
            }}
            aria-label={t('publish.backToDraft')}
          >
            <Undo2
              className='size-3.5'
              aria-hidden='true'
            />
            <span className='hidden md:inline'>{t('publish.backToDraft')}</span>
          </Button>
        ) : null}

        <Button
          size='sm'
          disabled={isPending}
          onClick={() => {
            setPublishError(null);
            setActiveDialog('publish');
          }}
          data-testid='form-publish-trigger'
        >
          <Rocket
            className='size-3.5'
            aria-hidden='true'
          />
          {t('publish.publish')}
        </Button>
      </div>

      <Dialog
        open={activeDialog === 'publish'}
        onOpenChange={(open) => {
          if (!open) {
            setActiveDialog(null);
          }
        }}
      >
        <DialogContent data-testid='form-publish-dialog'>
          <DialogHeader>
            <DialogTitle>{t('publish.confirmTitle')}</DialogTitle>
            <DialogDescription>{t('publish.confirmBody')}</DialogDescription>
          </DialogHeader>
          {publishError ? (
            <Alert variant='destructive'>
              <AlertDescription>{publishError}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              disabled={publishMutation.isPending}
              onClick={() => {
                setActiveDialog(null);
              }}
            >
              {t('publish.cancel')}
            </Button>
            <Button
              type='button'
              disabled={publishMutation.isPending}
              onClick={() => {
                void publishMutation.mutateAsync();
              }}
              data-testid='form-publish-confirm'
            >
              {publishMutation.isPending ? (
                <Spinner data-icon='inline-start' />
              ) : (
                <Rocket
                  className='size-3.5'
                  aria-hidden='true'
                />
              )}
              {t('publish.confirmAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeDialog === 'withdraw'}
        onOpenChange={(open) => {
          if (!open) {
            setActiveDialog(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('publish.withdrawTitle')}</DialogTitle>
            <DialogDescription>{t('publish.withdrawBody')}</DialogDescription>
          </DialogHeader>
          {withdrawError ? (
            <Alert variant='destructive'>
              <AlertDescription>{withdrawError}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              disabled={withdrawMutation.isPending}
              onClick={() => {
                setActiveDialog(null);
              }}
            >
              {t('publish.cancel')}
            </Button>
            <Button
              type='button'
              variant='destructive'
              disabled={withdrawMutation.isPending}
              onClick={() => {
                void withdrawMutation.mutateAsync();
              }}
            >
              {withdrawMutation.isPending ? (
                <Spinner data-icon='inline-start' />
              ) : (
                <Undo2
                  className='size-3.5'
                  aria-hidden='true'
                />
              )}
              {t('publish.withdrawAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={publishedVersion !== null}
        onOpenChange={(open) => {
          // Published versions have no editable draft, so the dialog only dismisses into an explicit next step.
          if (!open) {
            backToForms();
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          data-testid='form-published-dialog'
        >
          <DialogHeader>
            <DialogTitle>{t('publish.publishedTitle')}</DialogTitle>
            <DialogDescription>
              {t('publish.publishedBody', {
                version: publishedVersion?.version ?? '',
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              disabled={continueEditingMutation.isPending}
              onClick={() => {
                void continueEditingMutation.mutateAsync();
              }}
            >
              {continueEditingMutation.isPending ? (
                <Spinner data-icon='inline-start' />
              ) : (
                <Plus
                  className='size-3.5'
                  aria-hidden='true'
                />
              )}
              {t('publish.continueEditing')}
            </Button>
            <Button
              type='button'
              onClick={backToForms}
              data-testid='form-published-back'
            >
              <ArrowLeft
                className='size-3.5'
                aria-hidden='true'
              />
              {t('publish.backToForms')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
