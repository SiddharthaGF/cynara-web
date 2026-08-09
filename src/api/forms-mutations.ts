import { contractHeaders } from '@/api/client-runtime.ts';
import { ApiError } from '@/api/client.ts';
import {
  DEFINITIONS_COLLECTION_PAGE_SIZE,
  FORM_DEFINITIONS,
  FORM_VERSIONS,
  isEditableStatus,
  listAllFormDefinitionsQuery,
  mapSummary,
  mapVersion,
  requireDefinition,
  versionById,
  type FormDefinitionResource,
  type FormVersionResource,
} from '@/api/forms-mappers.ts';
import { getFormVersionSnapshot } from '@/api/forms-read.ts';
import {
  getFormDefinition as sdkGetFormDefinition,
  getFormDefinitionCollection as sdkGetFormDefinitionCollection,
  patchFormVersion as sdkPatchFormVersion,
  postApiFormDefinitionsByIdCreateDraft as sdkPostFormDefinitionCreateDraft,
  postApiFormVersionsByIdPublish as sdkPostFormVersionPublish,
  postApiFormVersionsByIdSubmitReview as sdkPostFormVersionSubmitReview,
  postApiFormVersionsByIdWithdrawReview as sdkPostFormVersionWithdrawReview,
  postFormDefinition as sdkPostFormDefinition,
  type AttributesInUpdateFormVersionRequest,
} from '@/api/generated';
import {
  buildPaginatedQuery,
  fetchAllCollectionPages,
  relationshipIds,
} from '@/api/json-api-utils.ts';
import type { FormSummary, FormVersion } from '@/features/forms/types.ts';

async function fetchDefinitionDocument(id: string): Promise<{
  definition: FormDefinitionResource;
  versions: Map<string, FormVersionResource>;
}> {
  const { data } = await sdkGetFormDefinition({
    path: { id },
    headers: contractHeaders(),
    query: { query: buildPaginatedQuery({ include: ['versions'] }) },
  });
  const definition = requireDefinition(data.data);
  return {
    definition,
    versions: versionById(data.included ?? []),
  };
}

async function getDefinitionByCode(code: string): Promise<{
  definition: FormDefinitionResource;
  versions: Map<string, FormVersionResource>;
}> {
  const collection = await fetchAllCollectionPages(
    listAllFormDefinitionsQuery(),
    DEFINITIONS_COLLECTION_PAGE_SIZE,
    async (query) => {
      const { data } = await sdkGetFormDefinitionCollection({
        headers: contractHeaders(),
        query: { query },
      });
      return data;
    },
  );
  const definition = collection.data.find(
    (item) => item.attributes?.code === code,
  );
  if (!definition) {
    throw new ApiError(404, 'Not Found', `Form '${code}' was not found.`);
  }
  return {
    definition,
    versions: versionById(collection.included ?? []),
  };
}

export async function createForm(input: {
  code: string;
  name: string;
  clinicalSchemaJson: string;
  uiSchemaJson?: string | null;
  rulesSchemaJson?: string | null;
}): Promise<FormSummary> {
  // CYN-55: generated `data.type` is the document discriminator, but the API expects the resource type on the wire; the narrow cast bridges the mismatch.
  const { data } = await sdkPostFormDefinition({
    headers: contractHeaders(),
    body: {
      data: {
        type: FORM_DEFINITIONS,
        attributes: {
          code: input.code,
          name: input.name,
          initialClinicalSchemaJson: input.clinicalSchemaJson,
          ...(input.uiSchemaJson
            ? { initialUiSchemaJson: input.uiSchemaJson }
            : {}),
          ...(input.rulesSchemaJson
            ? { initialRulesSchemaJson: input.rulesSchemaJson }
            : {}),
        },
      },
    } as never,
  });
  const createdId = data?.data?.id;
  if (!createdId) {
    throw new ApiError(
      500,
      'Invalid API response',
      'Created form definition did not return an identifier.',
    );
  }
  const { definition, versions } = await fetchDefinitionDocument(createdId);
  return mapSummary(definition, versions);
}

