/**
 * Centralized React Query key factories. The legacy `forms` and `components`
 * shapes are preserved verbatim so existing consumers do not break. New
 * resources follow the `{all, list, detail, draft, ...}` convention.
 */

export interface FormListParams {
  includeRetired?: boolean;
  status?: string;
  sort?: string;
}

export interface FormVersionListParams {
  include?: string;
  formDefinitionId?: string;
  sort?: string;
}

export interface TaxonomyQueryParams {
  facilityId?: string;
  clinicalAreaId?: string;
  includeRetired?: boolean;
}

export interface DocumentDefinitionListParams {
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

export interface PatientListParams {
  mrn?: string;
  nationalId?: string;
  givenName?: string;
  familyName?: string;
  includeDeleted?: boolean;
}

function key(...segments: readonly unknown[]): readonly unknown[] {
  return [...segments];
}

const FORMS_ALL = ['forms'];
const COMPONENTS_ALL = ['components'];
const WORKSPACE_ALL = ['workspace'];
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
const AUDIT_EVENTS_ALL = ['auditEvents'];
const PATIENTS_ALL = ['patients'];
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
  facilities: {
    all: FACILITIES_ALL,
    list: (params: TaxonomyQueryParams = {}) =>
      key('facilities', 'list', params),
  },
  clinicalAreas: {
    all: CLINICAL_AREAS_ALL,
    list: (params: TaxonomyQueryParams = {}) =>
      key('clinicalAreas', 'list', params),
  },
  disciplines: {
    all: DISCIPLINES_ALL,
    list: (params: TaxonomyQueryParams = {}) =>
      key('disciplines', 'list', params),
  },
  formDefinitions: {
    all: FORM_DEFINITIONS_ALL,
    list: (params: FormListParams = {}) =>
      key('formDefinitions', 'list', params),
    detail: (id: string) => key('formDefinitions', 'detail', id),
    versions: (id: string) => key('formDefinitions', 'versions', id),
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
  ai: {
    all: AI_ALL,
    settings: () => key('ai', 'settings'),
    status: () => key('ai', 'status'),
  },
} as const;

export type QueryKeys = typeof queryKeys;
