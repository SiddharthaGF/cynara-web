import { useForm } from '@tanstack/react-form';
import type { JSX, ReactNode } from 'react';
import { useRef } from 'react';

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

const DRAFT_CODE_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;

export interface CreateDraftValues {
  code: string;
  name: string;
}

export interface CreateDraftCardCopy {
  title: string;
  description: string;
  nameLabel: string;
  namePlaceholder: string;
  nameRequiredError: string;
  codeLabel: string;
  codePlaceholder: string;
  codeRequiredError: string;
  codeInvalidError: string;
  codeAutoHint: string;
  creatingLabel: string;
  createLabel: string;
}

interface CreateDraftCardProps {
  icon: ReactNode;
  copy: CreateDraftCardCopy;
  isCreating: boolean;
  onSubmit: (values: CreateDraftValues) => Promise<void>;
}

/**
 * New-draft card with name-to-code auto-generation shared by the form and
 * workflow catalogs. Callers own creation and translate every string; the
 * code pattern is identical for both catalogs.
 */
export function CreateDraftCard({
  icon,
  copy,
  isCreating,
  onSubmit,
}: CreateDraftCardProps): JSX.Element {
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
    <div>
      <Card className='border-primary/10 shadow-sm'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 font-heading text-lg'>
            {icon}
            {copy.title}
          </CardTitle>
          <CardDescription>{copy.description}</CardDescription>
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
                    value.trim() ? undefined : copy.nameRequiredError,
                }}
              >
                {(field) => (
                  <Field data-invalid={!field.state.meta.isValid}>
                    <FieldLabel htmlFor={field.name}>
                      {copy.nameLabel}
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
                      placeholder={copy.namePlaceholder}
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
                      return copy.codeRequiredError;
                    }
                    if (!DRAFT_CODE_PATTERN.test(value.trim())) {
                      return copy.codeInvalidError;
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <Field data-invalid={!field.state.meta.isValid}>
                    <FieldLabel htmlFor={field.name}>
                      {copy.codeLabel}
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
                      placeholder={copy.codePlaceholder}
                      aria-invalid={!field.state.meta.isValid}
                    />
                    {field.state.meta.isValid ? null : (
                      <FieldError>
                        {fieldErrorText(field.state.meta.errors)}
                      </FieldError>
                    )}
                    <FieldDescription>{copy.codeAutoHint}</FieldDescription>
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
                    {isCreating ? copy.creatingLabel : copy.createLabel}
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
