import { contractHeaders } from '@/api/client-runtime.ts';
import {
  listAllFormDefinitionsQuery,
  versionById,
  type FormVersionResource,
} from '@/api/forms.ts';
import { getFormDefinitionCollection } from '@/api/generated';
import { relationshipIds } from '@/api/json-api-utils.ts';

export interface PublishedFormVersionOption {
  id: string;
  version: string;
}

export interface FormVersionPickerOption {
  formDefinitionId: string;
  code: string;
  name: string;
  publishedVersions: PublishedFormVersionOption[];
}

/**
 * Form definitions with their published versions, used by the clinical
 * document catalog form selector. Only published versions can back a catalog
 * entry, so draft/review versions are omitted.
 */
export async function listFormVersionPickerOptions(): Promise<
  FormVersionPickerOption[]
> {
  const { data } = await getFormDefinitionCollection({
    headers: contractHeaders(),
    query: { query: listAllFormDefinitionsQuery() },
  });
  const versions = versionById(data.included ?? []);
  return data.data.map((definition) => {
    const related = relationshipIds(definition.relationships?.versions)
      .map((id) => versions.get(id))
      .filter((item): item is FormVersionResource => item !== undefined);
    const publishedVersions = related
      .flatMap((item) =>
        item.attributes?.status === 'published'
          ? [
              {
                id: item.id,
                version: item.attributes?.version ?? item.id,
              },
            ]
          : [],
      )
      // The mapped array is freshly created, so an in-place sort is safe.
      // eslint-disable-next-line unicorn/no-array-sort
      .sort((a, b) => a.version.localeCompare(b.version));
    return {
      formDefinitionId: definition.id,
      code: definition.attributes?.code ?? '',
      name: definition.attributes?.name ?? '',
      publishedVersions,
    };
  });
}
