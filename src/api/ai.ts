import { apiRequest } from '@/api/client.ts';

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

// The API client contract intentionally exposes async functions.
// eslint-disable-next-line require-await
export async function getFormAiStatus(): Promise<FormAiStatus> {
  return apiRequest<FormAiStatus>('/api/ai/status');
}

// eslint-disable-next-line require-await
export async function getAiSettings(): Promise<FormAiSettings> {
  return apiRequest<FormAiSettings>('/api/ai/settings');
}

// eslint-disable-next-line require-await
export async function updateAiSettings(
  input: FormAiSettingsUpdate,
): Promise<FormAiSettings> {
  return apiRequest<FormAiSettings>('/api/ai/settings', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}
