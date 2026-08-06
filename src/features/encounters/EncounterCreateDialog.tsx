import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DEFAULT_ACTOR_ID } from '@/api/client.ts';
import {
  isForbiddenEncounterError,
  type CreateEncounterInput,
  type EncounterType,
} from '@/api/encounters.ts';
import { describeApiError } from '@/api/error-message.ts';
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
import { Field, FieldError, FieldLabel } from '@/components/ui/field.tsx';
import { Input } from '@/components/ui/input.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import {
  ENCOUNTER_TYPES,
  validateEncounterCreate,
  type EncounterCreateFields,
  type EncounterFieldErrors,
} from '@/features/encounters/encounterForm.ts';
import {
  useActiveClinicalAreas,
  useActiveFacilities,
  useCreateEncounter,
} from '@/features/encounters/useEncountersCatalog.ts';

const INITIAL_VALUES: EncounterCreateFields = {
  facilityId: '',
  clinicalAreaId: '',
  type: '',
  responsibleProfessionalId: DEFAULT_ACTOR_ID,
};

interface EncounterCreateDialogProps {
  patientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (encounterId: string) => void;
  onForbidden: (message: string) => void;
}

export function EncounterCreateDialog({
  patientId,
  open,
  onOpenChange,
  onCreated,
  onForbidden,
}: EncounterCreateDialogProps): JSX.Element {
  const { t } = useTranslation(['encounters', 'api']);
  const { createEncounter, isCreating } = useCreateEncounter();
  const {
    facilities,
    isLoading: facilitiesLoading,
    error: facilitiesError,
  } = useActiveFacilities(open);

  const [fieldErrors, setFieldErrors] = useState<EncounterFieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [facilityId, setFacilityId] = useState('');

  const {
    clinicalAreas,
    isLoading: areasLoading,
    error: areasError,
  } = useActiveClinicalAreas(facilityId || null);

  const form = useForm({
    defaultValues: INITIAL_VALUES,
    onSubmit: async ({ value }) => {
      setFieldErrors({});
      setServerError(null);

      const errors = validateEncounterCreate(value, t);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }

      const input: CreateEncounterInput = {
        patientId,
        facilityId: value.facilityId,
        clinicalAreaId: value.clinicalAreaId,
        type: value.type as EncounterType,
        responsibleProfessionalId: value.responsibleProfessionalId.trim(),
      };

      try {
        const created = await createEncounter(input);
        form.reset();
        setFacilityId('');
        onOpenChange(false);
        onCreated(created.id);
      } catch (err) {
        if (isForbiddenEncounterError(err)) {
          onForbidden(describeApiError(err, t));
          onOpenChange(false);
          return;
        }
        setServerError(describeApiError(err, t));
      }
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
      setFacilityId('');
      setFieldErrors({});
      setServerError(null);
    }
  }, [open, form]);

  const taxonomyEmpty =
    !facilitiesLoading && facilities.length === 0 && facilitiesError === null;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        className='sm:max-w-md'
        data-testid='encounter-create-dialog'
      >
        <DialogHeader>
          <DialogTitle>{t('create.title')}</DialogTitle>
          <DialogDescription>{t('create.description')}</DialogDescription>
        </DialogHeader>

        {serverError !== null && serverError !== '' ? (
          <Alert
            variant='destructive'
            data-testid='encounter-create-error'
          >
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        ) : null}

        {facilitiesError || areasError ? (
          <Alert variant='destructive'>
            <AlertDescription>{facilitiesError ?? areasError}</AlertDescription>
          </Alert>
        ) : null}

        {taxonomyEmpty ? (
          <Alert data-testid='encounter-create-taxonomy-empty'>
            <AlertDescription>
              {t('create.errors.taxonomyEmpty')}
            </AlertDescription>
          </Alert>
        ) : null}

        <form
          className='grid gap-4'
          data-testid='encounter-create-form'
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Field name='facilityId'>
            {(field) => {
              const facilityItems = facilities.map((facility) => ({
                value: facility.id,
                label: facility.name,
              }));
              return (
                <Field data-invalid={Boolean(fieldErrors.facilityId)}>
                  <FieldLabel htmlFor='encounter-facility'>
                    {t('create.fields.facility')}
                  </FieldLabel>
                  <Select
                    items={facilityItems}
                    value={field.state.value || null}
                    onValueChange={(next: string | null = '') => {
                      const value = next ?? '';
                      field.handleChange(value);
                      setFacilityId(value);
                      form.setFieldValue('clinicalAreaId', '');
                    }}
                    disabled={isCreating || facilitiesLoading || taxonomyEmpty}
                  >
                    <SelectTrigger
                      id='encounter-facility'
                      data-testid='encounter-create-facility'
                      aria-invalid={Boolean(fieldErrors.facilityId)}
                      className='w-full'
                    >
                      <SelectValue
                        placeholder={t('create.fields.facilityPlaceholder')}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {facilityItems.map((facility) => (
                        <SelectItem
                          key={facility.value}
                          value={facility.value}
                        >
                          {facility.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.facilityId ? (
                    <FieldError>{fieldErrors.facilityId}</FieldError>
                  ) : null}
                </Field>
              );
            }}
          </form.Field>

          <form.Field name='clinicalAreaId'>
            {(field) => {
              const areaItems = clinicalAreas.map((area) => ({
                value: area.id,
                label: area.name,
              }));
              return (
                <Field data-invalid={Boolean(fieldErrors.clinicalAreaId)}>
                  <FieldLabel htmlFor='encounter-clinical-area'>
                    {t('create.fields.clinicalArea')}
                  </FieldLabel>
                  <Select
                    items={areaItems}
                    value={field.state.value || null}
                    onValueChange={(next: string | null) => {
                      field.handleChange(next ?? '');
                    }}
                    disabled={
                      isCreating ||
                      !facilityId ||
                      areasLoading ||
                      clinicalAreas.length === 0
                    }
                  >
                    <SelectTrigger
                      id='encounter-clinical-area'
                      data-testid='encounter-create-clinicalArea'
                      aria-invalid={Boolean(fieldErrors.clinicalAreaId)}
                      className='w-full'
                    >
                      <SelectValue
                        placeholder={t('create.fields.clinicalAreaPlaceholder')}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {areaItems.map((area) => (
                        <SelectItem
                          key={area.value}
                          value={area.value}
                        >
                          {area.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.clinicalAreaId ? (
                    <FieldError>{fieldErrors.clinicalAreaId}</FieldError>
                  ) : null}
                </Field>
              );
            }}
          </form.Field>

          <form.Field name='type'>
            {(field) => {
              const typeItems = ENCOUNTER_TYPES.map((type) => ({
                value: type,
                label: t(`types.${type}`),
              }));
              return (
                <Field data-invalid={Boolean(fieldErrors.type)}>
                  <FieldLabel htmlFor='encounter-type'>
                    {t('create.fields.type')}
                  </FieldLabel>
                  <Select
                    items={typeItems}
                    value={field.state.value || null}
                    onValueChange={(next: string | null) => {
                      field.handleChange(next ?? '');
                    }}
                    disabled={isCreating}
                  >
                    <SelectTrigger
                      id='encounter-type'
                      data-testid='encounter-create-type'
                      aria-invalid={Boolean(fieldErrors.type)}
                      className='w-full'
                    >
                      <SelectValue
                        placeholder={t('create.fields.typePlaceholder')}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {typeItems.map((type) => (
                        <SelectItem
                          key={type.value}
                          value={type.value}
                        >
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.type ? (
                    <FieldError>{fieldErrors.type}</FieldError>
                  ) : null}
                </Field>
              );
            }}
          </form.Field>

          <form.Field name='responsibleProfessionalId'>
            {(field) => (
              <Field
                data-invalid={Boolean(fieldErrors.responsibleProfessionalId)}
              >
                <FieldLabel htmlFor='encounter-professional'>
                  {t('create.fields.professional')}
                </FieldLabel>
                <Input
                  id='encounter-professional'
                  data-testid='encounter-create-professional'
                  value={field.state.value}
                  disabled={isCreating}
                  aria-invalid={Boolean(fieldErrors.responsibleProfessionalId)}
                  placeholder={t('create.fields.professionalPlaceholder')}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                  }}
                  onBlur={field.handleBlur}
                />
                {fieldErrors.responsibleProfessionalId ? (
                  <FieldError>
                    {fieldErrors.responsibleProfessionalId}
                  </FieldError>
                ) : null}
              </Field>
            )}
          </form.Field>

          <DialogFooter className='mt-2'>
            <Button
              type='button'
              variant='ghost'
              disabled={isCreating}
              onClick={() => {
                onOpenChange(false);
              }}
            >
              {t('create.cancel')}
            </Button>
            <Button
              type='submit'
              data-testid='encounter-create-submit'
              disabled={isCreating || taxonomyEmpty}
            >
              {isCreating ? <Spinner data-icon='inline-start' /> : null}
              {isCreating ? t('create.submitting') : t('create.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
