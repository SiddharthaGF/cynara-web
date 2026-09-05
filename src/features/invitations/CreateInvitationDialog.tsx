import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/api/client.ts';
import { describeApiError } from '@/api/error-message.ts';
import type { InvitationProfileSnapshot } from '@/api/invitations.ts';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field.tsx';
import { Input } from '@/components/ui/input.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import { CopyLinkDialog } from '@/features/invitations/CopyLinkDialog.tsx';
import { CreateInvitationAccessStep } from '@/features/invitations/CreateInvitationAccessStep.tsx';
import {
  INITIAL_INVITATION_VALUES,
  validateInvitationCreate,
  type InvitationCreateValues,
  type InvitationFieldErrors,
} from '@/features/invitations/invitationForm.ts';
import { useInvitationMutations } from '@/features/invitations/useInvitationMutations.ts';
import { deriveActorIdFromEmail } from '@/lib/actor-id.ts';

interface CreateInvitationDialogProps {
  open: boolean;
  locale: string;
  /** Display-only workspace context bound at create time (D10). */
  hospitalName: string | null;
  onOpenChange: (open: boolean) => void;
}

interface PersonSnapshot {
  email: string;
  name: string;
  surname: string;
}

const EMPTY_PERSON: PersonSnapshot = { email: '', name: '', surname: '' };

