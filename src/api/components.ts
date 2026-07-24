import {
  attrNumber,
  attrString,
  includedOfType,
  jsonApiGetCollection,
  relatedIds,
  type JsonApiResource,
} from '@/api/json-api.ts';
import type { ComponentSummary } from '@/features/forms/types.ts';

interface ComponentDefinitionAttributes {
  code?: string;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ComponentVersionAttributes {
  version?: string | null;
  status?: string;
  rowVersion?: number;
}

const COMPONENT_DEFINITIONS = 'componentDefinitions';
const COMPONENT_VERSIONS = 'componentVersions';

function listComponentsQuery(): string {
  const params = new URLSearchParams();
  params.set('include', 'versions');
  params.set('page[size]', '100');
  params.set('sort', 'code');
  return params.toString();
}

function versionById(
  included: JsonApiResource[],
): Map<string, JsonApiResource<ComponentVersionAttributes>> {
  const map = new Map<string, JsonApiResource<ComponentVersionAttributes>>();
  for (const item of includedOfType(included, COMPONENT_VERSIONS)) {
    map.set(item.id, item);
  }
  return map;
}

function mapSummary(
  definition: JsonApiResource<ComponentDefinitionAttributes>,
  versions: Map<string, JsonApiResource<ComponentVersionAttributes>>,
): ComponentSummary {
  const attrs = definition.attributes;
  const related = relatedIds(definition, 'versions')
    .map((id) => versions.get(id))
    .filter(
      (item): item is JsonApiResource<ComponentVersionAttributes> =>
        item !== undefined,
    );

  const draft = related.find(
    (item) => attrString(item.attributes, 'status') === 'draft',
  );
  const publishedVersions: string[] = [];
  for (const item of related) {
    if (attrString(item.attributes, 'status') === 'published') {
      const value = attrString(item.attributes, 'version');
      if (value !== null && value.length > 0) {
        publishedVersions.push(value);
      }
    }
  }
  publishedVersions.sort();

  return {
    code: attrString(attrs, 'code') ?? '',
    name: attrString(attrs, 'name') ?? '',
    createdAt: attrString(attrs, 'createdAt') ?? '',
    updatedAt: attrString(attrs, 'updatedAt') ?? '',
    draftVersionId: draft?.id ?? null,
    draftRowVersion: draft ? attrNumber(draft.attributes, 'rowVersion') : null,
    publishedVersions,
  };
}

export async function listComponents(): Promise<ComponentSummary[]> {
  const { data, included } =
    await jsonApiGetCollection<ComponentDefinitionAttributes>(
      `/api/${COMPONENT_DEFINITIONS}?${listComponentsQuery()}`,
    );
  const versions = versionById(included);
  return data.map((definition) => mapSummary(definition, versions));
}
