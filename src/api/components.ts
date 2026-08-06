import { contractHeaders } from '@/api/client-runtime.ts';
import {
  getComponentDefinitionCollection as sdkGetComponentDefinitionCollection,
  type DataInComponentDefinitionResponse,
  type DataInComponentVersionResponse,
  type ResourceInResponse,
} from '@/api/generated';
import {
  buildPaginatedQuery,
  includedResources,
  relationshipIds,
} from '@/api/json-api-utils.ts';
import type { ComponentSummary } from '@/features/forms/types.ts';

const COMPONENT_VERSIONS = 'componentVersions';

type ComponentDefinitionResource = Pick<
  DataInComponentDefinitionResponse,
  'id' | 'attributes' | 'relationships'
>;
type ComponentVersionResource = Pick<
  DataInComponentVersionResponse,
  'id' | 'attributes' | 'relationships'
>;

function listComponentsQuery(): Record<string, string> {
  return buildPaginatedQuery({
    include: ['versions'],
    pageSize: 100,
    sort: 'code',
  });
}

function versionById(
  included: readonly ResourceInResponse[],
): Map<string, ComponentVersionResource> {
  const map = new Map<string, ComponentVersionResource>();
  for (const item of includedResources<DataInComponentVersionResponse>(
    included,
    COMPONENT_VERSIONS,
  )) {
    map.set(item.id, item);
  }
  return map;
}

function mapSummary(
  definition: ComponentDefinitionResource,
  versions: Map<string, ComponentVersionResource>,
): ComponentSummary {
  const attrs = definition.attributes;
  const related = relationshipIds(definition.relationships?.versions)
    .map((id) => versions.get(id))
    .filter((item): item is ComponentVersionResource => item !== undefined);

  const draft = related.find((item) => item.attributes?.status === 'draft');
  const publishedVersions: string[] = [];
  for (const item of related) {
    if (item.attributes?.status === 'published') {
      const value = item.attributes?.version;
      if (value !== null && value !== undefined && value.length > 0) {
        publishedVersions.push(value);
      }
    }
  }
  publishedVersions.sort();

  return {
    code: attrs?.code ?? '',
    name: attrs?.name ?? '',
    createdAt: attrs?.createdAt ?? '',
    updatedAt: attrs?.updatedAt ?? '',
    draftVersionId: draft?.id ?? null,
    draftRowVersion: draft ? (draft.attributes?.rowVersion ?? null) : null,
    publishedVersions,
  };
}

export async function listComponents(): Promise<ComponentSummary[]> {
  const { data } = await sdkGetComponentDefinitionCollection({
    headers: contractHeaders(),
    query: { query: listComponentsQuery() },
  });
  const versions = versionById(data.included ?? []);
  return data.data.map((definition) => mapSummary(definition, versions));
}
