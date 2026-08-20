import type {
  ListClinicalAreasData,
  ListClinicalDocumentsData,
  ListDisciplinesData,
  ListEncountersData,
  ListFacilitiesData,
  SearchPatientsData,
} from '@/api/generated';

/**
 * Centralized React Query key factories. The legacy `forms` and `components`
 * shapes are preserved verbatim so existing consumers do not break. New
 * resources follow the `{all, list, detail, draft, ...}` convention.
 */

export interface FormListParams {
  includeRetired?: boolean;
  status?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export interface FormVersionListParams {
  include?: string;
  formDefinitionId?: string;
  sort?: string;
}

export interface WorkflowListParams {
  include?: string;
  status?: string;
  sort?: string;
}

export interface WorkflowVersionListParams {
  include?: string;
  workflowDefinitionId?: string;
  sort?: string;
}

export interface JourneyListParams {
  patientId?: string;
  encounterId?: string;
  status?: string;
}

export interface TaskListParams {
  assigneeId?: string;
  status?: string;
}

/** Query params modeled by the OpenAPI contract for the patient search. */
export type PatientListParams = NonNullable<SearchPatientsData['query']>;

/** Query params modeled by the OpenAPI contract for the encounter listing. */
export type EncounterListParams = NonNullable<ListEncountersData['query']>;

/** Query params modeled by the OpenAPI contract for document listings. */
export type ClinicalDocumentListParams = NonNullable<
  ListClinicalDocumentsData['query']
>;

/** Query params modeled by the OpenAPI contract for taxonomy listings. */
export type FacilityListParams = NonNullable<ListFacilitiesData['query']>;
export type ClinicalAreaListParams = NonNullable<
  ListClinicalAreasData['query']
>;
export type DisciplineListParams = NonNullable<ListDisciplinesData['query']>;

export interface DocumentDefinitionListParams {
  includeRetired?: boolean;
  include?: string;
  facilityId?: string;
  clinicalAreaId?: string;
  disciplineId?: string;
  status?: string;
}

export interface FormResponseListParams {
  include?: string;
  formVersionId?: string;
  pageSize?: number;
}

export interface AuditEventQueryParams {
  resourceType?: string;
  resourceId?: string;
  sort?: string;
}

function key(...segments: readonly unknown[]): readonly unknown[] {
  return [...segments];
}

const FORMS_ALL = ['forms'];
const COMPONENTS_ALL = ['components'];
const WORKSPACE_ALL = ['workspace'];
const HOSPITALS_ALL = ['hospitals'];
const FACILITIES_ALL = ['facilities'];
const CLINICAL_AREAS_ALL = ['clinicalAreas'];
const DISCIPLINES_ALL = ['disciplines'];
const FORM_DEFINITIONS_ALL = ['formDefinitions'];
const FORM_VERSIONS_ALL = ['formVersions'];
const COMPONENT_DEFINITIONS_ALL = ['componentDefinitions'];
const COMPONENT_VERSIONS_ALL = ['componentVersions'];
const DOCUMENT_DEFINITIONS_ALL = ['documentDefinitions'];
const FORM_RESPONSES_ALL = ['formResponses'];
const FORM_RESPONSE_REVISIONS_ALL = ['formResponseRevisions'];
const WORKFLOW_DEFINITIONS_ALL = ['workflowDefinitions'];
const WORKFLOW_VERSIONS_ALL = ['workflowVersions'];
const JOURNEYS_ALL = ['journeys'];
const TASKS_ALL = ['tasks'];
const AUDIT_EVENTS_ALL = ['auditEvents'];
const PATIENTS_ALL = ['patients'];
const ENCOUNTERS_ALL = ['encounters'];
const CLINICAL_DOCUMENTS_ALL = ['clinicalDocuments'];
const CAPABILITIES_ALL = ['capabilities'];
const AI_ALL = ['ai'];

export const queryKeys = {
  forms: {
    all: FORMS_ALL,
    list: (params: FormListParams = {}) => key('forms', 'list', params),
    draft: (code: string) => key('forms', 'draft', code),
  },
  components: {
    all: COMPONENTS_ALL,
    list: () => key('components', 'list'),
  },
  workspace: {
    all: WORKSPACE_ALL,
    detail: () => key('workspace', 'detail'),
  },
  hospitals: {
    all: HOSPITALS_ALL,
    memberships: () => key('hospitals', 'memberships'),
  },
  facilities: {
    all: FACILITIES_ALL,
    list: (params: FacilityListParams = {}) =>
      key('facilities', 'list', params),
  },
  clinicalAreas: {
    all: CLINICAL_AREAS_ALL,
    list: (params: ClinicalAreaListParams = {}) =>
      key('clinicalAreas', 'list', params),
  },
  disciplines: {
    all: DISCIPLINES_ALL,
    list: (params: DisciplineListParams = {}) =>
      key('disciplines', 'list', params),
  },
  formDefinitions: {
    all: FORM_DEFINITIONS_ALL,
    list: (params: FormListParams = {}) =>
      key('formDefinitions', 'list', params),
    detail: (id: string) => key('formDefinitions', 'detail', id),
    versions: (id: string) => key('formDefinitions', 'versions', id),
    /** Published-version picker options for the document catalog form. */
    versionOptions: () => key('formDefinitions', 'versionOptions'),
  },
  formVersions: {
    all: FORM_VERSIONS_ALL,
    list: (params: FormVersionListParams = {}) =>
      key('formVersions', 'list', params),
    detail: (id: string) => key('formVersions', 'detail', id),
  },
  componentDefinitions: {
    all: COMPONENT_DEFINITIONS_ALL,
    list: () => key('componentDefinitions', 'list'),
    detail: (id: string) => key('componentDefinitions', 'detail', id),
    versions: (id: string) => key('componentDefinitions', 'versions', id),
  },
  componentVersions: {
    all: COMPONENT_VERSIONS_ALL,
    detail: (id: string) => key('componentVersions', 'detail', id),
  },
  documentDefinitions: {
    all: DOCUMENT_DEFINITIONS_ALL,
    list: (params: DocumentDefinitionListParams = {}) =>
      key('documentDefinitions', 'list', params),
    detail: (id: string) => key('documentDefinitions', 'detail', id),
  },
  formResponses: {
    all: FORM_RESPONSES_ALL,
    list: (params: FormResponseListParams = {}) =>
      key('formResponses', 'list', params),
    detail: (id: string) => key('formResponses', 'detail', id),
    revisions: (id: string) => key('formResponses', 'revisions', id),
  },
  workflowDefinitions: {
    all: WORKFLOW_DEFINITIONS_ALL,
    list: (params: WorkflowListParams = {}) =>
      key('workflowDefinitions', 'list', params),
    detail: (id: string) => key('workflowDefinitions', 'detail', id),
    versions: (id: string) => key('workflowDefinitions', 'versions', id),
    /** The editable draft workflow version for a definition code. */
    draft: (code: string) => key('workflowDefinitions', 'draft', code),
  },
  workflowVersions: {
    all: WORKFLOW_VERSIONS_ALL,
    list: (params: WorkflowVersionListParams = {}) =>
      key('workflowVersions', 'list', params),
    detail: (id: string) => key('workflowVersions', 'detail', id),
  },
  journeys: {
    all: JOURNEYS_ALL,
    list: (params: JourneyListParams = {}) => key('journeys', 'list', params),
    detail: (id: string) => key('journeys', 'detail', id),
  },
  tasks: {
    all: TASKS_ALL,
    list: (params: TaskListParams = {}) => key('tasks', 'list', params),
    detail: (id: string) => key('tasks', 'detail', id),
  },
  formResponseRevisions: {
    all: FORM_RESPONSE_REVISIONS_ALL,
    detail: (id: string) => key('formResponseRevisions', 'detail', id),
  },
  auditEvents: {
    all: AUDIT_EVENTS_ALL,
    list: (params: AuditEventQueryParams = {}) =>
      key('auditEvents', 'list', params),
  },
  patients: {
    all: PATIENTS_ALL,
    list: (params: PatientListParams = {}) => key('patients', 'list', params),
    detail: (id: string) => key('patients', 'detail', id),
  },
  encounters: {
    all: ENCOUNTERS_ALL,
    list: (params: EncounterListParams = {}) =>
      key('encounters', 'list', params),
    detail: (id: string) => key('encounters', 'detail', id),
  },
  clinicalDocuments: {
    all: CLINICAL_DOCUMENTS_ALL,
    list: (params: ClinicalDocumentListParams = {}) =>
      key('clinicalDocuments', 'list', params),
    detail: (id: string) => key('clinicalDocuments', 'detail', id),
  },
  capabilities: {
    all: CAPABILITIES_ALL,
    current: () => key('capabilities', 'current'),
  },
  ai: {
    all: AI_ALL,
    settings: () => key('ai', 'settings'),
    status: () => key('ai', 'status'),
  },
} as const;

export type QueryKeys = typeof queryKeys;
