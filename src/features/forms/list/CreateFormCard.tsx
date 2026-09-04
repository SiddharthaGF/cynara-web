import { Plus } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import {
  CreateDraftCard,
  type CreateDraftValues as CreateFormValues,
} from '@/components/create-draft-card.tsx';

interface CreateFormCardProps {
  isCreating: boolean;
  onSubmit: (values: CreateFormValues) => Promise<void>;
}

export function CreateFormErrorAlert({
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

export function CreateFormCard({
  isCreating,
  onSubmit,
}: CreateFormCardProps): JSX.Element {
  const { t } = useTranslation('forms');

  return (
    <CreateDraftCard
      icon={<Plus className='size-4 text-primary' />}
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
        createLabel: t('list.createForm'),
      }}
      isCreating={isCreating}
      onSubmit={onSubmit}
    />
  );
}