async function patchFormVersion(
  versionId: string,
  input: {
    clinicalSchemaJson: string;
    uiSchemaJson: string | null;
    rulesSchemaJson: string | null;
    rowVersion: number;
  },
): Promise<FormVersion> {
  // CYN-55: same `data.type` discriminator mismatch as `createForm`.
  const { data } = await sdkPatchFormVersion({
    path: { id: versionId },
    headers: contractHeaders(),
    body: {
      data: {
        id: versionId,
        type: FORM_VERSIONS,
        attributes: {
          clinicalSchemaJson: input.clinicalSchemaJson,
          uiSchemaJson: input.uiSchemaJson,
          rulesSchemaJson: input.rulesSchemaJson,
          rowVersion: input.rowVersion,
        } satisfies Omit<
          AttributesInUpdateFormVersionRequest,
          'openapi:discriminator'
        >,
      },
    } as never,
  });
  if (!data) {
    throw new ApiError(
      500,
      'Invalid API response',
      'Form version update did not return the updated resource.',
    );
  }
  return mapVersion(data.data, '');
}

export async function getFormDraft(code: string): Promise<FormVersion> {
  const { definition, versions } = await getDefinitionByCode(code);
  const related = relationshipIds(definition.relationships?.versions)
    .map((id) => versions.get(id))
    .filter((item): item is FormVersionResource => item !== undefined);
  const editable = related.find((item) =>
    isEditableStatus(item.attributes?.status),
  );
  if (!editable) {
    throw new ApiError(
      404,
      'Not Found',
      `Form '${code}' has no editable draft.`,
    );
  }
  return mapVersion(editable, definition.attributes?.code ?? code);
}

export async function updateFormDraft(
  code: string,
  input: {
    clinicalSchemaJson: string;
    uiSchemaJson: string | null;
    rulesSchemaJson: string | null;
    rowVersion: number;
  },
): Promise<FormVersion> {
  const draft = await getFormDraft(code);
  const updated = await patchFormVersion(draft.id, input);
  return { ...updated, code };
}

export async function resolveFormDefinitionId(code: string): Promise<string> {
  const { definition } = await getDefinitionByCode(code);
  return definition.id;
}

type LifecycleTransition = 'submit-review' | 'withdraw-review' | 'publish';

async function transitionFormVersion(
  versionId: string,
  rowVersion: number,
  transition: LifecycleTransition,
): Promise<FormVersion> {
  const headers = contractHeaders();
  const query = { rowVersion };
  if (transition === 'submit-review') {
    await sdkPostFormVersionSubmitReview({
      path: { id: versionId },
      headers,
      query,
    });
  } else if (transition === 'withdraw-review') {
    await sdkPostFormVersionWithdrawReview({
      path: { id: versionId },
      headers,
      query,
    });
  } else {
    await sdkPostFormVersionPublish({
      path: { id: versionId },
      headers,
      query,
    });
  }
  return getFormVersionSnapshot(versionId);
}

/**
 * Moves an editable draft to the review state. The schema locks and the draft
 * becomes read-only until it is published or withdrawn.
 */
export async function submitFormReview(
  versionId: string,
  rowVersion: number,
): Promise<FormVersion> {
  return transitionFormVersion(versionId, rowVersion, 'submit-review');
}

/** Returns a review-state version to an editable draft. */
export async function withdrawFormReview(
  versionId: string,
  rowVersion: number,
): Promise<FormVersion> {
  return transitionFormVersion(versionId, rowVersion, 'withdraw-review');
}

/** Publishes a reviewed version, making it available to consultations. */
export async function publishFormVersion(
  versionId: string,
  rowVersion: number,
): Promise<FormVersion> {
  return transitionFormVersion(versionId, rowVersion, 'publish');
}

/**
 * Creates a new editable draft from the latest published version, allowing a
 * designer to keep iterating on the next version after publishing.
 */
export async function createFormDraft(code: string): Promise<FormVersion> {
  const definitionId = await resolveFormDefinitionId(code);
  await sdkPostFormDefinitionCreateDraft({
    path: { id: definitionId },
    headers: contractHeaders(),
  });
  return getFormDraft(code);
}
