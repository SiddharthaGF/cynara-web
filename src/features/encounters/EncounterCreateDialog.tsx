import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useState } from 'react';
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
import { Spinner } from '@/components/ui/spinner.tsx';
import {
  EncounterClinicalAreaField,
  EncounterFacilityField,
  EncounterTypeField,
} from '@/features/encounters/EncounterCreateFields.tsx';
import {
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
        // The responsible professional is the signed-in actor (not a free-text field).
        responsibleProfessionalId: DEFAULT_ACTOR_ID,
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

        {/* Client-only SPA form; preventDefault avoids a native submit reload. */}
        {/* react-doctor-disable-next-line react-doctor/no-prevent-default */}
        <form
          className='grid gap-4'
          data-testid='encounter-create-form'
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Field name='facilityId'>
            {(field) => (
              <EncounterFacilityField
                field={field}
                facilities={facilities}
                facilitiesLoading={facilitiesLoading}
                isCreating={isCreating}
                taxonomyEmpty={taxonomyEmpty}
                error={fieldErrors.facilityId}
                onFacilityChange={(value) => {
                  setFacilityId(value);
                  form.setFieldValue('clinicalAreaId', '');
                }}
              />
            )}
          </form.Field>

          <form.Field name='clinicalAreaId'>
            {(field) => (
              <EncounterClinicalAreaField
                field={field}
                clinicalAreas={clinicalAreas}
                areasLoading={areasLoading}
                isCreating={isCreating}
                facilityId={facilityId}
                error={fieldErrors.clinicalAreaId}
              />
            )}
          </form.Field>

          <form.Field name='type'>
            {(field) => (
              <EncounterTypeField
                field={field}
                isCreating={isCreating}
                error={fieldErrors.type}
              />
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