export function CreateInvitationDialog({
  open,
  locale,
  hospitalName,
  onOpenChange,
}: CreateInvitationDialogProps): JSX.Element {
  const { t } = useTranslation(['invitations', 'api']);
  const { create } = useInvitationMutations();
  const [step, setStep] = useState(1);
  const [person, setPerson] = useState<PersonSnapshot>(EMPTY_PERSON);
  const [fieldErrors, setFieldErrors] = useState<InvitationFieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  // True once the admin manually types into the actor id field. While false
  // We keep the value in sync with the derived suggestion so the admin does
  // Not have to copy a generated slug into a separate field.
  const [actorIdTouched, setActorIdTouched] = useState(false);

  const form = useForm({
    defaultValues: INITIAL_INVITATION_VALUES,
    onSubmit: async ({ value }) => {
      setFieldErrors({});
      setServerError(null);

      const errors = validateInvitationCreate(value, t);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        // Surface person errors where they can be fixed.
        if (errors.email !== undefined || errors.actorId !== undefined) {
          setStep(1);
        }
        return;
      }

      const snapshot = buildSnapshot(value);
      try {
        const result = await create.mutateAsync({
          email: value.email.trim(),
          snapshot,
        });
        form.reset();
        setStep(1);
        setPerson(EMPTY_PERSON);
        setActorIdTouched(false);
        setToken(result.token);
      } catch (err) {
        // Backend rejects duplicate actor ids today with a 400/409 carrying
        // An explanatory message. Surface it on the actor id field so the
        // Admin knows which value to change, then drop them back to step 1.
        if (
          err instanceof ApiError &&
          (err.status === 409 || err.status === 400)
        ) {
          const detail = err.message.toLowerCase();
          if (detail.includes('actor')) {
            setFieldErrors((current) => ({
              ...current,
              actorId: t('create.errors.actorIdTaken'),
            }));
            setStep(1);
            setServerError(null);
            return;
          }
        }
        // Dialog stays open showing the API error; no token is retained.
        setServerError(describeApiError(err, t));
      }
    },
  });

  const handleOpenChange = (next: boolean): void => {
    if (!next && !create.isPending) {
      setToken(null);
      setServerError(null);
      setFieldErrors({});
      setActorIdTouched(false);
      setStep(1);
      onOpenChange(false);
    }
  };

  const handleContinue = (): void => {
    const { values } = form.state;
    const errors = validateInvitationCreate(values, t);
    const stepErrors: InvitationFieldErrors = {};
    if (errors.email !== undefined) {
      stepErrors.email = errors.email;
    }
    if (errors.actorId !== undefined) {
      stepErrors.actorId = errors.actorId;
    }
    // Surface the access requirement up-front so the user does not hit a
    // Silent disabled submit on step 2 with no preset chosen.
    if (values.capabilities.length === 0) {
      stepErrors.capabilities = t('create.errors.accessRequired');
    }
    setFieldErrors(stepErrors);
    setServerError(null);
    if (stepErrors.email !== undefined || stepErrors.actorId !== undefined) {
      return;
    }
    setPerson({
      email: values.email.trim(),
      name: values.name.trim(),
      surname: values.surname.trim(),
    });
    setStep(2);
  };

  const personLabel =
    person.name.length > 0 || person.surname.length > 0
      ? `${`${person.name} ${person.surname}`.trim()} · ${person.email}`
      : person.email;

  const canSubmitAccess = form.state.values.capabilities.length > 0;

  return (
    <>
      <Dialog
        open={open && token === null}
        onOpenChange={handleOpenChange}
      >
        <form
          id='create-invitation-form'
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <DialogContent className='kardex flex h-[85vh] max-h-[85vh] flex-col gap-4 overflow-hidden sm:max-w-xl'>
            <DialogHeader>
              <p className='kardex-folio text-xs font-medium tracking-wide text-muted-foreground uppercase'>
                {t('create.stepOf', { current: step, total: 2 })}
              </p>
              <DialogTitle>
                {step === 1 ? t('create.title') : t('create.step2Title')}
              </DialogTitle>
              <DialogDescription>
                {step === 1
                  ? t('create.description')
                  : t('create.step2Subtitle')}
              </DialogDescription>
            </DialogHeader>

            {serverError === null ? null : (
              <Alert variant='destructive'>
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}
            {step === 1 ? (
              <div className='min-h-0 flex-1 overflow-hidden'>
                <ScrollArea className='h-full'>
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
                            <FieldError
                              errors={[{ message: fieldErrors.email }]}
                            />
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
                              items.find(
                                (item) => item.value === field.state.value,
                              ) ?? null;
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
                                      placeholder={t(
                                        'create.languagePlaceholder',
                                      )}
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
                                  setActorIdTouched(true);
                                  field.handleChange(event.target.value);
                                }}
                                onBlur={() => {
                                  // If the admin clears the field, let the
                                  // Email-derived value take over again.
                                  if (field.state.value.trim().length === 0) {
                                    setActorIdTouched(false);
                                  }
                                }}
                              />
                              <FieldError
                                errors={[{ message: fieldErrors.actorId }]}
                              />
                              <FieldError
                                errors={[{ message: fieldErrors.actorId }]}
                              />
                            </Field>
                          );
                        }}
                      </form.Field>
                    </FieldGroup>
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className='min-h-0 flex-1 overflow-hidden'>
                <ScrollArea className='h-full'>
                  <div className='flex flex-col gap-4 pr-4'>
                    <form.Field name='capabilities'>
                      {(field) => (
                        <CreateInvitationAccessStep
                          hospitalName={hospitalName}
                          capabilities={field.state.value}
                          capabilitiesError={fieldErrors.capabilities}
                          personSummary={personLabel}
                          onCapabilitiesChange={(next) => {
                            field.handleChange(next);
                            if (
                              next.length > 0 &&
                              fieldErrors.capabilities !== undefined
                            ) {
                              setFieldErrors((current) => {
                                const { capabilities: _capabilities, ...rest } =
                                  current;
                                return rest;
                              });
                            }
                          }}
                          onEditPerson={() => {
                            setStep(1);
                          }}
                        />
                      )}
                    </form.Field>
                  </div>
                </ScrollArea>
              </div>
            )}

            <DialogFooter>
              {step === 1 ? (
                <>
                  <Button
                    type='button'
                    variant='outline'
                    disabled={create.isPending}
                    onClick={() => {
                      handleOpenChange(false);
                    }}
                  >
                    {t('create.cancel')}
                  </Button>
                  <Button
                    type='button'
                    disabled={create.isPending}
                    onClick={handleContinue}
                  >
                    {t('create.continue')}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type='button'
                    variant='outline'
                    disabled={create.isPending}
                    onClick={() => {
                      setStep(1);
                    }}
                  >
                    {t('create.back')}
                  </Button>
                  <Button
                    type='submit'
                    form='create-invitation-form'
                    disabled={create.isPending || !canSubmitAccess}
                  >
                    {create.isPending ? (
                      <Spinner data-icon='inline-start' />
                    ) : null}
                    {create.isPending
                      ? t('create.submitting')
                      : t('create.submit')}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </form>
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
        title={t('create.success.title')}
        description={t('create.success.description')}
        note={t('create.success.note')}
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
