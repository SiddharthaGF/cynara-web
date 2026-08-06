import { useForm, type ReactFormExtendedApi } from '@tanstack/react-form';

export interface TaxonomyParentOption {
  id: string;
  name: string;
}

export interface TaxonomyRecordLike {
  id: string;
  code: string;
  name: string;
  rowVersion: number;
  parentId?: string | null;
}

export interface TaxonomyRow extends TaxonomyRecordLike {
  status: 'active' | 'retired';
  updatedAt: string;
}

export type TaxonomyResourceKind =
  | 'facilities'
  | 'clinicalAreas'
  | 'disciplines';

export interface TaxonomyFormValues {
  code: string;
  name: string;
  parentId: string;
}

export type TaxonomyForm = ReturnType<typeof useTaxonomyForm>;

export function useTaxonomyForm(options: {
  defaultValues: TaxonomyFormValues;
  onSubmit: (values: TaxonomyFormValues) => Promise<void>;
}): ReactFormExtendedApi<
  TaxonomyFormValues,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  unknown
> {
  return useForm({
    defaultValues: options.defaultValues,
    onSubmit: async ({ value }) => {
      await options.onSubmit({
        code: value.code.trim(),
        name: value.name.trim(),
        parentId: value.parentId,
      });
    },
  });
}

export function parentFieldLabelKey(
  resource: 'facilities' | 'clinicalAreas' | 'disciplines',
): string {
  return resource === 'clinicalAreas' ? 'facilityLabel' : 'clinicalAreaLabel';
}

export function parentFieldPlaceholderKey(
  resource: 'facilities' | 'clinicalAreas' | 'disciplines',
): string {
  return resource === 'clinicalAreas'
    ? 'facilityPlaceholder'
    : 'clinicalAreaPlaceholder';
}

export function parentFieldRequiredKey(
  resource: 'facilities' | 'clinicalAreas' | 'disciplines',
): string {
  return resource === 'clinicalAreas'
    ? 'facilityRequired'
    : 'clinicalAreaRequired';
}

export function parentEmptyKey(
  resource: 'facilities' | 'clinicalAreas' | 'disciplines',
): string {
  return resource === 'clinicalAreas' ? 'facilityEmpty' : 'clinicalAreaEmpty';
}
