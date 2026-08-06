import { contractHeaders } from '@/api/client-runtime.ts';
import { ApiError } from '@/api/client.ts';
import {
  getAiProviderSetting,
  getFormAiStatus as sdkGetFormAiStatus,
  patchAiProviderSetting,
  type AttributesInUpdateAiProviderSettingRequest,
  type DataInAiProviderSettingResponse,
  type FormAiStatusResponse,
  type PatchAiProviderSettingResponses,
  type PrimaryAiProviderSettingResponseDocument,
} from '@/api/generated';

export interface AiEndpointSuggestion {
  id: string;
  label: string;
  baseUrl: string;
  defaultModel: string;
  jsonObject: boolean;
}

/**
 * AI configuration status. Re-exported from the generated client so the shape
 * stays aligned with the OpenAPI contract.
 */
export type FormAiStatus = FormAiStatusResponse;

export interface FormAiSettings extends FormAiStatus {
  suggestions: AiEndpointSuggestion[];
}

export interface FormAiSettingsUpdate {
  apiKey?: string | null;
  clearApiKey?: boolean;
  baseUrl?: string | null;
  model?: string | null;
  jsonObject?: boolean | null;
}

/**
 * The contract models `suggestions` as `unknown[]` (no item schema). The API
 * returns the endpoint suggestions below; the guard keeps the mapping honest
 * without an unchecked cast.
 */
function isAiEndpointSuggestion(value: unknown): value is AiEndpointSuggestion {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.label === 'string' &&
    typeof record.baseUrl === 'string' &&
    typeof record.defaultModel === 'string' &&
    typeof record.jsonObject === 'boolean'
  );
}

/**
 * Attributes of the AI provider setting resource as the API returns them.
 * The `openapi:discriminator` metadata is documentation-only; `mapSettings`
 * reads the projected fields below.
 */
type AiProviderSettingAttributes = NonNullable<
  DataInAiProviderSettingResponse['attributes']
>;

function mapSettings(
  attributes: AiProviderSettingAttributes | undefined,
): FormAiSettings {
  const attrs: AiProviderSettingAttributes = attributes ?? {
    'openapi:discriminator': 'dataInAiProviderSettingResponse',
  };
  const { source } = attrs;
  const normalizedSource =
    source === 'database' || source === 'env' || source === 'none'
      ? source
      : 'none';

  return {
    configured: attrs.configured === true,
    model: attrs.model ?? null,
    baseUrl: attrs.baseUrl ?? null,
    apiKeyConfigured: attrs.hasApiKey === true,
    apiKeyMasked: attrs.apiKeyMasked ?? null,
    jsonObject: attrs.jsonObject ?? true,
    source: normalizedSource,
    baseUrlConfigured: attrs.baseUrlConfigured === true,
    suggestions: (attrs.suggestions ?? []).filter(isAiEndpointSuggestion),
  };
}

const AI_PROVIDER_SETTINGS_ID = 'default';

/** Attributes the API accepts on PATCH, without the `openapi:discriminator` metadata. */
type AiProviderSettingsUpdateAttributes = Omit<
  AttributesInUpdateAiProviderSettingRequest,
  'openapi:discriminator'
>;

export async function getFormAiStatus(): Promise<FormAiStatus> {
  const { data } = await sdkGetFormAiStatus({
    headers: contractHeaders(),
  });
  return data;
}

export async function getAiSettings(): Promise<FormAiSettings> {
  const { data } = await getAiProviderSetting({
    path: { id: AI_PROVIDER_SETTINGS_ID },
    headers: contractHeaders(),
  });
  return mapSettings(data.data.attributes);
}

/**
 * CYN-55: the generated request document requires `openapi:discriminator`
 * metadata fields that are documentation-only and must not be serialized. The
 * body below matches the wire contract the API accepts; the narrow cast bridges
 * the generated typing.
 */
export async function updateAiSettings(
  input: FormAiSettingsUpdate,
): Promise<FormAiSettings> {
  const attributes: AiProviderSettingsUpdateAttributes = {};
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

  const { data } = await patchAiProviderSetting({
    path: { id: AI_PROVIDER_SETTINGS_ID },
    headers: contractHeaders(),
    body: {
      data: {
        id: AI_PROVIDER_SETTINGS_ID,
        type: 'aiProviderSettings',
        attributes,
      },
    },
  } as never);

  const document = requireSettingsDocument(data);
  return mapSettings(document.data.attributes);
}

function requireSettingsDocument(
  data: PatchAiProviderSettingResponses[keyof PatchAiProviderSettingResponses],
): PrimaryAiProviderSettingResponseDocument {
  if (typeof data === 'object' && data !== null && 'data' in data) {
    return data;
  }
  throw new ApiError(
    500,
    'Invalid API response',
    'Expected a JSON:API resource.',
  );
}
