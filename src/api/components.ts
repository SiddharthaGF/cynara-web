import { apiRequest } from '@/api/client.ts';
import type { ComponentSummary } from '@/features/forms/types.ts';

interface ApiComponentSummary {
  code: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  draftVersionId: string | null;
  draftRowVersion: number | null;
  publishedVersions: string[];
}

function mapSummary(item: ApiComponentSummary): ComponentSummary {
  return {
    code: item.code,
    name: item.name,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    draftVersionId: item.draftVersionId,
    draftRowVersion: item.draftRowVersion,
    publishedVersions: item.publishedVersions,
  };
}

export async function listComponents(): Promise<ComponentSummary[]> {
  const items = await apiRequest<ApiComponentSummary[]>('/api/components');
  return items.map(mapSummary);
}
