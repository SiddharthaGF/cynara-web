import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { Field, FieldError, FieldLabel } from '@/components/ui/field.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import type { DocumentForm } from '@/features/hospital/document-form-model.ts';
import { fieldErrorText } from '@/lib/useSyncedTanstackForm.ts';

export function DocumentScopeFields({
  form,
  activeFacilities,
  activeClinicalAreas,
  activeDisciplines,
  isPending,
}: {
  form: DocumentForm;
  activeFacilities: { id: string; name: string }[];
  activeClinicalAreas: { id: string; name: string; facilityId: string }[];
  activeDisciplines: { id: string; name: string; clinicalAreaId: string }[];
  isPending: boolean;
}): JSX.Element {
  const { t } = useTranslation('hospital');
  const noFacilities = activeFacilities.length === 0;

  return (
    <>
      <form.Field
        name='facilityId'
        validators={{
          onChange: ({ value }) =>
            value ? undefined : t('documents.facilityRequired'),
        }}
      >
        {(field) => (
          <Field data-invalid={!field.state.meta.isValid}>
            <FieldLabel htmlFor='documents-facility'>
              {t('documents.facilityLabel')}
            </FieldLabel>
            {noFacilities ? (
              <Alert
                variant='destructive'
                className='mt-1'
              >
                <AlertDescription>
                  {t('documents.facilityEmpty')}
                </AlertDescription>
              </Alert>
            ) : (
              <Select
                items={activeFacilities.map((facility) => ({
                  value: facility.id,
                  label: facility.name,
                }))}
                value={field.state.value || null}
                onValueChange={(next: string | null) => {
                  field.handleChange(next ?? '');
                  form.setFieldValue('clinicalAreaId', '');
                  form.setFieldValue('disciplineId', '');
                }}
                disabled={isPending}
              >
                <SelectTrigger
                  id='documents-facility'
                  className='w-full'
                  aria-invalid={!field.state.meta.isValid}
                >
                  <SelectValue
                    placeholder={t('documents.facilityPlaceholder')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {activeFacilities.map((item) => (
                    <SelectItem
                      key={item.id}
                      value={item.id}
                    >
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {field.state.meta.isValid ? null : (
              <FieldError>{fieldErrorText(field.state.meta.errors)}</FieldError>
            )}
          </Field>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => state.values.facilityId}>
        {(facilityId) => {
          const areaItems = activeClinicalAreas.flatMap((area) =>
            area.facilityId === facilityId
              ? [{ value: area.id, label: area.name }]
              : [],
          );
          return (
            <form.Field
              name='clinicalAreaId'
              validators={{
                onChange: ({ value }) =>
                  value ? undefined : t('documents.clinicalAreaRequired'),
              }}
            >
              {(field) => (
                <Field data-invalid={!field.state.meta.isValid}>
                  <FieldLabel htmlFor='documents-clinical-area'>
                    {t('documents.clinicalAreaLabel')}
                  </FieldLabel>
                  <Select
                    items={areaItems}
                    value={field.state.value || null}
                    onValueChange={(next: string | null) => {
                      field.handleChange(next ?? '');
                      form.setFieldValue('disciplineId', '');
                    }}
                    disabled={isPending || !facilityId}
                  >
                    <SelectTrigger
                      id='documents-clinical-area'
                      className='w-full'
                      aria-invalid={!field.state.meta.isValid}
                    >
                      <SelectValue
                        placeholder={t('documents.clinicalAreaPlaceholder')}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {areaItems.map((item) => (
                        <SelectItem
                          key={item.value}
                          value={item.value}
                        >
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {field.state.meta.isValid ? null : (
                    <FieldError>
                      {fieldErrorText(field.state.meta.errors)}
                    </FieldError>
                  )}
                </Field>
              )}
            </form.Field>
          );
        }}
      </form.Subscribe>

      <form.Subscribe selector={(state) => state.values.clinicalAreaId}>
        {(clinicalAreaId) => {
          const disciplineItems = activeDisciplines.flatMap((discipline) =>
            discipline.clinicalAreaId === clinicalAreaId
              ? [{ value: discipline.id, label: discipline.name }]
              : [],
          );
          return (
            <form.Field
              name='disciplineId'
              validators={{
                onChange: ({ value }) =>
                  value ? undefined : t('documents.disciplineRequired'),
              }}
            >
              {(field) => (
                <Field data-invalid={!field.state.meta.isValid}>
                  <FieldLabel htmlFor='documents-discipline'>
                    {t('documents.disciplineLabel')}
                  </FieldLabel>
                  <Select
                    items={disciplineItems}
                    value={field.state.value || null}
                    onValueChange={(next: string | null) => {
                      field.handleChange(next ?? '');
                    }}
                    disabled={isPending || !clinicalAreaId}
                  >
                    <SelectTrigger
                      id='documents-discipline'
                      className='w-full'
                      aria-invalid={!field.state.meta.isValid}
                    >
                      <SelectValue
                        placeholder={t('documents.disciplinePlaceholder')}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {disciplineItems.map((item) => (
                        <SelectItem
                          key={item.value}
                          value={item.value}
                        >
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {field.state.meta.isValid ? null : (
                    <FieldError>
                      {fieldErrorText(field.state.meta.errors)}
                    </FieldError>
                  )}
                </Field>
              )}
            </form.Field>
          );
        }}
      </form.Subscribe>
    </>
  );
}
