export {
  useAdminListState,
  useAdminMutationState,
  type AdminListState,
  type AdminMutationState,
} from '@/features/hospital/useAdminQueryState.ts';
export {
  useWorkspace,
  useUpdateWorkspace,
  type WorkspaceState,
} from '@/features/hospital/useWorkspaceAdmin.ts';
export {
  useFacilities,
  useCreateFacility,
  usePatchFacility,
  useRetireFacility,
} from '@/features/hospital/useFacilitiesAdmin.ts';
export {
  useClinicalAreas,
  useCreateClinicalArea,
  usePatchClinicalArea,
  useRetireClinicalArea,
} from '@/features/hospital/useClinicalAreasAdmin.ts';
export {
  useDisciplines,
  useCreateDiscipline,
  usePatchDiscipline,
  useRetireDiscipline,
} from '@/features/hospital/useDisciplinesAdmin.ts';
export {
  useDocumentDefinitions,
  useFormVersionPickerOptions,
  useCreateDocumentDefinition,
  usePatchDocumentDefinition,
  useRetireDocumentDefinition,
} from '@/features/hospital/useDocumentCatalogAdmin.ts';
export type {
  CreateClinicalAreaInput,
  CreateDisciplineInput,
  CreateFacilityInput,
  ListClinicalAreasParams,
  ListDisciplinesParams,
  ListFacilitiesParams,
  UpdateTaxonomyInput,
} from '@/api/taxonomy.ts';
export type {
  CreateDocumentDefinitionInput,
  DocumentDefinitionDto,
  ListDocumentDefinitionsParams,
  UpdateDocumentDefinitionInput,
} from '@/api/document-catalog.ts';
export type { UpdateWorkspaceInput } from '@/api/workspace.ts';
