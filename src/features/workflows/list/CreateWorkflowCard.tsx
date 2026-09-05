import { Workflow } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import {
  CreateDraftCard,
  type CreateDraftValues as CreateWorkflowValues,
} from '@/components/create-draft-card.tsx';

interface CreateWorkflowCardProps {
  isCreating: boolean;
  onSubmit: (values: CreateWorkflowValues) => Promise<void>;
}

export function CreateWorkflowErrorAlert({
  message,
}: {
  message: string;
}): JSX.Element {
  return (
    <Alert
      variant='destructive'
      className='mb-6'
    >
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function CreateWorkflowCard({
  isCreating,
  onSubmit,
}: CreateWorkflowCardProps): JSX.Element {
  const { t } = useTranslation('workflows');

  return (
    <CreateDraftCard
      icon={<Workflow className='size-4 text-primary' />}
      copy={{
        title: t('list.newDraft'),
        description: t('list.newDraftDescription'),
        nameLabel: t('list.name'),
        namePlaceholder: t('list.namePlaceholder'),
        nameRequiredError: t('list.errors.nameRequired'),
        codeLabel: t('list.code'),
        codePlaceholder: t('list.codePlaceholder'),
        codeRequiredError: t('list.errors.codeRequired'),
        codeInvalidError: t('list.errors.codeInvalid'),
        codeAutoHint: t('list.codeAutoHint'),
        creatingLabel: t('list.creating'),
        createLabel: t('list.createWorkflow'),
      }}
      isCreating={isCreating}
      onSubmit={onSubmit}
    />
  );
}
