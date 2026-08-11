import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Rocket, Undo2 } from 'lucide-react';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { queryKeys } from '@/api/query-keys.ts';
import {
  createWorkflowDraft,
  publishWorkflow,
  submitWorkflowReview,
  withdrawWorkflowReview,
} from '@/api/workflows.ts';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import type { WorkflowVersion } from '@/features/workflows/types.ts';

import { WorkflowPublishDialog } from './WorkflowPublishDialog.tsx';
import { WorkflowPublishedDialog } from './WorkflowPublishedDialog.tsx';
import { WorkflowWithdrawDialog } from './WorkflowWithdrawDialog.tsx';

type PublishDialog = 'publish' | 'withdraw' | null;

interface WorkflowPublishControlProps {
  code: string;
  versionStatus: string;
  versionLabel: string | null;
  saveNow: () => Promise<boolean>;
  reloadDraft: () => Promise<void>;
}

/**
 * Lifecycle control for the workflow designer. Draft versions can be
 * published directly (the review gate runs transparently), and review versions
 * can be published or returned to draft. The confirmation dialogs explain what
 * publishing means for patient pipelines that are already running.
 */
export function WorkflowPublishControl({
  code,
  versionStatus,
  versionLabel,
  saveNow,
  reloadDraft,
}: WorkflowPublishControlProps): JSX.Element {
  const { t } = useTranslation('workflows');
  const { locale } = useParams({ from: '/$locale' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeDialog, setActiveDialog] = useState<PublishDialog>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [publishedVersion, setPublishedVersion] =
    useState<WorkflowVersion | null>(null);

  const isReview = versionStatus === 'review';

  const publishMutation = useMutation({
    mutationFn: async (): Promise<WorkflowVersion> => {
      // Review versions are read-only, so there is nothing to flush before publishing.
      if (!isReview) {
        const flushed = await saveNow();
        if (!flushed) {
          throw new Error(t('publish.saveFailed'));
        }
      }
      const saved = queryClient.getQueryData<WorkflowVersion>(
        queryKeys.workflowDefinitions.draft(code),
      );
      if (!saved) {
        throw new Error(t('publish.errorNoDraft'));
      }
      let current = saved;
      if (current.status === 'draft') {
        current = await submitWorkflowReview(current.id, current.rowVersion);
      }
      return publishWorkflow(current.id, current.rowVersion);
    },
    onSuccess: (published) => {
      // Published workflows have no editable draft; drop the cached draft so the next designer mount refetches cleanly.
      queryClient.removeQueries({
        queryKey: queryKeys.workflowDefinitions.draft(code),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workflowDefinitions.all,
      });
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
      const saved = queryClient.getQueryData<WorkflowVersion>(
        queryKeys.workflowDefinitions.draft(code),
      );
      if (!saved) {
        throw new Error(t('publish.errorNoDraft'));
      }
      const withdrawn = await withdrawWorkflowReview(
        saved.id,
        saved.rowVersion,
      );
      queryClient.setQueryData(
        queryKeys.workflowDefinitions.draft(code),
        withdrawn,
      );
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
    mutationFn: async (): Promise<WorkflowVersion> => createWorkflowDraft(code),
    onSuccess: (draft) => {
      queryClient.setQueryData(
        queryKeys.workflowDefinitions.draft(code),
        draft,
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workflowDefinitions.all,
      });
      void navigate({
        to: '/$locale/workflows/$code/designer',
        params: { locale, code },
      });
    },
  });

  function backToWorkflows(): void {
    void navigate({ to: '/$locale/workflows', params: { locale } });
  }

  const isPending =
    publishMutation.isPending ||
    withdrawMutation.isPending ||
    continueEditingMutation.isPending;

  return (
    <>
      <div className='flex shrink-0 items-center gap-2'>
        <Badge
          variant={isReview ? 'secondary' : 'outline'}
          className='hidden gap-1.5 font-normal sm:inline-flex'
          title={
            versionLabel
              ? `${t('versionHistory.version')} ${versionLabel}`
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
        >
          <Rocket
            className='size-3.5'
            aria-hidden='true'
          />
          {t('publish.publish')}
        </Button>
      </div>

      <WorkflowPublishDialog
        open={activeDialog === 'publish'}
        error={publishError}
        isPending={publishMutation.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setActiveDialog(null);
          }
        }}
        onConfirm={() => {
          publishMutation.mutate();
        }}
      />

      <WorkflowWithdrawDialog
        open={activeDialog === 'withdraw'}
        error={withdrawError}
        isPending={withdrawMutation.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setActiveDialog(null);
          }
        }}
        onConfirm={() => {
          withdrawMutation.mutate();
        }}
      />

      <WorkflowPublishedDialog
        open={publishedVersion !== null}
        version={publishedVersion?.version ?? null}
        continuePending={continueEditingMutation.isPending}
        onOpenChange={(open) => {
          // Published workflows have no editable draft, so the dialog only dismisses into an explicit next step.
          if (!open) {
            backToWorkflows();
          }
        }}
        onContinue={() => {
          continueEditingMutation.mutate();
        }}
        onBack={backToWorkflows}
      />
    </>
  );
}
