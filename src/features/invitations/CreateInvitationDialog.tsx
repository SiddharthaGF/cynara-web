import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { describeApiError } from '@/api/error-message.ts';
import type { InvitationProfileSnapshot } from '@/api/invitations.ts';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { Field, FieldError, FieldLabel } from '@/components/ui/field.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import { CopyLinkDialog } from '@/features/invitations/CopyLinkDialog.tsx';
import {
  INITIAL_INVITATION_VALUES,
  validateInvitationCreate,
  type InvitationCreateValues,
  type InvitationFieldErrors,
} from '@/features/invitations/invitationForm.ts';
import { useInvitationMutations } from '@/features/invitations/useInvitationMutations.ts';
import { CAPABILITY_CODES } from '@/lib/capabilities.ts';

interface CreateInvitationDialogProps {
  open: boolean;
  locale: string;
  /** Display-only workspace context bound at create time (D10). */
  hospitalName: string | null;
  onOpenChange: (open: boolean) => void;
}

export function CreateInvitationDialog({
  open,
  locale,
  hospitalName,
  onOpenChange,
}: CreateInvitationDialogProps): JSX.Element {
  const { t } = useTranslation(['invitations', 'api']);
  const { create } = useInvitationMutations();
  const [fieldErrors, setFieldErrors] = useState<InvitationFieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const form = useForm({
    defaultValues: INITIAL_INVITATION_VALUES,
    onSubmit: async ({ value }) => {
      setFieldErrors({});
      setServerError(null);

      const errors = validateInvitationCreate(value, t);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }

      const snapshot = buildSnapshot(value);
      try {
        const result = await create.mutateAsync({
          email: value.email.trim(),
          snapshot,
        });
        form.reset();
        setToken(result.token);
      } catch (err) {
        // Dialog stays open showing the API error; no token is retained.
        setServerError(describeApiError(err, t));
      }
    },
  });

  const handleOpenChange = (next: boolean): void => {
    if (!next && !create.isPending) {
      setToken(null);
      setServerError(null);
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog
        open={open && token === null}
        onOpenChange={handleOpenChange}
      >
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>{t('create.title')}</DialogTitle>
            <DialogDescription>{t('create.description')}</DialogDescription>
          </DialogHeader>

          {serverError === null ? null : (
            <Alert variant='destructive'>
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <form
            className='grid gap-4'
            onSubmit={(event) => {
              event.preventDefault();
              void form.handleSubmit();
            }}
          >
            <div className='grid gap-4 sm:grid-cols-2'>
              <form.Field name='email'>
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor='invitation-email'>
                      {t('create.emailLabel')}
                    </FieldLabel>
                    <Input
                      id='invitation-email'
                      type='email'
                      autoComplete='off'
                      value={field.state.value}
                      aria-invalid={fieldErrors.email !== undefined}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                    />
                    <FieldError errors={[{ message: fieldErrors.email }]} />
                  </Field>
                )}
              </form.Field>
              <form.Field name='actorId'>
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor='invitation-actor-id'>
                      {t('create.actorIdLabel')}
                    </FieldLabel>
                    <Input
                      id='invitation-actor-id'
                      autoComplete='off'
                      value={field.state.value}
                      aria-invalid={fieldErrors.actorId !== undefined}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                    />
                    <FieldError errors={[{ message: fieldErrors.actorId }]} />
                  </Field>
                )}
              </form.Field>
            </div>

            <Field>
              <FieldLabel>{t('create.hospitalLabel')}</FieldLabel>
              <Input
                readOnly
                value={hospitalName ?? ''}
                placeholder={t('create.hospitalPlaceholder')}
              />
              <FieldError />
            </Field>

            <form.Field name='capabilities'>
              {(field) => (
                <Field>
                  <FieldLabel>{t('create.capabilitiesLabel')}</FieldLabel>
                  <p className='text-sm text-muted-foreground'>
                    {t('create.capabilitiesDescription')}
                  </p>
                  <div
                    className='grid gap-1.5 sm:grid-cols-2'
                    role='group'
                    aria-label={t('create.capabilitiesLabel')}
                  >
                    {CAPABILITY_CODES.map((code) => (
                      <label
                        key={code}
                        className='flex items-center gap-2 rounded-md border border-border/60 px-2 py-1.5 text-sm has-data-checked:border-primary/40 has-data-checked:bg-primary/5'
                      >
                        <Checkbox
                          checked={field.state.value.includes(code)}
                          onCheckedChange={(checked) => {
                            const next = checked
                              ? [...field.state.value, code]
                              : field.state.value.filter(
                                  (item) => item !== code,
                                );
                            field.handleChange(next);
                          }}
                        />
                        <span className='font-mono text-xs'>{code}</span>
                      </label>
                    ))}
                  </div>
                  <FieldError
                    errors={[{ message: fieldErrors.capabilities }]}
                  />
                </Field>
              )}
            </form.Field>

            <fieldset className='grid gap-4'>
              <legend className='text-sm font-medium'>
                {t('create.profileSection')}
              </legend>
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
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor='invitation-language'>
                        {t('create.languageLabel')}
                      </FieldLabel>
                      <Input
                        id='invitation-language'
                        autoComplete='off'
                        value={field.state.value}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                      />
                    </Field>
                  )}
                </form.Field>
              </div>
            </fieldset>

            <DialogFooter className='mt-2'>
              <Button
                type='button'
                variant='ghost'
                disabled={create.isPending}
                onClick={() => {
                  handleOpenChange(false);
                }}
              >
                {t('create.cancel')}
              </Button>
              <Button
                type='submit'
                disabled={create.isPending}
              >
                {create.isPending ? <Spinner data-icon='inline-start' /> : null}
                {create.isPending ? t('create.submitting') : t('create.submit')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <CopyLinkDialog
        open={open && token !== null}
        onOpenChange={(next) => {
          if (!next) {
            setToken(null);
            onOpenChange(false);
          }
        }}
        token={token ?? ''}
        locale={locale}
      />
    </>
  );
}

function buildSnapshot(
  value: InvitationCreateValues,
): InvitationProfileSnapshot {
  const profile =
    value.name.trim().length > 0 || value.surname.trim().length > 0
      ? {
          name: value.name.trim(),
          surname: value.surname.trim(),
          phone: value.phone.trim().length > 0 ? value.phone.trim() : undefined,
          language:
            value.language.trim().length > 0
              ? value.language.trim()
              : undefined,
        }
      : undefined;
  return {
    actorId: value.actorId.trim(),
    capabilities: value.capabilities,
    profile,
  };
}
