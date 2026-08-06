import { useForm, type ReactFormExtendedApi } from '@tanstack/react-form';

export interface DocumentFormValues {
  code: string;
  name: string;
  formDefinitionId: string;
  formVersionId: string;
  facilityId: string;
  clinicalAreaId: string;
  disciplineId: string;
  allowsMultipleInstancesPerEncounter: boolean;
  requiresActorForCreation: boolean;
  requiresActorForCompletion: boolean;
}

export const EMPTY_DOCUMENT_VALUES: DocumentFormValues = {
  code: '',
  name: '',
  formDefinitionId: '',
  formVersionId: '',
  facilityId: '',
  clinicalAreaId: '',
  disciplineId: '',
  allowsMultipleInstancesPerEncounter: false,
  requiresActorForCreation: false,
  requiresActorForCompletion: false,
};

export interface DocumentFormOption {
  formDefinitionId: string;
  code: string;
  name: string;
  publishedVersions: { id: string; version: string }[];
}

export const DOCUMENT_CODE_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9-]*$/;

export type DocumentForm = ReturnType<typeof useDocumentForm>;

export function useDocumentForm(options: {
  defaultValues: DocumentFormValues;
  onSubmit: (values: DocumentFormValues) => Promise<void>;
}): ReactFormExtendedApi<
  DocumentFormValues,
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
      await options.onSubmit(value);
    },
  });
}
