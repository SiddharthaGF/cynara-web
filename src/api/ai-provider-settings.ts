import {
  jsonApiActionDelete,
  jsonApiGetCollection,
  jsonApiGetResource,
  jsonApiPatchResource,
  jsonApiPostResource,
  type JsonApiResource,
} from '@/api/json-api.ts';

export const AI_PROVIDER_SETTINGS = 'aiProviderSettings';

export interface AiProviderSettingsDto {
  id: string;
  baseUrl: string | null;
  model: string | null;
  /**
   * Sensitive credential. The server never echoes the raw value back — only a
   * masked form or a boolean flag is exposed on the read DTO. The shape here
   * is intentionally `never` on the read side; see `AiProviderSettingsInput`
   * for the write-side type.
   */
  apiKey: never;
  jsonObject: boolean;
  hasApiKey: boolean;
  apiKeyMasked: string | null;
  source: 'database' | 'env' | 'none';
  baseUrlConfigured: boolean;
  rowVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface AiProviderSettingsInput {
  baseUrl?: string | null;
  model?: string | null;
  /** Raw credential. Sent only on writes; never read back. */
  apiKey?: string | null;
  /** Explicit flag to clear a previously stored credential. */
  clearApiKey?: boolean;
  jsonObject?: boolean | null;
}

export interface CreateAiProviderSettingsInput {
  baseUrl?: string | null;
  model?: string | null;
  apiKey?: string | null;
  jsonObject?: boolean | null;
}

export interface UpdateAiProviderSettingsInput {
  baseUrl?: string | null;
  model?: string | null;
  apiKey?: string | null;
  clearApiKey?: boolean;
  jsonObject?: boolean | null;
  rowVersion: number;
}

interface AiProviderSettingsAttributes {
  baseUrl?: string | null;
  model?: string | null;
  apiKey?: string;
  jsonObject?: boolean | null;
  hasApiKey?: boolean;
  apiKeyMasked?: string | null;
  source?: string;
  baseUrlConfigured?: boolean;
  rowVersion?: number;
  createdAt?: string;
  updatedAt?: string;
}

function readString(attributes: object, name: string): string | null {
  const value = (attributes as Record<string, unknown>)[name];
  return typeof value === 'string' ? value : null;
}

function readNumber(attributes: object, name: string): number {
  const value = (attributes as Record<string, unknown>)[name];
  return typeof value === 'number' ? value : 0;
}

function readBoolean(attributes: object, name: string): boolean {
  const value = (attributes as Record<string, unknown>)[name];
  return typeof value === 'boolean' ? value : false;
}

function readNullableBoolean(attributes: object, name: string): boolean | null {
  const value = (attributes as Record<string, unknown>)[name];
  return typeof value === 'boolean' ? value : null;
}

function normalizeSource(
  value: string | null,
): AiProviderSettingsDto['source'] {
  if (value === 'database' || value === 'env' || value === 'none') {
    return value;
  }
  return 'none';
}

function mapResource(
  resource: JsonApiResource<AiProviderSettingsAttributes>,
): AiProviderSettingsDto {
  const attrs = resource.attributes;
  return {
    id: resource.id,
    baseUrl: readString(attrs, 'baseUrl'),
    model: readString(attrs, 'model'),
    // Read DTO never exposes the raw key. Use `hasApiKey`/`apiKeyMasked`.
    apiKey: undefined as never,
    jsonObject: readNullableBoolean(attrs, 'jsonObject') ?? true,
    hasApiKey: readBoolean(attrs, 'hasApiKey'),
    apiKeyMasked: readString(attrs, 'apiKeyMasked'),
    source: normalizeSource(readString(attrs, 'source')),
    baseUrlConfigured: readBoolean(attrs, 'baseUrlConfigured'),
    rowVersion: readNumber(attrs, 'rowVersion'),
    createdAt: readString(attrs, 'createdAt') ?? '',
    updatedAt: readString(attrs, 'updatedAt') ?? '',
  };
}

function buildAttributes(
  input: AiProviderSettingsInput,
): Record<string, unknown> {
  const attributes: Record<string, unknown> = {};
  if (input.baseUrl !== undefined) {
    attributes.baseUrl = input.baseUrl;
  }
  if (input.model !== undefined) {
    attributes.model = input.model;
  }
  if (input.jsonObject !== undefined) {
    attributes.jsonObject = input.jsonObject;
  }
  if (
    input.apiKey !== undefined &&
    input.apiKey !== null &&
    input.apiKey !== ''
  ) {
    attributes.apiKey = input.apiKey;
  }
  if (input.clearApiKey === true) {
    attributes.clearApiKey = true;
  }
  return attributes;
}

export async function listAiProviderSettings(): Promise<
  AiProviderSettingsDto[]
> {
  const { data } = await jsonApiGetCollection<AiProviderSettingsAttributes>(
    `/api/${AI_PROVIDER_SETTINGS}`,
  );
  return data.map(mapResource);
}

export async function getAiProviderSettings(
  id: string,
): Promise<AiProviderSettingsDto> {
  const resource = await jsonApiGetResource<AiProviderSettingsAttributes>(
    `/api/${AI_PROVIDER_SETTINGS}/${id}`,
  );
  return mapResource(resource);
}

export async function createAiProviderSettings(
  input: CreateAiProviderSettingsInput,
): Promise<AiProviderSettingsDto> {
  const resource = await jsonApiPostResource<AiProviderSettingsAttributes>(
    AI_PROVIDER_SETTINGS,
    buildAttributes(input),
  );
  return mapResource(resource);
}

export async function updateAiProviderSettings(
  id: string,
  input: UpdateAiProviderSettingsInput,
): Promise<AiProviderSettingsDto> {
  const attributes: Record<string, unknown> = {
    ...buildAttributes(input),
    rowVersion: input.rowVersion,
  };
  const resource = await jsonApiPatchResource<AiProviderSettingsAttributes>(
    AI_PROVIDER_SETTINGS,
    id,
    attributes,
  );
  return mapResource(resource);
}

export async function deleteAiProviderSettings(id: string): Promise<void> {
  await jsonApiActionDelete(AI_PROVIDER_SETTINGS, id, 'delete');
}

export type AiProviderSettingsAttributesShape = AiProviderSettingsAttributes;
