import { useForm } from '@tanstack/react-form';
import { Workflow } from 'lucide-react';
import type { JSX } from 'react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

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
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import { slugifyCode } from '@/lib/slugify.ts';
import { fieldErrorText } from '@/lib/useSyncedTanstackForm.ts';

const WORKFLOW_CODE_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;

interface CreateWorkflowValues {
  code: string;
  name: string;
}

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

  const form = useForm({
    defaultValues: {
      code: '',
      name: '',
    },
    onSubmit: async ({ value, formApi }) => {
      await onSubmit(value);
      codeTouchedRef.current = false;
      lastAutoCodeRef.current = '';
      formApi.reset();
    },
  });

  // The code is generated from the name until the user edits it by hand.
  const codeTouchedRef = useRef(false);
  const lastAutoCodeRef = useRef('');

  function handleNameChange(value: string): void {
    if (!codeTouchedRef.current) {
      const auto = slugifyCode(value);
      if (auto) {
        lastAutoCodeRef.current = auto;
        form.setFieldValue('code', auto);
      }
    }
  }

  function handleCodeChange(value: string): void {
    if (value === '') {
      // Clearing the code lets the name resume generating it.
      codeTouchedRef.current = false;
      lastAutoCodeRef.current = '';
    } else if (value !== lastAutoCodeRef.current) {
      codeTouchedRef.current = true;
    }
  }

  return (
    <div data-testid='create-workflow-card'>
      <Card className='border-primary/10 shadow-sm'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 font-heading text-lg'>
            <Workflow className='size-4 text-primary' />
            {t('list.newDraft')}
          </CardTitle>
          <CardDescription>{t('list.newDraftDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void form.handleSubmit();
            }}
          >
            <FieldGroup className='grid gap-4'>
              <form.Field
                name='name'
                validators={{
                  onChange: ({ value }) =>
                    value.trim() ? undefined : t('list.errors.nameRequired'),
                }}
              >
                {(field) => (
                  <Field data-invalid={!field.state.meta.isValid}>
                    <FieldLabel htmlFor={field.name}>
                      {t('list.name')}
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        handleNameChange(event.target.value);
                      }}
                      placeholder={t('list.namePlaceholder')}
                      aria-invalid={!field.state.meta.isValid}
                    />
                    {field.state.meta.isValid ? null : (
                      <FieldError>
                        {fieldErrorText(field.state.meta.errors)}
                      </FieldError>
                    )}
                  </Field>
                )}
              </form.Field>

              <form.Field
                name='code'
                validators={{
                  onChange: ({ value }) => {
                    if (!value.trim()) {
                      return t('list.errors.codeRequired');
                    }
                    if (!WORKFLOW_CODE_PATTERN.test(value.trim())) {
                      return t('list.errors.codeInvalid');
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <Field data-invalid={!field.state.meta.isValid}>
                    <FieldLabel htmlFor={field.name}>
                      {t('list.code')}
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        handleCodeChange(event.target.value);
                      }}
                      placeholder={t('list.codePlaceholder')}
                      aria-invalid={!field.state.meta.isValid}
                    />
                    {field.state.meta.isValid ? null : (
                      <FieldError>
                        {fieldErrorText(field.state.meta.errors)}
                      </FieldError>
                    )}
                    <FieldDescription>
                      {t('list.codeAutoHint')}
                    </FieldDescription>
                  </Field>
                )}
              </form.Field>

              <form.Subscribe selector={(state) => state.canSubmit}>
                {(canSubmit) => (
                  <Button
                    type='submit'
                    disabled={isCreating || !canSubmit}
                    className='w-full'
                  >
                    {isCreating ? <Spinner data-icon='inline-start' /> : null}
                    {isCreating ? t('list.creating') : t('list.createWorkflow')}
                  </Button>
                )}
              </form.Subscribe>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
