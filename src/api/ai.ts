import { apiRequest } from '@/api/client.ts';
import { jsonApiGetResource, jsonApiPatchResource } from '@/api/json-api.ts';

export interface AiEndpointSuggestion {
  id: string;
  label: string;
  baseUrl: string;
  defaultModel: string;
  jsonObject: boolean;
}

export interface FormAiStatus {
  configured: boolean;
  model: string | null;
  baseUrl: string | null;
  apiKeyConfigured: boolean;
  apiKeyMasked: string | null;
  jsonObject: boolean;
  source: 'database' | 'env' | 'none';
  baseUrlConfigured: boolean;
}

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

interface AiProviderSettingsAttributes {
  configured?: boolean;
  model?: string | null;
  baseUrl?: string | null;
  hasApiKey?: boolean;
  apiKeyMasked?: string | null;
  jsonObject?: boolean | null;
  source?: string | null;
  baseUrlConfigured?: boolean;
  suggestions?: AiEndpointSuggestion[] | null;
}

const AI_PROVIDER_SETTINGS_ID = 'default';
const AI_PROVIDER_SETTINGS_TYPE = 'aiProviderSettings';

function mapSettings(attributes: AiProviderSettingsAttributes): FormAiSettings {
  const { source } = attributes;
  const normalizedSource =
    source === 'database' || source === 'env' || source === 'none'
      ? source
      : 'none';

  return {
    configured: attributes.configured === true,
    model: attributes.model ?? null,
    baseUrl: attributes.baseUrl ?? null,
    apiKeyConfigured: attributes.hasApiKey === true,
    apiKeyMasked: attributes.apiKeyMasked ?? null,
    jsonObject: attributes.jsonObject ?? true,
    source: normalizedSource,
    baseUrlConfigured: attributes.baseUrlConfigured === true,
    suggestions: attributes.suggestions ?? [],
  };
}

// The API client contract intentionally exposes async functions.
// eslint-disable-next-line require-await
export async function getFormAiStatus(): Promise<FormAiStatus> {
  return apiRequest<FormAiStatus>('/api/ai/status');
}

export async function getAiSettings(): Promise<FormAiSettings> {
  const resource = await jsonApiGetResource<AiProviderSettingsAttributes>(
    `/api/${AI_PROVIDER_SETTINGS_TYPE}/${AI_PROVIDER_SETTINGS_ID}`,
  );
  return mapSettings(resource.attributes);
}

export async function updateAiSettings(
  input: FormAiSettingsUpdate,
): Promise<FormAiSettings> {
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

  const resource = await jsonApiPatchResource<AiProviderSettingsAttributes>(
    AI_PROVIDER_SETTINGS_TYPE,
    AI_PROVIDER_SETTINGS_ID,
    attributes,
  );
  return mapSettings(resource.attributes);
}
