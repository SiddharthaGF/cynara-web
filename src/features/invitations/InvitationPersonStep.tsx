import type {
  FormAsyncValidateOrFn,
  FormValidateOrFn,
  ReactFormExtendedApi,
} from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field.tsx';
import { Input } from '@/components/ui/input.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import type {
  InvitationCreateValues,
  InvitationFieldErrors,
} from '@/features/invitations/invitationForm.ts';
import { deriveActorIdFromEmail } from '@/lib/actor-id.ts';

export type InvitationDialogFormApi = ReactFormExtendedApi<
  InvitationCreateValues,
  FormValidateOrFn<InvitationCreateValues> | undefined,
  FormValidateOrFn<InvitationCreateValues> | undefined,
  FormAsyncValidateOrFn<InvitationCreateValues> | undefined,
  FormValidateOrFn<InvitationCreateValues> | undefined,
  FormAsyncValidateOrFn<InvitationCreateValues> | undefined,
  FormValidateOrFn<InvitationCreateValues> | undefined,
  FormAsyncValidateOrFn<InvitationCreateValues> | undefined,
  FormValidateOrFn<InvitationCreateValues> | undefined,
  FormAsyncValidateOrFn<InvitationCreateValues> | undefined,
  FormAsyncValidateOrFn<InvitationCreateValues> | undefined,
  unknown
>;

/**
 * Step 1 of the wizard: identity fields with the email-derived actor id
 * suggestion. Receives the live form instance; the touched flag arrives as
 * props so the email/actor-id sync behaves exactly as before.
 */
export function InvitationPersonStep({
  form,
  fieldErrors,
  actorIdTouched,
  onActorIdTouchedChange,
}: {
  form: InvitationDialogFormApi;
  fieldErrors: InvitationFieldErrors;
  actorIdTouched: boolean;
  onActorIdTouchedChange: (touched: boolean) => void;
}): JSX.Element {
  const { t } = useTranslation(['invitations', 'api']);
  return (
    <div className='flex flex-col gap-4'>
      <FieldGroup>
        <form.Field name='email'>
          {(field) => (
            <Field>
              <FieldLabel htmlFor='invitation-email'>
                {t('create.emailLabel')}
                <span className='text-destructive'> *</span>
              </FieldLabel>
              <Input
                id='invitation-email'
                type='email'
                autoComplete='off'
                value={field.state.value}
                aria-invalid={fieldErrors.email !== undefined}
                aria-required
                onChange={(event) => {
                  const next = event.target.value;
                  field.handleChange(next);
                  // Keep the actor id in sync with the email
                  // Username while the admin has not typed a
                  // Custom value of their own.
                  if (!actorIdTouched) {
                    form.setFieldValue(
                      'actorId',
                      deriveActorIdFromEmail(next),
                    );
                  }
                }}
              />
              <FieldError errors={[{ message: fieldErrors.email }]} />
            </Field>
          )}
        </form.Field>
        <div className='grid gap-4 sm:grid-cols-2'>
          <form.Field name='name'>
            {(field) => (
              <Field>
                <FieldLabel htmlFor='invitation-name'>
                  {t('create.nameLabel')}
                </FieldLabel>
                <Input
                  id='invitation-name'
                  autoComplete='off'
                  value={field.state.value}
                  onChange={(event) =>
                    field.handleChange(event.target.value)
                  }
                />
              </Field>
            )}
          </form.Field>
          <form.Field name='surname'>
            {(field) => (
              <Field>
                <FieldLabel htmlFor='invitation-surname'>
                  {t('create.surnameLabel')}
                </FieldLabel>
                <Input
                  id='invitation-surname'
                  autoComplete='off'
                  value={field.state.value}
                  onChange={(event) =>
                    field.handleChange(event.target.value)
                  }
                />
              </Field>
            )}
          </form.Field>
          <form.Field name='phone'>
            {(field) => (
              <Field>
                <FieldLabel htmlFor='invitation-phone'>
                  {t('create.phoneLabel')}
                </FieldLabel>
                <Input
                  id='invitation-phone'
                  autoComplete='off'
                  value={field.state.value}
                  onChange={(event) =>
                    field.handleChange(event.target.value)
                  }
                />
              </Field>
            )}
          </form.Field>
          <form.Field name='language'>
            {(field) => {
              const items = [
                { value: 'en', label: t('create.languageEn') },
                { value: 'es', label: t('create.languageEs') },
              ];
              const selected =
                items.find((item) => item.value === field.state.value) ?? null;
              return (
                <Field>
                  <FieldLabel htmlFor='invitation-language'>
                    {t('create.languageLabel')}
                  </FieldLabel>
                  <Select
                    items={items}
                    value={field.state.value || null}
                    onValueChange={(val: string | null) => {
                      field.handleChange(val ?? '');
                    }}
                  >
                    <SelectTrigger
                      id='invitation-language'
                      className='w-full'
                    >
                      <SelectValue
                        placeholder={t('create.languagePlaceholder')}
                      >
                        {selected?.label ?? null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((item) => (
                        <SelectItem
                          key={item.value}
                          value={item.value}
                        >
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              );
            }}
          </form.Field>
        </div>
        <form.Field name='actorId'>
          {(field) => {
            const suggestion = deriveActorIdFromEmail(
              form.state.values.email,
            );
            const placeholder = suggestion
              ? t('create.actorIdAutoPlaceholder', {
                  value: suggestion,
                })
              : t('create.actorIdLabel');
            return (
              <Field>
                <FieldLabel htmlFor='invitation-actor-id'>
                  {t('create.actorIdLabel')}
                  <span className='text-destructive'> *</span>
                </FieldLabel>
                <Input
                  id='invitation-actor-id'
                  autoComplete='off'
                  value={field.state.value}
                  placeholder={placeholder}
                  aria-invalid={fieldErrors.actorId !== undefined}
                  aria-required
                  onChange={(event) => {
                    onActorIdTouchedChange(true);
                    field.handleChange(event.target.value);
                  }}
                  onBlur={() => {
                    // If the admin clears the field, let the
                    // Email-derived value take over again.
                    if (field.state.value.trim().length === 0) {
                      onActorIdTouchedChange(false);
                    }
                  }}
                />
                <FieldError errors={[{ message: fieldErrors.actorId }]} />
                <FieldError errors={[{ message: fieldErrors.actorId }]} />
              </Field>
            );
          }}
        </form.Field>
      </FieldGroup>
    </div>
  );
}
