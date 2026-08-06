import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Switch } from '@/components/ui/switch.tsx';
import type { DocumentForm } from '@/features/hospital/document-form-model.ts';

export function DocumentPolicyFields({
  form,
  isPending,
}: {
  form: DocumentForm;
  isPending: boolean;
}): JSX.Element {
  const { t } = useTranslation('hospital');
  return (
    <fieldset className='grid gap-3'>
      <legend className='mb-1 text-sm font-medium'>
        {t('documents.policies')}
      </legend>
      <form.Field
        name='allowsMultipleInstancesPerEncounter'
        mode='value'
      >
        {(field) => (
          <ToggleField
            id='documents-multiple'
            label={t('documents.multipleInstances')}
            help={t('documents.multipleInstancesHelp')}
            checked={field.state.value}
            onChange={(next) => field.handleChange(next)}
            disabled={isPending}
          />
        )}
      </form.Field>
      <form.Field
        name='requiresActorForCreation'
        mode='value'
      >
        {(field) => (
          <ToggleField
            id='documents-actor-creation'
            label={t('documents.actorCreation')}
            help={t('documents.actorCreationHelp')}
            checked={field.state.value}
            onChange={(next) => field.handleChange(next)}
            disabled={isPending}
          />
        )}
      </form.Field>
      <form.Field
        name='requiresActorForCompletion'
        mode='value'
      >
        {(field) => (
          <ToggleField
            id='documents-actor-completion'
            label={t('documents.actorCompletion')}
            help={t('documents.actorCompletionHelp')}
            checked={field.state.value}
            onChange={(next) => field.handleChange(next)}
            disabled={isPending}
          />
        )}
      </form.Field>
    </fieldset>
  );
}

export function ToggleField({
  id,
  label,
  help,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  help: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled: boolean;
}): JSX.Element {
  return (
    <div className='flex items-start justify-between gap-4 rounded-lg border border-border/60 px-3 py-2.5'>
      <div className='flex flex-col gap-0.5'>
        <label
          htmlFor={id}
          className='text-sm font-medium'
        >
          {label}
        </label>
        <p className='text-xs text-muted-foreground'>{help}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}
