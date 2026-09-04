import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
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
import { PublishControlBar } from '@/components/publish-control-bar.tsx';
import type { FormVersion } from '@/features/forms/types.ts';

import { PublishConfirmDialog } from './PublishConfirmDialog.tsx';
import { PublishedVersionDialog } from './PublishedVersionDialog.tsx';
import { WithdrawConfirmDialog } from './WithdrawConfirmDialog.tsx';

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
      <PublishControlBar
        isReview={isReview}
        isPending={isPending}
        versionTitle={
          versionLabel
            ? `${t('inspector.version')} ${versionLabel}`
            : undefined
        }
        statusReviewLabel={t('publish.statusReview')}
        statusDraftLabel={t('publish.statusDraft')}
        backToDraftLabel={t('publish.backToDraft')}
        publishLabel={t('publish.publish')}
        onWithdraw={() => {
          setWithdrawError(null);
          setActiveDialog('withdraw');
        }}
        onPublish={() => {
          setPublishError(null);
          setActiveDialog('publish');
        }}
      />

      <PublishConfirmDialog
        open={activeDialog === 'publish'}
        error={publishError}
        isPending={publishMutation.isPending}
        onCancel={() => {
          setActiveDialog(null);
        }}
        onConfirm={() => {
          publishMutation.mutate();
        }}
      />

      <WithdrawConfirmDialog
        open={activeDialog === 'withdraw'}
        error={withdrawError}
        isPending={withdrawMutation.isPending}
        onCancel={() => {
          setActiveDialog(null);
        }}
        onConfirm={() => {
          withdrawMutation.mutate();
        }}
      />

      <PublishedVersionDialog
        version={publishedVersion}
        isPending={continueEditingMutation.isPending}
        onClose={backToForms}
        onContinueEditing={() => {
          continueEditingMutation.mutate();
        }}
      />
    </>
  );
}
