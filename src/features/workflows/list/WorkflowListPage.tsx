import { useNavigate, useParams } from '@tanstack/react-router';
import type { JSX } from 'react';

import { AppShell } from '@/components/app-shell.tsx';
import { useCapabilities } from '@/hooks/use-capabilities.ts';

import { useWorkflowsCatalog } from './useWorkflowsCatalog.ts';
import {
  WorkflowListContent,
  type WorkflowCreationState,
} from './WorkflowListContent.tsx';

export function WorkflowListPage(): JSX.Element {
  const navigate = useNavigate();
  const { locale } = useParams({ from: '/$locale' });
  const { can } = useCapabilities();
  const {
    workflows,
    error,
    isCreating,
    isCreatingDraft,
    isLoading,
    createWorkflow,
    createDraft,
  } = useWorkflowsCatalog();

  let creationState: WorkflowCreationState = 'idle';
  if (isCreating) {
    creationState = 'creating';
  } else if (isCreatingDraft) {
    creationState = 'creating-draft';
  }

  async function handleCreate(values: {
    code: string;
    name: string;
  }): Promise<void> {
    try {
      const created = await createWorkflow({
        code: values.code.trim(),
        name: values.name.trim(),
      });
      // Land straight in the designer: the route resolves the editable draft.
      if (!created.editableVersionId) {
        await createDraft(created.code);
      }
      void navigate({
        to: '/$locale/workflows/$code/designer',
        params: { locale, code: created.code },
      });
    } catch {
      // Mutation error is surfaced through useWorkflowsCatalog().error
    }
  }

  function handleCreateDraft(code: string): void {
    void createDraft(code)
      .then(() => {
        void navigate({
          to: '/$locale/workflows/$code/designer',
          params: { locale, code },
        });
      })
      .catch(() => {
        // Mutation error is surfaced through useWorkflowsCatalog().error
      });
  }

  return (
    <AppShell variant='catalog'>
      <WorkflowListContent
        workflows={workflows}
        error={error}
        creationState={creationState}
        isLoading={isLoading}
        canCreate={can('write', 'Catalog')}
        onCreate={handleCreate}
        onCreateDraft={handleCreateDraft}
      />
    </AppShell>
  );
}
