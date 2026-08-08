import { useNavigate, useParams } from '@tanstack/react-router';
import { useReducedMotion } from 'motion/react';
import type { JSX } from 'react';

import { AppShell } from '@/components/app-shell.tsx';
import { useCapabilities } from '@/hooks/use-capabilities.ts';

import { CreateWorkflowCard } from './CreateWorkflowCard.tsx';
import { useWorkflowsCatalog } from './useWorkflowsCatalog.ts';
import { WorkflowListContent } from './WorkflowListContent.tsx';
import { WorkflowsCatalogCard } from './WorkflowsCatalogCard.tsx';

export function WorkflowListPage(): JSX.Element {
  const navigate = useNavigate();
  const { locale } = useParams({ from: '/$locale' });
  const { can } = useCapabilities();
  const reduceMotion = useReducedMotion();
  const {
    workflows,
    error,
    isCreating,
    isCreatingDraft,
    isLoading,
    createWorkflow,
    createDraft,
  } = useWorkflowsCatalog();

  async function handleCreate(values: {
    code: string;
    name: string;
  }): Promise<void> {
    try {
      await createWorkflow({
        code: values.code.trim(),
        name: values.name.trim(),
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
      >
        {can('write', 'Catalog') ? (
          <CreateWorkflowCard
            isCreating={isCreating}
            reduceMotion={reduceMotion}
            onSubmit={handleCreate}
          />
        ) : null}
        <WorkflowsCatalogCard
          workflows={workflows}
          isLoading={isLoading}
          isCreatingDraft={isCreatingDraft}
          reduceMotion={reduceMotion}
          onCreateDraft={handleCreateDraft}
        />
      </WorkflowListContent>
    </AppShell>
  );
}
